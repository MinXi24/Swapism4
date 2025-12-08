
import React from 'react';
import {
  Image,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { colors, fonts, spacing } from '../../lib/theme';

export default function WelcomeScreen({ navigation }) {
  const handleLogin = () => {
    navigation.navigate('Login');
  };

  const handleSignUp = () => {
    navigation.navigate('Signup');
  };

  const handleSkip = () => {
    navigation.navigate('Home');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor={colors.accent} barStyle="dark-content" />
      
      {/* Illustration - Full background */}
      <View style={styles.illustrationContainer}>
        <Image 
          source={require('../../assets/images/welcome.png')} 
          style={styles.illustration}
          resizeMode="cover"
        />
        
        {/* Logo overlaid on illustration */}
        <View style={styles.logoContainer}>
          <Image 
            source={require('../../assets/images/logo.png')} 
            style={styles.logo}
          />
        </View>
      </View>

      {/* Bottom Content Box */}
      <View style={styles.bottomBox}>
        {/* Description */}
        <Text style={styles.descriptionText}>Discover, swap, and try clothes virtually</Text>

        {/* Title */}
        <Text style={styles.title}>Welcome!</Text>

        {/* Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={styles.loginButton}
            onPress={handleLogin}
          >
            <Text style={styles.loginButtonText}>Login</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.signupButton}
            onPress={handleSignUp}
          >
            <Text style={styles.signupButtonText}>Sign Up</Text>
          </TouchableOpacity>
        </View>

        {/* Skip for now */}
        <TouchableOpacity onPress={handleSkip}>
          <Text style={styles.skipText}>Skip for now</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.accent,
    paddingTop: 0,
  },
  illustrationContainer: {
    height: '67%',
    position: 'relative',
  },
  illustration: {
    width: '100%',
    height: '100%',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  logoContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  logo: {
    width: 350,
    height: 250,
    resizeMode: 'contain',
  },
  logoBackground: {
    backgroundColor: 'rgba(255,255,255,0.4)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 15,
    transform: [{ rotate: '-5deg' }],
  },
  logoText: {
    fontFamily: fonts.header,
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.dark,
  },
  bottomBox: {
    backgroundColor: colors.light,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
  },
  descriptionText: {
    fontFamily: fonts.sub,
    fontSize: 13,
    color: colors.dark,
    textAlign: 'center',
    marginBottom: 8,
  },
  title: {
    fontFamily: fonts.header,
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.dark,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  buttonContainer: {
    marginBottom: 12,
  },
  loginButton: {
    backgroundColor: colors.dark,
    paddingVertical: spacing.md,
    borderRadius: 25,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  loginButtonText: {
    fontFamily: fonts.header,
    fontSize: 16,
    color: colors.light,
    fontWeight: 'bold',
  },
  signupButton: {
    backgroundColor: 'transparent',
    paddingVertical: spacing.md,
    borderRadius: 25,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.dark,
  },
  signupButtonText: {
    fontFamily: fonts.header,
    fontSize: 16,
    color: colors.dark,
    fontWeight: 'bold',
  },
  skipText: {
    fontFamily: fonts.sub,
    fontSize: 14,
    color: '#ff6b6b',
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
});
