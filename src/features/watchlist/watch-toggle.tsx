import { useTranslation } from 'react-i18next';
import { Pressable, Text } from 'react-native';

export function WatchToggle({
  name,
  watched,
  onToggle,
  testID,
}: {
  name: string;
  watched: boolean;
  onToggle: () => void;
  testID: string;
}) {
  const { t } = useTranslation();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t(watched ? 'watchlist.remove' : 'watchlist.add', { name })}
      accessibilityState={{ selected: watched }}
      hitSlop={8}
      onPress={onToggle}
      testID={testID}
      className="h-11 w-11 items-center justify-center"
    >
      <Text className={`text-2xl ${watched ? 'text-yellow-500' : 'text-gray-400'}`}>
        {watched ? '★' : '☆'}
      </Text>
    </Pressable>
  );
}
