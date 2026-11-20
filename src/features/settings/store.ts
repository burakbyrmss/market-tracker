import { z } from 'zod';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { DISPLAY_CURRENCIES, type DisplayCurrency } from '@/domain/ids';
import { LANGUAGES } from '@/shared/i18n';
import { persistOptions } from '@/shared/storage';

export const THEMES = ['system', 'light', 'dark'] as const;
export type Theme = (typeof THEMES)[number];

// 'system' follows the device language.
export const LANGUAGE_SETTINGS = ['system', ...LANGUAGES] as const;
export type LanguageSetting = (typeof LANGUAGE_SETTINGS)[number];

export type Settings = {
  displayCurrency: DisplayCurrency;
  language: LanguageSetting;
  theme: Theme;
};

export const DEFAULT_SETTINGS: Settings = {
  displayCurrency: 'USD',
  language: 'system',
  theme: 'system',
};

// Each field falls back on its own, so a value removed in a later version resets only that field.
const settingsSchema = z.object({
  displayCurrency: z.enum(DISPLAY_CURRENCIES).catch(DEFAULT_SETTINGS.displayCurrency),
  language: z.enum(LANGUAGE_SETTINGS).catch(DEFAULT_SETTINGS.language),
  theme: z.enum(THEMES).catch(DEFAULT_SETTINGS.theme),
});

type SettingsState = Settings & {
  setDisplayCurrency: (displayCurrency: DisplayCurrency) => void;
  setLanguage: (language: LanguageSetting) => void;
  setTheme: (theme: Theme) => void;
};

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,
      setDisplayCurrency: (displayCurrency) => set({ displayCurrency }),
      setLanguage: (language) => set({ language }),
      setTheme: (theme) => set({ theme }),
    }),
    persistOptions({
      name: 'settings',
      version: 1,
      schema: settingsSchema,
      pick: ({ displayCurrency, language, theme }): Settings => ({
        displayCurrency,
        language,
        theme,
      }),
    }),
  ),
);
