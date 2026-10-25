// Part of MARIA (MathML Automatisch Renderen In ASCII)
import { mathmlPreview } from './preview.js';
import { readable, shownMessage } from './status.js';

const DELAY = 1000;

const panel = document.getElementById('preview');
const mathmlField = document.getElementById('preview-mathml');
const linearField = document.getElementById('preview-linear');

let shownText = null;
let run = 0;
let timer = 0;

function message(text, reason = null) {
  const element = document.createElement('p');
  element.className = 'message';
  element.textContent = text;
  if (reason && readable(reason) !== shownMessage()) {
    element.append(document.createElement('br'), readable(reason));
  }
  return element;
}

function enable(field, on) {
  field.setAttribute('aria-disabled', String(!on));
  field.tabIndex = on ? 0 : -1;
}

function clearPreview() {
  shownText = null;
  run++;
  mathmlField.replaceChildren();
  linearField.replaceChildren();
  enable(mathmlField, false);
  enable(linearField, false);
}

function showMathml(text, declarations) {
  try {
    mathmlField.replaceChildren(mathmlPreview(text, declarations));
  } catch (e) {
    mathmlField.replaceChildren(message('Kan niet worden getoond', e.message));
  }
}

function showLinear(pause, text) {
  const thisRun = run;
  const show = (dedicon, reason) => {
    if (thisRun === run) {
      linearField.replaceChildren(dedicon === null ? message('Niet beschikbaar', reason)
        : dedicon.trim() === '' ? message('(leeg)') : dedicon);
    }
  };
  if (text === pause.mathml.replace(/\r\n?/g, '\n')) {
    show(pause.dedicon, pause.message);
  } else {
    linearField.replaceChildren(message('Bezig…'));
    pause.toLinear(text).then(
      (done) => show(done.dedicon),
      (e) => show(null, e.name === 'AbortError' ? null : e.message),
    );
  }
}

export function showPreviewPanel(visible) {
  panel.hidden = !visible;
}

export function updatePreviewLater(update) {
  clearTimeout(timer);
  timer = setTimeout(update, DELAY);
}

export function updatePreview(pause, text, force = false) {
  clearTimeout(timer);
  if (!pause || panel.hidden) {
    clearPreview();
    return;
  }
  if (text === shownText && !force) {
    return;
  }
  shownText = text;
  run++;
  enable(mathmlField, true);
  enable(linearField, true);
  showMathml(text, pause.declarations);
  showLinear(pause, text);
}
