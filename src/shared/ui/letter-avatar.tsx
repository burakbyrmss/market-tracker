import { Text, View } from 'react-native';

// Full class names, so Tailwind finds them when it scans the source.
const COLORS = [
  'bg-blue-600',
  'bg-emerald-600',
  'bg-amber-600',
  'bg-rose-600',
  'bg-violet-600',
  'bg-cyan-700',
  'bg-orange-600',
  'bg-slate-600',
];

function colorFor(label: string): string {
  let hash = 0;
  for (const char of label) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return COLORS[hash % COLORS.length] ?? 'bg-slate-600';
}

// Stands in for a coin logo until M14 bundles real logos. The same ticker always gets the same
// color. Decorative: the row's label already names the coin.
export function LetterAvatar({ label }: { label: string }) {
  return (
    <View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      className={`h-9 w-9 items-center justify-center rounded-full ${colorFor(label)}`}
    >
      <Text className="text-base font-bold text-white">{label.slice(0, 1)}</Text>
    </View>
  );
}
