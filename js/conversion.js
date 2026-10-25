// Part of MARIA (MathML Automatisch Renderen In ASCII)
import { FormulaError, abortError } from './errors.js';
import { heuristicFindings, misusesNoBreakSpace } from './heuristics.js';
import { MathCATUnavailable, toDedicon } from './mathcat.js';
import { codePiece, markupPiece, todoPiece } from './pieces.js';
import { formulaContext, lineFinder, replaceFormulas } from './scanner.js';
import { parseFormula } from './xml.js';

const MFENCED = /<!--[\s\S]*?-->|<!\[CDATA\[[\s\S]*?\]\]>|<\?[\s\S]*?\?>|<(?:[\w.-]+:)?mfenced(?:\s+[^\s=/>]+\s*=\s*(?:"[^"]*"|'[^']*'))*\s*(?=\/?>)/g;

function hasUnknownCharacter(dedicon) {
  return /'\\x[0-9a-fA-F]{4,6}'/.test(dedicon);
}

function addEmptySeparators(formula) {
  let count = 0;
  const text = formula.replace(MFENCED, (tag) => {
    if (tag[1] === '!' || tag[1] === '?' || /\sseparators\s*=/.test(tag.replace(/"[^"]*"|'[^']*'/g, ''))) {
      return tag;
    }
    count++;
    return `${tag} separators=""`;
  });
  return { text, count };
}

class Pause {
  #resolve;
  #converter;
  #busy = false;
  #open = true;
  #linear = null;

  constructor(fields, resolve, converter) {
    Object.assign(this, fields);
    this.#resolve = resolve;
    this.#converter = converter;
  }

  get busy() {
    return this.#busy;
  }

  get open() {
    return this.#open;
  }

  toLinear(mathml) {
    if (this.#linear?.mathml !== mathml) {
      const linear = { mathml, done: this.#converter.toLinear(mathml) };
      linear.done.catch(() => {
        if (this.#linear === linear) {
          this.#linear = null;
        }
      });
      this.#linear = linear;
    }
    return this.#linear.done;
  }

  #check() {
    if (!this.#open) {
      throw new Error('de conversie is niet gepauzeerd');
    }
    if (this.#busy) {
      throw new Error('de herstelde formule wordt nog geconverteerd');
    }
  }

  #finish(piece) {
    this.#open = false;
    this.#resolve(piece);
  }

  close() {
    this.#open = false;
  }

  async retry(mathml) {
    this.#check();
    if (typeof mathml !== 'string') {
      throw new TypeError('de formule moet tekst zijn');
    }
    this.#busy = true;
    try {
      const converted = this.#converter.withPieces(await this.toLinear(mathml), mathml, this.number, this.line);
      if (!this.#open) {
        throw abortError();
      }
      this.#finish(this.#converter.accept(converted));
      return null;
    } catch (e) {
      if (!this.#open) {
        throw abortError();
      }
      if (!(e instanceof FormulaError)) {
        throw e;
      }
      Object.assign(this, { message: e.message, kind: 'error', mathml, dedicon: null });
      return e.message;
    } finally {
      this.#busy = false;
    }
  }

  skip() {
    this.#check();
    this.#finish(this.converted ? this.#converter.accept(this.converted) : this.#converter.skip(this));
  }
}

export async function convertPublication(publication, settings, { signal, onProgress, onPause }) {
  const { bytes, formulas, pages, encoding, newline, declarations } = publication;
  const { withEmptySeparators, limits } = settings;
  const counts = { skipped: [], unknown: [], empty: [], mfencedChanged: 0, flagged: 0, noBreakSpaces: 0 };

  const converter = {
    async toLinear(mathml) {
      try {
        let math = parseFormula(mathml, declarations);
        const changed = withEmptySeparators ? addEmptySeparators(mathml) : { text: mathml, count: 0 };
        if (changed.count) {
          math = parseFormula(changed.text, declarations);
        }
        return { dedicon: await toDedicon(changed.text), mathml: changed.text, math, changed: changed.count };
      } catch (e) {
        if (e.name === 'AbortError' || e instanceof MathCATUnavailable) {
          throw e;
        }
        throw new FormulaError(e.message, { cause: e });
      }
    },

    withPieces(done, mathml, number, line, original = null) {
      const pieces = {
        linear: codePiece(done.dedicon, encoding),
        corrected: original && done.mathml === mathml ? original : markupPiece(done.mathml, encoding, newline),
      };
      return { ...done, number, line, pieces };
    },

    accept(converted) {
      const { dedicon, number, line } = converted;
      counts.mfencedChanged += converted.changed;
      if (dedicon.trim() === '') {
        counts.empty.push({ number, line });
      } else if (hasUnknownCharacter(dedicon)) {
        counts.unknown.push({ number, line });
      }
      if (misusesNoBreakSpace(converted.math)) {
        counts.noBreakSpaces++;
      }
      return converted.pieces;
    },

    skip(pause) {
      counts.skipped.push({ number: pause.number, line: pause.line });
      const todo = todoPiece(pause.original.message, pause.original.mathml, encoding, newline);
      return { linear: todo, corrected: todo };
    },
  };

  function pause(message, kind, k, line, mathml, converted = null) {
    return new Promise((resolve, reject) => {
      if (signal.aborted) {
        reject(abortError());
        return;
      }
      const stop = () => {
        p.close();
        reject(abortError());
      };
      const p = new Pause({
        number: k + 1, line, page: pages[k], message, kind, mathml, converted, declarations,
        dedicon: converted?.dedicon ?? null, original: { message, mathml },
        context: formulaContext(bytes, formulas[k], encoding),
      }, (piece) => {
        signal.removeEventListener('abort', stop);
        resolve(piece);
      }, converter);
      signal.addEventListener('abort', stop, { once: true });
      onPause(p);
    });
  }

  const decoder = new TextDecoder(encoding);
  const lineOf = lineFinder(bytes);
  const outputs = await replaceFormulas(bytes, formulas, ['linear', 'corrected'], async (formulaBytes, k, f) => {
    const mathml = decoder.decode(formulaBytes);
    const line = lineOf(f.start);
    let one;
    try {
      one = converter.withPieces(await converter.toLinear(mathml), mathml, k + 1, line, formulaBytes);
    } catch (e) {
      if (!(e instanceof FormulaError)) {
        throw e;
      }
      return pause(e.message, 'error', k, line, mathml);
    }
    const findings = limits ? heuristicFindings(one.math, one.dedicon, limits) : [];
    if (findings.length === 0) {
      return converter.accept(one);
    }
    counts.flagged++;
    return pause(`Heuristiek: ${findings.join('; ')}`, 'warning', k, line, mathml, one);
  }, onProgress, signal);
  return { ...outputs, ...counts };
}
