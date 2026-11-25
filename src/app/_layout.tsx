import '../global.css';
import '@/shared/i18n';
import '@/shared/ui/interop';

import { QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { useColorScheme } from 'nativewind';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { useMarketData } from '@/features/market/use-market-data';
import { startSettings } from '@/features/settings/apply';
import { startCrashReports } from '@/services/crash-reports';
import { cryptoPersisted } from '@/services/market-data';
import { fxPersisted } from '@/services/fx';
import { queryClient } from '@/shared/query';
import { persistQueryCache } from '@/shared/query/persist';

startCrashReports();
startSettings();
persistQueryCache(queryClient, [...fxPersisted, ...cryptoPersisted]);

export default function RootLayout() {
  const { colorScheme } = useColorScheme();
  useMarketData();
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <GestureHandlerRootView className="flex-1">
          {/* Screens draw their own header through Screen's `title`. */}
          <Stack screenOptions={{ headerShown: false }} />
        </GestureHandlerRootView>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
