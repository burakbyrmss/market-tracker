import { Link } from 'expo-router';
import { Text, View } from 'react-native';

import { Screen } from '@/shared/ui/screen';

export default function HomeScreen() {
  return (
    <Screen>
      <View className="flex-1 items-center justify-center gap-6">
        <Text
          accessibilityRole="header"
          className="text-2xl font-semibold text-black dark:text-white"
        >
          Market Tracker
        </Text>
        <Link href="/spike" className="text-lg text-blue-600">
          Open M2 performance spike
        </Link>
      </View>
    </Screen>
  );
}
