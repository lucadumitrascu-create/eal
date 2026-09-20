import translations from '../data/translations.json';

type Lang = keyof typeof translations;

// Set only when the visitor picks a language from the navbar. Without it there was
// no way to tell "they chose English" from "we defaulted to English", because
// applyTranslations writes `lang` on every run, so the first visit stored 'en' and
// detection could never run again.
const CHOSEN_KEY = 'langChosen';

// Country to language, for the markets this site actually serves. A visitor whose
// phone is in English but who is browsing from Austria gets German, which is the
// whole point: the site sells to small businesses in those countries.
const COUNTRY_LANG: Record<string, Lang> = {
  AT: 'de', DE: 'de', CH: 'de', LI: 'de',
  RO: 'ro', MD: 'ro',
  FR: 'fr', BE: 'fr', LU: 'fr', MC: 'fr',
  ES: 'es', MX: 'es', AR: 'es', CL: 'es', CO: 'es', PE: 'es',
  IT: 'it', SM: 'it', VA: 'it',
};

function isLang(value: string | null): value is Lang {
  return !!value && Object.prototype.hasOwnProperty.call(translations, value);
}

// Storage throws in some privacy modes; a language switcher is not worth a crash.
function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
}

function chosenLang(): Lang | null {
  if (read(CHOSEN_KEY) !== '1') return null;
  const stored = read('lang');
  return isLang(stored) ? stored : null;
}

/** The language the browser asks for, if it is one we speak. */
function fromBrowser(): Lang | null {
  const tags = navigator.languages?.length ? navigator.languages : [navigator.language];
  for (const tag of tags) {
    const base = String(tag).toLowerCase().split('-')[0];
    if (isLang(base)) return base;
  }
  return null;
}

/** The country the request came from, mapped to a language. */
async function fromCountry(): Promise<Lang | null> {
  try {
    const res = await fetch('/api/geo', { headers: { accept: 'application/json' } });
    if (!res.ok) return null;
    const { country } = (await res.json()) as { country: string | null };
    if (!country) return null;
    return COUNTRY_LANG[country.toUpperCase()] ?? null;
  } catch {
    return null;
  }
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
  // Still written on every run: the builder island reads this key to know the
  // active language. What it no longer does is count as the visitor's choice.
  write('lang', lang);

  // Let client islands (e.g. the /builder React app) react to language changes live.
  window.dispatchEvent(new CustomEvent('eal:langchange', { detail: lang }));
}

export function initI18n() {
  const chosen = chosenLang();
  const browser = chosen ? null : fromBrowser();
  const lang: Lang = chosen ?? browser ?? 'en';
  applyTranslations(lang);

  // The browser did not name one of our languages, or named English, so fall back
  // to where the visitor actually is. Async, so English paints first and is
  // replaced a moment later; that is the cost of the page being prerendered.
  if (!chosen && (browser === null || browser === 'en')) {
    void fromCountry().then((byCountry) => {
      if (byCountry && byCountry !== lang && !chosenLang()) applyTranslations(byCountry);
    });
  }

  return lang;
}

export function setLang(lang: Lang) {
  write(CHOSEN_KEY, '1');
  applyTranslations(lang);
}

export { translations, type Lang };
