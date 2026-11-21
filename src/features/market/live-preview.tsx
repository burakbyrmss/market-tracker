import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';

import type { AssetId, CurrencyCode } from '@/domain/ids';
import { marketData, useLivePrices, useLiveQuote } from '@/services/market-data';
import { formatPercentChange, formatPrice } from '@/shared/format';
import { FORMAT_LOCALE, type Language } from '@/shared/i18n';

// Placeholder until the M7 market list: a few coins, enough to see prices move on a device.
const PREVIEW_ASSETS = ['BTC', 'ETH', 'SOL'] as AssetId[];
const USD = 'USD' as CurrencyCode;

function PriceRow({ assetId, locale }: { assetId: AssetId; locale: string }) {
  const quote = useLiveQuote(assetId);
  if (!quote) return null;
  const change = quote.change24hPct;
  return (
    <View className="flex-row items-center justify-between gap-4">
      <Text className="text-base font-semibold text-black dark:text-white">{assetId}</Text>
      <View className="items-end">
        <Text className="text-base text-black dark:text-white">
          {formatPrice(quote.price, USD, locale)}
        </Text>
        {change !== null && (
          <Text className={change < 0 ? 'text-sm text-red-600' : 'text-sm text-green-600'}>
            {formatPercentChange(change, locale)}
          </Text>
        )}
      </View>
    </View>
  );
}

export function LivePreview() {
  const { t, i18n } = useTranslation();
  const status = useLivePrices((state) => state.status);
  const source = useLivePrices((state) => state.source);
  const locale = FORMAT_LOCALE[(i18n.language === 'tr' ? 'tr' : 'en') satisfies Language];

  if (status === 'error') {
    return (
      <View className="items-center gap-3">
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
    return <Text className="text-base text-gray-500">{t('market.loading')}</Text>;
  }

  return (
    <View className="w-64 gap-3 rounded-xl bg-gray-100 p-4 dark:bg-gray-900">
      {PREVIEW_ASSETS.map((assetId) => (
        <PriceRow key={assetId} assetId={assetId} locale={locale} />
      ))}
      <Text className="text-xs text-gray-500">{t('market.source', { name: source.name })}</Text>
    </View>
  );
}
