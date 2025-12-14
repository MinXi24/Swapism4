// App.js
import { NavigationContainer } from '@react-navigation/native';
import * as Font from 'expo-font';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import Navigation from './navigation/Navigation';
import SplashScreen from './screens/SplashScreen';

export default function App() {
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    async function loadFonts() {
      await Font.loadAsync({
        'Georgia': require('./assets/fonts/Georgia.ttf'),
        'TimesNewRoman': require('./assets/fonts/TimesNewRoman.ttf'),
      });
      setFontsLoaded(true);
    }

    loadFonts();
  }, []);

  useEffect(() => {
    if (fontsLoaded) {
      // Show splash screen for 2.5 seconds after fonts are loaded
      const timer = setTimeout(() => {
        setShowSplash(false);
      }, 2500);

      return () => clearTimeout(timer);
    }
  }, [fontsLoaded]);

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
    <NavigationContainer>
      <Navigation />
    </NavigationContainer>
  );
}
