// Part of MARIA (MathML Automatisch Renderen In ASCII)
import { abortError } from './errors.js';

const TIMEOUT_SECONDS = 15;

export class MathCATUnavailable extends Error {}

let worker = null;
let nextId = 1;
const waiting = new Map();

function failAll(error) {
  for (const { reject, timer } of waiting.values()) {
    clearTimeout(timer);
    reject(error);
  }
  waiting.clear();
}

function getWorker() {
  if (!worker) {
    worker = new Worker(new URL('./mathcat-worker.js', import.meta.url), { type: 'module' });
    worker.addEventListener('message', ({ data: { id, ok, text, message, unavailable, crashed } }) => {
      const job = waiting.get(id);
      if (job) {
        waiting.delete(id);
        clearTimeout(job.timer);
        if (ok) {
          job.resolve(text);
        } else {
          job.reject(crashed ? new Error('MathCAT is vastgelopen op deze formule')
            : new (unavailable ? MathCATUnavailable : Error)(message));
        }
      }
      if (crashed) {
        restartMathCAT();
      }
    });
    worker.addEventListener('error', (event) => {
      event.preventDefault();
      stopMathCAT(new MathCATUnavailable(`MathCAT kon niet worden gestart (${event.message || 'onbekende fout'})`));
    });
  }
  return worker;
}

export function stopMathCAT(error = abortError()) {
  worker?.terminate();
  worker = null;
  failAll(error);
}

function send(id, job) {
  clearTimeout(job.timer);
  job.timer = setTimeout(() => {
    waiting.delete(id);
    job.reject(new Error(job.timeoutMessage));
    restartMathCAT();
  }, TIMEOUT_SECONDS * 1000);
  getWorker().postMessage({ id, ...job.message });
}

function restartMathCAT() {
  worker?.terminate();
  worker = null;
  for (const [id, job] of waiting) {
    send(id, job);
  }
}

function ask(message, timeoutMessage) {
  const id = nextId++;
  return new Promise((resolve, reject) => {
    const job = { resolve, reject, message, timeoutMessage, timer: 0 };
    waiting.set(id, job);
    send(id, job);
  });
}

export function toDedicon(mathml) {
  return ask({ mathml }, `MathCAT is na ${TIMEOUT_SECONDS} seconden gestopt met deze formule`);
}

export function mathcatVersion() {
  return ask({ version: true }, `MathCAT was na ${TIMEOUT_SECONDS} seconden nog niet geladen`);
}
