import { useState } from 'react';
import {
  FlatList,
  Image,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import Icon from '../../assets/icons/icons';
import BottomNavBar from '../../components/BottomNavBar';
import Input from '../../components/Input';
import { useAuth } from '../../context/GuestContext';
import { colors, fonts, spacing } from '../../lib/theme';

// Sample message data - replace with your actual data
const sampleMessages = [
  {
    id: 1,
    name: 'Ben',
    message: '2 new messages',
    time: '10m',
    avatar: 'https://via.placeholder.com/50/9abeaa/FFFFFF?text=B',
    unread: true,
  },
  {
    id: 2,
    name: 'Jenny',
    message: '1 new messages',
    time: '4h',
    avatar: 'https://via.placeholder.com/50/ffd75c/1e1e1e?text=J',
    unread: true,
  },
];

export default function MessagesScreen({ navigation }) {
  const { isGuest } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');

  // If guest, show login prompt
  if (isGuest) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar backgroundColor={colors.accent} barStyle="dark-content" />
        
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Text style={styles.logo}>Swapism</Text>
          </View>
          <Text style={styles.pageTitle}>Messages</Text>
          <TouchableOpacity style={styles.menuButton}>
            <Icon name="menu-outline" size={24} color={colors.dark} />
          </TouchableOpacity>
        </View>

        {/* Guest Content */}
        <View style={[styles.messagesContainer, styles.guestContent]}>
          <Image source={require('../../assets/images/logo.png')} style={styles.logoImage} resizeMode="contain" />
          <Text style={styles.guestMessage}>Please login to access Messages</Text>
          <TouchableOpacity 
            style={styles.loginButton}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.loginButtonText}>Login</Text>
          </TouchableOpacity>
        </View>

        <BottomNavBar navigation={navigation} activeRoute="Messages" />
      </SafeAreaView>
    );
  }

  // Normal screen content for logged-in users
  const [searchQuery2] = useState('');

  const handleMessagePress = (message) => {
    console.log('Open chat with:', message.name);
    // Navigate to ChatScreen
    navigation.navigate('Chat', { user: message });
  };

  const renderMessageItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.messageItem}
      onPress={() => handleMessagePress(item)}
    >
      <Image source={{ uri: item.avatar }} style={styles.avatar} />
      <View style={styles.messageContent}>
        <View style={styles.messageHeader}>
          <Text style={styles.userName}>{item.name}</Text>
          <Text style={styles.time}>{item.time}</Text>
        </View>
        <Text style={styles.messageText}>{item.message}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor={colors.accent} barStyle="dark-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <Text style={styles.logo}>Swapism</Text>
        </View>
        <Text style={styles.pageTitle}>Messages</Text>
        <TouchableOpacity style={styles.menuButton}>
          <Icon name="menu-outline" size={24} color={colors.dark} />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Input
          placeholder="Search..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          leftIcon="search-outline"
          style={styles.searchBar}
        />
      </View>

      {/* Messages List */}
      <View style={styles.messagesContainer}>
        <FlatList
          data={sampleMessages}
          renderItem={renderMessageItem}
          keyExtractor={(item) => item.id.toString()}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
        />
      </View>

      {/* Bottom Navigation */}
      <BottomNavBar navigation={navigation} activeRoute="Messages" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.light,
  },
  header: {
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logoContainer: {
    flex: 1,
  },
  logo: {
    fontFamily: fonts.header,
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.dark,
  },
  pageTitle: {
    fontFamily: fonts.header,
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.dark,
    flex: 2,
    textAlign: 'center',
  },
  menuButton: {
    flex: 1,
    alignItems: 'flex-end',
  },
  searchContainer: {
    backgroundColor: colors.light,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
   searchBar: {
    marginHorizontal: spacing.md,
    marginVertical: spacing.sm,
  },
  messagesContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  messageItem: {
    flexDirection: 'row',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: spacing.md,
  },
  messageContent: {
    flex: 1,
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  userName: {
    fontFamily: fonts.header,
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.dark,
  },
  time: {
    fontFamily: fonts.sub,
    fontSize: 12,
    color: colors.gray,
  },
  messageText: {
    fontFamily: fonts.sub,
    fontSize: 14,
    color: colors.gray,
  },
  guestContent: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  logoImage: {
    width: 300,
    height: 300,
    marginBottom: spacing.lg,
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
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
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
    paddingVertical: 8,
  },
});