// Part of MARIA (MathML Automatisch Renderen In ASCII)
const TOKENS = new Set(['mi', 'mn', 'mo', 'mtext', 'ms']);
const EDGE_SPACE = /^[ \t\r\n]+|[ \t\r\n]+$/g;
const NO_BREAK_SPACE = '\u00a0';

let loaded = null;

async function readJson(url) {
  const response = await fetch(url, { cache: 'no-cache' });
  if (!response.ok) {
    throw new Error(`${url}: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

export function loadHeuristics() {
  loaded ??= Promise.all([readJson('heuristics.json'), readJson('mathcat/unchanged-characters.json')]).then(
    ([limits, unchanged]) => ({ ...limits, usual: new Set([...limits.ignoredCharacters, ...unchanged.characters]) }),
  );
  loaded.catch(() => { loaded = null; });
  return loaded;
}

function tokenTexts(elements) {
  return elements.filter((e) => TOKENS.has(e.localName)).map((e) => e.textContent);
}

function depthOf(element) {
  let deepest = 0;
  for (const child of element.children) {
    deepest = Math.max(deepest, depthOf(child));
  }
  return deepest + 1;
}

function doubleBracketCount(text) {
  const open = [], pairs = new Map();
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '(') {
      open.push(i);
    } else if (text[i] === ')' && open.length) {
      pairs.set(open.pop(), i);
    }
  }
  let count = 0;
  for (const [start, end] of pairs) {
    if (pairs.get(start + 1) === end - 1) {
      count++;
    }
  }
  return count;
}

function longFormula({ elements }, limits) {
  const count = elements.length + 1;
  return count > limits.maxElements ? `lange formule (${count} elementen, meer dan ${limits.maxElements})` : null;
}

function deepFormula({ math }, limits) {
  const depth = depthOf(math);
  return depth > limits.maxDepth ? `diep genest (${depth} niveaus, meer dan ${limits.maxDepth})` : null;
}

function unusualCharacters({ elements }, limits) {
  const unusual = new Set();
  for (const text of tokenTexts(elements)) {
    for (const c of text) {
      if (c.codePointAt(0) > 127 && !limits.usual.has(c)) {
        unusual.add(c);
      }
    }
  }
  return unusual.size ? `ongebruikelijk teken: ${[...unusual].join(' ')}` : null;
}

function doubleBrackets({ linear }) {
  const count = doubleBracketCount(linear);
  return count ? `overbodige haakjes in de lineaire notatie (${count}× ((…)))` : null;
}

function longLinear({ linear }, limits) {
  return linear.length > limits.maxLinearLength
    ? `lange lineaire notatie (${linear.length} tekens, meer dan ${limits.maxLinearLength})` : null;
}

function textInFormula({ elements }, limits) {
  const words = Math.max(0, ...elements.filter((e) => e.localName === 'mtext')
    .map((e) => e.textContent.trim().split(/\s+/).filter(Boolean).length));
  return words >= limits.minTextWords ? `tekst in de formule (${words} woorden in <mtext>)` : null;
}

function table({ elements }) {
  return elements.some((e) => e.localName === 'mtable') ? 'tabel (<mtable>)' : null;
}

function emptyElement({ elements }) {
  const empty = elements.find((e) => (TOKENS.has(e.localName) || e.localName === 'mrow')
    && e.children.length === 0 && e.textContent.trim() === '');
  return empty ? `leeg element (<${empty.localName}>)` : null;
}

const CHECKS = [longFormula, deepFormula, unusualCharacters, doubleBrackets, longLinear, textInFormula, table, emptyElement];

export function heuristicFindings(math, linear, limits) {
  const formula = { math, linear, elements: [...math.getElementsByTagName('*')] };
  return CHECKS.map((check) => check(formula, limits)).filter(Boolean);
}

export function misusesNoBreakSpace(math) {
  return tokenTexts([...math.getElementsByTagName('*')]).some((text) => {
    const t = text.replace(EDGE_SPACE, '');
    return t.startsWith(NO_BREAK_SPACE) || t.endsWith(NO_BREAK_SPACE);
  });
}
