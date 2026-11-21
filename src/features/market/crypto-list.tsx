import { FlashList } from '@shopify/flash-list';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';

import type { AssetId, CurrencyCode } from '@/domain/ids';
import { marketData, useLivePrices, useLiveQuote } from '@/services/market-data';
import { formatPercentChange, formatPrice } from '@/shared/format';
import { FORMAT_LOCALE } from '@/shared/i18n';
import { LetterAvatar } from '@/shared/ui/letter-avatar';

// Display currency conversion arrives in M9. Until then prices show in the provider's USD quote.
const USD = 'USD' as CurrencyCode;

function useLocale() {
  const { i18n } = useTranslation();
  return FORMAT_LOCALE[i18n.language === 'tr' ? 'tr' : 'en'];
}

// Reads only its own asset, so a price change re-renders one row (ADR 0003).
const CryptoRow = memo(function CryptoRow({ assetId, rank }: { assetId: AssetId; rank: number }) {
  const { t } = useTranslation();
  const locale = useLocale();
  const quote = useLiveQuote(assetId);
  if (!quote) return null;

  const price = formatPrice(quote.price, USD, locale);
  const change = quote.change24hPct;
  const changeText = change === null ? null : formatPercentChange(change, locale);

  return (
    <View
      accessible
      accessibilityLabel={
        changeText
          ? t('market.rowLabel', { asset: assetId, price, change: changeText })
          : t('market.rowLabelNoChange', { asset: assetId, price })
      }
      testID={`crypto-row-${assetId}`}
      className="h-16 flex-row items-center gap-3 border-b border-gray-200 px-4 dark:border-gray-800"
    >
      <Text className="w-7 text-right text-xs text-gray-500">{rank}</Text>
      <LetterAvatar label={assetId} />
      <Text className="flex-1 text-base font-semibold text-black dark:text-white">{assetId}</Text>
      <View className="items-end">
        <Text
          testID={`price-${assetId}`}
          className="text-base tabular-nums text-black dark:text-white"
        >
          {price}
        </Text>
        <Text
          className={`text-sm tabular-nums ${
            change === null ? 'text-gray-500' : change < 0 ? 'text-red-600' : 'text-green-600'
          }`}
        >
          {changeText ?? '–'}
        </Text>
      </View>
    </View>
  );
});

export function CryptoList() {
  const { t } = useTranslation();
  const status = useLivePrices((state) => state.status);
  const source = useLivePrices((state) => state.source);
  const ranking = useLivePrices((state) => state.ranking);

  if (status === 'error') {
    return (
      <View className="flex-1 items-center justify-center gap-3 px-8">
        <Text className="text-center text-base text-black dark:text-white">
          {t('market.unavailable')}
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => void marketData.start()}
          className="rounded-lg bg-blue-600 px-4 py-2"
        >
          <Text className="font-semibold text-white">{t('market.retry')}</Text>
        </Pressable>
      </View>
    );
  }

  if (status !== 'live' || !source) {
    return (
      <View className="flex-1 items-center justify-center">
        <Text className="text-base text-gray-500">{t('market.loading')}</Text>
      </View>
    );
  }

  return (
    <View className="flex-1">
      <FlashList
        data={ranking}
        keyExtractor={(assetId) => assetId}
        renderItem={({ item, index }) => <CryptoRow assetId={item} rank={index + 1} />}
      />
      <Text className="px-4 py-2 text-center text-xs text-gray-500">
        {t('market.source', { name: source.name })}
      </Text>
    </View>
  );
}
