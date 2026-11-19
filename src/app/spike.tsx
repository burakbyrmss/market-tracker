// THROWAWAY M2 spike code. Never merge.
import { Circle } from '@shopify/react-native-skia';
import { FlashList } from '@shopify/flash-list';
import { memo, useMemo, useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { CartesianChart, Line, useChartPressState } from 'victory-native';

import { Screen } from '@/shared/ui/screen';
import { summarize, useFpsRun } from '@/spike/fps';
import { makeYear, ROW_IDS, useFakeTicker, usePriceStore } from '@/spike/prices';

type Variant = 'chart' | 'flatlist' | 'flashlist';
const RUN_SECONDS = 15;

const Row = memo(function Row({ id }: { id: string }) {
  const price = usePriceStore((s) => s.prices[id] ?? 0);
  const change = usePriceStore((s) => s.changes[id] ?? 0);
  return (
    <View className="h-14 flex-row items-center gap-3 px-3">
      <View className="h-8 w-8 items-center justify-center rounded-full bg-gray-200">
        <Text className="font-bold">{id.slice(0, 1)}</Text>
      </View>
      <Text className="flex-1 font-semibold text-black dark:text-white">{id}</Text>
      <Text className="w-24 text-right tabular-nums text-black dark:text-white">
        {price.toFixed(2)}
      </Text>
      <Text
        className={`w-20 text-right tabular-nums ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}
      >
        {change.toFixed(2)}%
      </Text>
    </View>
  );
});

function ChartVariant() {
  const data = useMemo(() => makeYear(), []);
  const { state } = useChartPressState({ x: 0, y: { price: 0 } });
  return (
    <View className="h-80 p-3">
      <CartesianChart data={data} xKey="day" yKeys={['price']} chartPressState={state}>
        {({ points }) => (
          <>
            <Line points={points.price} color="#2563eb" strokeWidth={2} />
            <Circle cx={state.x.position} cy={state.y.price.position} r={6} color="#2563eb" />
          </>
        )}
      </CartesianChart>
      <Text className="text-center text-gray-500">
        Drag your finger across the chart during the run.
      </Text>
    </View>
  );
}

export default function SpikeScreen() {
  const [variant, setVariant] = useState<Variant>('chart');
  const { live, running, result, start } = useFpsRun(RUN_SECONDS);
  useFakeTicker(variant !== 'chart');

  return (
    <Screen>
      <View className="flex-row gap-2 p-3">
        {(['chart', 'flatlist', 'flashlist'] as const).map((v) => (
          <Pressable
            key={v}
            onPress={() => setVariant(v)}
            className={`rounded-lg px-3 py-2 ${v === variant ? 'bg-blue-600' : 'bg-gray-200'}`}
          >
            <Text className={v === variant ? 'text-white' : 'text-black'}>{v}</Text>
          </Pressable>
        ))}
      </View>
      <View className="gap-2 px-3 pb-2">
        <Text className="text-black dark:text-white">
          live JS {live.js} fps · UI {live.ui} fps
        </Text>
        <Pressable
          onPress={start}
          disabled={running}
          className="items-center rounded-lg bg-gray-900 p-2.5"
        >
          <Text className="font-semibold text-white">
            {running ? 'Running…' : `Start ${RUN_SECONDS}s run`}
          </Text>
        </Pressable>
        {result && (
          <Text selectable className="text-black dark:text-white">
            {variant} · JS {summarize(result.js)}
            {'\n'}
            {variant} · UI {summarize(result.ui)}
          </Text>
        )}
      </View>
      {variant === 'chart' && <ChartVariant />}
      {variant === 'flatlist' && (
        <FlatList
          data={ROW_IDS}
          keyExtractor={(id) => id}
          renderItem={({ item }) => <Row id={item} />}
        />
      )}
      {variant === 'flashlist' && (
        <FlashList
          data={ROW_IDS}
          keyExtractor={(id) => id}
          renderItem={({ item }) => <Row id={item} />}
        />
      )}
    </Screen>
  );
}
