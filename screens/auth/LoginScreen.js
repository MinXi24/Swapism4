import React, { useState } from 'react';
import {
  Alert,
  Image,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import Icon from '../../assets/icons/icons';
import Button from '../../components/Button';
import Input from '../../components/Input';
import { colors, fonts, spacing } from '../../lib/theme';

// Firebase imports
import { signInWithEmailAndPassword } from 'firebase/auth';
// --- NEW IMPORTS START ---
import { doc, getDoc, getFirestore } from 'firebase/firestore';
// --- NEW IMPORTS END ---
import { auth } from '../../firebaseConfig';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);

    try {
      // 1. Sign in with Firebase Auth
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // --- NEW ADMIN ROLE CHECK START ---
      const db = getFirestore();
      const userDocRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userDocRef);

      Alert.alert('Success', 'Logged in successfully!');

      if (userDoc.exists()) {
        const userData = userDoc.data();
        
        // Check if role is 'admin'
        if (userData.role === 'admin') {
          navigation.replace('AdminHome'); // Use replace to prevent going back to login
        } else {
          navigation.navigate('Home');
        }
      } else {
        // Default behavior if no user document exists
        navigation.navigate('Home');
      }
      // --- NEW ADMIN ROLE CHECK END ---

    } catch (error) {
      let errorMessage = error.message;
      
      // Customize common Firebase errors
      if (error.code === 'auth/user-not-found') {
        errorMessage = "No account found with this email!";
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = "Incorrect password!";
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = "Please enter a valid email address.";
      }

      Alert.alert('Login Failed', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = (provider) => {
    Alert.alert('Coming Soon', `${provider} login will be implemented soon!`);
  };

  const handleSignUpRedirect = () => {
    navigation.navigate('Signup');
  };

  const handleForgotPassword = () => {
    Alert.alert('Forgot Password', 'Password reset feature coming soon!');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor={colors.secondary} barStyle="dark-content" />
      
      <View style={styles.content}>
        {/* Back Button */}
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color={colors.dark} />
        </TouchableOpacity>

        {/* Logo and Branding */}
        <View style={styles.logoContainer}>
          <Image 
            source={require('../../assets/images/logo.png')} 
            style={styles.logo}
          />
        </View>

        {/* Title */}
        <View style={styles.titleContainer}>
          <Text style={styles.title}>Welcome Back</Text>
        </View>

        {/* Illustration */}
        <View style={styles.illustrationContainer}>
          <Image 
            source={require('../../assets/images/login.png')} 
            style={styles.illustration}
            resizeMode="contain"
          />
        </View>

        {/* Form */}
        <View style={styles.formContainer}>
          <Input
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            style={styles.input}
          />
          
          <Input
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            style={styles.input}
          />

          {/* Login Button */}
          <Button
            title="Log In"
            onPress={handleLogin}
            disabled={loading}
            style={styles.loginButton}
          />

          {/* Forgot Password & Sign Up Links */}
          <View style={styles.linksContainer}>
            <TouchableOpacity onPress={handleForgotPassword}>
              <Text style={styles.forgotPassword}>Forgot Password</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleSignUpRedirect}>
              <Text style={styles.signUpLink}>Sign up</Text>
            </TouchableOpacity>
          </View>

          {/* Divider */}
          <View style={styles.dividerContainer}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Social Login */}
          <View style={styles.socialContainer}>
            <TouchableOpacity 
              style={styles.socialButton}
              onPress={() => handleSocialLogin('Google')}
            >
              <Icon name="logo-google" size={32} color={colors.dark} />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.socialButton}
              onPress={() => handleSocialLogin('Apple')}
            >
              <Icon name="logo-apple" size={32} color={colors.dark} />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.socialButton}
              onPress={() => handleSocialLogin('Facebook')}
            >
              <Icon name="logo-facebook" size={32} color="#1877F2" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.secondary,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.sm,
  },
  backButton: {
    padding: spacing.sm,
    marginTop: spacing.sm,
    marginBottom: 0,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: -10,
  },
  logo: {
    width: 250,
    height: 150,
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  title: {
    fontFamily: fonts.header,
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.dark,
  },
  illustrationContainer: {
    alignItems: 'center',
    marginBottom: -10,
  },
  // --- CONFLICT REMOVED HERE ---
  illustration: {
    width: 240,
    height: 160,
  },
  formContainer: {
    flex: 1,
  },
  input: {
    marginBottom: spacing.sm,
  },
  loginButton: {
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
    paddingVertical: spacing.sm,
  },
  linksContainer: {
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.sm,
    gap: 4,
  },
  forgotPassword: {
    fontFamily: fonts.sub,
    fontSize: 14,
    color: '#ff6b6b',
  },
  signUpLink: {
    fontFamily: fonts.sub,
    fontSize: 14,
    color: '#ff6b6b',
    fontWeight: 'bold',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.gray,
    opacity: 0.3,
  },
  dividerText: {
    fontFamily: fonts.sub,
    fontSize: 14,
    color: colors.gray,
    marginHorizontal: spacing.md,
  },
  socialContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.lg,
    paddingTop: 0,
    paddingBottom: spacing.md,
  },
  socialButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.dark,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
});