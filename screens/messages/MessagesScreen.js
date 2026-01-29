import { useFocusEffect } from '@react-navigation/native';
import { getAuth } from 'firebase/auth';
import {
    collection,
    doc,
    getDoc,
    getDocs,
    getFirestore,
    query,
    where
} from 'firebase/firestore';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
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
import { useGuest } from '../../hooks/useGuest';

import { colors, fonts, spacing } from '../../lib/theme';

export default function MessagesScreen({ navigation, route }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const sharedPost = route.params?.sharedPost || null;

  const db = getFirestore();
  const auth = getAuth();
  const currentUser = auth.currentUser;
  const { isGuest } = useGuest();

  // Check if user is guest
  useEffect(() => {
    if (isGuest) {
      Alert.alert(
        'Login Required',
        'You must be logged in to access messages!',
        [
          {
            text: 'Login',
            onPress: () => navigation.navigate('Welcome')
          }
        ],
        { cancelable: false }
      );
    }
  }, [isGuest, navigation]);

  useFocusEffect(
    useCallback(() => {
      loadConversations();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  const loadConversations = async () => {
    if (!currentUser) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      // Load ALL messages for the current user (no orderBy to avoid limitations)
      const messagesQuery = query(
        collection(db, 'messages'),
        where('participants', 'array-contains', currentUser.uid)
      );

      const querySnapshot = await getDocs(messagesQuery);
      const conversationsMap = new Map();
      const allMessages = querySnapshot.docs.map(doc => doc.data());

      // Group messages by conversation partner
      for (const messageData of allMessages) {
        const otherUserId = messageData.senderId === currentUser.uid 
          ? messageData.receiverId 
          : messageData.senderId;

        if (!conversationsMap.has(otherUserId)) {
          conversationsMap.set(otherUserId, {
            userId: otherUserId,
            messages: [],
            lastMessageTime: null,
            unread: false,
            hasSwapOngoing: false,
          });
        }

        const conversation = conversationsMap.get(otherUserId);
        conversation.messages.push(messageData);
        
        // Track the most recent message
        const messageTime = messageData.createdAt?.toDate?.() || new Date();
        if (!conversation.lastMessageTime || messageTime > conversation.lastMessageTime) {
          conversation.lastMessageTime = messageTime;
          conversation.lastMessageData = messageData;
        }

        // Check for unread messages
        if (!messageData.read && messageData.receiverId === currentUser.uid) {
          conversation.unread = true;
        }

        // Check for ongoing swaps
        if (messageData.type === 'swap_request' && 
            messageData.swapDetails && 
            messageData.swapDetails.status === 'accepted') {
          conversation.hasSwapOngoing = true;
        }
      }

      // Load user data and prepare final conversation objects
      const conversationsArray = [];
      for (const [otherUserId, conversation] of conversationsMap.entries()) {
        try {
          const userDoc = await getDoc(doc(db, 'users', otherUserId));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            const lastMessageText = conversation.lastMessageData.type === 'swap_request' 
              ? '🔄 Swap Request'
              : conversation.lastMessageData.text;
            
            // Store ALL message texts for comprehensive search
            const allMessageTexts = conversation.messages
              .map(msg => msg.text || '')
              .filter(Boolean);
            
            console.log(`User ${userData.username || userData.displayName}: ${allMessageTexts.length} searchable messages`);
            
            conversationsArray.push({
              userId: otherUserId,
              userName: userData.username || userData.displayName || 'User',
              userPhotoURL: userData.photoURL || null,
              lastMessage: lastMessageText,
              lastMessageTime: conversation.lastMessageTime,
              unread: conversation.unread,
              hasSwapOngoing: conversation.hasSwapOngoing,
              allMessages: allMessageTexts,
            });
          }
        } catch (error) {
          console.error('Error loading user data:', error);
        }
      }

      // Sort conversations by most recent message
      conversationsArray.sort((a, b) => b.lastMessageTime - a.lastMessageTime);

      setConversations(conversationsArray);
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (date) => {
    if (!date) return '';
    const now = new Date();
    const diff = now - date;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    
    if (hours < 1) {
      const minutes = Math.floor(diff / (1000 * 60));
      return minutes < 1 ? 'Just now' : `${minutes}m`;
    } else if (hours < 24) {
      return `${hours}h`;
    } else {
      const days = Math.floor(hours / 24);
      return `${days}d`;
    }
  };

  const handleMessagePress = (conversation) => {
    const chatParams = {
      user: {
        id: conversation.userId,
        uid: conversation.userId,
        name: conversation.userName,
        photoURL: conversation.userPhotoURL,
      },
    };
    
    // If there's a shared post, pass it to the chat
    if (sharedPost) {
      chatParams.sharedPost = sharedPost;
    }
    
    navigation.navigate('Chat', chatParams);
  };

  const renderMessageItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.messageItem}
      onPress={() => handleMessagePress(item)}
    >
      {item.userPhotoURL ? (
        <Image source={{ uri: item.userPhotoURL }} style={styles.avatar} />
      ) : (
        <View style={styles.avatarPlaceholder}>
          <Icon name="person" size={24} color={colors.gray} />
        </View>
      )}
      <View style={styles.messageContent}>
        <View style={styles.messageHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <Text style={styles.userName}>{item.userName}</Text>
            {item.hasSwapOngoing && (
              <View style={styles.swapOngoingBadge}>
                <Icon name="swap-horizontal" size={12} color="#fff" />
                <Text style={styles.swapOngoingText}>Swap</Text>
              </View>
            )}
          </View>
          <Text style={styles.time}>{formatTime(item.lastMessageTime)}</Text>
        </View>
        <Text style={[styles.messageText, item.unread && styles.unreadMessage]} numberOfLines={1}>
          {item.displayMessage || item.lastMessage}
        </Text>
      </View>
      {item.unread && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#fff" barStyle="dark-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.logo}>Messages</Text>
      </View>

      {/* Search Bar */}
      <Input
        placeholder="Search..."
        value={searchQuery}
        onChangeText={setSearchQuery}
        leftIcon="search-outline"
        style={styles.searchBar}
      />

      {/* Messages List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : conversations.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Icon name="chatbubbles-outline" size={64} color={colors.gray} />
          <Text style={styles.emptyText}>No messages yet</Text>
          <Text style={styles.emptySubtext}>Start a conversation from a user&apos;s profile</Text>
        </View>
      ) : (
        <View style={styles.messagesContainer}>
          <FlatList
            data={conversations
              .map(item => {
                if (!searchQuery) {
                  return { ...item, displayMessage: item.lastMessage, isMatch: true };
                }
                
                const query = searchQuery.toLowerCase().trim();
                const matchesUsername = item.userName.toLowerCase().includes(query);
                
                // Log the search attempt for this conversation
                console.log(`\n--- Searching in ${item.userName}'s conversation ---`);
                console.log(`Search query: "${query}"`);
                console.log(`Total messages to search: ${item.allMessages?.length || 0}`);
                
                // Search through all messages in the conversation
                // Use word boundary matching for accurate search results
                const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const wordBoundaryRegex = new RegExp(`\\b${escapedQuery}\\b`, 'i');
                
                const matchedMessage = item.allMessages?.find(msg => {
                  if (!msg) return false;
                  
                  // Only match complete words
                  const matches = wordBoundaryRegex.test(msg);
                  
                  if (matches) {
                    console.log(`✓ FOUND match: "${msg}"`);
                  }
                  return matches;
                });
                
                // Determine if this conversation should be shown
                const isMatch = matchesUsername || !!matchedMessage;
                
                console.log(`Username match: ${matchesUsername}, Message match: ${!!matchedMessage}, Show: ${isMatch}`);
                
                // Set the display message
                const displayMessage = matchedMessage || item.lastMessage;
                
                return {
                  ...item,
                  displayMessage,
                  isMatch
                };
              })
              .filter(item => item.isMatch)}
            renderItem={renderMessageItem}
            keyExtractor={(item) => item.userId}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
          />
        </View>
      )}

      {/* Bottom Navigation */}
      <BottomNavBar navigation={navigation} activeRoute="Messages" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  logo: {
    fontFamily: fonts.header,
    fontSize: 28,
    fontWeight: '700',
    color: colors.accent,
  },
  headerIcon: {
    padding: 4,
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
    paddingBottom: 80,
  },
  messageItem: {
    flexDirection: 'row',
    alignItems: 'center',
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
  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
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
  swapOngoingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 4,
  },
  swapOngoingText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#fff',
    fontFamily: fonts.semiBold,
  },
  messageText: {
    fontFamily: fonts.sub,
    fontSize: 14,
    color: colors.gray,
  },
  unreadMessage: {
    fontWeight: '600',
    color: colors.dark,
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.accent,
    marginLeft: spacing.sm,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.dark,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.gray,
    textAlign: 'center',
  },
});