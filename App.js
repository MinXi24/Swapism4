// App.js
import * as Font from 'expo-font';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { AuthProvider } from './context/GuestContext';
import Navigation from './navigation/Navigation';
import SplashScreen from './screens/SplashScreen';

export default function App() {
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    async function loadFonts() {
      await Font.loadAsync({
        'Georgia': require('./assets/fonts/Georgia-Bold.ttf'),
        'TimesNewRoman': require('./assets/fonts/TimesNewRoman-Regular.ttf'),
      });
      setFontsLoaded(true);
    }

    loadFonts();
  }, []);

  if (!fontsLoaded || showSplash) {
    if (!fontsLoaded) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#9abeaa" />
        </View>
      );
    }

    return <SplashScreen onAnimationComplete={() => setShowSplash(false)} />;
  }

  return (
      <AuthProvider>
        <Navigation />
      </AuthProvider>
  );
}