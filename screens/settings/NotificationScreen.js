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

export default function NotificationScreen({ navigation }) {
  const [pushNotifications, setPushNotifications] = useState(true);
  const [likesNotifications, setLikesNotifications] = useState(true);
  const [commentsNotifications, setCommentsNotifications] = useState(true);
  const [followNotifications, setFollowNotifications] = useState(true);
  const [swapNotifications, setSwapNotifications] = useState(true);
  const [messageNotifications, setMessageNotifications] = useState(true);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const db = getFirestore();
  const auth = getAuth();
  const currentUser = auth.currentUser;

  const loadNotificationSettings = async () => {
    if (!currentUser) {
      setLoading(false);
      return;
    }

    try {
      const userDocRef = doc(db, 'users', currentUser.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const notificationSettings = userData.notificationSettings || {};
        
        setPushNotifications(notificationSettings.pushNotifications !== false);
        setLikesNotifications(notificationSettings.likes !== false);
        setCommentsNotifications(notificationSettings.comments !== false);
        setFollowNotifications(notificationSettings.follows !== false);
        setSwapNotifications(notificationSettings.swaps !== false);
        setMessageNotifications(notificationSettings.messages !== false);
      }
    } catch (error) {
      console.error('Error loading notification settings:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotificationSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateNotificationSetting = async (setting, value) => {
    if (!currentUser) {
      Alert.alert('Error', 'Please log in to change settings');
      return;
    }

    try {
      setUpdating(true);
      const userDocRef = doc(db, 'users', currentUser.uid);
      
      await updateDoc(userDocRef, {
        [`notificationSettings.${setting}`]: value
      });
      
    } catch (error) {
      console.error('Error updating notification settings:', error);
      Alert.alert('Error', 'Failed to update notification settings. Please try again.');
    } finally {
      setUpdating(false);
    }
  };

  const handlePushNotificationsToggle = async (value) => {
    if (!currentUser) {
      Alert.alert(
        'Login to change notification settings!',
        '',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Login', onPress: () => navigation.navigate('Login') }
        ]
      );
      return;
    }
    
    setPushNotifications(value);
    await updateNotificationSetting('pushNotifications', value);
    
    if (!value) {
      Alert.alert(
        'Notifications Disabled',
        'You will not receive any notifications from the app.'
      );
    }
  };

  const handleLikesToggle = async (value) => {
    if (!currentUser) {
      Alert.alert(
        'Login to change notification settings!',
        '',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Login', onPress: () => navigation.navigate('Login') }
        ]
      );
      return;
    }
    setLikesNotifications(value);
    await updateNotificationSetting('likes', value);
  };

  const handleCommentsToggle = async (value) => {
    if (!currentUser) {
      Alert.alert(
        'Login to change notification settings!',
        '',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Login', onPress: () => navigation.navigate('Login') }
        ]
      );
      return;
    }
    setCommentsNotifications(value);
    await updateNotificationSetting('comments', value);
  };

  const handleFollowToggle = async (value) => {
    if (!currentUser) {
      Alert.alert(
        'Login to change notification settings!',
        '',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Login', onPress: () => navigation.navigate('Login') }
        ]
      );
      return;
    }
    setFollowNotifications(value);
    await updateNotificationSetting('follows', value);
  };

  const handleSwapToggle = async (value) => {
    if (!currentUser) {
      Alert.alert(
        'Login to change notification settings!',
        '',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Login', onPress: () => navigation.navigate('Login') }
        ]
      );
      return;
    }
    setSwapNotifications(value);
    await updateNotificationSetting('swaps', value);
  };

  const handleMessageToggle = async (value) => {
    if (!currentUser) {
      Alert.alert(
        'Login to change notification settings!',
        '',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Login', onPress: () => navigation.navigate('Login') }
        ]
      );
      return;
    }
    setMessageNotifications(value);
    await updateNotificationSetting('messages', value);
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
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* Push Notifications Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Push Notifications</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Enable Notifications</Text>
              <Text style={styles.settingDescription}>
                {pushNotifications 
                  ? 'You will receive notifications from the app'
                  : 'All notifications are disabled'
                }
              </Text>
            </View>
            <Switch
              value={pushNotifications}
              onValueChange={handlePushNotificationsToggle}
              trackColor={{ false: colors.lightGray, true: colors.accent }}
              thumbColor={colors.light}
              disabled={updating}
            />
          </View>
        </View>

        {/* Activity Notifications Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Activity Notifications</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Likes</Text>
              <Text style={styles.settingDescription}>
                Notify when someone likes your post
              </Text>
            </View>
            <Switch
              value={likesNotifications && pushNotifications}
              onValueChange={handleLikesToggle}
              trackColor={{ false: colors.lightGray, true: colors.accent }}
              thumbColor={colors.light}
              disabled={updating || !pushNotifications}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Comments</Text>
              <Text style={styles.settingDescription}>
                Notify when someone comments on your post
              </Text>
            </View>
            <Switch
              value={commentsNotifications && pushNotifications}
              onValueChange={handleCommentsToggle}
              trackColor={{ false: colors.lightGray, true: colors.accent }}
              thumbColor={colors.light}
              disabled={updating || !pushNotifications}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Follows</Text>
              <Text style={styles.settingDescription}>
                Notify when someone follows you or requests to follow
              </Text>
            </View>
            <Switch
              value={followNotifications && pushNotifications}
              onValueChange={handleFollowToggle}
              trackColor={{ false: colors.lightGray, true: colors.accent }}
              thumbColor={colors.light}
              disabled={updating || !pushNotifications}
            />
          </View>
        </View>

        {/* Swap & Messages Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Other Notifications</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Swap Requests</Text>
              <Text style={styles.settingDescription}>
                Notify about swap requests and updates
              </Text>
            </View>
            <Switch
              value={swapNotifications && pushNotifications}
              onValueChange={handleSwapToggle}
              trackColor={{ false: colors.lightGray, true: colors.accent }}
              thumbColor={colors.light}
              disabled={updating || !pushNotifications}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Messages</Text>
              <Text style={styles.settingDescription}>
                Notify when you receive new messages
              </Text>
            </View>
            <Switch
              value={messageNotifications && pushNotifications}
              onValueChange={handleMessageToggle}
              trackColor={{ false: colors.lightGray, true: colors.accent }}
              thumbColor={colors.light}
              disabled={updating || !pushNotifications}
            />
          </View>
        </View>

        {/* Info Section */}
        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>About Notifications</Text>
          <Text style={styles.infoText}>
            • Control what notifications you receive from Swapism
          </Text>
          <Text style={styles.infoText}>
            • Disabling push notifications will turn off all notifications
          </Text>
          <Text style={styles.infoText}>
            • You can customize each notification type individually
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
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
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
    paddingBottom: spacing.xl,
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
