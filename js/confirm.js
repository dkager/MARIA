// Part of MARIA (MathML Automatisch Renderen In ASCII)
const dialog = document.getElementById('confirm');

let applies = () => true;

document.getElementById('confirm-yes').addEventListener('click', () => dialog.close('ja'));
document.getElementById('confirm-no').addEventListener('click', () => dialog.close('nee'));

export function confirmLoss(stillApplies) {
  if (dialog.open) {
    return Promise.resolve(false);
  }
  applies = stillApplies;
  dialog.returnValue = '';
  dialog.showModal();
  return new Promise((resolve) => {
    dialog.addEventListener('close', () => resolve(dialog.returnValue === 'ja'), { once: true });
  });
}

export function recheckConfirm() {
  if (dialog.open && !applies()) {
    dialog.close('ja');
  }
}

export function afterConfirm(action) {
  if (dialog.open) {
    dialog.addEventListener('close', () => setTimeout(action), { once: true });
  } else {
    action();
  }
}
