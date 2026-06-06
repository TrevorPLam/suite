import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translation files
import en from './en.json' with { type: 'json' };

export const resources = {
  en: {
    translation: en,
  },
};

export const defaultNS = 'translation';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    lng: 'en',
    fallbackLng: 'en',
    defaultNS,
    ns: ['translation'],
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
    },
    react: {
      useSuspense: false, // Disable suspense for simpler integration
    },
  });

export default i18n;
