import '../global.css';
import '@/shared/i18n';
import '@/shared/ui/interop';

import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { useColorScheme } from 'nativewind';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { startSettings } from '@/features/settings/apply';

startSettings();

export default function RootLayout() {
  const { colorScheme } = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <GestureHandlerRootView className="flex-1">
        <Stack screenOptions={{ headerShown: false, headerBackButtonDisplayMode: 'minimal' }} />
      </GestureHandlerRootView>
    </ThemeProvider>
  );
}
