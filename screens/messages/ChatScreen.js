import { getAuth } from 'firebase/auth';
import { addDoc, collection, doc, getDocs, getFirestore, onSnapshot, orderBy, query, serverTimestamp, setDoc, updateDoc, where } from 'firebase/firestore';
import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import Icon from '../../assets/icons/icons';
import BottomNavBar from '../../components/BottomNavBar';
import { useAuth } from '../../context/GuestContext';
import { colors, fonts, spacing } from '../../lib/theme';

export default function ChatScreen({ navigation, route }) {
  const { isGuest } = useAuth();
  const { user, swapRequest } = route.params || {};
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [userItems, setUserItems] = useState([]);
  const [showItemPicker, setShowItemPicker] = useState(false);
  const flatListRef = useRef(null);

  const auth = getAuth();
  const db = getFirestore();
  const currentUser = auth.currentUser;

  // Load user's swap items
  useEffect(() => {
    if (!currentUser) return;
    
    const loadUserItems = async () => {
      try {
        const q = query(
          collection(db, 'wardrobe-plug-fyp/user/images'),
          where('ownerUid', '==', currentUser.uid),
          where('postType', '==', 'forSwap'),
          where('swapStatus', '==', 'available')
        );
        const querySnapshot = await getDocs(q);
        const items = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setUserItems(items);
      } catch (error) {
        console.error('Error loading user items:', error);
      }
    };
    
    loadUserItems();
  }, [currentUser]);

  // Handle swap request on mount
  useEffect(() => {
    if (swapRequest && userItems.length > 0) {
      setShowItemPicker(true);
    }
  }, [swapRequest, userItems]);

  // Load messages in real-time
  useEffect(() => {
    if (!user || !currentUser) return;

    const otherUserId = user.id || user.uid;
    
    const messagesRef = collection(db, 'messages');
    const q = query(
      messagesRef,
      where('participants', 'array-contains', currentUser.uid),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        // Only show messages between current user and selected user
        if (
          (data.senderId === currentUser.uid && data.receiverId === otherUserId) ||
          (data.senderId === otherUserId && data.receiverId === currentUser.uid)
        ) {
          msgs.push({
            id: doc.id,
            createdAt: data.createdAt,
            message: data.message,
            type: data.type || 'text',
            content: data.content,
            swapDetails: data.swapDetails,
            participants: data.participants,
            senderId: data.senderId,
            senderName: data.senderName,
            receiverId: data.receiverId,
            receiverName: data.receiverName,
          });
        }
      });
      // Sort by createdAt ascending (oldest to newest)
      msgs.sort((a, b) => {
        const dateA = a.createdAt?.toDate?.() || new Date(0);
        const dateB = b.createdAt?.toDate?.() || new Date(0);
        return dateA - dateB;
      });
      setMessages(msgs);
      
      // Auto-scroll to bottom when new messages arrive
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    });

    return () => unsubscribe();
  }, [user, currentUser]);

  const handleSelectMyItem = async (myItem) => {
    if (!swapRequest || !user || !currentUser) return;

    setShowItemPicker(false);
    setLoading(true);

    try {
      const otherUserId = user.id || user.uid;
      const otherUserName = user.name || user.userName || 'User';

      const messageData = {
        type: 'swap_request',
        content: '',
        senderId: currentUser.uid,
        senderName: currentUser.displayName || currentUser.email,
        receiverId: otherUserId,
        receiverName: otherUserName,
        message: 'Swap Request',
        swapDetails: {
          myItemId: myItem.id,
          myItemImage: myItem.url,
          myItemTitle: myItem.title,
          theirItemId: swapRequest.theirItemId,
          theirItemImage: swapRequest.theirItemImage,
          theirItemTitle: swapRequest.theirItemTitle,
          status: 'pending'
        },
        createdAt: serverTimestamp(),
        participants: [currentUser.uid, otherUserId]
      };

      await addDoc(collection(db, 'messages'), messageData);
      
      const conversationId = [currentUser.uid, otherUserId].sort().join('_');
      const conversationRef = doc(db, 'conversations', conversationId);
      await setDoc(conversationRef, {
        participants: [currentUser.uid, otherUserId],
        lastMessage: 'Swap Request',
        lastMessageTime: new Date(),
        updatedAt: new Date(),
      }, { merge: true });

      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      console.error('Error sending swap request:', error);
      alert('Failed to send swap request');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptSwap = async (messageId) => {
    try {
      // Get the message to access swap details
      const message = messages.find(m => m.id === messageId);
      if (!message || !message.swapDetails) {
        throw new Error('Message or swap details not found');
      }

      const { myItemId, theirItemId } = message.swapDetails;

      // Update message status
      const messageRef = doc(db, 'messages', messageId);
      await updateDoc(messageRef, {
        'swapDetails.status': 'accepted'
      });

      // Update both items' swap status to 'swapped out'
      const myItemRef = doc(db, 'wardrobe-plug-fyp/user/images', myItemId);
      const theirItemRef = doc(db, 'wardrobe-plug-fyp/user/images', theirItemId);

      await Promise.all([
        updateDoc(myItemRef, { swapStatus: 'swapped out' }),
        updateDoc(theirItemRef, { swapStatus: 'swapped out' })
      ]);

      Alert.alert('Success', 'Swap accepted! Both items have been marked as swapped out.');
    } catch (error) {
      console.error('Error accepting swap:', error);
      Alert.alert('Error', 'Failed to accept swap. Please try again.');
    }
  };

  const handleRejectSwap = async (messageId) => {
    try {
      const messageRef = doc(db, 'messages', messageId);
      await updateDoc(messageRef, {
        'swapDetails.status': 'rejected'
      });
    } catch (error) {
      console.error('Error rejecting swap:', error);
      alert('Failed to reject swap');
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !user || !currentUser) return;

    const messageText = newMessage.trim();
    const otherUserId = user.id || user.uid;
    const otherUserName = user.name || user.userName || 'User';

    // Clear input immediately for optimistic UI
    setNewMessage('');

    setLoading(true);
    try {
      const messageData = {
        type: 'text',
        senderId: currentUser.uid,
        senderName: currentUser.displayName || currentUser.email,
        receiverId: otherUserId,
        receiverName: otherUserName,
        message: messageText,
        createdAt: serverTimestamp(),
        participants: [currentUser.uid, otherUserId]
      };

      // Add message to messages collection
      await addDoc(collection(db, 'messages'), messageData);
      
      // Update conversation document for MessagesScreen
      const conversationId = [currentUser.uid, otherUserId].sort().join('_');
      const conversationRef = doc(db, 'conversations', conversationId);
      await setDoc(conversationRef, {
        participants: [currentUser.uid, otherUserId],
        lastMessage: messageText,
        lastMessageTime: new Date(),
        updatedAt: new Date(),
      }, { merge: true });

      // Scroll to bottom after sending
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message');
    } finally {
      setLoading(false);
    }
  };

  // If guest, show login prompt
  if (isGuest) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar backgroundColor="#fff" barStyle="dark-content" />
        
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="arrow-back" size={24} color={colors.dark} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Messages</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Guest Content */}
        <View style={[styles.content, styles.guestContent]}>
          <Image source={require('../../assets/images/logo.png')} style={styles.logo} resizeMode="contain" />
          <Text style={styles.guestMessage}>Please login to chat</Text>
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

  // Logged-in user chat view
  const renderMessage = ({ item }) => {
    const isCurrentUser = item.senderId === currentUser?.uid;
    
    if (item.type === 'swap_request') {
      const { swapDetails } = item;
      const status = swapDetails?.status || 'pending';
      const isReceiver = item.receiverId === currentUser?.uid;

      let statusHeader = '';
      let statusColor = colors.dark;
      
      if (status === 'pending') {
        statusHeader = isCurrentUser ? 'Request Sent' : 'Requested for swap';
        statusColor = colors.dark;
      } else if (status === 'accepted') {
        statusHeader = isCurrentUser ? 'Swap accepted!' : "You've accepted the swap";
        statusColor = '#4caf50';
      } else if (status === 'rejected') {
        statusHeader = 'Swap rejected';
        statusColor = '#f44336';
      }

      return (
        <View style={[styles.messageRow, isCurrentUser && styles.messageRowRight]}>
          <View
            style={[
              styles.swapRequestCard,
              isCurrentUser ? styles.swapRequestCardRight : styles.swapRequestCardLeft,
            ]}
          >
            <View style={[
              styles.swapStatusBadge,
              status === 'accepted' && styles.swapStatusBadgeAccepted,
              status === 'rejected' && styles.swapStatusBadgeRejected,
            ]}>
              <Text style={[
                styles.swapStatusHeader,
                isCurrentUser && styles.swapStatusHeaderRight,
                (status === 'accepted' || status === 'rejected') && styles.swapStatusHeaderBadge
              ]}>
                {statusHeader}
              </Text>
            </View>

            <View style={styles.swapImagesContainer}>
              <View style={styles.swapItemWrapper}>
                <Image 
                  source={{ uri: swapDetails?.theirItemImage }} 
                  style={styles.swapItemImage}
                />
                {swapDetails?.theirItemTitle && (
                  <Text style={[styles.swapItemTitle, isCurrentUser && styles.swapItemTitleRight]} numberOfLines={1}>
                    {swapDetails.theirItemTitle}
                  </Text>
                )}
              </View>
              <View style={styles.swapIconContainer}>
                <Icon name="swap-vertical" size={20} color={isCurrentUser ? '#fff' : colors.accent} />
              </View>
              <View style={styles.swapItemWrapper}>
                <Image 
                  source={{ uri: swapDetails?.myItemImage }} 
                  style={styles.swapItemImage}
                />
                {swapDetails?.myItemTitle && (
                  <Text style={[styles.swapItemTitle, isCurrentUser && styles.swapItemTitleRight]} numberOfLines={1}>
                    {swapDetails.myItemTitle}
                  </Text>
                )}
              </View>
            </View>

            {item.content && (
              <Text style={[styles.swapContent, isCurrentUser && styles.swapContentRight]}>{item.content}</Text>
            )}

            {isReceiver && status === 'pending' && (
              <View style={styles.swapActionsContainer}>
                <TouchableOpacity 
                  style={styles.acceptButton}
                  onPress={() => handleAcceptSwap(item.id)}
                >
                  <Icon name="checkmark" size={20} color="#fff" />
                  <Text style={styles.acceptButtonText}>Accept</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.rejectButton}
                  onPress={() => handleRejectSwap(item.id)}
                >
                  <Icon name="close" size={20} color="#fff" />
                  <Text style={styles.rejectButtonText}>Reject</Text>
                </TouchableOpacity>
              </View>
            )}

            <Text style={[styles.swapTime, isCurrentUser && styles.swapTimeRight]}>
              {item.createdAt?.toDate?.().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || 'Just now'}
            </Text>
          </View>
        </View>
      );
    }

    return (
      <View style={[styles.messageRow, isCurrentUser && styles.messageRowRight]}>
        <View
          style={[
            styles.messageBubble,
            isCurrentUser ? styles.messageBubbleRight : styles.messageBubbleLeft,
          ]}
        >
          <Text
            style={[
              styles.messageText,
              isCurrentUser && styles.messageTextRight,
            ]}
          >
            {item.message}
          </Text>
          <Text
            style={[
              styles.messageTime,
              isCurrentUser && styles.messageTimeRight,
            ]}
          >
            {item.createdAt?.toDate?.().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || 'Just now'}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      <SafeAreaView style={styles.container}>
        <StatusBar backgroundColor="#fff" barStyle="dark-content" />
        
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="arrow-back" size={24} color={colors.dark} />
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            {user?.photoURL && (
              <Image source={{ uri: user.photoURL }} style={styles.headerAvatar} />
            )}
            <Text style={styles.headerTitle}>{user?.name || user?.userName || 'User'}</Text>
          </View>
          <View style={{ width: 24 }} />
        </View>

        {/* Messages List */}
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messagesList}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
        />

        {/* Message Input */}
        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              placeholder="Type a message..."
              placeholderTextColor={colors.gray}
              value={newMessage}
              onChangeText={setNewMessage}
              multiline
              maxHeight={100}
              editable={!loading}
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                (!newMessage.trim() || loading) && styles.sendButtonDisabled,
              ]}
              onPress={handleSendMessage}
              disabled={!newMessage.trim() || loading}
            >
              <Icon
                name="send"
                size={20}
                color={newMessage.trim() ? colors.accent : colors.gray}
              />
            </TouchableOpacity>
          </View>
        </View>

        <BottomNavBar navigation={navigation} activeRoute="Messages" />
      </SafeAreaView>

      {/* Item Picker Modal */}
      {showItemPicker && (
        <View style={styles.modalOverlay}>
          <View style={styles.itemPickerModal}>
            <Text style={styles.modalTitle}>Select Your Item to Swap</Text>
            <Text style={styles.modalSubtitle}>Choose an item from your available swap items</Text>
            <ScrollView style={styles.itemsList}>
              {userItems.map(item => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.itemCard}
                  onPress={() => handleSelectMyItem(item)}
                >
                  <Image source={{ uri: item.url }} style={styles.itemCardImage} />
                  <Text style={styles.itemCardTitle} numberOfLines={2}>{item.title}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowItemPicker(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#dbdbdb',
  },
  headerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: fonts.header,
    color: colors.dark,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  guestContent: {
    backgroundColor: colors.secondary,
  },
  messagesList: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    flexGrow: 1,
  },
  messageRow: {
    marginBottom: spacing.sm,
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  messageRowRight: {
    justifyContent: 'flex-end',
  },
  messageBubble: {
    maxWidth: '80%',
    padding: spacing.md,
    borderRadius: 12,
  },
  messageBubbleLeft: {
    backgroundColor: colors.secondary,
    borderBottomLeftRadius: 0,
  },
  messageBubbleRight: {
    backgroundColor: colors.accent,
    borderBottomRightRadius: 0,
  },
  messageText: {
    fontSize: 14,
    color: colors.dark,
    fontFamily: fonts.body,
  },
  messageTextRight: {
    color: '#fff',
  },
  messageTime: {
    fontSize: 12,
    color: colors.gray,
    marginTop: 4,
    fontFamily: fonts.body,
  },
  messageTimeRight: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  swapRequestCard: {
    maxWidth: '85%',
    padding: spacing.md,
    borderRadius: 12,
    backgroundColor: '#fff',
  },
  swapRequestCardLeft: {
    backgroundColor: colors.secondary,
    borderBottomLeftRadius: 0,
  },
  swapRequestCardRight: {
    backgroundColor: colors.accent,
    borderBottomRightRadius: 0,
  },
  swapStatusBadge: {
    alignSelf: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: spacing.sm,
  },
  swapStatusBadgeAccepted: {
    backgroundColor: '#4caf50',
  },
  swapStatusBadgeRejected: {
    backgroundColor: '#f44336',
  },
  swapStatusHeader: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: fonts.body,
    color: colors.dark,
  },
  swapStatusHeaderRight: {
    color: '#fff',
  },
  swapStatusHeaderBadge: {
    color: '#fff',
  },
  swapImagesContainer: {
    alignItems: 'center',
    marginVertical: spacing.sm,
  },
  swapItemWrapper: {
    alignItems: 'center',
    width: '100%',
  },
  swapItemImage: {
    width: 120,
    height: 120,
    borderRadius: 8,
    marginVertical: 4,
  },
  swapItemTitle: {
    fontSize: 12,
    color: colors.dark,
    fontFamily: fonts.body,
    marginTop: 4,
    textAlign: 'center',
  },
  swapItemTitleRight: {
    color: '#fff',
  },
  swapIconContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 4,
  },
  swapContent: {
    fontSize: 14,
    color: colors.dark,
    fontFamily: fonts.body,
    marginBottom: spacing.sm,
  },
  swapContentRight: {
    color: '#fff',
  },
  swapActionsContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  acceptButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#4caf50',
    paddingVertical: spacing.sm,
    borderRadius: 8,
  },
  acceptButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: fonts.body,
  },
  rejectButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#f44336',
    paddingVertical: spacing.sm,
    borderRadius: 8,
  },
  rejectButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: fonts.body,
  },
  swapTime: {
    fontSize: 11,
    color: colors.gray,
    marginTop: spacing.sm,
    fontFamily: fonts.body,
  },
  swapTimeRight: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemPickerModal: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: spacing.lg,
    width: '90%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.dark,
    marginBottom: spacing.xs,
    fontFamily: fonts.header,
  },
  modalSubtitle: {
    fontSize: 14,
    color: colors.gray,
    marginBottom: spacing.md,
    fontFamily: fonts.body,
  },
  itemsList: {
    maxHeight: 400,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginBottom: spacing.sm,
  },
  itemCardImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: spacing.sm,
  },
  itemCardTitle: {
    flex: 1,
    fontSize: 14,
    color: colors.dark,
    fontFamily: fonts.body,
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
    paddingVertical: spacing.md,
    borderRadius: 8,
    marginTop: spacing.md,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.dark,
    fontFamily: fonts.body,
  },
  inputContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#dbdbdb',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#dbdbdb',
    borderRadius: 20,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 14,
    fontFamily: fonts.body,
    maxHeight: 100,
    color: colors.dark,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#f0f0f0',
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: spacing.lg,
  },
  guestMessage: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.dark,
    textAlign: 'center',
    marginBottom: spacing.lg,
    fontFamily: fonts.body,
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