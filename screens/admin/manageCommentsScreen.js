import { StyleSheet, Text, View } from 'react-native';

export default function ManageCommentsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Manage Comments</Text>
      {/* Add comment management logic here */}
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
