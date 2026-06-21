import { useEffect, useState } from 'react';
import translations from '../../data/translations.json';

export type Lang = keyof typeof translations;

export function currentLang(): Lang {
  if (typeof localStorage === 'undefined') return 'en';
  const stored = localStorage.getItem('lang') as Lang | null;
  return stored && (translations as Record<string, unknown>)[stored] ? stored : 'en';
}

export function translate(lang: Lang, key: string, fallback?: string): string {
  const dict = (translations[lang] || translations.en) as Record<string, string>;
  const en = translations.en as Record<string, string>;
  return dict[key] ?? en[key] ?? fallback ?? key;
}

/** Tracks the active language and re-renders on change (navbar switch or other tab). */
export function useLang(): Lang {
  const [lang, setLang] = useState<Lang>(() => currentLang());
  useEffect(() => {
    setLang(currentLang()); // re-sync in case it changed between init and mount
    const onChange = () => setLang(currentLang());
    window.addEventListener('eal:langchange', onChange as EventListener);
    window.addEventListener('storage', onChange);
    return () => {
      window.removeEventListener('eal:langchange', onChange as EventListener);
      window.removeEventListener('storage', onChange);
    };
  }, []);
  return lang;
}

/** Bound translator hook: const t = useT(); t('builder.action.submit'). */
export function useT() {
  const lang = useLang();
  return (key: string, fallback?: string) => translate(lang, key, fallback);
}
