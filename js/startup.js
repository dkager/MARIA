// Part of MARIA (MathML Automatisch Renderen In ASCII)
document.addEventListener('DOMContentLoaded', () => {
  if (location.protocol === 'file:') {
    const message = document.getElementById('error');
    message.textContent = 'MARIA werkt niet als je index.html dubbelklikt. Start een webserver in de hoofdmap ' +
      '(bijvoorbeeld: py -m http.server 8123) en open http://localhost:8123.';
    message.dataset.kind = 'error';
  }
});
