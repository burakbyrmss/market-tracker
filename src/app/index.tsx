import { Link } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';

import { FxList } from '@/features/fx/fx-list';
import { CryptoList } from '@/features/market/crypto-list';
import { Screen } from '@/shared/ui/screen';

type Market = 'crypto' | 'fx';

function MarketTab({
  market,
  selected,
  onSelect,
}: {
  market: Market;
  selected: boolean;
  onSelect: (market: Market) => void;
}) {
  const { t } = useTranslation();
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected }}
      onPress={() => onSelect(market)}
      className={`flex-1 items-center rounded-md py-2 ${selected ? 'bg-white dark:bg-gray-700' : ''}`}
    >
      <Text
        className={`text-sm font-semibold ${selected ? 'text-black dark:text-white' : 'text-gray-500'}`}
      >
        {t(`markets.${market}`)}
      </Text>
    </Pressable>
  );
}

export default function MarketsScreen() {
  const { t } = useTranslation();
  const [market, setMarket] = useState<Market>('crypto');
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
      <View
        accessibilityRole="tablist"
        className="mx-4 mb-2 flex-row rounded-lg bg-gray-100 p-1 dark:bg-gray-900"
      >
        <MarketTab market="crypto" selected={market === 'crypto'} onSelect={setMarket} />
        <MarketTab market="fx" selected={market === 'fx'} onSelect={setMarket} />
      </View>
      {market === 'crypto' ? <CryptoList /> : <FxList />}
    </Screen>
  );
}
