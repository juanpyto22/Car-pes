export const COLOR_THEMES = [
  { id: 'ocean', label: 'Océano', description: 'Azul profundo y limpio', rgb: '14 165 233', strongRgb: '2 132 199', chipClass: 'from-sky-400 to-blue-500' },
  { id: 'cyan', label: 'Cian', description: 'Fresco y tecnológico', rgb: '6 182 212', strongRgb: '8 145 178', chipClass: 'from-cyan-400 to-sky-500' },
  { id: 'emerald', label: 'Esmeralda', description: 'Natural y elegante', rgb: '16 185 129', strongRgb: '5 150 105', chipClass: 'from-emerald-400 to-teal-500' },
  { id: 'amber', label: 'Ámbar', description: 'Cálido y vistoso', rgb: '245 158 11', strongRgb: '217 119 6', chipClass: 'from-amber-400 to-orange-500' },
  { id: 'rose', label: 'Rosa', description: 'Fuerte y moderno', rgb: '244 63 94', strongRgb: '225 29 72', chipClass: 'from-rose-400 to-pink-500' },
  { id: 'violet', label: 'Violeta', description: 'Premium y suave', rgb: '139 92 246', strongRgb: '124 58 237', chipClass: 'from-violet-400 to-fuchsia-500' },
  { id: 'orange', label: 'Naranja', description: 'Vivo y energético', rgb: '249 115 22', strongRgb: '234 88 12', chipClass: 'from-orange-400 to-amber-500' },
  { id: 'lime', label: 'Lima', description: 'Fresco y natural', rgb: '132 204 22', strongRgb: '101 163 13', chipClass: 'from-lime-400 to-green-500' },
];

export const DEFAULT_COLOR_THEME = 'ocean';
export const COLOR_THEME_STORAGE_KEY = 'carpes-color-theme';

export const resolveColorTheme = (themeId) =>
  COLOR_THEMES.find((theme) => theme.id === themeId) || COLOR_THEMES[0];

export const applyColorTheme = (themeId) => {
  const theme = resolveColorTheme(themeId);

  if (typeof document !== 'undefined') {
    const root = document.documentElement;
    const body = document.body;

    root.style.setProperty('--accent-rgb', theme.rgb);
    root.style.setProperty('--accent-strong-rgb', theme.strongRgb);
    root.style.setProperty('--accent-soft-rgb', theme.rgb);
    root.dataset.themeAccent = theme.id;
    body.dataset.themeAccent = theme.id;
  }

  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(COLOR_THEME_STORAGE_KEY, theme.id);
      window.dispatchEvent(new CustomEvent('carpes-theme-changed', { detail: theme.id }));
    } catch {
      // Ignore storage errors.
    }
  }

  return theme;
};

export const initializeColorTheme = () => {
  if (typeof window === 'undefined') {
    return resolveColorTheme(DEFAULT_COLOR_THEME);
  }

  let storedTheme = DEFAULT_COLOR_THEME;

  try {
    storedTheme = window.localStorage.getItem(COLOR_THEME_STORAGE_KEY) || DEFAULT_COLOR_THEME;
  } catch {
    storedTheme = DEFAULT_COLOR_THEME;
  }

  return applyColorTheme(storedTheme);
};

export const getStoredColorTheme = () => {
  if (typeof window === 'undefined') {
    return DEFAULT_COLOR_THEME;
  }

  try {
    return window.localStorage.getItem(COLOR_THEME_STORAGE_KEY) || DEFAULT_COLOR_THEME;
  } catch {
    return DEFAULT_COLOR_THEME;
  }
};