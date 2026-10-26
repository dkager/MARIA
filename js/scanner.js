// Part of MARIA (MathML Automatisch Renderen In ASCII)
import { GT, LT, NEWLINE, ascii, joinBytes } from './encoding.js';
import { FormulaError, abortError } from './errors.js';

const SLASH = 0x2f, QUOTE = 0x22, APOS = 0x27, BANG = 0x21, QUESTION = 0x3f;
const OPEN_BRACKET = 0x5b, CLOSE_BRACKET = 0x5d, COLON = 0x3a;

const COMMENT_START = ascii('<!--'), COMMENT_END = ascii('-->');
const CDATA_START = ascii('<![CDATA['), CDATA_END = ascii(']]>');
const PI_END = ascii('?>');
const MATH = ascii('math');

const ELLIPSIS = '\u2026';
const LEADING_REPLACEMENTS = /^\uFFFD+/, TRAILING_REPLACEMENTS = /\uFFFD+$/;

const CONTEXT_LINES = 100;
const CONTEXT_BYTES = 20_000;

export function formulaContext(bytes, { start, end }, encoding) {
  let from = start, lines = 0;
  while (from > 0 && start - from < CONTEXT_BYTES && !(bytes[from - 1] === NEWLINE && ++lines > CONTEXT_LINES)) {
    from--;
  }
  let to = end;
  lines = 0;
  while (to < bytes.length && to - end < CONTEXT_BYTES && !(bytes[to] === NEWLINE && ++lines > CONTEXT_LINES)) {
    to++;
  }
  const decoder = new TextDecoder(encoding);
  const text = (a, b) => decoder.decode(bytes.subarray(a, b)).replace(/\r\n?/g, '\n');
  let before = text(from, start), after = text(end, to);
  if (from > 0 && bytes[from - 1] !== NEWLINE) {
    before = ELLIPSIS + before.replace(LEADING_REPLACEMENTS, '');
  }
  if (to < bytes.length && bytes[to] !== NEWLINE) {
    after = after.replace(TRAILING_REPLACEMENTS, '') + ELLIPSIS;
  }
  return { before, after };
}

export function lineFinder(bytes) {
  const starts = [0];
  for (let i = bytes.indexOf(NEWLINE); i >= 0; i = bytes.indexOf(NEWLINE, i + 1)) {
    starts.push(i + 1);
  }
  return (position) => {
    let low = 0, high = starts.length;
    while (low < high) {
      const middle = (low + high) >> 1;
      if (starts[middle] <= position) {
        low = middle + 1;
      } else {
        high = middle;
      }
    }
    return low;
  };
}

function startsWith(bytes, pattern, at) {
  if (at + pattern.length > bytes.length) {
    return false;
  }
  for (let j = 0; j < pattern.length; j++) {
    if (bytes[at + j] !== pattern[j]) {
      return false;
    }
  }
  return true;
}

function skipTo(bytes, pattern, from) {
  for (let i = from; i + pattern.length <= bytes.length; i++) {
    if (startsWith(bytes, pattern, i)) {
      return i + pattern.length;
    }
  }
  throw new FormulaError('geen geldig XML-bestand');
}

const isNameEnd = (b) => b === GT || b === SLASH || b <= 0x20;

function nameEnd(bytes, i) {
  while (i < bytes.length && !isNameEnd(bytes[i])) {
    i++;
  }
  return i;
}

function tagEnd(bytes, i) {
  let quote = 0;
  for (; i < bytes.length; i++) {
    const b = bytes[i];
    if (quote) {
      if (b === quote) {
        quote = 0;
      }
    } else if (b === QUOTE || b === APOS) {
      quote = b;
    } else if (b === GT) {
      return i + 1;
    }
  }
  throw new FormulaError('geen geldig XML-bestand');
}

function doctypeEnd(bytes, i) {
  let quote = 0, depth = 0;
  for (; i < bytes.length; i++) {
    const b = bytes[i];
    if (quote) {
      if (b === quote) {
        quote = 0;
      }
    } else if (b === QUOTE || b === APOS) {
      quote = b;
    } else if (startsWith(bytes, COMMENT_START, i)) {
      i = skipTo(bytes, COMMENT_END, i) - 1;
    } else if (b === OPEN_BRACKET) {
      depth++;
    } else if (b === CLOSE_BRACKET) {
      depth--;
    } else if (b === GT && depth <= 0) {
      return i + 1;
    }
  }
  throw new FormulaError('geen geldig XML-bestand');
}

function isMathName(bytes, start, end) {
  let colon = start - 1;
  for (let i = start; i < end; i++) {
    if (bytes[i] === COLON) {
      colon = i;
    }
  }
  return end - (colon + 1) === MATH.length && startsWith(bytes, MATH, colon + 1);
}

export function findFormulas(bytes) {
  const formulas = [];
  let depth = 0, start = 0, i = 0;
  while ((i = bytes.indexOf(LT, i)) >= 0) {
    const next = bytes[i + 1];
    if (startsWith(bytes, COMMENT_START, i)) {
      i = skipTo(bytes, COMMENT_END, i + 4);
    } else if (startsWith(bytes, CDATA_START, i)) {
      i = skipTo(bytes, CDATA_END, i + 9);
    } else if (next === QUESTION) {
      i = skipTo(bytes, PI_END, i + 2);
    } else if (next === BANG) {
      i = doctypeEnd(bytes, i + 2);
    } else if (next === SLASH) {
      const n = nameEnd(bytes, i + 2);
      const isMath = isMathName(bytes, i + 2, n);
      i = tagEnd(bytes, n);
      if (isMath && depth > 0 && --depth === 0) {
        formulas.push({ start, end: i });
      }
    } else {
      const n = nameEnd(bytes, i + 1);
      const isMath = isMathName(bytes, i + 1, n);
      const tagStart = i;
      i = tagEnd(bytes, n);
      if (isMath) {
        if (depth === 0) {
          start = tagStart;
        }
        if (bytes[i - 2] !== SLASH) {
          depth++;
        } else if (depth === 0) {
          formulas.push({ start, end: i });
        }
      }
    }
  }
  if (depth !== 0) {
    throw new FormulaError('geen geldig XML-bestand');
  }
  return formulas;
}

export async function replaceFormulas(bytes, formulas, outputs, replacement, onFormula, signal) {
  const parts = Object.fromEntries(outputs.map((name) => [name, []]));
  let at = 0, lastYield = performance.now();
  for (let k = 0; k < formulas.length; k++) {
    if (signal.aborted) {
      throw abortError();
    }
    const f = formulas[k];
    const pieces = await replacement(bytes.subarray(f.start, f.end), k, f);
    for (const name of outputs) {
      parts[name].push(bytes.subarray(at, f.start), pieces[name]);
    }
    at = f.end;
    onFormula(k + 1);
    if (performance.now() - lastYield > 15) {
      await new Promise((resolve) => setTimeout(resolve, 0));
      lastYield = performance.now();
    }
  }
  return Object.fromEntries(outputs.map((name) => [name, joinBytes([...parts[name], bytes.subarray(at)])]));
}
