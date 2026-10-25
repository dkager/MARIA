// Part of MARIA (MathML Automatisch Renderen In ASCII)
import { charReference } from './encoding.js';
import { parseFormula } from './xml.js';

const MATHML = 'http://www.w3.org/1998/Math/MathML';
const LEFT_OUT = /^(?:id|style|on.*|href|src|tabindex|autofocus|nonce)$/i;

function entityReferences(name) {
  const decoder = document.createElement('textarea');
  decoder.innerHTML = `&${name};`;
  const text = decoder.value;
  return text === `&${name};` ? ' ' : [...text].map(charReference).join('');
}

function copyAsMathml(node) {
  if (node.nodeType === Node.TEXT_NODE || node.nodeType === Node.CDATA_SECTION_NODE) {
    return document.createTextNode(node.data);
  }
  if (node.nodeType !== Node.ELEMENT_NODE) {
    return null;
  }
  const element = document.createElementNS(MATHML, node.localName);
  for (const attribute of node.attributes) {
    if (attribute.namespaceURI === null && !LEFT_OUT.test(attribute.localName)) {
      element.setAttribute(attribute.localName, attribute.value);
    }
  }
  for (const child of node.childNodes) {
    const copy = copyAsMathml(child);
    if (copy) {
      element.append(copy);
    }
  }
  return element;
}

export function mathmlPreview(formula, declarations) {
  const math = copyAsMathml(parseFormula(formula, declarations, entityReferences));
  math.setAttribute('display', 'block');
  return math;
}
