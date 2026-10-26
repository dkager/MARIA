// Part of MARIA (MathML Automatisch Renderen In ASCII)
const NO_ERROR = '<!-- Geen fout -->';

const title = document.getElementById('rescue-title');
const skip = document.getElementById('skip');

export const rescueField = document.getElementById('rescue-mathml');

export function showRescue(pause, newFormula = false) {
  title.textContent = pause ? `Herstel: regel ${pause.line}; pagina ${pause.page ?? '?'}` : 'Herstel: geen fout';
  if (newFormula || !pause) {
    rescueField.value = pause ? pause.mathml : NO_ERROR;
  }
  rescueField.disabled = !pause;
  rescueField.readOnly = Boolean(pause?.busy);
  skip.disabled = !pause;
}
