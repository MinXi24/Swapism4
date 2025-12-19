import { getAuth } from 'firebase/auth';
import { doc, getDoc, getFirestore } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Linking,
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import Icon from '../../assets/icons/icons';
import { colors, fonts, spacing } from '../../lib/theme';

export default function AboutScreen({ navigation }) {
  const [userJoinDate, setUserJoinDate] = useState(null);
  const [loading, setLoading] = useState(true);

  const db = getFirestore();
  const auth = getAuth();
  const currentUser = auth.currentUser;

  const loadUserData = async () => {

    try {
      const userDocRef = doc(db, 'users', currentUser.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const joinDate = userData.createdAt?.toDate?.() || currentUser.metadata.creationTime;
        setUserJoinDate(joinDate);
      } else {
        // Fallback to Firebase auth metadata
        const joinDate = new Date(currentUser.metadata.creationTime);
        setUserJoinDate(joinDate);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      // Fallback to Firebase auth metadata
      if (currentUser.metadata.creationTime) {
        const joinDate = new Date(currentUser.metadata.creationTime);
        setUserJoinDate(joinDate);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUserData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const formatDate = (date) => {
    if (!date) return 'Unknown';
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(date).toLocaleDateString('en-US', options);
  };

  const handleOpenLink = (url) => {
    Linking.openURL(url).catch(err => console.error('Error opening link:', err));
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar backgroundColor="#fff" barStyle="dark-content" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#fff" barStyle="dark-content" />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>About</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* App Info Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About Swapism</Text>
          
          <View style={styles.infoContainer}>
            <Text style={styles.appName}>Swapism</Text>
            <Text style={styles.version}>Version 1.0.0</Text>
            <Text style={styles.description}>
              Swapism is a sustainable fashion platform that allows you to swap, share, and discover unique clothing items with others. Join our community and give your wardrobe a new life while reducing fashion waste.
            </Text>
          </View>
        </View>

        {/* Your Account Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Account</Text>
          
          <View style={styles.accountItem}>
            <Text style={styles.accountLabel}>Email</Text>
            <Text style={styles.accountValue}>{currentUser?.email || 'Not available'}</Text>
          </View>

          <View style={styles.accountItem}>
            <Text style={styles.accountLabel}>Member Since</Text>
            <Text style={styles.accountValue}>{formatDate(userJoinDate)}</Text>
          </View>

        </View>

        {/* Legal Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Legal</Text>
          
          <TouchableOpacity 
            style={styles.linkItem}
            onPress={() => handleOpenLink('https://swapism.com/terms')}
          >
            <View style={styles.linkLeft}>
              <Icon name="document-text-outline" size={20} color={colors.dark} />
              <Text style={styles.linkText}>Terms and Conditions</Text>
            </View>
            <Icon name="open-outline" size={18} color={colors.gray} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.linkItem}
            onPress={() => handleOpenLink('https://swapism.com/privacy')}
          >
            <View style={styles.linkLeft}>
              <Icon name="shield-checkmark-outline" size={20} color={colors.dark} />
              <Text style={styles.linkText}>Privacy Policy</Text>
            </View>
            <Icon name="open-outline" size={18} color={colors.gray} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.linkItem}
            onPress={() => handleOpenLink('https://swapism.com/community-guidelines')}
          >
            <View style={styles.linkLeft}>
              <Icon name="people-outline" size={20} color={colors.dark} />
              <Text style={styles.linkText}>Community Guidelines</Text>
            </View>
            <Icon name="open-outline" size={18} color={colors.gray} />
          </TouchableOpacity>
        </View>

        {/* Terms & Conditions Content */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Terms & Conditions Summary</Text>
          
          <View style={styles.termsContainer}>
            <Text style={styles.termsTitle}>1. User Responsibilities</Text>
            <Text style={styles.termsText}>
              • Users must be 13 years or older to use the app{'\n'}
              • You are responsible for maintaining the security of your account{'\n'}
              • Provide accurate and complete information when creating an account
            </Text>

            <Text style={styles.termsTitle}>2. Content Guidelines</Text>
            <Text style={styles.termsText}>
              • Post only items you own or have permission to share{'\n'}
              • No counterfeit or prohibited items{'\n'}
              • Respect intellectual property rights{'\n'}
              • Keep content appropriate and respectful
            </Text>

            <Text style={styles.termsTitle}>3. Swap Terms</Text>
            <Text style={styles.termsText}>
              • Both parties must agree to swap terms{'\n'}
              • Users are responsible for item authenticity and condition{'\n'}
              • Swapism is not responsible for disputes between users{'\n'}
              • Meet in safe, public locations when exchanging items
            </Text>

            <Text style={styles.termsTitle}>4. Privacy & Data</Text>
            <Text style={styles.termsText}>
              • We collect and use data as described in our Privacy Policy{'\n'}
              • Your information is protected and never sold{'\n'}
              • You can delete your account and data at any time
            </Text>

            <Text style={styles.termsTitle}>5. Prohibited Activities</Text>
            <Text style={styles.termsText}>
              • No harassment, bullying, or hate speech{'\n'}
              • No spam or misleading content{'\n'}
              • No commercial selling without permission{'\n'}
              • Violation may result in account suspension
            </Text>
          </View>
        </View>

        {/* Contact Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Us</Text>
          
          <TouchableOpacity 
            style={styles.linkItem}
            onPress={() => handleOpenLink('mailto:support@swapism.com')}
          >
            <View style={styles.linkLeft}>
              <Icon name="mail-outline" size={20} color={colors.dark} />
              <Text style={styles.linkText}>support@swapism.com</Text>
            </View>
            <Icon name="open-outline" size={18} color={colors.gray} />
          </TouchableOpacity>

        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Discover, swap, and try clothes virtually</Text>
          <Text style={styles.copyright}>© 2025 Swapism. All rights reserved.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: 16,
    color: colors.gray,
    fontFamily: fonts.regular,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#dbdbdb',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: fonts.semiBold,
    color: '#000',
  },
  content: {
    flex: 1,
  },
  section: {
    marginTop: spacing.lg,
    backgroundColor: '#fff',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  sectionTitle: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: '#666',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
  },
  infoContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  appName: {
    fontSize: 28,
    fontWeight: 'bold',
    fontFamily: fonts.header,
    color: colors.accent,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  version: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: '#666',
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  description: {
    fontSize: 15,
    fontFamily: fonts.regular,
    color: '#333',
    lineHeight: 22,
    textAlign: 'center',
  },
  accountItem: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  accountLabel: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: '#666',
    marginBottom: 4,
  },
  accountValue: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: fonts.semiBold,
    color: '#000',
  },
  linkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  linkLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  linkText: {
    fontSize: 16,
    fontFamily: fonts.regular,
    color: colors.dark,
    marginLeft: spacing.sm,
  },
  termsContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  termsTitle: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: fonts.semiBold,
    color: '#000',
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  termsText: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: '#666',
    lineHeight: 22,
    marginBottom: spacing.sm,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: '#666',
    marginBottom: spacing.xs,
  },
  copyright: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: '#999',
  },
});
