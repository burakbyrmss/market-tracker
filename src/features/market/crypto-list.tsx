import { FlashList } from '@shopify/flash-list';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'expo-router';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';

import type { FxRates } from '@/domain/fx';
import type { AssetId, DisplayCurrency } from '@/domain/ids';
import { useSettings } from '@/features/settings/store';
import { FX_SOURCE_NAME, fxQueries } from '@/services/fx';
import { marketData, useLivePrices } from '@/services/market-data';
import { formatPercentChange } from '@/shared/format';
import { useFormatLocale } from '@/shared/i18n';
import { LetterAvatar } from '@/shared/ui/letter-avatar';

import { formatDisplayPrice, useDisplayPrice } from './display-price';

type CryptoRowProps = {
  assetId: AssetId;
  // The market list shows ranks. A watchlist has its own order and shows none.
  rank?: number;
  currency: DisplayCurrency;
  fx: FxRates | null;
};

// Reads only its own asset, so a price change re-renders one row (ADR 0003).
export const CryptoRow = memo(function CryptoRow({ assetId, rank, currency, fx }: CryptoRowProps) {
  const { t } = useTranslation();
  const locale = useFormatLocale();
  const { quote, display } = useDisplayPrice(assetId, currency, fx);
  if (!quote) return null;

  const price = formatDisplayPrice(display, currency, locale);
  const change = quote.change24hPct;
  const changeText = change === null ? null : formatPercentChange(change, locale);
  const priceLabel = price ?? t('market.priceUnavailable');

  return (
    <Link href={{ pathname: '/asset/[id]', params: { id: assetId } }} asChild>
      <Pressable
        accessibilityLabel={
          changeText
            ? t('market.rowLabel', { asset: assetId, price: priceLabel, change: changeText })
            : t('market.rowLabelNoChange', { asset: assetId, price: priceLabel })
        }
        testID={`crypto-row-${assetId}`}
        className="h-16 flex-row items-center gap-3 border-b border-gray-200 px-4 active:bg-gray-100 dark:border-gray-800 dark:active:bg-gray-900"
      >
        {rank !== undefined && <Text className="w-7 text-right text-xs text-gray-500">{rank}</Text>}
        <LetterAvatar label={assetId} />
        <Text className="flex-1 text-base font-semibold text-black dark:text-white">{assetId}</Text>
        <View className="items-end">
          <Text
            testID={`price-${assetId}`}
            className="text-base tabular-nums text-black dark:text-white"
          >
            {price ?? '–'}
          </Text>
          <Text
            className={`text-sm tabular-nums ${
              change === null ? 'text-gray-500' : change < 0 ? 'text-red-600' : 'text-green-600'
            }`}
          >
            {changeText ?? '–'}
          </Text>
        </View>
      </Pressable>
    </Link>
  );
});

export function CryptoList() {
  const { t } = useTranslation();
  const status = useLivePrices((state) => state.status);
  const source = useLivePrices((state) => state.source);
  const ranking = useLivePrices((state) => state.ranking);
  const currency = useSettings((state) => state.displayCurrency);
  // Loaded for every currency, so switching to EUR or TRY has rates at hand. Rows get the same
  // object, so they re-render only when new rates arrive.
  const fx = useQuery(fxQueries.latest()).data ?? null;

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
        extraData={{ currency, fx }}
        renderItem={({ item, index }) => (
          <CryptoRow assetId={item} rank={index + 1} currency={currency} fx={fx} />
        )}
      />
      <Text className="px-4 py-2 text-center text-xs text-gray-500">
        {currency === 'USD'
          ? t('market.source', { name: source.name })
          : t('market.sources', { crypto: source.name, fx: FX_SOURCE_NAME })}
      </Text>
    </View>
  );
}
