import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';

// A banner for data that is older than it should be, such as saved prices shown offline.
export function Notice({ text, onRetry }: { text: string; onRetry?: () => void }) {
  const { t } = useTranslation();
  return (
    <View
      testID="stale-notice"
      className="flex-row items-center gap-3 rounded-lg bg-amber-100 px-3 py-2 dark:bg-amber-950"
    >
      <Text
        accessibilityLiveRegion="polite"
        className="flex-1 text-sm text-amber-900 dark:text-amber-100"
      >
        {text}
      </Text>
      {onRetry && (
        <Pressable accessibilityRole="button" onPress={onRetry} className="h-11 justify-center">
          <Text className="font-semibold text-blue-700 dark:text-blue-300">
            {t('market.retry')}
          </Text>
        </Pressable>
      )}
    </View>
  );
}
