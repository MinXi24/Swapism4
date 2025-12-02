import { StyleSheet, Text, View } from 'react-native';

export default function AddPostScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Add New Post</Text>
      {/* Add form or upload logic here */}
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
