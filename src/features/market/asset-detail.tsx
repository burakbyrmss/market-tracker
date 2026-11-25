import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, Text, View } from 'react-native';

import type { DisplayPrice } from '@/domain/conversion';
import { displayCurrencyCode, type AssetId, type DisplayCurrency } from '@/domain/ids';
import { CHART_RANGES, type ChartRange } from '@/domain/market';
import { decimal } from '@/domain/money';
import { ChartSection } from '@/features/chart/chart-section';
import { coinName } from '@/features/coins';
import { useSettings } from '@/features/settings/store';
import { FX_SOURCE_NAME, fxQueries } from '@/services/fx';
import { cryptoQueries, useLivePrices, type MarketSource } from '@/services/market-data';
import {
  formatChartTime,
  formatDate,
  formatFxRate,
  formatPercentChange,
  formatPrice,
} from '@/shared/format';
import { useFormatLocale } from '@/shared/i18n';
import { Screen } from '@/shared/ui/screen';

import { formatDisplayPrice, useDisplayPrice } from './display-price';
import { PricesNotice } from './prices-notice';

function Message({ title, text }: { title: string; text: string }) {
  return (
    <Screen title={title}>
      <View className="flex-1 items-center justify-center px-8">
        <Text className="text-center text-base text-gray-500 dark:text-gray-400">{text}</Text>
      </View>
    </Screen>
  );
}

// Requirement 7 (docs/product/requirements.md): the detail screen says which method and which
// sources produced the price.
function PriceMethod({
  assetId,
  currency,
  price,
  source,
}: {
  assetId: AssetId;
  currency: DisplayCurrency;
  price: DisplayPrice;
  source: MarketSource;
}) {
  const { t } = useTranslation();
  const locale = useFormatLocale();
  const base = { asset: assetId, quote: source.quoteAsset, source: source.name };
  const usdtNote = source.quoteAsset === 'USDT' ? [t('detail.usdtAsUsd')] : [];

  let lines: string[];
  switch (price.method) {
    case 'usd':
      lines = [t('detail.usd', base), ...usdtNote];
      break;
    case 'direct':
      lines = [t('detail.direct', { ...base, currency: price.currency })];
      break;
    case 'fx':
      lines = [
        t('detail.fxBase', {
          ...base,
          price: formatPrice(price.usdPrice, displayCurrencyCode('USD'), locale),
        }),
        t('detail.fxRate', {
          currency: currency,
          rate: formatFxRate(price.rate, locale),
          fxSource: FX_SOURCE_NAME,
          date: formatDate(price.fxDate, locale),
        }),
        ...usdtNote,
      ];
      break;
    case 'unavailable':
      lines = [
        price.reason === 'no-usd-price'
          ? t('detail.noUsdPrice', base)
          : t('detail.noFxRate', { currency: currency }),
      ];
      break;
  }

  return (
    <View testID="price-method" className="gap-2 rounded-xl bg-gray-100 p-4 dark:bg-gray-900">
      <Text
        accessibilityRole="header"
        className="text-sm font-semibold uppercase text-gray-500 dark:text-gray-400"
      >
        {t('detail.method')}
      </Text>
      {lines.map((line) => (
        <Text key={line} className="text-base text-black dark:text-white">
          {line}
        </Text>
      ))}
    </View>
  );
}

// The chart plots the provider's own USD or USDT pair. Converting history with today's FX rate
// would draw prices that never traded, so the chart stays in its quote currency and says so.
function CryptoChart({ assetId, source }: { assetId: AssetId; source: MarketSource }) {
  const { t } = useTranslation();
  const locale = useFormatLocale();
  const [range, setRange] = useState<ChartRange>('1D');
  const query = useQuery(cryptoQueries.history(source.id, assetId, range));
  const usd = displayCurrencyCode('USD');

  return (
    <ChartSection
      ranges={CHART_RANGES}
      range={range}
      onRange={setRange}
      query={query}
      note={t('chart.pair', { pair: `${assetId}/${source.quoteAsset}`, source: source.name })}
      formatValue={(value) => formatPrice(decimal(value), usd, locale)}
      formatTime={(time, shown) =>
        formatChartTime(time, locale, { withTime: shown === '1D' || shown === '1W', utc: false })
      }
      formatSavedAt={(time) => formatChartTime(time, locale, { withTime: true, utc: false })}
    />
  );
}

export function AssetDetail({ assetId }: { assetId: AssetId }) {
  const { t } = useTranslation();
  const locale = useFormatLocale();
  const currency = useSettings((state) => state.displayCurrency);
  const fx = useQuery(fxQueries.latest()).data ?? null;
  const status = useLivePrices((state) => state.status);
  const source = useLivePrices((state) => state.source);
  const { quote, display } = useDisplayPrice(assetId, currency, fx);

  if (!source) {
    return (
      <Message
        title={assetId}
        text={t(status === 'error' ? 'market.unavailable' : 'market.loading')}
      />
    );
  }
  if (!quote) {
    return (
      <Message
        title={assetId}
        text={t('detail.notListed', { asset: assetId, source: source.name })}
      />
    );
  }

  const price = formatDisplayPrice(display, currency, locale);
  const change = quote.change24hPct;
  const name = coinName(assetId);

  return (
    <Screen title={assetId}>
      <ScrollView contentContainerClassName="gap-6 p-4">
        <View className="gap-1">
          {name !== null && (
            <Text className="text-base text-gray-500 dark:text-gray-400">{name}</Text>
          )}
          <Text
            testID="detail-price"
            accessibilityLabel={price ?? t('market.priceUnavailable')}
            className="text-4xl font-bold tabular-nums text-black dark:text-white"
          >
            {price ?? '–'}
          </Text>
          <Text className="text-base text-gray-500 dark:text-gray-400">
            {t('detail.change24h')}:{' '}
            <Text
              className={`tabular-nums ${
                change === null
                  ? 'text-gray-500 dark:text-gray-400'
                  : change < 0
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-green-700 dark:text-green-500'
              }`}
            >
              {change === null ? '–' : formatPercentChange(change, locale)}
            </Text>
          </Text>
        </View>
        <PricesNotice />
        <CryptoChart assetId={assetId} source={source} />
        <PriceMethod assetId={assetId} currency={currency} price={display} source={source} />
        <Text className="text-sm text-gray-500 dark:text-gray-400">{t('detail.disclaimer')}</Text>
      </ScrollView>
    </Screen>
  );
}
