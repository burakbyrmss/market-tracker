import { useTranslation } from 'react-i18next';
import { Link } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { DISPLAY_CURRENCIES } from '@/domain/ids';
import { Screen } from '@/shared/ui/screen';

import { LANGUAGE_SETTINGS, THEMES, useSettings } from './store';

type OptionGroupProps<T extends string> = {
  label: string;
  options: readonly T[];
  selected: T;
  onSelect: (value: T) => void;
  optionLabel: (value: T) => string;
};

function OptionGroup<T extends string>({
  label,
  options,
  selected,
  onSelect,
  optionLabel,
}: OptionGroupProps<T>) {
  return (
    <View className="gap-2">
      <Text accessibilityRole="header" className="text-sm font-semibold uppercase text-gray-500">
        {label}
      </Text>
      <View
        accessibilityRole="radiogroup"
        accessibilityLabel={label}
        className="overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-900"
      >
        {options.map((option, index) => {
          const checked = option === selected;
          return (
            <Pressable
              key={option}
              accessibilityRole="radio"
              accessibilityState={{ checked }}
              onPress={() => onSelect(option)}
              className={`flex-row items-center justify-between px-4 py-3 active:bg-gray-200 dark:active:bg-gray-800 ${
                index > 0 ? 'border-t border-gray-200 dark:border-gray-800' : ''
              }`}
            >
              <Text className="text-base text-black dark:text-white">{optionLabel(option)}</Text>
              <View
                className={`h-5 w-5 rounded-full border-2 ${
                  checked ? 'border-blue-600 bg-blue-600' : 'border-gray-400'
                }`}
              />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function SettingsScreen() {
  const { t } = useTranslation();
  const settings = useSettings();

  return (
    <Screen title={t('settings.title')}>
      <ScrollView contentContainerClassName="gap-8 p-4">
        <OptionGroup
          label={t('settings.theme.label')}
          options={THEMES}
          selected={settings.theme}
          onSelect={settings.setTheme}
          optionLabel={(theme) => t(`settings.theme.${theme}`)}
        />
        <OptionGroup
          label={t('settings.language.label')}
          options={LANGUAGE_SETTINGS}
          selected={settings.language}
          onSelect={settings.setLanguage}
          optionLabel={(language) => t(`settings.language.${language}`)}
        />
        <OptionGroup
          label={t('settings.displayCurrency.label')}
          options={DISPLAY_CURRENCIES}
          selected={settings.displayCurrency}
          onSelect={settings.setDisplayCurrency}
          optionLabel={(currency) => t(`settings.displayCurrency.${currency}`)}
        />
        <Link href="/about" asChild>
          <Pressable
            accessibilityRole="button"
            testID="open-about"
            className="h-12 justify-center border-t border-gray-200 dark:border-gray-800"
          >
            <Text className="text-base font-semibold text-blue-600">{t('about.open')}</Text>
          </Pressable>
        </Link>
      </ScrollView>
    </Screen>
  );
}
