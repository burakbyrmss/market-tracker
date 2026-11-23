import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

import { parseCurrencyCode } from '@/domain/ids';
import { FxDetail } from '@/features/fx/fx-detail';
import { Screen } from '@/shared/ui/screen';

export default function FxRoute() {
  const { t } = useTranslation();
  const { code } = useLocalSearchParams<{ code: string }>();
  // A deep link can carry anything, so the code is checked before it reaches the app.
  const currency = typeof code === 'string' ? parseCurrencyCode(code) : null;

  if (currency) return <FxDetail code={currency} />;
  return (
    <Screen title="">
      <View className="flex-1 items-center justify-center px-8">
        <Text className="text-center text-base text-gray-500">{t('detail.notFound')}</Text>
      </View>
    </Screen>
  );
}
