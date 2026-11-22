import { Stack, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

import { parseAssetId } from '@/domain/ids';
import { AssetDetail } from '@/features/market/asset-detail';
import { Screen } from '@/shared/ui/screen';

export default function AssetRoute() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  // A deep link can carry anything, so the ID is checked before it reaches the app.
  const assetId = typeof id === 'string' ? parseAssetId(id) : null;

  return (
    <>
      <Stack.Screen options={{ title: assetId ?? '' }} />
      {assetId ? (
        <AssetDetail assetId={assetId} />
      ) : (
        <Screen edges={['bottom', 'left', 'right']}>
          <View className="flex-1 items-center justify-center px-8">
            <Text className="text-center text-base text-gray-500">{t('detail.notFound')}</Text>
          </View>
        </Screen>
      )}
    </>
  );
}
