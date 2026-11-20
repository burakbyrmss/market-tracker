import { getLocales } from 'expo-localization';
import { createInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './locales/en.json';
import trJson from './locales/tr.json';

export type Translation = typeof en;

// Fails to compile when tr.json is missing a key that en.json has.
const tr: Translation = trJson;

export const LANGUAGES = ['en', 'tr'] as const;
export type Language = (typeof LANGUAGES)[number];

// Number and currency formatting follows the app language.
export const FORMAT_LOCALE: Record<Language, string> = { en: 'en-US', tr: 'tr-TR' };

export function deviceLanguage(): Language {
  return getLocales()[0]?.languageCode === 'tr' ? 'tr' : 'en';
}

export function currentLanguage(): Language {
  return i18n.language === 'tr' ? 'tr' : 'en';
}

const i18n = createInstance();

void i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, tr: { translation: tr } },
  lng: deviceLanguage(),
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export default i18n;
