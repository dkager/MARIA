// Part of MARIA (MathML Automatisch Renderen In ASCII)
const browse = document.getElementById('browse');
const fileInput = document.getElementById('file');

export function setUpFilePicker(onFile) {
  browse.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', () => {
    const file = fileInput.files[0];
    fileInput.value = '';
    if (file) {
      onFile(file);
    }
  });
  document.addEventListener('dragover', (event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = event.dataTransfer.types.includes('Files') ? 'copy' : 'none';
  });
  document.addEventListener('drop', (event) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file) {
      onFile(file);
    }
  });
}
