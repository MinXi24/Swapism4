import { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import Navigation from '../navigation/Navigation';

export default function App() {
  const [fontsLoaded, setFontsLoaded] = useState(true); // Set to true since we're using system fonts

  // Remove all font loading code since we're using system fonts

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#9abeaa" />
      </View>
    );
  }

  return (
      <Navigation />
  );
}