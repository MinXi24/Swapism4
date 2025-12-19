import { getAuth } from 'firebase/auth';
import { doc, getDoc, getFirestore, updateDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from '../../assets/icons/icons';
import { colors, fonts, spacing } from '../../lib/theme';

export default function PrivacyScreen({ navigation }) {
  const [isPrivate, setIsPrivate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const db = getFirestore();
  const auth = getAuth();
  const currentUser = auth.currentUser;

  const loadPrivacySettings = async () => {

    try {
      const userDocRef = doc(db, 'users', currentUser.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        setIsPrivate(userData.isPrivate || false);
      }
    } catch (error) {
      console.error('Error loading privacy settings:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPrivacySettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePrivacyToggle = async (value) => {

    try {
      setUpdating(true);
      const userDocRef = doc(db, 'users', currentUser.uid);
      
      await updateDoc(userDocRef, {
        isPrivate: value
      });
      
      setIsPrivate(value);
      Alert.alert(
        'Privacy Updated',
        value 
          ? 'Your account is now private. Only approved followers can see your For Fun posts.' 
          : 'Your account is now public. Everyone can see your posts.'
      );
    } catch (error) {
      console.error('Error updating privacy:', error);
      Alert.alert('Error', 'Failed to update privacy settings. Please try again.');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar backgroundColor={colors.light} barStyle="dark-content" />
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
        <Text style={styles.headerTitle}>Privacy</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* Private Account Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Privacy</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Private Account</Text>
              <Text style={styles.settingDescription}>
                {isPrivate 
                  ? 'Only approved followers can see your For Fun posts. Swap posts remain visible to everyone.'
                  : 'Everyone can see all your posts.'
                }
              </Text>
            </View>
            <Switch
              value={isPrivate}
              onValueChange={handlePrivacyToggle}
              trackColor={{ false: colors.lightGray, true: colors.accent }}
              thumbColor={colors.light}
              disabled={updating}
            />
          </View>
        </View>

        {/* Privacy Info */}
        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>What does this mean?</Text>
          <Text style={styles.infoText}>
            • When your account is private, only people who follow you can see your For Fun posts
          </Text>
          <Text style={styles.infoText}>
            • Your Swap posts will always be visible to everyone
          </Text>
          <Text style={styles.infoText}>
            • New followers need to send a request that you can approve
          </Text>
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
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: '#fff',
  },
  settingInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: fonts.semiBold,
    color: '#000',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: '#666',
    lineHeight: 18,
  },
  infoSection: {
    marginTop: spacing.xl,
    paddingHorizontal: spacing.lg,
    backgroundColor: '#fff',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: fonts.semiBold,
    color: '#000',
    marginBottom: spacing.md,
  },
  infoText: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: '#666',
    lineHeight: 22,
    marginBottom: spacing.sm,
  },
});
