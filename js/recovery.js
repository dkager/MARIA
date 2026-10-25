// Part of MARIA (MathML Automatisch Renderen In ASCII)
import { showContext } from './context-panel.js';
import { updatePreview, updatePreviewLater } from './preview-panel.js';
import { rescueField, showRescue } from './rescue-panel.js';
import { showMessage } from './status.js';

const skip = document.getElementById('skip');
const ok = document.getElementById('submit');

let paused = null;

export function refreshPreview(force = false) {
  updatePreview(paused, rescueField.value, force);
}

function showPause(newFormula = false) {
  showRescue(paused, newFormula);
  if (newFormula || !paused) {
    showContext(paused?.context, paused?.kind);
    refreshPreview(true);
  }
}

export function startPause(pause) {
  paused = pause;
  const lostFocus = !document.activeElement || document.activeElement === document.body;
  showMessage(pause.message, pause.kind);
  showPause(true);
  if (lostFocus) {
    rescueField.focus();
  }
}

export function endPause() {
  paused = null;
  showPause();
}

function pausedFormula() {
  if (!paused) {
    throw new Error('de conversie is niet gepauzeerd');
  }
  return paused;
}

window.MARIA = Object.freeze({
  get paused() {
    return paused && {
      number: paused.number, line: paused.line, page: paused.page, message: paused.message, kind: paused.kind,
      mathml: paused.mathml,
    };
  },
  async retry(mathml) {
    const pause = pausedFormula();
    const attempt = pause.retry(mathml);
    showPause();
    try {
      const failure = await attempt;
      if (paused === pause) {
        if (failure === null) {
          paused = null;
          showMessage(null);
        } else {
          showMessage(failure);
          if (rescueField.value === mathml) {
            refreshPreview(true);
          }
        }
      }
      return failure;
    } finally {
      if (paused === pause || paused === null) {
        showPause();
      }
    }
  },
  skip() {
    const pause = pausedFormula();
    pause.skip();
    if (paused === pause) {
      paused = null;
      showMessage(null);
      showPause();
    }
  },
});

rescueField.addEventListener('input', () => updatePreviewLater(refreshPreview));
rescueField.addEventListener('blur', () => refreshPreview());
rescueField.addEventListener('mouseleave', () => refreshPreview());

ok.addEventListener('click', async () => {
  if (!paused || paused.busy) {
    return;
  }
  try {
    await window.MARIA.retry(rescueField.value);
  } catch (e) {
    if (e.name !== 'AbortError') {
      showMessage(e.message);
    }
  }
});

skip.addEventListener('click', () => {
  if (paused && !paused.busy) {
    window.MARIA.skip();
  }
});
