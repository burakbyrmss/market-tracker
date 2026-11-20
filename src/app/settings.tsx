import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { SettingsScreen } from '@/features/settings/settings-screen';

export default function SettingsRoute() {
  const { t } = useTranslation();
  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: t('settings.title') }} />
      <SettingsScreen />
    </>
  );
}
