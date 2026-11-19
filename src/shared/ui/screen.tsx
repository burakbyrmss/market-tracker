import type { ReactNode } from 'react';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

type ScreenProps = {
  children: ReactNode;
  className?: string;
  edges?: Edge[];
};

// Every screen renders inside Screen so content never runs under the status bar, notch, or home indicator.
export function Screen({ children, className, edges }: ScreenProps) {
  return (
    <SafeAreaView
      className={`flex-1 bg-white dark:bg-black ${className ?? ''}`}
      {...(edges ? { edges } : {})}
    >
      {children}
    </SafeAreaView>
  );
}
