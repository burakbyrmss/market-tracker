import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

type ScreenProps = {
  children: ReactNode;
  className?: string;
  edges?: Edge[];
  // Shows a header with a back button. The app draws its own headers, not the native stack's:
  // the native header covered the top of screen content on device.
  title?: string;
  // Replaces the router's back, for a screen shown in a modal.
  onBack?: () => void;
};

function ScreenHeader({ title, onBack }: { title: string; onBack?: () => void }) {
  const { t } = useTranslation();
  const router = useRouter();
  return (
    <View className="h-12 flex-row items-center border-b border-gray-200 px-1 dark:border-gray-800">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('common.back')}
        hitSlop={8}
        // A deep link opens a screen with nothing behind it, so back goes to the markets list.
        onPress={() => {
          if (onBack) onBack();
          else if (router.canGoBack()) router.back();
          else router.replace('/');
        }}
        className="h-11 w-11 items-center justify-center"
      >
        <Text className="text-3xl leading-9 text-blue-600">‹</Text>
      </Pressable>
      <Text
        accessibilityRole="header"
        numberOfLines={1}
        className="flex-1 text-center text-lg font-semibold text-black dark:text-white"
      >
        {title}
      </Text>
      <View className="w-11" />
    </View>
  );
}

// Every screen renders inside Screen so content never runs under the status bar, notch, or home indicator.
export function Screen({ children, className, edges, title, onBack }: ScreenProps) {
  return (
    <SafeAreaView
      className={`flex-1 bg-white dark:bg-black ${className ?? ''}`}
      {...(edges ? { edges } : {})}
    >
      {title !== undefined && <ScreenHeader title={title} {...(onBack ? { onBack } : {})} />}
      {children}
    </SafeAreaView>
  );
}
