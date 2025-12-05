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
import BottomNavBar from '../../components/BottomNavBar';
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
    marginVertical: 0,
  },
  messagesContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: 80,
    paddingBottom: 100,
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
    marginVertical: 0,
  },
  messagesContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: 100,
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
});