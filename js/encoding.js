// Part of MARIA (MathML Automatisch Renderen In ASCII)
import { FormulaError } from './errors.js';

export const LT = 0x3c, GT = 0x3e, NEWLINE = 0x0a;
const RETURN = 0x0d;

export function ascii(text) {
  return Uint8Array.from(text, (c) => c.charCodeAt(0));
}

export function joinBytes(parts) {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.length;
  }
  return out;
}

export function charReference(c) {
  return `&#x${c.codePointAt(0).toString(16).toUpperCase()};`;
}

export function checkEncoding(bytes) {
  const utf16 = (bytes[0] === 0xfe && bytes[1] === 0xff) || (bytes[0] === 0xff && bytes[1] === 0xfe) ||
    (bytes[0] === 0x00 && bytes[1] === LT) || (bytes[0] === LT && bytes[1] === 0x00);
  if (utf16) {
    throw new FormulaError('UTF-16 wordt nog niet ondersteund');
  }
  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    return 'utf-8';
  }
  const start = String.fromCharCode(...bytes.subarray(0, 200));
  const declared = /^<\?xml[^>]*\sencoding\s*=\s*["']([A-Za-z0-9._-]+)["']/.exec(start)?.[1].toLowerCase() ?? 'utf-8';
  try {
    new TextDecoder(declared);
  } catch {
    throw new FormulaError(`de codering ${declared} wordt niet ondersteund`);
  }
  return declared;
}

export function newlineOf(bytes) {
  const i = bytes.indexOf(NEWLINE);
  return i > 0 && bytes[i - 1] === RETURN ? '\r\n' : '\n';
}

export function encodeForFile(text, encoding) {
  if (encoding === 'utf-8' || encoding === 'utf8') {
    return new TextEncoder().encode(text);
  }
  return ascii(text.replace(/[^\x00-\x7f]/gu, charReference));
}
