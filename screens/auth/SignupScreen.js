import { useState } from 'react';
import {
  Alert,
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import Icon from '../../assets/icons/icons';
import Button from '../../components/Button';
import Input from '../../components/Input';
import { colors, fonts, spacing } from '../../lib/theme';

//firebase imports
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { ref, set } from 'firebase/database';
import { doc, getFirestore, setDoc } from 'firebase/firestore';
import { auth, db } from '../../firebaseConfig';


export default function SignUpScreen({ navigation }) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  
  // Added loading state to prevent double-clicks
  const [loading, setLoading] = useState(false);

  // logic for signing up user
  const handleSignUp = async () => {
    // basic validation
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    
    if (!acceptTerms) {
      Alert.alert('Error', 'Please accept the Terms & Conditions');
      return;
    }

    setLoading(true);

    try {
      // create user in firebase auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      //save user info in realtime database
      // Using the user.uid ensures the DB entry matches the Auth ID
      await set(ref(db, 'users/' + user.uid), {
        email: email,
        createdAt: new Date().toISOString()
      });

      // Also save to Firestore for easy access
      // Username will be set during ProfileSetup
      const firestore = getFirestore();
      await setDoc(doc(firestore, 'users', user.uid), {
        email: email,
        createdAt: new Date(),
        bio: '',
        location: 'Singapore',
        area: ''
      });

      Alert.alert('Success', 'Account created successfully!');
      navigation.navigate('ProfileSetup');

    } catch (error) {
      // handling errors
      let errorMessage = error.message;
      
      // Customize common Firebase errors
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = "That email address is already in use!";
      } else if (error.code === 'auth/weak-password') {
        errorMessage = "Password should be at least 6 characters.";
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = "Please enter a valid email address.";
      }

      Alert.alert('Registration Failed', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = (provider) => {
    console.log(`Login with ${provider}`);
    // Implement social login logic here
  };

  const handleLoginRedirect = () => {
    navigation.navigate('Login'); 
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Icon name="arrow-back" size={24} color={colors.dark} />
          </TouchableOpacity>
        </View>

        {/* Logo and Branding */}
        <View style={styles.logoContainer}>
          <Image 
            source={require('../../assets/images/logo.png')} 
            style={styles.logo}
          />
        </View>

        {/* Title and Subtitle */}
        <View style={styles.titleContainer}>
          <Text style={styles.title}>Join Swapism</Text>
          <Text style={styles.subtitle}>Try clothes on virtually</Text>
        </View>

        {/* Illustration */}
        <View style={styles.illustrationContainer}>
          <Image 
            source={require('../../assets/images/regi.png')} 
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

          {/* Terms and Conditions */}
          <TouchableOpacity 
            style={styles.termsContainer}
            onPress={() => setAcceptTerms(!acceptTerms)}
          >
            <View style={[styles.checkbox, acceptTerms && styles.checkboxChecked]}>
              {acceptTerms && (
                <Icon name="checkmark" size={12} color={colors.light} />
              )}
            </View>
            <Text style={styles.termsText}>
              I accept the <Text style={styles.termsLink}>T&C</Text>
            </Text>
          </TouchableOpacity>

          {/* Create Account Button */}
          <Button
            title="Create Account"
            onPress={handleSignUp}
            style={styles.createButton}
          />

          {/* Login Redirect */}
          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>Already have an account? </Text>
            <TouchableOpacity onPress={handleLoginRedirect}>
              <Text style={styles.loginLink}>Log in</Text>
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
              <Icon name="logo-google" size={24} color="#DB4437" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.socialButton}
              onPress={() => handleSocialLogin('Apple')}
            >
              <Icon name="logo-apple" size={24} color={colors.dark} />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.socialButton}
              onPress={() => handleSocialLogin('Facebook')}
            >
              <Icon name="logo-facebook" size={24} color="#1877F2" />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Box - Added background color #F5F3E4 */}
      <View style={[styles.bottomBox, {backgroundColor: '#F5F3E4'}]}>
        {/* Description */}
        <Text style={styles.description}>
          By signing up, you agree to our {' '}
          <Text style={styles.link}>Terms of Service</Text> and {' '}
          <Text style={styles.link}>Privacy Policy</Text>
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.secondary,
  },
  scrollContent: {
    flex: 1,
    paddingHorizontal: spacing.sm,
    paddingTop: 0,
  },
  header: {
    paddingTop: 0,
    paddingBottom: 0,
  },
  backButton: {
    padding: spacing.sm,
    marginBottom: -8,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 0,
    marginTop: -8,
  },
  logoBackground: {
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    transform: [{ rotate: '-5deg' }],
  },
  logoText: {
    fontFamily: fonts.header,
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.dark,
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontFamily: fonts.header,
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.dark,
    marginBottom: 4,
  },
  subtitle: {
    fontFamily: fonts.sub,
    fontSize: 16,
    color: colors.gray,
  },
  illustrationContainer: {
    alignItems: 'center',
    marginBottom: 0,
  },
  logo: {
    width: 250,
    height: 150,
  },
  illustration: {
    width: 300,
    height: 200,
  },
  formContainer: {
    flex: 1,
  },
  input: {
    marginBottom: 8,  
  },
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: spacing.sm,
  },
  checkbox: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.accent,
    marginRight: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: colors.accent,
  },
  termsText: {
    fontFamily: fonts.sub,
    fontSize: 14,
    color: colors.dark,
  },
  termsLink: {
    color: '#ff6b6b',
    fontWeight: 'bold',
  },
  createButton: {
    marginBottom: 12,
    paddingVertical: 12,
  },
  loginContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  loginText: {
    fontFamily: fonts.sub,
    fontSize: 14,
    color: colors.dark,
  },
  loginLink: {
    fontFamily: fonts.sub,
    fontSize: 14,
    color: '#ff6b6b',
    fontWeight: 'bold',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
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
    paddingBottom: spacing.lg,
  },
  socialButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.light,
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
  bottomBox: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.gray,
  },
  description: {
    fontFamily: fonts.sub,
    fontSize: 12,
    color: colors.dark,
    textAlign: 'center',
  },
  link: {
    color: '#ff6b6b',
    fontWeight: 'bold',
  },
});