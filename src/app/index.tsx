import { Link } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text accessibilityRole="header" style={styles.title}>
        Market Tracker
      </Text>
      <Link href="/spike" style={styles.link}>
        Open M2 performance spike
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 24 },
  title: { fontSize: 24, fontWeight: '600' },
  link: { fontSize: 18, color: '#2563eb' },
});
