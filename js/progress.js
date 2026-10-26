// Part of MARIA (MathML Automatisch Renderen In ASCII)
const INTERVAL = 250;

export class ProgressBar {
  constructor(element) {
    this.element = element;
    this.lastDraw = -Infinity;
    this.pending = null;
    this.timer = null;
  }

  activate() {
    this.element.removeAttribute('data-inactive');
  }

  reset() {
    this.set(0, 0);
  }

  set(done, total) {
    this.pending = { done, total };
    const wait = this.lastDraw + INTERVAL - performance.now();
    if (wait <= 0) {
      this.draw();
    } else if (this.timer === null) {
      this.timer = setTimeout(() => this.draw(), wait);
    }
  }

  draw() {
    clearTimeout(this.timer);
    this.timer = null;
    if (this.pending !== null) {
      const { done, total } = this.pending;
      const percent = total ? Math.round(Math.min(1, done / total) * 100) : 0;
      this.pending = null;
      this.lastDraw = performance.now();
      this.element.style.setProperty('--progress-value', `${percent}%`);
      this.element.setAttribute('aria-valuenow', String(percent));
      this.element.setAttribute('aria-valuetext', `${percent}%`);
      if (total) {
        this.element.dataset.tooltip = `${done}/${total} ${total === 1 ? 'formule' : 'formules'}`;
      } else {
        delete this.element.dataset.tooltip;
      }
    }
  }
}
