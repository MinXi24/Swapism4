// screens/SplashScreen.js
import { useEffect } from 'react';
import { Image, StyleSheet, View } from 'react-native';

export default function SplashScreen({ onAnimationComplete }) {
  
  useEffect(() => {
    // Keep the splash screen visible for 2 seconds (2000ms)
    const timer = setTimeout(() => {
      if (onAnimationComplete) {
        onAnimationComplete();
      }
    }, 2000);

    
    return () => clearTimeout(timer); // Cleanup timer if component unmounts
  }, [onAnimationComplete]);

  return (
    <View style={styles.container}>
      <Image 
        source={require('../assets/images/logo.png')} 
        style={styles.logo} 
        resizeMode="contain" 
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 450,
    height: 450,
  },
});