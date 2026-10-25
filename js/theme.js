// Part of MARIA (MathML Automatisch Renderen In ASCII)
(() => {
  const KEY = 'maria-theme';
  const root = document.documentElement;

  function storedTheme() {
    try {
      return localStorage.getItem(KEY);
    } catch {
      return null;
    }
  }

  function storeTheme(theme) {
    try {
      localStorage.setItem(KEY, theme);
    } catch {
    }
  }

  const systemTheme = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  const stored = storedTheme();
  root.dataset.theme = stored === 'light' || stored === 'dark' ? stored : systemTheme;

  document.addEventListener('DOMContentLoaded', () => {
    const toggle = document.getElementById('dark-mode');
    toggle.checked = root.dataset.theme === 'dark';
    const logo = document.querySelector('.logo');
    const normalLogo = logo.textContent;
    const area = toggle.parentElement;
    function showLogo() {
      logo.textContent = !area.matches(':hover') ? normalLogo : root.dataset.theme === 'dark' ? '🌸' : '💀';
    }
    area.addEventListener('mouseenter', showLogo);
    area.addEventListener('mouseleave', showLogo);
    toggle.addEventListener('change', () => {
      root.dataset.theme = toggle.checked ? 'dark' : 'light';
      storeTheme(root.dataset.theme);
      showLogo();
    });
  });
})();
