import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import Navigation from '../navigation/Navigation';
import SplashScreen from '../screens/SplashScreen';

export default function App() {
  const [fontsLoaded, setFontsLoaded] = useState(true); // Set to true since we're using system fonts
  const [showSplash, setShowSplash] = useState(true);

  // Remove all font loading code since we're using system fonts

  useEffect(() => {
    // Show splash screen for 2.5 seconds
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#9abeaa" />
      </View>
    );
  }

  if (showSplash) {
    return <SplashScreen />;
  }

  return (
      <Navigation />
  );
}