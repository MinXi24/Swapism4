import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function SignUpScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sign Up</Text>
      {/* Add sign-up form here */}
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
