// Part of MARIA (MathML Automatisch Renderen In ASCII)
import { showContextPanel } from './context-panel.js';
import { convertPublication } from './conversion.js';
import { FormulaError, ZipError } from './errors.js';
import { setUpFilePicker } from './file-picker.js';
import { loadHeuristics } from './heuristics.js';
import { stopMathCAT } from './mathcat.js';
import { showPreviewPanel } from './preview-panel.js';
import { ProgressBar } from './progress.js';
import { openPublication, zipName, zipPublication } from './publication.js';
import { endPause, refreshPreview, startPause } from './recovery.js';
import { rememberSwitch } from './settings.js';
import { setUpShortcuts } from './shortcuts.js';
import { showMessage, showStatus, showVersion } from './status.js';
import { formulasText, summaryText } from './summary.js';

const replaceMfenced = document.getElementById('replace-mfenced');
const contextOn = document.getElementById('context-on');
const previewOn = document.getElementById('preview-on');
const heuristicOn = document.getElementById('heuristic-on');
const convert = document.getElementById('convert');
const result = document.getElementById('result');
const progress = new ProgressBar(document.getElementById('progress'));

let publication = null;
let output = null;
let conversion = null;
let opening = null;

function showRunning(running) {
  convert.textContent = running ? 'Stop' : 'Converteer';
  convert.disabled = !running && (publication === null || publication.formulas.length === 0);
  replaceMfenced.disabled = running;
  heuristicOn.disabled = running;
}

function stopConversion() {
  const stopped = conversion;
  if (stopped) {
    stopped.controller.abort();
    conversion = null;
    endPause();
    stopMathCAT();
    showRunning(false);
  }
  return stopped;
}

function setResult(zip) {
  output = zip;
  result.disabled = zip === null;
}

function dropResult() {
  if (output) {
    setResult(null);
    progress.reset();
    showMessage(null);
  }
}

async function chooseFile(file) {
  const current = (opening = {});
  stopConversion();
  setResult(null);
  publication = null;
  convert.disabled = true;
  progress.setEnabled(true);
  progress.reset();
  showMessage(null);
  showStatus(file.name, 'Bezig met tellen…');
  try {
    const opened = await openPublication(file);
    if (opening !== current) {
      return;
    }
    publication = { file, ...opened };
    convert.disabled = publication.formulas.length === 0;
    showStatus(publication.entries ? `${file.name} › ${publication.name}` : file.name, formulasText(publication.formulas.length));
    if (publication.formulaInDoctype) {
      showMessage('De DOCTYPE bevat een formule in een entiteit; die wordt niet geconverteerd.', 'warning');
    }
  } catch (e) {
    if (opening !== current) {
      return;
    }
    showStatus(file.name);
    if (e instanceof ZipError) {
      showMessage(`Deze zip kan niet worden gebruikt: ${e.message}.`);
    } else if (e instanceof FormulaError) {
      showMessage(`Dit bestand kan niet worden gebruikt: ${e.message}.`);
    } else {
      showMessage('Het bestand kon niet worden gelezen.');
    }
  }
}

function stopByUser() {
  const stopped = stopConversion();
  showMessage(stopped.done === 0 ? 'Gestopt voordat de eerste formule klaar was.'
    : `Gestopt na formule ${stopped.done} van ${stopped.total}.`, 'warning');
}

async function startConversion() {
  setResult(null);
  showMessage(null);
  progress.reset();
  const chosen = publication;
  const controller = new AbortController();
  const current = (conversion = { controller, done: 0, total: chosen.formulas.length });
  const settings = { withEmptySeparators: replaceMfenced.checked, limits: null };
  showRunning(true);
  if (heuristicOn.checked) {
    try {
      settings.limits = await loadHeuristics();
    } catch (e) {
      if (conversion === current) {
        conversion = null;
        showRunning(false);
        showMessage(`Heuristiek kan niet worden gebruikt: ${e.message}`);
      }
      return;
    }
    if (controller.signal.aborted) {
      return;
    }
  }
  try {
    const converted = await convertPublication(chosen, settings, {
      signal: controller.signal,
      onProgress: (done) => {
        current.done = done;
        progress.set(done / current.total);
      },
      onPause: startPause,
    });
    const zip = await zipPublication(chosen, converted.linear, converted.corrected);
    if (controller.signal.aborted) {
      return;
    }
    progress.set(1);
    setResult(zip);
    const summary = summaryText(converted);
    if (summary) {
      showMessage(summary, 'warning');
    }
  } catch (e) {
    if (e.name === 'AbortError') {
      return;
    }
    showMessage(`De conversie is gestopt bij een fout: ${e.message}`);
  } finally {
    if (conversion === current) {
      conversion = null;
      showRunning(false);
    }
  }
}

function download() {
  const url = URL.createObjectURL(output);
  const link = document.createElement('a');
  link.href = url;
  link.download = zipName(publication.file.name);
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

rememberSwitch(replaceMfenced, 'maria-replace-mfenced', false, dropResult);
rememberSwitch(contextOn, 'maria-context', true, showContextPanel);
rememberSwitch(previewOn, 'maria-preview', true, (on) => {
  showPreviewPanel(on);
  refreshPreview(true);
});
rememberSwitch(heuristicOn, 'maria-heuristic', false);

setUpShortcuts();
setUpFilePicker(chooseFile);
showVersion();

convert.addEventListener('click', () => {
  if (conversion) {
    stopByUser();
  } else if (publication && publication.formulas.length > 0) {
    startConversion();
  }
});

result.addEventListener('click', () => {
  if (output) {
    download();
  }
});
