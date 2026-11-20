import { Link } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';

import { Screen } from '@/shared/ui/screen';

export default function HomeScreen() {
  const { t } = useTranslation();
  return (
    <Screen>
      <View className="flex-1 items-center justify-center gap-6">
        <Text
          accessibilityRole="header"
          className="text-2xl font-semibold text-black dark:text-white"
        >
          {t('home.title')}
        </Text>
        <Link href="/spike" asChild>
          <Pressable className="rounded-lg bg-blue-600 px-4 py-3">
            <Text className="text-lg font-semibold text-white">{t('home.openSpike')}</Text>
          </Pressable>
        </Link>
      </View>
    </Screen>
  );
}
