import { deleteUser, getAuth } from 'firebase/auth';
import { deleteDoc, doc, getFirestore } from 'firebase/firestore';
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import Icon from '../../assets/icons/icons';
import { colors, fonts, spacing } from '../../lib/theme';

export default function SettingsScreen({ navigation }) {
  const auth = getAuth();
  const db = getFirestore();

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete this account?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const user = auth.currentUser;
              
              if (user) {
                // Delete user document from Firestore
                try {
                  await deleteDoc(doc(db, 'users', user.uid));
                } catch (error) {
                  console.log('Error deleting user document:', error);
                }
                
                // Delete user from Firebase Authentication
                await deleteUser(user);
                
                // Navigate to Welcome screen
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'Welcome' }],
                });
                
                Alert.alert('Account Deleted', 'Your account has been successfully deleted.');
              }
            } catch (error) {
              console.error('Error deleting account:', error);
              
              let errorMessage = 'Failed to delete account. Please try again.';
              
              if (error.code === 'auth/requires-recent-login') {
                errorMessage = 'For security reasons, please log out and log back in before deleting your account.';
              }
              
              Alert.alert('Error', errorMessage);
            }
          }
        }
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await auth.signOut();
              navigation.reset({
                index: 0,
                routes: [{ name: 'Welcome' }],
              });
            } catch (error) {
              console.error('Error logging out:', error);
              Alert.alert('Error', 'Failed to logout. Please try again.');
            }
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#fff" barStyle="dark-content" />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color={colors.dark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Activities Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Activities</Text>
          
          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => navigation.navigate('Notification')}
          >
            <View style={styles.menuLeft}>
              <Icon name="notifications-outline" size={24} color={colors.dark} />
              <Text style={styles.menuText}>Notification</Text>
            </View>
            <Icon name="chevron-forward" size={20} color={colors.gray} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => navigation.navigate('Activity')}
          >
            <View style={styles.menuLeft}>
              <Icon name="time-outline" size={24} color={colors.dark} />
              <Text style={styles.menuText}>Activity</Text>
            </View>
            <Icon name="chevron-forward" size={20} color={colors.gray} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => navigation.navigate('RecentlyDeleted')}
          >
            <View style={styles.menuLeft}>
              <Icon name="trash-outline" size={24} color={colors.dark} />
              <Text style={styles.menuText}>Recently Deleted</Text>
            </View>
            <Icon name="chevron-forward" size={20} color={colors.gray} />
          </TouchableOpacity>
        </View>

        {/* Privacy & Settings Section */}
        <View style={styles.section}>
          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => navigation.navigate('Privacy')}
          >
            <View style={styles.menuLeft}>
              <Icon name="lock-closed-outline" size={24} color={colors.dark} />
              <Text style={styles.menuText}>Privacy</Text>
            </View>
            <Icon name="chevron-forward" size={20} color={colors.gray} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => navigation.navigate('BlockedUsers')}
          >
            <View style={styles.menuLeft}>
              <Icon name="ban-outline" size={24} color={colors.dark} />
              <Text style={styles.menuText}>Blocked</Text>
            </View>
            <Icon name="chevron-forward" size={20} color={colors.gray} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.menuItem}
            onPress={handleDeleteAccount}
          >
            <View style={styles.menuLeft}>
              <Icon name="trash-outline" size={24} color="#FF3B30" />
              <Text style={[styles.menuText, { color: '#FF3B30' }]}>Delete Account</Text>
            </View>
            <Icon name="chevron-forward" size={20} color={colors.gray} />
          </TouchableOpacity>
        </View>

        {/* Help Centre Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Help Centre</Text>
          
          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => navigation.navigate('About')}
          >
            <View style={styles.menuLeft}>
              <Icon name="information-circle-outline" size={24} color={colors.dark} />
              <Text style={styles.menuText}>About</Text>
            </View>
            <Icon name="chevron-forward" size={20} color={colors.gray} />
          </TouchableOpacity>
        </View>

        {/* Spacer to push logout to bottom */}
        <View style={styles.spacer} />

        {/* Login Info Section */}
        <View style={styles.logoutSection}>
          <Text style={styles.sectionTitle}>Login Info</Text>
          <TouchableOpacity 
            style={styles.logoutItem}
            onPress={handleLogout}
          >
            <Text style={styles.logoutText}>Log out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#dbdbdb',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: fonts.semiBold,
    fontWeight: '600',
    color: colors.dark,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: colors.gray,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.light,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuText: {
    fontSize: 16,
    fontFamily: fonts.regular,
    color: colors.dark,
    marginLeft: spacing.md,
  },
  spacer: {
    flex: 1,
  },
  logoutSection: {
    marginTop: 'auto',
  },
  logoutItem: {
    backgroundColor: colors.light,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  logoutText: {
    fontSize: 16,
    fontFamily: fonts.regular,
    color: '#FF3B30',
  },
});
