import { colorScheme } from 'nativewind';

import i18n, { deviceLanguage } from '@/shared/i18n';

import { useSettings, type Settings } from './store';

function applySettings({ language, theme }: Settings) {
  colorScheme.set(theme);
  const target = language === 'system' ? deviceLanguage() : language;
  if (i18n.language !== target) void i18n.changeLanguage(target);
}

let started = false;

// Called once at startup, before the first render, so the first frame already has the stored
// language and theme.
export function startSettings() {
  if (started) return;
  started = true;
  applySettings(useSettings.getState());
  useSettings.subscribe(applySettings);
}
