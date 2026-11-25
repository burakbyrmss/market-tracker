import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';

import type { ChartRange, FxRange, PricePoint } from '@/domain/market';

import { Notice } from '@/shared/ui/notice';

import { LineChart } from './line-chart';

type ChartQuery = {
  data: PricePoint[] | undefined;
  dataUpdatedAt: number;
  isError: boolean;
  refetch: () => unknown;
};

type ChartSectionProps<Range extends ChartRange | FxRange> = {
  ranges: readonly Range[];
  range: Range;
  onRange: (range: Range) => void;
  query: ChartQuery;
  // Which pair and source the chart plots, such as "Chart: BTC/USDT on Binance".
  note: string;
  formatValue: (value: number) => string;
  formatTime: (time: number, range: Range) => string;
  // When the shown chart was fetched, for the notice on a saved chart that could not update.
  formatSavedAt: (time: number) => string;
};

function Placeholder({ children }: { children: ReactNode }) {
  // Same height as a chart with its readout, so switching ranges does not shift the page.
  return <View className="h-[256px] items-center justify-center gap-3">{children}</View>;
}

export function ChartSection<Range extends ChartRange | FxRange>({
  ranges,
  range,
  onRange,
  query,
  note,
  formatValue,
  formatTime,
  formatSavedAt,
}: ChartSectionProps<Range>) {
  const { t } = useTranslation();
  // Plain union parameters: typed translation keys do not resolve through the generic.
  const nameOf = (option: ChartRange | FxRange) => t(`chart.rangeName.${option}`);
  const labelOf = (option: ChartRange | FxRange) => t(`chart.range.${option}`);
  const rangeName = nameOf(range);

  let body: ReactNode;
  if (query.data === undefined && query.isError) {
    body = (
      <Placeholder>
        <Text className="text-base text-gray-500 dark:text-gray-400">{t('chart.unavailable')}</Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => void query.refetch()}
          className="rounded-lg bg-blue-600 px-4 py-2"
        >
          <Text className="font-semibold text-white">{t('market.retry')}</Text>
        </Pressable>
      </Placeholder>
    );
  } else if (query.data === undefined) {
    body = (
      <Placeholder>
        <Text className="text-base text-gray-500 dark:text-gray-400">{t('chart.loading')}</Text>
      </Placeholder>
    );
  } else if (query.data.length < 2) {
    body = (
      <Placeholder>
        <Text className="text-base text-gray-500 dark:text-gray-400">{t('chart.empty')}</Text>
      </Placeholder>
    );
  } else {
    body = (
      <LineChart
        // A new range starts without a finger cursor from the last one.
        key={range}
        points={query.data}
        rangeName={rangeName}
        formatValue={formatValue}
        formatTime={(time) => formatTime(time, range)}
      />
    );
  }

  return (
    <View className="gap-3">
      {query.isError && query.data !== undefined && (
        <Notice
          text={t('chart.saved', { time: formatSavedAt(query.dataUpdatedAt) })}
          onRetry={() => void query.refetch()}
        />
      )}
      {body}
      <View
        accessibilityRole="tablist"
        className="flex-row rounded-lg bg-gray-100 p-1 dark:bg-gray-900"
      >
        {ranges.map((option) => {
          const selected = option === range;
          return (
            <Pressable
              key={option}
              accessibilityRole="tab"
              accessibilityLabel={nameOf(option)}
              accessibilityState={{ selected }}
              testID={`chart-range-${option}`}
              onPress={() => onRange(option)}
              className={`flex-1 items-center rounded-md py-2 ${selected ? 'bg-white dark:bg-gray-700' : ''}`}
            >
              <Text
                className={`text-sm font-semibold ${selected ? 'text-black dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}
              >
                {labelOf(option)}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Text className="text-xs text-gray-500 dark:text-gray-400">{note}</Text>
    </View>
  );
}
