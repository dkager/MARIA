// Part of MARIA (MathML Automatisch Renderen In ASCII)
function isTyping(target) {
  if (target.isContentEditable || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
    return true;
  }
  return target.tagName === 'INPUT' && !['checkbox', 'radio', 'button', 'submit', 'reset', 'file'].includes(target.type);
}

export function setUpShortcuts() {
  document.addEventListener('keydown', (event) => {
    if (event.ctrlKey || event.altKey || event.metaKey || event.repeat || isTyping(event.target)
      || !/^[a-z]$/i.test(event.key) || document.querySelector('dialog[open]')) {
      return;
    }
    const control = document.querySelector(`[aria-keyshortcuts="${event.key.toUpperCase()}"]`);
    if (control && !control.disabled) {
      event.preventDefault();
      control.click();
    }
  });
}
