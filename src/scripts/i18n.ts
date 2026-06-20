import translations from '../data/translations.json';

type Lang = keyof typeof translations;

function detectLang(): Lang {
  const stored = localStorage.getItem('lang') as Lang | null;
  if (stored && translations[stored]) return stored;

  // Default to English — user can switch manually
  return 'en';
}

function applyTranslations(lang: Lang) {
  const t = translations[lang] || translations['en'];

  document.querySelectorAll<HTMLElement>('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    if (key && t[key as keyof typeof t]) {
      el.textContent = t[key as keyof typeof t];
    }
  });

  document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('[data-i18n-placeholder]').forEach((el) => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (key && t[key as keyof typeof t]) {
      el.placeholder = t[key as keyof typeof t];
    }
  });

  document.querySelectorAll<HTMLElement>('[data-i18n-aria]').forEach((el) => {
    const key = el.getAttribute('data-i18n-aria');
    if (key && t[key as keyof typeof t]) {
      el.setAttribute('aria-label', t[key as keyof typeof t]);
    }
  });

  document.documentElement.lang = lang;
  localStorage.setItem('lang', lang);

  // Let client islands (e.g. the /builder React app) react to language changes live.
  window.dispatchEvent(new CustomEvent('eal:langchange', { detail: lang }));
}

export function initI18n() {
  const lang = detectLang();
  applyTranslations(lang);
  return lang;
}

export function setLang(lang: Lang) {
  applyTranslations(lang);
}

export { translations, type Lang };
