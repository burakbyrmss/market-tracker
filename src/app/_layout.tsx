import '../global.css';
import '@/shared/i18n';
import '@/shared/ui/interop';

import { QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { useColorScheme } from 'nativewind';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { useMarketData } from '@/features/market/use-market-data';
import { startSettings } from '@/features/settings/apply';
import { queryClient } from '@/shared/query';

startSettings();

export default function RootLayout() {
  const { colorScheme } = useColorScheme();
  useMarketData();
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <GestureHandlerRootView className="flex-1">
          {/* Headers are set here, before a screen mounts. Turning one on from inside a screen
              changes it after the content is laid out, and the header then covered the top of
              Settings. */}
          <Stack screenOptions={{ headerBackButtonDisplayMode: 'minimal' }}>
            <Stack.Screen name="index" options={{ headerShown: false }} />
          </Stack>
        </GestureHandlerRootView>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
