// Part of MARIA (MathML Automatisch Renderen In ASCII)
import { checkEncoding, newlineOf } from './encoding.js';
import { FormulaError, ZipError } from './errors.js';
import { findFormulas } from './scanner.js';
import { formulaPages, hasFormulaInDoctype, namespaceDeclarations, rootElementName } from './xml.js';
import { isZip, readZip, unzipEntry, zipFiles } from './zip.js';

const MAX_XML_BYTES = 100_000_000;
const ROOT_SEARCH_BYTES = 16_384;

function readSource(bytes) {
  const encoding = checkEncoding(bytes);
  const formulas = findFormulas(bytes);
  let text;
  try {
    text = new TextDecoder(encoding, { fatal: true }).decode(bytes);
  } catch {
    throw new FormulaError(`het bevat bytes die geen geldige ${encoding} zijn`);
  }
  const pages = formulaPages(text);
  if (pages.length !== formulas.length) {
    throw new FormulaError('de formules konden niet betrouwbaar worden gevonden');
  }
  return {
    bytes, formulas, pages, encoding, newline: newlineOf(bytes), declarations: namespaceDeclarations(text),
    formulaInDoctype: hasFormulaInDoctype(text),
  };
}

function isHidden(name) {
  return name.split(/[\\/]/).some((part) => part === '__MACOSX' || part.startsWith('.'));
}

function isPublication(bytes) {
  return rootElementName(new TextDecoder().decode(bytes.subarray(0, ROOT_SEARCH_BYTES))) === 'dtbook';
}

async function findPublication(entries) {
  const publications = [];
  for (const entry of entries) {
    if (/\.xml$/i.test(entry.name) && !isHidden(entry.name)
      && isPublication(await unzipEntry(entry, MAX_XML_BYTES, ROOT_SEARCH_BYTES))) {
      publications.push(entry);
    }
  }
  if (publications.length !== 1) {
    throw new ZipError(publications.length === 0 ? 'er staat geen DTBook-bestand in'
      : `er staan ${publications.length} DTBook-bestanden in; er mag er maar één in staan`);
  }
  return publications[0];
}

export async function openPublication(file) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!isZip(bytes)) {
    checkEncoding(bytes);
    if (!isPublication(bytes)) {
      throw new FormulaError('het is geen DTBook-bestand');
    }
    return { name: file.name, entries: null, ...readSource(bytes) };
  }
  const entries = readZip(bytes);
  const entry = await findPublication(entries);
  return { name: entry.name, entries, entry, ...readSource(await unzipEntry(entry, MAX_XML_BYTES)) };
}

export function zipName(name) {
  return `${name.replace(/\.(xml|zip)$/i, '')}_maria.zip`;
}

export function zipPublication(publication, linear, corrected) {
  const base = publication.name.replace(/\.xml$/i, '');
  const added = [{ name: `${base}_lineair.xml`, bytes: linear }, { name: `${base}_gecorrigeerd.xml`, bytes: corrected }];
  if (!publication.entries) {
    return zipFiles([{ name: publication.name, bytes: publication.bytes }, ...added]);
  }
  const replaced = new Set(added.map((f) => f.name.toLowerCase()));
  return zipFiles(publication.entries.filter((e) => !replaced.has(e.name.toLowerCase()))
    .flatMap((e) => (e === publication.entry ? [e, ...added] : [e])));
}
