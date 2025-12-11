import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import BottomNavBar from '../../components/BottomNavBar';
import { useAuth } from '../../context/GuestContext';
import { colors, fonts, spacing } from '../../lib/theme';

export default function ChatScreen({ navigation }) {
  const { isGuest } = useAuth();

  // If guest, show login prompt
  if (isGuest) {
    return (
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>CHATS</Text>
        </View>

        {/* Guest Content */}
        <View style={styles.content}>
          <Image source={require('../../assets/images/logo.png')} style={styles.logo} resizeMode="contain" />
          <Text style={styles.guestMessage}>Please login to access Chats</Text>
          <TouchableOpacity 
            style={styles.loginButton}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.loginButtonText}>Login</Text>
          </TouchableOpacity>
        </View>

        <BottomNavBar navigation={navigation} activeRoute="Messages" />
      </View>
    );
  }

  // Normal screen content for logged-in users
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>CHATS</Text>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.placeholderText}>Chat Screen</Text>
        <Text style={styles.placeholderSubtext}>Coming Soon</Text>
      </View>

      <BottomNavBar navigation={navigation} activeRoute="Messages" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.secondary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
    paddingTop: 50,
    backgroundColor: '#fff',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    fontFamily: fonts.header,
    color: colors.dark,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  placeholderText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.dark,
    marginBottom: spacing.sm,
  },
  placeholderSubtext: {
    fontSize: 16,
    color: colors.gray,
  },
  guestMessage: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.dark,
    textAlign: 'center',
    marginBottom: spacing.lg,
    fontFamily: fonts.body,
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: spacing.lg,
  },
  loginButton: {
    backgroundColor: colors.dark,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: 25,
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.light,
    fontFamily: fonts.header,
  },
});