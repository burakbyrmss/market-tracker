import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, Text, View } from 'react-native';

import { fxRate } from '@/domain/fx';
import { displayCurrencyCode, type CurrencyCode } from '@/domain/ids';
import { FX_RANGES, type FxRange } from '@/domain/market';
import { decimal } from '@/domain/money';
import { ChartSection } from '@/features/chart/chart-section';
import { useSettings } from '@/features/settings/store';
import { FX_SOURCE_NAME, fxQueries } from '@/services/fx';
import { formatChartTime, formatDate, formatPrice } from '@/shared/format';
import { useCurrencyName, useFormatLocale } from '@/shared/i18n';
import { Screen } from '@/shared/ui/screen';

const USD = displayCurrencyCode('USD');
const EUR = displayCurrencyCode('EUR');

// A currency is valued in the display currency. The display currency itself is valued in USD,
// or in EUR when it is USD, so its chart is never a flat line at 1.
function quoteFor(code: CurrencyCode, display: CurrencyCode): CurrencyCode {
  if (code !== display) return display;
  return code === USD ? EUR : USD;
}

function Message({ title, text }: { title: string; text: string }) {
  return (
    <Screen title={title}>
      <View className="flex-1 items-center justify-center px-8">
        <Text className="text-center text-base text-gray-500">{text}</Text>
      </View>
    </Screen>
  );
}

function FxChart({ code, quote }: { code: CurrencyCode; quote: CurrencyCode }) {
  const { t } = useTranslation();
  const locale = useFormatLocale();
  const [range, setRange] = useState<FxRange>('1M');
  const query = useQuery(fxQueries.history(code, quote, range));
  return (
    <ChartSection
      ranges={FX_RANGES}
      range={range}
      onRange={setRange}
      query={query}
      note={t('chart.pair', { pair: `${code}/${quote}`, source: FX_SOURCE_NAME })}
      formatValue={(value) => formatPrice(decimal(value), quote, locale)}
      formatTime={(time) => formatChartTime(time, locale, { withTime: false, utc: true })}
    />
  );
}

export function FxDetail({ code }: { code: CurrencyCode }) {
  const { t } = useTranslation();
  const locale = useFormatLocale();
  const name = useCurrencyName()(code);
  const display = displayCurrencyCode(useSettings((state) => state.displayCurrency));
  const latest = useQuery(fxQueries.latest());
  const fx = latest.data;
  const quote = quoteFor(code, display);

  if (!fx) {
    return <Message title={code} text={t(latest.isError ? 'fx.unavailable' : 'fx.loading')} />;
  }
  const rate = fxRate(fx, code, quote);
  if (!rate) return <Message title={code} text={t('fxDetail.notListed', { code })} />;

  return (
    <Screen title={code}>
      <ScrollView contentContainerClassName="gap-6 p-4">
        <View className="gap-1">
          <Text className="text-base text-gray-500">{name}</Text>
          <Text
            testID="fx-detail-rate"
            className="text-4xl font-bold tabular-nums text-black dark:text-white"
          >
            {t('fx.unit', { code })} = {formatPrice(rate, quote, locale)}
          </Text>
          <Text className="text-sm text-gray-500">
            {t('fxDetail.rateOf', { date: formatDate(fx.date, locale) })}
          </Text>
        </View>
        <FxChart code={code} quote={quote} />
      </ScrollView>
    </Screen>
  );
}
