import translations from '../data/translations.json';

type Lang = keyof typeof translations;

const COUNTRY_TO_LANG: Record<string, Lang> = {
  ro: 'ro', md: 'ro',
  de: 'de', at: 'de', ch: 'de',
  fr: 'fr', be: 'fr', mc: 'fr',
  es: 'es', mx: 'es', ar: 'es', co: 'es', cl: 'es', pe: 'es',
  it: 'it', sm: 'it',
};

function detectLang(): Lang {
  const stored = localStorage.getItem('lang') as Lang | null;
  if (stored && translations[stored]) return stored;

  const browserLang = navigator.language.split('-')[0].toLowerCase();
  if (translations[browserLang as Lang]) return browserLang as Lang;

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

  document.documentElement.lang = lang;
  localStorage.setItem('lang', lang);
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
