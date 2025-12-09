import { StyleSheet, Text, View } from 'react-native';

export default function GuestEntryScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Continue as Guest</Text>
      {/* Add guest access logic here */}
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
    fontSize: 24,
    fontWeight: 'bold',
  },
});