import { useFocusEffect } from '@react-navigation/native';
import { getAuth } from 'firebase/auth';
import {
  addDoc,
  collection,
  getDocs,
  getFirestore,
  orderBy,
  query,
  serverTimestamp,
  where
} from 'firebase/firestore';
import React, { useCallback, useRef, useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import Icon from '../../assets/icons/icons';
import { ItemPickerModal } from '../../components/ItemPickerModal';
import { SwapRequestCard } from '../../components/SwapRequestCard';
import { useSwapRequest } from '../../hooks/useSwapRequest';
import { colors, fonts, spacing } from '../../lib/theme';

export default function ChatScreen({ route, navigation }) {
  const { user, swapRequest } = route.params;
  const otherUserId = user?.id || user?.uid;
  const otherUserName = user?.name;
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const flatListRef = useRef(null);
  const inputRef = useRef(null);

  const db = getFirestore();
  const auth = getAuth();
  const currentUser = auth.currentUser;

  // Use swap request hook
  const {
    userItems,
    showItemPicker,
    setShowItemPicker,
    handleSelectMyItem,
    handleAcceptSwap,
    handleRejectSwap,
  } = useSwapRequest({
    currentUser,
    otherUserId,
    otherUserName,
    swapRequest,
    db,
    messages,
  });

  // Load messages on mount
  useFocusEffect(
    useCallback(() => {
      loadMessages();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  const loadMessages = async () => {
    if (!currentUser) return;

    try {
      setLoading(true);
      const messagesQuery = query(
        collection(db, 'messages'),
        where('participants', 'array-contains', currentUser.uid),
        orderBy('createdAt', 'asc')
      );

      const querySnapshot = await getDocs(messagesQuery);
      const messagesData = querySnapshot.docs
        .map((doc) => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate?.() || new Date(),
        }))
        .filter(msg => 
          (msg.senderId === currentUser.uid && msg.receiverId === otherUserId) ||
          (msg.senderId === otherUserId && msg.receiverId === currentUser.uid)
        );

      setMessages(messagesData);
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !currentUser) return;

    try {
      await addDoc(collection(db, 'messages'), {
        senderId: currentUser.uid,
        receiverId: otherUserId,
        text: newMessage.trim(),
        createdAt: serverTimestamp(),
        participants: [currentUser.uid, otherUserId],
        read: false,
        type: 'text',
      });

      setNewMessage('');
      await loadMessages();
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };



  const formatTime = (date) => {
    if (!date) return '';
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const formatDate = (date) => {
    if (!date) return '';
    const today = new Date();
    const messageDate = new Date(date);
    
    // Reset time for comparison
    today.setHours(0, 0, 0, 0);
    messageDate.setHours(0, 0, 0, 0);
    
    const diffTime = today - messageDate;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return date.toLocaleDateString('en-US', { weekday: 'long' });
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
      });
    }
  };

  const groupMessagesByDate = (messages) => {
    const grouped = {};
    
    messages.forEach(message => {
      const dateKey = formatDate(message.createdAt);
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(message);
    });
    
    return Object.keys(grouped).map(date => ({
      title: date,
      data: grouped[date]
    }));
  };

  const renderMessage = ({ item }) => {
    const isMyMessage = item.senderId === currentUser?.uid;
    
    // Render swap request card
    if (item.type === 'swap_request' && item.swapDetails) {
      return (
        <SwapRequestCard
          message={item}
          isMyMessage={isMyMessage}
          currentUserId={currentUser?.uid}
          onAccept={handleAcceptSwap}
          onReject={handleRejectSwap}
          formatTime={formatTime}
        />
      );
    }
    
    // Render regular text message
    return (
      <View style={[
        styles.messageContainer,
        isMyMessage ? styles.myMessage : styles.theirMessage
      ]}>
        {!isMyMessage && user?.photoURL && (
          <Image source={{ uri: user.photoURL }} style={styles.messageAvatar} />
        )}
        <View style={[
          styles.messageBubble,
          isMyMessage ? styles.myMessageBubble : styles.theirMessageBubble
        ]}>
          <Text style={[
            styles.messageText,
            isMyMessage ? styles.myMessageText : styles.theirMessageText
          ]}>
            {item.text}
          </Text>
          <Text style={[
            styles.messageTime,
            isMyMessage ? styles.myMessageTime : styles.theirMessageTime
          ]}>
            {formatTime(item.createdAt)}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Icon name="arrow-back" size={24} color={colors.dark} />
          </TouchableOpacity>
          <View style={styles.headerUser}>
            {user?.photoURL ? (
              <Image source={{ uri: user.photoURL }} style={styles.headerAvatar} />
            ) : (
              <View style={styles.headerAvatarPlaceholder}>
                <Icon name="person" size={20} color={colors.gray} />
              </View>
            )}
            <Text style={styles.headerName}>{user?.name}</Text>
          </View>
          <View style={styles.headerSpacer} />
        </View>

        {/* Messages List */}
        <SectionList
          ref={flatListRef}
          sections={groupMessagesByDate(messages)}
          renderItem={renderMessage}
          renderSectionHeader={({ section: { title } }) => (
            <View style={styles.dateHeader}>
              <View style={styles.dateBadge}>
                <Text style={styles.dateText}>{title}</Text>
              </View>
            </View>
          )}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messagesList}
          stickySectionHeadersEnabled={true}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Icon name="chatbubbles-outline" size={64} color={colors.gray} />
              <Text style={styles.emptyText}>No messages yet</Text>
              <Text style={styles.emptySubtext}>Start the conversation!</Text>
            </View>
          }
        />

        {/* Input Area */}
        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
            <TextInput
              ref={inputRef}
              style={styles.input}
              value={newMessage}
              onChangeText={setNewMessage}
              placeholder="Type a message..."
              placeholderTextColor={colors.gray}
              multiline
              maxLength={500}
            />
            <TouchableOpacity style={styles.iconButton}>
              <Icon name="image-outline" size={24} color={colors.gray} />
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={[styles.sendButton, !newMessage.trim() && styles.sendButtonDisabled]}
            onPress={handleSendMessage}
            disabled={!newMessage.trim()}
          >
            <Icon name="send" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Item Picker Modal */}
        <ItemPickerModal
          visible={showItemPicker}
          onClose={() => setShowItemPicker(false)}
          items={userItems}
          onSelectItem={handleSelectMyItem}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.secondary,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    paddingTop: 50,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: spacing.xs,
  },
  headerUser: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: spacing.sm,
  },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: spacing.sm,
  },
  headerAvatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  headerName: {
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: fonts.header,
    color: colors.dark,
  },
  headerSpacer: {
    width: 40,
  },
  messagesList: {
    padding: spacing.md,
    flexGrow: 1,
  },
  messageContainer: {
    flexDirection: 'row',
    marginVertical: spacing.xs,
    alignItems: 'flex-end',
  },
  myMessage: {
    justifyContent: 'flex-end',
  },
  theirMessage: {
    justifyContent: 'flex-start',
  },
  messageAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: spacing.xs,
  },
  messageBubble: {
    maxWidth: '75%',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: 16,
  },
  myMessageBubble: {
    backgroundColor: colors.accent,
    borderBottomRightRadius: 4,
  },
  theirMessageBubble: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  myMessageText: {
    color: colors.dark,
  },
  theirMessageText: {
    color: colors.dark,
  },
  messageTime: {
    fontSize: 11,
    marginTop: spacing.xs,
  },
  myMessageTime: {
    color: colors.gray,
    textAlign: 'right',
  },
  theirMessageTime: {
    color: colors.gray,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: spacing.md,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    alignItems: 'center',
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.secondary,
    borderRadius: 24,
    paddingHorizontal: spacing.sm,
    marginRight: spacing.sm,
  },
  iconButton: {
    padding: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  input: {
    flex: 1,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.sm,
    fontSize: 15,
    maxHeight: 100,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: colors.gray,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xl * 2,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.dark,
    marginTop: spacing.md,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.gray,
    marginTop: spacing.xs,
  },
  dateHeader: {
    alignItems: 'center',
    marginVertical: spacing.md,
  },
  dateBadge: {
    backgroundColor: '#fff',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  dateText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.gray,
    fontFamily: fonts.sub,
  },
});
