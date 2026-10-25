// Part of MARIA (MathML Automatisch Renderen In ASCII)
const INTERVAL = 250;

export class ProgressBar {
  constructor(element) {
    this.element = element;
    this.lastDraw = -Infinity;
    this.pending = null;
    this.timer = null;
  }

  setEnabled(enabled) {
    this.element.setAttribute('aria-disabled', String(!enabled));
  }

  reset() {
    this.set(0);
  }

  set(fraction) {
    this.pending = Math.min(1, Math.max(0, fraction));
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
      const percent = Math.round(this.pending * 100);
      this.pending = null;
      this.lastDraw = performance.now();
      this.element.style.setProperty('--progress-value', `${percent}%`);
      this.element.setAttribute('aria-valuenow', String(percent));
      this.element.setAttribute('aria-valuetext', `${percent}%`);
    }
  }
}
