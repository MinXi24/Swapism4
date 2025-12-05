import React, { useState } from 'react';
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
import Input from '../../components/Input';
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
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('messages');

  const handleNavigation = (tab) => {
    setActiveTab(tab);
    switch(tab) {
      case 'home':
        navigation.navigate('Home');
        break;
      case 'swap':
        navigation.navigate('Swap');
        break;
      case 'chat':
        // Already on messages
        break;
      case 'favorites':
        navigation.navigate('Favorites');
        break;
      case 'profile':
        navigation.navigate('Profile');
        break;
    }
  };

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

      {/* Bottom Navigation Bar */}
      <View style={styles.bottomNav}>
        <TouchableOpacity 
          style={styles.navItem}
          onPress={() => handleNavigation('home')}
        >
          <Icon 
            name={activeTab === 'home' ? 'home' : 'home-outline'} 
            size={24} 
            color={activeTab === 'home' ? colors.accent : colors.gray} 
          />
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.navItem}
          onPress={() => handleNavigation('swap')}
        >
          <Icon 
            name={activeTab === 'swap' ? 'swap-horizontal' : 'swap-horizontal-outline'} 
            size={24} 
            color={activeTab === 'swap' ? colors.accent : colors.gray} 
          />
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.navItem}
          onPress={() => handleNavigation('chat')}
        >
          <Icon 
            name={activeTab === 'messages' ? 'chatbubble' : 'chatbubble-outline'} 
            size={24} 
            color={colors.accent} 
          />
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.navItem}
          onPress={() => handleNavigation('favorites')}
        >
          <Icon 
            name={activeTab === 'favorites' ? 'heart' : 'heart-outline'} 
            size={24} 
            color={activeTab === 'favorites' ? colors.accent : colors.gray} 
          />
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.navItem}
          onPress={() => handleNavigation('profile')}
        >
          <Icon 
            name={activeTab === 'profile' ? 'person' : 'person-outline'} 
            size={24} 
            color={activeTab === 'profile' ? colors.accent : colors.gray} 
          />
        </TouchableOpacity>
      </View>
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
  addButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.highlight,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
