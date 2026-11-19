import { cssInterop } from 'nativewind';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';

// NativeWind maps className to style only for React Native core components.
// Register every third-party component that takes className here, once.
cssInterop(SafeAreaView, { className: 'style' });
cssInterop(GestureHandlerRootView, { className: 'style' });
