// Part of MARIA (MathML Automatisch Renderen In ASCII)
const shortcuts = new Map([
  ['d', 'dark-mode'],
  ['b', 'browse'],
  ['x', 'convert'],
  ['r', 'result'],
  ['o', 'submit'],
  ['s', 'skip'],
  ['c', 'context-on'],
  ['p', 'preview-on'],
  ['h', 'heuristic-on'],
]);

function isTyping(target) {
  if (target.isContentEditable || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
    return true;
  }
  return target.tagName === 'INPUT' && !['checkbox', 'radio', 'button', 'submit', 'reset', 'file'].includes(target.type);
}

export function setUpShortcuts() {
  for (const [key, id] of shortcuts) {
    document.getElementById(id).setAttribute('aria-keyshortcuts', key.toUpperCase());
  }
  document.addEventListener('keydown', (event) => {
    if (event.ctrlKey || event.altKey || event.metaKey || event.repeat || isTyping(event.target)) {
      return;
    }
    const id = shortcuts.get(event.key.toLowerCase());
    const control = id && document.getElementById(id);
    if (control && !control.disabled) {
      event.preventDefault();
      control.click();
    }
  });
}
