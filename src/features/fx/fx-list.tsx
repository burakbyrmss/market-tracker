import { FlashList } from '@shopify/flash-list';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';

import { fxRate, type FxRates } from '@/domain/fx';
import { displayCurrencyCode, type CurrencyCode } from '@/domain/ids';
import { useSettings } from '@/features/settings/store';
import { FX_SOURCE_NAME, fxQueries } from '@/services/fx';
import { formatDate, formatPrice } from '@/shared/format';
import { useCurrencyName, useFormatLocale } from '@/shared/i18n';
import { LetterAvatar } from '@/shared/ui/letter-avatar';
import { Notice } from '@/shared/ui/notice';

// One currency valued in the display currency: "1 USD = ₺38.12".
export function FxRateRow({
  code,
  fx,
  display,
}: {
  code: CurrencyCode;
  fx: FxRates;
  display: CurrencyCode;
}) {
  const { t } = useTranslation();
  const locale = useFormatLocale();
  const name = useCurrencyName()(code);
  const rate = fxRate(fx, code, display);
  const value = rate ? formatPrice(rate, display, locale) : '–';

  return (
    <Link href={{ pathname: '/fx/[code]', params: { code } }} asChild>
      <Pressable
        accessibilityLabel={t('fx.rowLabel', { code, name, value })}
        testID={`fx-row-${code}`}
        className="h-16 flex-row items-center gap-3 border-b border-gray-200 px-4 active:bg-gray-100 dark:border-gray-800 dark:active:bg-gray-900"
      >
        <LetterAvatar label={code} />
        <View className="flex-1">
          <Text className="text-base font-semibold text-black dark:text-white">
            {t('fx.unit', { code })}
          </Text>
          <Text className="text-sm text-gray-500">{name}</Text>
        </View>
        <Text className="text-base tabular-nums text-black dark:text-white">{value}</Text>
      </Pressable>
    </Link>
  );
}

// Every ECB currency except the display currency itself.
function listedCodes(fx: FxRates, display: CurrencyCode): CurrencyCode[] {
  return [fx.base, ...fx.rates.keys()]
    .filter((code) => code !== display && fxRate(fx, code, display) !== null)
    .sort();
}

export function FxList() {
  const { t } = useTranslation();
  const locale = useFormatLocale();
  const display = displayCurrencyCode(useSettings((state) => state.displayCurrency));
  const query = useQuery(fxQueries.latest());

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

  const fx = query.data;
  if (!fx) {
    return (
      <View className="flex-1 items-center justify-center">
        <Text className="text-base text-gray-500">{t('fx.loading')}</Text>
      </View>
    );
  }

  return (
    <View className="flex-1">
      <Text className="px-4 pb-2 text-sm text-gray-500">
        {t('fx.ratesOf', { date: formatDate(fx.date, locale) })}
      </Text>
      {query.isError && (
        <View className="px-4 pb-2">
          <Notice text={t('fx.savedRates')} onRetry={() => void query.refetch()} />
        </View>
      )}
      <FlashList
        data={listedCodes(fx, display)}
        keyExtractor={(code) => code}
        extraData={display}
        renderItem={({ item }) => <FxRateRow code={item} fx={fx} display={display} />}
      />
      <Text className="px-4 py-2 text-center text-xs text-gray-500">
        {t('market.source', { name: FX_SOURCE_NAME })}
      </Text>
    </View>
  );
}
