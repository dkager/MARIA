// Part of MARIA (MathML Automatisch Renderen In ASCII)
import { FormulaError } from './errors.js';

const NAMED_ENTITY = /&(?!(?:amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);)[A-Za-z][\w.-]*;/g;
const PARSER_ERROR_NAMESPACES = ['http://www.w3.org/1999/xhtml', 'http://www.mozilla.org/newlayout/xml/parsererror.xml'];

function parserError(doc) {
  return PARSER_ERROR_NAMESPACES.map((ns) => doc.getElementsByTagNameNS(ns, 'parsererror')[0]).find(Boolean);
}

function parserMessage(error) {
  const message = /at column \d+: ([^\n]*)/.exec(error.textContent)?.[1]
    ?? error.textContent.split('\n').find((l) => l.trim())?.trim() ?? '';
  return message.replace(/Below is a rendering.*$/, '').replaceAll('maria-check', 'einde van de formule').trim();
}

function nextOutside(walker) {
  for (;;) {
    const sibling = walker.nextSibling();
    if (sibling) {
      return sibling;
    }
    if (!walker.parentNode()) {
      return null;
    }
  }
}

export function formulaPages(text) {
  const doc = new DOMParser().parseFromString(text.replace(NAMED_ENTITY, ' '), 'application/xml');
  if (parserError(doc)) {
    throw new FormulaError('geen geldig XML-bestand');
  }
  const pages = [];
  let page = null;
  const walker = doc.createTreeWalker(doc.documentElement, NodeFilter.SHOW_ELEMENT);
  let element = walker.currentNode;
  while (element) {
    if (element.localName === 'math') {
      pages.push(page);
      element = nextOutside(walker);
    } else {
      if (element.localName === 'pagenum') {
        page = element.textContent.replace(/\s+/g, ' ').trim() || null;
      }
      element = walker.nextNode();
    }
  }
  return pages;
}

export function namespaceDeclarations(text) {
  const declarations = new Map();
  for (const m of text.matchAll(/\sxmlns:([\w.-]+)\s*=\s*("[^"]*"|'[^']*')/g)) {
    if (!declarations.has(m[1])) {
      declarations.set(m[1], `xmlns:${m[1]}=${m[2]}`);
    }
  }
  return [...declarations.values()].join(' ');
}

export function parseFormula(formula, declarations, entity = () => ' ') {
  const text = `<maria-check ${declarations}>${formula.replace(NAMED_ENTITY, (e) => entity(e.slice(1, -1)))}</maria-check>`;
  const doc = new DOMParser().parseFromString(text, 'application/xml');
  const error = parserError(doc);
  if (error) {
    throw new FormulaError(`geen geldige XML (${parserMessage(error)})`);
  }
  const root = doc.documentElement;
  const hasText = [...root.childNodes].some((n) => n.nodeType !== Node.ELEMENT_NODE
    && n.nodeType !== Node.COMMENT_NODE && n.textContent.trim() !== '');
  if (root.children.length !== 1 || root.firstElementChild.localName !== 'math' || hasText) {
    throw new FormulaError('de formule moet precies één <math>-element zijn');
  }
  return root.firstElementChild;
}

function doctypeEnd(text, i) {
  let inSubset = false;
  for (; i < text.length; i++) {
    if (text[i] === '[' || text[i] === ']') {
      inSubset = text[i] === '[';
    } else if (text[i] === '>' && !inSubset) {
      return i + 1;
    }
  }
  return -1;
}

function after(text, mark, i) {
  const at = text.indexOf(mark, i);
  return at < 0 ? -1 : at + mark.length;
}

export function rootElementName(text) {
  const tag = /<(?:[\w.-]+:)?([\w.-]+)[\s/>]/y;
  let i = text.startsWith('\uFEFF') ? 1 : 0;
  while (i >= 0 && i < text.length) {
    if (/\s/.test(text[i])) {
      i++;
    } else if (text.startsWith('<?', i)) {
      i = after(text, '?>', i);
    } else if (text.startsWith('<!--', i)) {
      i = after(text, '-->', i);
    } else if (text.startsWith('<!DOCTYPE', i)) {
      i = doctypeEnd(text, i);
    } else {
      tag.lastIndex = i;
      return tag.exec(text)?.[1] ?? null;
    }
  }
  return null;
}

export function hasFormulaInDoctype(text) {
  const subset = /<!DOCTYPE[^[>]*\[([\s\S]*?)\]\s*>/.exec(text)?.[1] ?? '';
  return /<([\w.-]+:)?math[\s>/]/.test(subset);
}
