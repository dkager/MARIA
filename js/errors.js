// Part of MARIA (MathML Automatisch Renderen In ASCII)
export class FormulaError extends Error {}

export class ZipError extends Error {}

export function abortError() {
  return new DOMException('afgebroken', 'AbortError');
}
