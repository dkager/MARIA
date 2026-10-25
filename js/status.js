// Part of MARIA (MathML Automatisch Renderen In ASCII)
import { mathcatVersion } from './mathcat.js';
import { MARIA_VERSION } from './version.js';

const fileName = document.getElementById('file-name');
const formulaCount = document.getElementById('formula-count');
const message = document.getElementById('error');
const versionText = document.getElementById('mathcat-version');

export function readable(text) {
  return text.replace(/[\p{Cc}\p{Cf}]/gu,
    (c) => (/[\t\n\r]/.test(c) ? ' ' : `[U+${c.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')}]`));
}

export function showStatus(name, count) {
  fileName.textContent = name ? readable(name) : 'Geen bestand';
  formulaCount.textContent = count ?? '';
  formulaCount.hidden = count === undefined;
}

export function showMessage(text, kind = 'error') {
  message.textContent = text ? readable(text) : '';
  message.dataset.kind = text ? kind : '';
}

export function shownMessage() {
  return message.textContent;
}

export function showVersion() {
  versionText.textContent = `MARIA ${MARIA_VERSION}`;
  mathcatVersion().then(
    (v) => { versionText.textContent = `MARIA ${MARIA_VERSION} · MathCAT ${v}`; },
    (e) => {
      if (e.name === 'AbortError') {
        showVersion();
      } else {
        versionText.textContent = `MARIA ${MARIA_VERSION} · MathCAT niet geladen`;
        versionText.title = e.message;
      }
    },
  );
}
