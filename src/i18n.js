export const LANGUAGE_REGISTRY = Object.freeze({
  en: Object.freeze({ code: 'en', label: 'English', nativeLabel: 'English', dir: 'ltr', locale: 'en-US' }),
  es: Object.freeze({ code: 'es', label: 'Spanish', nativeLabel: 'Español', dir: 'ltr', locale: 'es-ES' }),
  ar: Object.freeze({ code: 'ar', label: 'Arabic', nativeLabel: 'العربية', dir: 'rtl', locale: 'ar-EG' }),
});

export const SUPPORTED_LANGUAGES = Object.freeze(Object.keys(LANGUAGE_REGISTRY));
export const SUBJECT_REGISTRY = Object.freeze({
  spanish: Object.freeze({ slug: 'spanish', label: 'Spanish', nativeLabel: 'Español', flag: '🇪🇸', accent: '#e8755f' }),
  english: Object.freeze({ slug: 'english', label: 'English', nativeLabel: 'English', flag: '🇬🇧', accent: '#2f6f64' }),
  arabic: Object.freeze({ slug: 'arabic', label: 'Arabic', nativeLabel: 'العربية', flag: 'ع', accent: '#bc8b3d' }),
});

export function normalizeLanguage(language) { return SUPPORTED_LANGUAGES.includes(language) ? language : 'en'; }
export function getSavedLanguage() { try { return normalizeLanguage(window.localStorage.getItem('linguaedu-language')); } catch { return 'en'; } }
export function applyDocumentLanguage(language, { persist = true } = {}) {
  const normalized = normalizeLanguage(language);
  document.documentElement.lang = normalized;
  document.documentElement.dir = LANGUAGE_REGISTRY[normalized].dir;
  document.documentElement.dataset.language = normalized;
  if (persist) { try { window.localStorage.setItem('linguaedu-language', normalized); } catch {} }
  window.dispatchEvent(new CustomEvent('linguaedu:languagechange', { detail: { language: normalized } }));
  return normalized;
}
export function nextLanguage(language) { const current = normalizeLanguage(language); return SUPPORTED_LANGUAGES[(SUPPORTED_LANGUAGES.indexOf(current) + 1) % SUPPORTED_LANGUAGES.length]; }
export function languageButtonLabel(language) { const current = LANGUAGE_REGISTRY[normalizeLanguage(language)]; return `${current.nativeLabel} / ${current.code.toUpperCase()}`; }
export function subjectLabel(subject, language = 'en') {
  const labels = {
    spanish: { en: 'Spanish', es: 'Español', ar: 'الإسبانية' },
    english: { en: 'English', es: 'Inglés', ar: 'الإنجليزية' },
    arabic: { en: 'Arabic', es: 'Árabe', ar: 'العربية' },
  };
  return labels[subject]?.[normalizeLanguage(language)] || SUBJECT_REGISTRY[subject]?.label || subject;
}
export async function persistLanguage(language) {
  const normalized = normalizeLanguage(language);
  try {
    await fetch('/api/me/language', { method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ language: normalized }) });
  } catch {}
  return normalized;
}
export function bindLanguageSwitcher(selector = '#lang-toggle') {
  const button = document.querySelector(selector);
  if (!button || button.dataset.i18nBound) return;
  button.dataset.i18nBound = 'true';
  const render = () => { const current = normalizeLanguage(document.documentElement.lang); button.textContent = languageButtonLabel(current); button.setAttribute('aria-label', `Switch language. Current: ${LANGUAGE_REGISTRY[current].label}`); };
  button.addEventListener('click', () => { const language = applyDocumentLanguage(nextLanguage(document.documentElement.lang)); render(); persistLanguage(language); });
  render();
}
