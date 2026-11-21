import { FlashList } from '@shopify/flash-list';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';

import { fxRate, type FxRates } from '@/domain/fx';
import { displayCurrencyCode, type CurrencyCode } from '@/domain/ids';
import { useSettings } from '@/features/settings/store';
import { FX_SOURCE_NAME, fxQueries } from '@/services/fx';
import { formatDate, formatPrice } from '@/shared/format';
import { FORMAT_LOCALE, namedCurrency } from '@/shared/i18n';
import { LetterAvatar } from '@/shared/ui/letter-avatar';

type FxRow = { code: CurrencyCode; value: string; name: string };

// Every ECB currency, valued in the display currency: "1 USD = ₺38.12". The display currency
// itself is left out.
function useRows(fx: FxRates | undefined, display: CurrencyCode, locale: string): FxRow[] {
  const { t } = useTranslation();
  if (!fx) return [];
  const codes = [fx.base, ...fx.rates.keys()].filter((code) => code !== display).sort();
  return codes.flatMap((code) => {
    const rate = fxRate(fx, code, display);
    if (!rate) return [];
    const named = namedCurrency(code);
    return [
      {
        code,
        value: formatPrice(rate, display, locale),
        name: named ? t(`currency.${named}`) : code,
      },
    ];
  });
}

export function FxList() {
  const { t, i18n } = useTranslation();
  const locale = FORMAT_LOCALE[i18n.language === 'tr' ? 'tr' : 'en'];
  const display = displayCurrencyCode(useSettings((state) => state.displayCurrency));
  const query = useQuery(fxQueries.latest());
  const rows = useRows(query.data, display, locale);

  if (query.isError && !query.data) {
    return (
      <View className="flex-1 items-center justify-center gap-3 px-8">
        <Text className="text-center text-base text-black dark:text-white">
          {t('fx.unavailable')}
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => void query.refetch()}
          className="rounded-lg bg-blue-600 px-4 py-2"
        >
          <Text className="font-semibold text-white">{t('market.retry')}</Text>
        </Pressable>
      </View>
    );
  }

  if (!query.data) {
    return (
      <View className="flex-1 items-center justify-center">
        <Text className="text-base text-gray-500">{t('fx.loading')}</Text>
      </View>
    );
  }

  return (
    <View className="flex-1">
      <Text className="px-4 pb-2 text-sm text-gray-500">
        {t('fx.ratesOf', { date: formatDate(query.data.date, locale) })}
      </Text>
      <FlashList
        data={rows}
        keyExtractor={(row) => row.code}
        renderItem={({ item }) => (
          <View
            accessible
            accessibilityLabel={t('fx.rowLabel', {
              code: item.code,
              name: item.name,
              value: item.value,
            })}
            testID={`fx-row-${item.code}`}
            className="h-16 flex-row items-center gap-3 border-b border-gray-200 px-4 dark:border-gray-800"
          >
            <LetterAvatar label={item.code} />
            <View className="flex-1">
              <Text className="text-base font-semibold text-black dark:text-white">
                {t('fx.unit', { code: item.code })}
              </Text>
              <Text className="text-sm text-gray-500">{item.name}</Text>
            </View>
            <Text className="text-base tabular-nums text-black dark:text-white">{item.value}</Text>
          </View>
        )}
      />
      <Text className="px-4 py-2 text-center text-xs text-gray-500">
        {t('market.source', { name: FX_SOURCE_NAME })}
      </Text>
    </View>
  );
}
