// Part of MARIA (MathML Automatisch Renderen In ASCII)
import init, { init_mathcat, mathcat_version, to_dedicon } from '../mathcat/mathcat_wasm.js';

const ready = init().then(() => init_mathcat());

function messageOf(e) {
  return e instanceof Error ? e.message : String(e);
}

self.addEventListener('message', async ({ data: { id, mathml, version } }) => {
  try {
    await ready;
  } catch (e) {
    self.postMessage({ id, ok: false, unavailable: true, message: messageOf(e) });
    return;
  }
  try {
    self.postMessage({ id, ok: true, text: version ? mathcat_version() : to_dedicon(mathml) });
  } catch (e) {
    self.postMessage({ id, ok: false, crashed: e instanceof WebAssembly.RuntimeError || e instanceof RangeError, message: messageOf(e) });
  }
});
