import Constants from 'expo-constants';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, Text, View } from 'react-native';

import { Screen } from '@/shared/ui/screen';

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View className="gap-2">
      <Text accessibilityRole="header" className="text-lg font-semibold text-black dark:text-white">
        {title}
      </Text>
      {children}
    </View>
  );
}

function Paragraph({ children }: { children: ReactNode }) {
  return <Text className="text-base text-gray-700 dark:text-gray-300">{children}</Text>;
}

// Credits every data source and asset the app ships with, and says the app is not advice.
export function AboutScreen() {
  const { t } = useTranslation();
  const version = Constants.expoConfig?.version;

  return (
    <Screen title={t('about.title')}>
      <ScrollView contentContainerClassName="gap-8 p-4">
        <Section title={t('about.disclaimerTitle')}>
          <Paragraph>{t('about.disclaimer')}</Paragraph>
        </Section>
        <Section title={t('about.sourcesTitle')}>
          <Paragraph>{t('about.cryptoSource')}</Paragraph>
          <Paragraph>{t('about.fxSource')}</Paragraph>
          <Paragraph>{t('about.icons')}</Paragraph>
        </Section>
        {version !== undefined && (
          <Text className="text-sm text-gray-500 dark:text-gray-400">
            {t('about.version', { version })}
          </Text>
        )}
      </ScrollView>
    </Screen>
  );
}
