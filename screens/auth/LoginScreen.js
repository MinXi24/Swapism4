import React, { useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import Icon from '../../assets/icons/icons';
import Button from '../../components/Button';
import Input from '../../components/Input';
import { colors, fonts, spacing } from '../../lib/theme';

// Firebase imports
import { sendPasswordResetEmail, signInWithEmailAndPassword, signOut } from 'firebase/auth'; // Added signOut
import { doc, getDoc, getFirestore } from 'firebase/firestore';
import { auth } from '../../firebaseConfig';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');

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

      // 2. Fetch User Profile & Role Check
      const db = getFirestore();
      const userDocRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        const userData = userDoc.data();
        
        // --- BAN CHECK START ---
        if (userData.isBanned === true) {
            await signOut(auth); // Kick them out
            setLoading(false);
            Alert.alert(
                "Account Suspended", 
                "Your account has been suspended due to violations of our community guidelines."
            );
            return; // Stop here
        }
        // --- BAN CHECK END ---

        Alert.alert('Success', 'Logged in successfully!');

        // Check if role is 'admin'
        if (userData.role === 'admin') {
          navigation.replace('AdminHome'); // Use replace to prevent going back to login
        } else {
          navigation.navigate('Home');
        }
      } else {
        // Default behavior if no user document exists (Safe fallback)
        Alert.alert('Success', 'Logged in successfully!');
        navigation.navigate('Home');
      }

    } catch (error) {
      let errorMessage = error.message;
      
      // Customize common Firebase errors
      if (error.code === 'auth/user-not-found') {
        errorMessage = "No account found with this email!";
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = "Incorrect password!";
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = "Please enter a valid email address.";
      } else if (error.code === 'auth/invalid-credential') {
        errorMessage = "Invalid email or password. Please check your credentials and try again. If you forgot your password, use 'Forgot Password' to reset it.";
      } else if (error.code === 'auth/user-disabled') {
        errorMessage = "This account has been disabled. Please contact support for assistance.";
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
    setResetEmail(email);
    setShowForgotPasswordModal(true);
  };

  const handleSendResetEmail = async () => {
    if (!resetEmail || !resetEmail.trim()) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    try {
      await sendPasswordResetEmail(auth, resetEmail.trim());
      setShowForgotPasswordModal(false);
      Alert.alert(
        'Success', 
        'Password reset email sent! Please check your inbox and follow the instructions to reset your password.',
        [{ text: 'OK' }]
      );
      setResetEmail('');
    } catch (error) {
      let errorMessage = error.message;
      
      if (error.code === 'auth/user-not-found') {
        errorMessage = 'No account found with this email address.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Please enter a valid email address.';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Too many attempts. Please try again later.';
      }

      Alert.alert('Error', errorMessage);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor={colors.secondary} barStyle="dark-content" />
      
      <View style={[styles.content, {backgroundColor: '#F5F3E4', borderBottomLeftRadius: 30, borderBottomRightRadius: 30}]}> 
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

      {/* Forgot Password Modal */}
      <Modal
        visible={showForgotPasswordModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowForgotPasswordModal(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowForgotPasswordModal(false)}
        >
          <TouchableOpacity 
            style={styles.modalContent}
            activeOpacity={1}
          >
            <Text style={styles.modalTitle}>Forgot Password</Text>
            <Text style={styles.modalSubtitle}>
              Enter your email address to receive a password reset link:
            </Text>
            
            <TextInput
              style={styles.modalInput}
              placeholder="Email"
              value={resetEmail}
              onChangeText={setResetEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoFocus={true}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => {
                  setShowForgotPasswordModal(false);
                  setResetEmail('');
                }}
              >
                <Text style={styles.modalButtonTextCancel}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton, styles.modalButtonSend]}
                onPress={handleSendResetEmail}
              >
                <Text style={styles.modalButtonTextSend}>Send Reset Link</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
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
    marginBottom: spacing.md,
  },
  illustration: {
    width: 340,
    height: 160,
  },
  formContainer: {
    flex: 1,
  },
  input: {
    marginBottom: spacing.sm,
  },
  loginButton: {
    marginTop: spacing.md,
    marginBottom: spacing.lg,
    paddingVertical: spacing.sm,
  },
  linksContainer: {
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.sm,
    gap: 8,
  },
  forgotPassword: {
    fontFamily: fonts.sub,
    fontSize: 14,
    color: '#ff6b6b',
    textDecorationLine: 'underline',
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
    marginBottom: spacing.md,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: spacing.lg,
    width: '85%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    fontFamily: fonts.semiBold,
    color: colors.dark,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.gray,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#dbdbdb',
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 16,
    fontFamily: fonts.regular,
    marginBottom: spacing.lg,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  modalButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonCancel: {
    backgroundColor: '#f0f0f0',
  },
  modalButtonSend: {
    backgroundColor: colors.accent,
  },
  modalButtonTextCancel: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: fonts.semiBold,
    color: colors.dark,
  },
  modalButtonTextSend: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: fonts.semiBold,
    color: '#fff',
  },
});