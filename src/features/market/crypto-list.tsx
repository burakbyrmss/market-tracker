import { FlashList } from '@shopify/flash-list';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'expo-router';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';

import type { FxRates } from '@/domain/fx';
import type { AssetId, DisplayCurrency } from '@/domain/ids';
import { CoinIcon, coinName } from '@/features/coins';
import { useSettings } from '@/features/settings/store';
import { FX_SOURCE_NAME, fxQueries } from '@/services/fx';
import { marketData, useLivePrices } from '@/services/market-data';
import { formatPercentChange } from '@/shared/format';
import { useFormatLocale } from '@/shared/i18n';

import { formatDisplayPrice, useDisplayPrice } from './display-price';
import { PricesNotice } from './prices-notice';

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

  const name = coinName(assetId);
  const price = formatDisplayPrice(display, currency, locale);
  const change = quote.change24hPct;
  const changeText = change === null ? null : formatPercentChange(change, locale);
  const priceLabel = price ?? t('market.priceUnavailable');
  // A screen reader says the name too, since many tickers mean nothing out loud.
  const spoken = name === null ? assetId : `${name}, ${assetId}`;

  return (
    <Link href={{ pathname: '/asset/[id]', params: { id: assetId } }} asChild>
      <Pressable
        accessibilityLabel={
          changeText
            ? t('market.rowLabel', { asset: spoken, price: priceLabel, change: changeText })
            : t('market.rowLabelNoChange', { asset: spoken, price: priceLabel })
        }
        testID={`crypto-row-${assetId}`}
        className="min-h-16 flex-row items-center gap-3 border-b border-gray-200 px-4 py-2 active:bg-gray-100 dark:border-gray-800 dark:active:bg-gray-900"
      >
        {rank !== undefined && (
          <Text className="w-7 text-right text-xs text-gray-500 dark:text-gray-400">{rank}</Text>
        )}
        <CoinIcon assetId={assetId} />
        <View className="flex-1">
          <Text className="text-base font-semibold text-black dark:text-white">{assetId}</Text>
          {name !== null && (
            <Text numberOfLines={1} className="text-sm text-gray-500 dark:text-gray-400">
              {name}
            </Text>
          )}
        </View>
        <View className="items-end">
          <Text
            testID={`price-${assetId}`}
            className="text-base tabular-nums text-black dark:text-white"
          >
            {price ?? '–'}
          </Text>
          <Text
            className={`text-sm tabular-nums ${
              change === null
                ? 'text-gray-500 dark:text-gray-400'
                : change < 0
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-green-700 dark:text-green-500'
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

  // Saved prices count: offline, the list shows them with their age instead of an error.
  const hasPrices = source !== null && ranking.length > 0;

  if (!hasPrices && status === 'error') {
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

  if (!hasPrices) {
    return (
      <View className="flex-1 items-center justify-center">
        <Text className="text-base text-gray-500 dark:text-gray-400">{t('market.loading')}</Text>
      </View>
    );
  }

  return (
    <View className="flex-1">
      <View className="px-4">
        <PricesNotice />
      </View>
      <FlashList
        data={ranking}
        keyExtractor={(assetId) => assetId}
        extraData={{ currency, fx }}
        renderItem={({ item, index }) => (
          <CryptoRow assetId={item} rank={index + 1} currency={currency} fx={fx} />
        )}
      />
      <Text className="px-4 py-2 text-center text-xs text-gray-500 dark:text-gray-400">
        {currency === 'USD'
          ? t('market.source', { name: source.name })
          : t('market.sources', { crypto: source.name, fx: FX_SOURCE_NAME })}
      </Text>
    </View>
  );
}
