// Part of MARIA (MathML Automatisch Renderen In ASCII)
const panel = document.getElementById('context-panel');
const field = document.getElementById('context');

function center() {
  const mark = field.querySelector('mark');
  if (mark) {
    const box = field.getBoundingClientRect(), place = mark.getBoundingClientRect();
    field.scrollTop += (place.top + place.height / 2) - (box.top + box.height / 2);
  }
}

new ResizeObserver(center).observe(field);

export function showContextPanel(visible) {
  panel.hidden = !visible;
}

export function showContext(around, kind) {
  if (around) {
    const mark = document.createElement('mark');
    mark.textContent = kind === 'warning' ? '[Heuristiek in MathML]' : '[Fout in MathML]';
    field.replaceChildren(around.before, mark, around.after);
  } else {
    field.replaceChildren();
  }
  field.setAttribute('aria-disabled', String(!around));
  field.tabIndex = around ? 0 : -1;
  center();
}
