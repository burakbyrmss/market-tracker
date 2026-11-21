import { focusManager, QueryClient } from '@tanstack/react-query';
import { AppState } from 'react-native';

// TanStack Query owns REST data (ADR 0003). The cache persists to MMKV in M13.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 2 },
  },
});

// React Native has no window focus. Treat returning to the foreground as focus, so stale
// queries refetch when the user comes back.
focusManager.setEventListener((setFocused) => {
  const subscription = AppState.addEventListener('change', (state) => {
    setFocused(state === 'active');
  });
  return () => subscription.remove();
});
