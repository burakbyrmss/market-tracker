import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View, type GestureResponderEvent } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';

import type { PricePoint } from '@/domain/market';
import { formatPercentChange } from '@/shared/format';
import { useFormatLocale } from '@/shared/i18n';

import { chartGeometry, nearestIndex, rangeChange } from './geometry';

const CHART_HEIGHT = 200;
const PADDING = 8;
// Tailwind green-600, red-600, and gray-400: SVG takes colors as props, not class names.
const RISING = '#16a34a';
const FALLING = '#dc2626';
const CURSOR = '#9ca3af';

type LineChartProps = {
  points: readonly PricePoint[];
  rangeName: string;
  formatValue: (value: number) => string;
  formatTime: (time: number) => string;
};

export function LineChart({ points, rangeName, formatValue, formatTime }: LineChartProps) {
  const { t } = useTranslation();
  const locale = useFormatLocale();
  const [width, setWidth] = useState(0);
  const [scrub, setScrub] = useState<number | null>(null);

  const geometry = useMemo(
    () =>
      width > 0 ? chartGeometry(points, { width, height: CHART_HEIGHT, padding: PADDING }) : null,
    [points, width],
  );
  const change = rangeChange(points);
  const color = (change ?? 0) < 0 ? FALLING : RISING;
  const prices = points.map((point) => point.price);
  const first = points[0];
  const last = points.at(-1);
  if (!first || !last) return null;

  const scrubbed = scrub === null ? null : points[scrub];
  const cursor = scrub === null ? null : geometry?.positions[scrub];
  const follow = (event: GestureResponderEvent) => {
    if (geometry) setScrub(nearestIndex(geometry.positions, event.nativeEvent.locationX));
  };

  return (
    <View className="gap-2">
      <View className="h-12 justify-center">
        <Text
          testID="chart-value"
          className="text-lg font-semibold tabular-nums text-black dark:text-white"
        >
          {formatValue((scrubbed ?? last).price)}
        </Text>
        <Text testID="chart-caption" className="text-sm text-gray-500">
          {scrubbed
            ? formatTime(scrubbed.time)
            : change === null
              ? ''
              : t('chart.change', {
                  change: formatPercentChange(change, locale),
                  range: rangeName,
                })}
        </Text>
      </View>
      <View
        testID="price-chart"
        accessible
        accessibilityRole="image"
        accessibilityLabel={t('chart.summary', {
          range: rangeName,
          first: formatValue(first.price),
          last: formatValue(last.price),
          high: formatValue(Math.max(...prices)),
          low: formatValue(Math.min(...prices)),
        })}
        onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
        // A finger on the chart reads the price under it. The chart keeps the touch while the
        // finger moves, so the page does not scroll away mid-read.
        onStartShouldSetResponder={() => true}
        onResponderTerminationRequest={() => false}
        onResponderGrant={follow}
        onResponderMove={follow}
        onResponderRelease={() => setScrub(null)}
        onResponderTerminate={() => setScrub(null)}
        className="h-[200px] w-full"
      >
        {geometry && (
          <Svg width={width} height={CHART_HEIGHT}>
            <Path d={geometry.path} stroke={color} strokeWidth={2} fill="none" />
            {cursor && (
              <>
                <Line
                  x1={cursor.x}
                  x2={cursor.x}
                  y1={0}
                  y2={CHART_HEIGHT}
                  stroke={CURSOR}
                  strokeWidth={1}
                />
                <Circle cx={cursor.x} cy={cursor.y} r={4} fill={color} />
              </>
            )}
          </Svg>
        )}
      </View>
    </View>
  );
}
