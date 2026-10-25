// Part of MARIA (MathML Automatisch Renderen In ASCII)
function stored(key, otherwise) {
  try {
    const value = localStorage.getItem(key);
    return value === null ? otherwise : value === 'true';
  } catch {
    return otherwise;
  }
}

function store(key, value) {
  try {
    localStorage.setItem(key, String(value));
  } catch {
  }
}

export function rememberSwitch(input, key, otherwise, apply = () => {}) {
  input.checked = stored(key, otherwise);
  apply(input.checked);
  input.addEventListener('change', () => {
    store(key, input.checked);
    apply(input.checked);
  });
}
