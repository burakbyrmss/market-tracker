import { Link } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';

import { CryptoList } from '@/features/market/crypto-list';
import { Screen } from '@/shared/ui/screen';

export default function MarketsScreen() {
  const { t } = useTranslation();
  return (
    <Screen edges={['top', 'left', 'right']}>
      <View className="flex-row items-center justify-between px-4 pb-2 pt-2">
        <Text accessibilityRole="header" className="text-2xl font-bold text-black dark:text-white">
          {t('home.title')}
        </Text>
        <Link href="/settings" asChild>
          <Pressable hitSlop={8}>
            <Text className="text-base font-semibold text-blue-600">{t('home.openSettings')}</Text>
          </Pressable>
        </Link>
      </View>
      <CryptoList />
    </Screen>
  );
}
