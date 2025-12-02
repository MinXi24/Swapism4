import { StyleSheet, Text, View } from 'react-native';

export default function SwapHistoryScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Swap History</Text>
      {/* Add swap history list or logic here */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
});
