import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function ItemDetailsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Item Details</Text>
      {/* Display item info here */}
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
