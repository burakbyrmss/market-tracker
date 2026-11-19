// THROWAWAY M2 spike code. Never merge.
import { Circle } from '@shopify/react-native-skia';
import { FlashList } from '@shopify/flash-list';
import { memo, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { CartesianChart, Line, useChartPressState } from 'victory-native';

import { summarize, useFpsRun } from '@/spike/fps';
import { makeYear, ROW_IDS, useFakeTicker, usePriceStore } from '@/spike/prices';

type Variant = 'chart' | 'flatlist' | 'flashlist';
const RUN_SECONDS = 15;

const Row = memo(function Row({ id }: { id: string }) {
  const price = usePriceStore((s) => s.prices[id] ?? 0);
  const change = usePriceStore((s) => s.changes[id] ?? 0);
  return (
    <View style={styles.row}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{id.slice(0, 1)}</Text>
      </View>
      <Text style={styles.name}>{id}</Text>
      <Text style={styles.price}>{price.toFixed(2)}</Text>
      <Text style={[styles.change, { color: change >= 0 ? '#16a34a' : '#dc2626' }]}>
        {change.toFixed(2)}%
      </Text>
    </View>
  );
});

function ChartVariant() {
  const data = useMemo(() => makeYear(), []);
  const { state } = useChartPressState({ x: 0, y: { price: 0 } });
  return (
    <View style={styles.chart}>
      <CartesianChart data={data} xKey="day" yKeys={['price']} chartPressState={state}>
        {({ points }) => (
          <>
            <Line points={points.price} color="#2563eb" strokeWidth={2} />
            <Circle cx={state.x.position} cy={state.y.price.position} r={6} color="#2563eb" />
          </>
        )}
      </CartesianChart>
      <Text style={styles.hint}>Drag your finger across the chart during the run.</Text>
    </View>
  );
}

export default function SpikeScreen() {
  const [variant, setVariant] = useState<Variant>('chart');
  const { live, running, result, start } = useFpsRun(RUN_SECONDS);
  useFakeTicker(variant !== 'chart');

  return (
    <View style={styles.screen}>
      <View style={styles.tabs}>
        {(['chart', 'flatlist', 'flashlist'] as const).map((v) => (
          <Pressable
            key={v}
            onPress={() => setVariant(v)}
            style={[styles.tab, v === variant && styles.tabActive]}
          >
            <Text style={v === variant ? styles.tabTextActive : undefined}>{v}</Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.meter}>
        <Text>
          live JS {live.js} fps · UI {live.ui} fps
        </Text>
        <Pressable onPress={start} disabled={running} style={styles.run}>
          <Text style={styles.runText}>{running ? 'Running…' : `Start ${RUN_SECONDS}s run`}</Text>
        </Pressable>
        {result && (
          <Text selectable>
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
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  tabs: { flexDirection: 'row', gap: 8, padding: 12 },
  tab: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: '#e5e7eb' },
  tabActive: { backgroundColor: '#2563eb' },
  tabTextActive: { color: 'white' },
  meter: { paddingHorizontal: 12, gap: 8, paddingBottom: 8 },
  run: { backgroundColor: '#111827', padding: 10, borderRadius: 8, alignItems: 'center' },
  runText: { color: 'white', fontWeight: '600' },
  chart: { height: 320, padding: 12 },
  hint: { textAlign: 'center', color: '#6b7280' },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, height: 56, gap: 12 },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontWeight: '700' },
  name: { flex: 1, fontWeight: '600' },
  price: { width: 90, textAlign: 'right', fontVariant: ['tabular-nums'] },
  change: { width: 70, textAlign: 'right', fontVariant: ['tabular-nums'] },
});
