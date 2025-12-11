import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import BottomNavBar from '../../components/BottomNavBar';
import { useAuth } from '../../context/GuestContext';
import { colors, fonts, spacing } from '../../lib/theme';

export default function FavouritesScreen({ navigation }) {
  const { isGuest } = useAuth();

  // If guest, show login prompt
  if (isGuest) {
    return (
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>FAVOURITES</Text>
        </View>

        {/* Guest Content */}
        <View style={styles.content}>
          <Image 
            source={require('../../assets/images/logo.png')} 
            style={styles.logo} 
            resizeMode="contain" 
          />
          <Text style={styles.guestMessage}>Please login to access Favourites</Text>
          <TouchableOpacity 
            style={styles.loginButton}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.loginButtonText}>Login</Text>
          </TouchableOpacity>
        </View>

        <BottomNavBar navigation={navigation} activeRoute="Favorites" />
      </View>
    );
  }

  // Normal screen content for logged-in users
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>FAVOURITES</Text>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.placeholderText}>Favourites Screen</Text>
        <Text style={styles.placeholderSubtext}>Coming Soon</Text>
      </View>

      <BottomNavBar navigation={navigation} activeRoute="Favorites" />
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
  logo: {
    width: 300,
    height: 300,
    marginBottom: spacing.sm,
  },
  guestMessage: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.dark,
    textAlign: 'center',
    marginBottom: spacing.lg,
    fontFamily: fonts.header,
  },
  loginButton: {
    backgroundColor: colors.dark,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
    borderRadius: 25,
    padding: 20,
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.light,
    fontFamily: fonts.header,
  },

});