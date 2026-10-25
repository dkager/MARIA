// Part of MARIA (MathML Automatisch Renderen In ASCII)
import { encodeForFile } from './encoding.js';

function escapeText(text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function codePiece(dedicon, encoding) {
  return encodeForFile(`<code class="maria-math">${escapeText(dedicon)}</code>`, encoding);
}

export function markupPiece(markup, encoding, newline) {
  return encodeForFile(markup.replace(/\r\n?/g, '\n').replaceAll('\n', newline), encoding);
}

export function todoPiece(message, mathml, encoding, newline) {
  const safe = (text) => text.replace(/-(?=-)/g, '- ');
  return markupPiece(`<!-- To do: ${safe(message)}\n${safe(mathml)}\n-->`, encoding, newline);
}
