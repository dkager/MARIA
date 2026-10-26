// Part of MARIA (MathML Automatisch Renderen In ASCII)
import { mathmlPreview } from './preview.js';
import { readable, shownMessage } from './status.js';

const panel = document.getElementById('preview');
const mathmlField = document.getElementById('preview-mathml');
const linearField = document.getElementById('preview-linear');

let shown = null;
let shownState = null;

function message(text, reason = null) {
  const element = document.createElement('p');
  element.className = 'message';
  element.textContent = text;
  if (reason && readable(reason) !== shownMessage()) {
    element.append(document.createElement('br'), readable(reason));
  }
  return element;
}

function showMathml(checked) {
  try {
    mathmlField.replaceChildren(mathmlPreview(checked.text, checked.pause.declarations));
  } catch (e) {
    mathmlField.replaceChildren(message('Kan niet worden getoond', e.message));
  }
}

export function showPreviewPanel(visible) {
  panel.hidden = !visible;
}

export function showPreview(checked, force = false) {
  if (!checked || panel.hidden) {
    shown = null;
    mathmlField.replaceChildren();
    linearField.replaceChildren();
    return;
  }
  if (!force && checked === shown && checked.state === shownState) {
    return;
  }
  shown = checked;
  shownState = checked.state;
  if (checked.state === 'pending') {
    mathmlField.replaceChildren(message('Bezig…'));
    linearField.replaceChildren(message('Bezig…'));
  } else if (checked.state === 'ok') {
    showMathml(checked);
    linearField.replaceChildren(checked.dedicon.trim() === '' ? message('(leeg)') : checked.dedicon);
  } else {
    mathmlField.replaceChildren(message('Niet beschikbaar'));
    linearField.replaceChildren(message('Niet beschikbaar', checked.reason));
  }
}
