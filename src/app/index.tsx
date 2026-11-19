import { Text, View } from 'react-native';

import { Screen } from '@/shared/ui/screen';

export default function HomeScreen() {
  return (
    <Screen>
      <View className="flex-1 items-center justify-center">
        <Text
          accessibilityRole="header"
          className="text-2xl font-semibold text-black dark:text-white"
        >
          Market Tracker
        </Text>
      </View>
    </Screen>
  );
}
