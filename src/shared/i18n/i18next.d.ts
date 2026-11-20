import 'i18next';

import type { Translation } from './index';

// Typed keys: t('home.missing') fails to compile.
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation';
    resources: { translation: Translation };
  }
}
