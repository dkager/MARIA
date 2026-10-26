// Part of MARIA (MathML Automatisch Renderen In ASCII)
import { afterConfirm } from './confirm.js';
import { showContext } from './context-panel.js';
import { showPreview } from './preview-panel.js';
import { rescueField, showRescue } from './rescue-panel.js';
import { showMessage } from './status.js';

const DELAY = 1000;

const skip = document.getElementById('skip');
const ok = document.getElementById('submit');

let paused = null;
let checked = null;
let timer = 0;

function updateOk() {
  ok.disabled = !paused
    || (checked?.pause === paused && checked.text === rescueField.value && checked.state === 'error');
}

function settle(result, state, dedicon = null, reason = null) {
  Object.assign(result, { state, dedicon, reason });
  if (checked === result) {
    updateOk();
    showPreview(checked);
  }
}

function checkText(force = false) {
  clearTimeout(timer);
  const pause = paused;
  const text = rescueField.value;
  if (!force && pause && checked?.pause === pause && checked.text === text) {
    return;
  }
  checked = pause && { pause, text, state: 'pending' };
  updateOk();
  showPreview(checked);
  if (!pause) {
    return;
  }
  const result = checked;
  if (text === pause.mathml.replace(/\r\n?/g, '\n')) {
    if (pause.dedicon !== null) {
      settle(result, 'ok', pause.dedicon);
    } else {
      settle(result, pause.certain ? 'error' : 'unknown', null, pause.message);
    }
    return;
  }
  pause.toLinear(text).then(
    (done) => settle(result, 'ok', done.dedicon),
    (e) => {
      if (e.name !== 'AbortError') {
        settle(result, e.certain ? 'error' : 'unknown', null, e.message);
      }
    },
  );
}

export function refreshPreview() {
  showPreview(checked, true);
}

function showPause(newFormula = false) {
  showRescue(paused, newFormula);
  if (newFormula || !paused) {
    showContext(paused?.context, paused?.kind);
    checkText(true);
  } else {
    updateOk();
  }
}

export function startPause(pause) {
  paused = pause;
  showMessage(pause.message, pause.kind);
  showPause(true);
  afterConfirm(() => {
    if (paused === pause) {
      rescueField.setSelectionRange(0, 0);
      rescueField.focus();
    }
  });
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
          checkText(true);
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

rescueField.addEventListener('input', () => {
  updateOk();
  clearTimeout(timer);
  timer = setTimeout(checkText, DELAY);
});
rescueField.addEventListener('blur', () => checkText());
rescueField.addEventListener('mouseleave', () => checkText());

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
