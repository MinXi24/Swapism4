import { StyleSheet, TouchableOpacity, View } from 'react-native';
import Icon from '../assets/icons/icons';
import { colors, spacing } from '../lib/theme';

export default function BottomNavBar({ navigation, activeRoute }) {
  const navigateTo = (routeName) => {
    if (routeName !== activeRoute) {
      if (routeName === 'Home') {
        // Reset navigation stack to Home to avoid deep navigation stacks
        navigation.reset({
          index: 0,
          routes: [{ name: 'Home' }],
        });
      } else {
        navigation.navigate(routeName);
      }
    }
  };

  return (
    <View style={styles.bottomNav}>
      <TouchableOpacity 
        style={styles.navItem}
        onPress={() => navigateTo('Home')}
      >
        <Icon 
          name={activeRoute === 'Home' ? 'home' : 'home-outline'} 
          size={24} 
          color={activeRoute === 'Home' ? colors.highlight : colors.dark} 
        />
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.navItem}
        onPress={() => navigateTo('Swap')}
      >
        <Icon 
          name={activeRoute === 'Swap' ? 'swap-horizontal' : 'swap-horizontal-outline'} 
          size={24} 
          color={activeRoute === 'Swap' ? colors.highlight : colors.dark} 
        />
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.navItem}
        onPress={() => navigateTo('Messages')}
      >
        <Icon 
          name={activeRoute === 'Messages' ? 'chatbubble' : 'chatbubble-outline'} 
          size={24} 
          color={activeRoute === 'Messages' ? colors.highlight : colors.dark} 
        />
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.navItem}
        onPress={() => navigateTo('Favorites')}
      >
        <Icon 
          name={activeRoute === 'Favorites' ? 'star' : 'star-outline'} 
          size={24} 
          color={activeRoute === 'Favorites' ? colors.highlight : colors.dark} 
        />
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.navItem}
        onPress={() => navigateTo('Profile')}
      >
        <Icon 
          name={activeRoute === 'Profile' ? 'person' : 'person-outline'} 
          size={24} 
          color={activeRoute === 'Profile' ? colors.highlight : colors.dark} 
        />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: colors.secondary,
    paddingVertical: 8,
    paddingHorizontal: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.primary,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
});
