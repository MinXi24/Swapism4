import { useFocusEffect } from '@react-navigation/native';
import * as Calendar from 'expo-calendar';
import { getAuth } from 'firebase/auth';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  getFirestore,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where
} from 'firebase/firestore';
import React, { useCallback, useRef, useState } from 'react';
import {
  Alert,
  Clipboard,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  SafeAreaView,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import RNModalDateTimePicker from 'react-native-modal-datetime-picker';
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
  // Use a ref lock for loading to prevent overlapping calls
  const loadingRef = useRef(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [postalCode, setPostalCode] = useState('');
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [swapDate, setSwapDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(14, 0, 0, 0);
    return tomorrow;
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [pickerMode, setPickerMode] = useState('date');
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
    setMessages,
    loadMessages,
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
    if (loadingRef.current) return;

    loadingRef.current = true;

    try {
      const messagesQuery = query(
        collection(db, 'messages'),
        where('participants', 'array-contains', currentUser.uid),
        orderBy('createdAt', 'asc')
      );

      const querySnapshot = await getDocs(messagesQuery);

      // Deduplicate messages by id using Map
      const messagesMap = new Map();

      querySnapshot.docs.forEach(docSnap => {
        messagesMap.set(docSnap.id, {
          id: docSnap.id,
          ...docSnap.data(),
          createdAt: docSnap.data().createdAt?.toDate?.() || new Date(),
        });
      });

      const messagesData = Array.from(messagesMap.values())
        .filter(msg =>
          (msg.senderId === currentUser.uid && msg.receiverId === otherUserId) ||
          (msg.senderId === otherUserId && msg.receiverId === currentUser.uid)
        )
        .sort((a, b) => a.createdAt - b.createdAt);

      setMessages(messagesData);
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      loadingRef.current = false;
    }
  };

  const handleDeleteMessage = async (messageId) => {
    Alert.alert(
      'Delete Message',
      'Are you sure you want to delete this message?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'messages', messageId));
              setMessages(messages.filter(msg => msg.id !== messageId));
            } catch (error) {
              console.error('Error deleting message:', error);
              Alert.alert('Error', 'Failed to delete message');
            }
          },
        },
      ],
      { cancelable: true }
    );
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

  const handleSendLocation = async () => {
    if (postalCode.length !== 6 || !/^\d{6}$/.test(postalCode)) {
      Alert.alert('Invalid Postal Code', 'Please enter a valid 6-digit Singapore postal code.');
      return;
    }

    try {
      await addDoc(collection(db, 'messages'), {
        senderId: currentUser.uid,
        receiverId: otherUserId,
        text: postalCode,
        createdAt: serverTimestamp(),
        participants: [currentUser.uid, otherUserId],
        read: false,
        type: 'location',
      });

      setShowLocationModal(false);
      setPostalCode('');
      await loadMessages();
    } catch (error) {
      console.error('Error sending location:', error);
      Alert.alert('Error', 'Failed to send location. Please try again.');
    }
  };

  const openInMapApp = (postalCode) => {
    const location = `Singapore ${postalCode}`;
    const encodedLocation = encodeURIComponent(location);
    
    const mapOptions = [
      {
        name: 'Google Maps',
        url: `comgooglemaps://?daddr=${encodedLocation}`,
      },
      {
        name: 'Apple Maps',
        url: `maps://?daddr=${encodedLocation}`,
      }
    ];

    const buttons = mapOptions.map(option => ({
      text: option.name,
      onPress: async () => {
        try {
          await Linking.openURL(option.url);
        } catch (error) {
          Alert.alert('App Not Available', `${option.name} is not installed or cannot be opened. Please install the app to use this option.`);
        }
      }
    }));

    buttons.push({ text: 'Cancel', style: 'cancel' });

    Alert.alert(
      'Choose Map App',
      `Maps to ${location}`,
      buttons
    );
  };

  const copyToClipboard = (text) => {
    Clipboard.setString(text);
    Alert.alert('Copied', 'Postal code copied to clipboard!');
  };

  // Calendar permission
  const getCalendarPermission = async () => {
    const { status } = await Calendar.requestCalendarPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Calendar permission is required to add events.');
      return false;
    }
    return true;
  };

  // Send calendar invite
  const handleSendCalendarInvite = async () => {
    try {
      await addDoc(collection(db, 'messages'), {
        senderId: currentUser.uid,
        receiverId: otherUserId,
        text: `Swap meetup invitation`,
        createdAt: serverTimestamp(),
        participants: [currentUser.uid, otherUserId],
        read: false,
        type: 'calendar_invite',
        calendarDetails: {
          dateTime: swapDate.toISOString(),
          status: 'pending'
        }
      });

      setShowCalendarModal(false);
      await loadMessages();
    } catch (error) {
      console.error('Error sending calendar invite:', error);
      Alert.alert('Error', 'Failed to send calendar invite. Please try again.');
    }
  };

  // Handle date change
  const onDateTimePicked = (selected) => {
    if (pickerMode === 'date') {
      const newDate = new Date(swapDate);
      newDate.setFullYear(selected.getFullYear());
      newDate.setMonth(selected.getMonth());
      newDate.setDate(selected.getDate());
      setSwapDate(newDate);
    } else {
      const newDate = new Date(swapDate);
      newDate.setHours(selected.getHours());
      newDate.setMinutes(selected.getMinutes());
      setSwapDate(newDate);
    }
    setShowDatePicker(false);
    setShowTimePicker(false);
  };
  const onPickerCancel = () => {
    setShowDatePicker(false);
    setShowTimePicker(false);
  };

  // Add event to calendar
  // Add event to calendar and persist status in Firestore per user
  const addEventToCalendar = async (calendarDetails, messageId) => {
    const allowed = await getCalendarPermission();
    if (!allowed) return;

    try {
      const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
      const defaultCalendar = calendars.find(cal => cal.allowsModifications) || calendars[0];

      if (!defaultCalendar) {
        Alert.alert('Error', 'No calendar available.');
        return;
      }

      const startDate = new Date(calendarDetails.dateTime);
      const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // 1 hour duration

      await Calendar.createEventAsync(defaultCalendar.id, {
        title: 'Clothes Swap Meetup',
        startDate,
        endDate,
        notes: `Meet to swap clothes with ${user?.name}. Don't forget to bring the item!`,
        timeZone: 'Asia/Singapore',
        alarms: [
          { relativeOffset: -60 }, // 1 hour before
          { relativeOffset: -30 }  // 30 minutes before
        ]
      });

      // Update Firestore: set addedToCalendar.<userId> = true
      const msgRef = doc(db, 'messages', messageId);
      await updateDoc(msgRef, {
        [`addedToCalendar.${currentUser.uid}`]: true
      });

      Alert.alert('Success', 'Event added to your calendar!');
      await loadMessages(); // reload to reflect status
      return true;
    } catch (error) {
      console.error('Error adding to calendar:', error);
      Alert.alert('Error', 'Failed to add event to calendar.');
      return false;
    }
  };

  // Handle accept calendar invite
  const handleAcceptCalendarInvite = async (message) => {
    // Update Firestore status to 'accepted'
    try {
      const msgRef = doc(db, 'messages', message.id);
      await updateDoc(msgRef, {
        'calendarDetails.status': 'accepted',
        updatedAt: serverTimestamp(),
      });
      await loadMessages();
    } catch (e) {
      console.error('Error updating event status:', e);
      Alert.alert('Error', 'Failed to update event status.');
    }
  };

  const handleDeclineCalendarInvite = async (message) => {
    // Update Firestore status to 'declined'
    try {
      const msgRef = doc(db, 'messages', message.id);
      await updateDoc(msgRef, {
        'calendarDetails.status': 'declined',
        updatedAt: serverTimestamp(),
      });
      await loadMessages();
    } catch (e) {
      console.error('Error updating event status:', e);
      Alert.alert('Error', 'Failed to update event status.');
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

  // Group messages by date, deduplicate by id per section
  const groupMessagesByDate = (messages) => {
    const grouped = {};

    messages.forEach(message => {
      if (!message.id) return;
      const dateKey = formatDate(message.createdAt);
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      // Prevent duplicate IDs per section
      if (!grouped[dateKey].some(m => m.id === message.id)) {
        grouped[dateKey].push(message);
      }
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

    // Render status message
    if (item.type === 'status') {
      return (
        <View style={styles.statusMessageContainer}>
          <View style={styles.statusMessageBubble}>
            <Text style={styles.statusMessageText}>{item.text}</Text>
          </View>
        </View>
      );
    }
    
    // Render location message
    if (item.type === 'location') {
      return (
        <View style={[
          styles.messageContainer,
          isMyMessage ? styles.myMessage : styles.theirMessage
        ]}>
          {!isMyMessage && user?.photoURL && (
            <Image source={{ uri: user.photoURL }} style={styles.messageAvatar} />
          )}
          <View style={[
            styles.locationBubble,
            isMyMessage ? styles.myMessageBubble : styles.theirMessageBubble
          ]}>
            <View style={styles.locationHeader}>
              <Icon name="location" size={20} color={isMyMessage ? '#fff' : colors.accent} />
              <Text style={styles.locationTitle}>Location Shared</Text>
            </View>
            <Text style={styles.locationText}>Postal Code: {item.text}</Text>
            <View style={styles.locationButtons}>
              <TouchableOpacity
                style={styles.locationButton}
                onPress={() => copyToClipboard(item.text)}
              >
                <Icon name="copy-outline" size={16} color={colors.accent} />
                <Text style={styles.locationButtonText}>Copy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.locationButton}
                onPress={() => openInMapApp(item.text)}
              >
                <Icon name="map-outline" size={16} color={colors.accent} />
                <Text style={styles.locationButtonText}>Open in Map</Text>
              </TouchableOpacity>
            </View>
            <Text style={[
              styles.messageTime,
              isMyMessage ? styles.myMessageTime : styles.theirMessageTime
            ]}>
              {formatTime(item.createdAt)}
            </Text>
          </View>
        </View>
      );
    }
    
    // Render calendar invite message
    if (item.type === 'calendar_invite' && item.calendarDetails) {
      const inviteDate = new Date(item.calendarDetails.dateTime);
      const dateStr = inviteDate.toLocaleDateString('en-US', { 
        weekday: 'long', 
        month: 'short', 
        day: 'numeric' 
      });
      const timeStr = inviteDate.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit', 
        hour12: true 
      });
      const status = item.calendarDetails.status;
      // Persisted per-user status
      const isAdded = item.addedToCalendar && currentUser && item.addedToCalendar[currentUser.uid];

      return (
        <View style={[
          styles.messageContainer,
          isMyMessage ? styles.myMessage : styles.theirMessage
        ]}>
          {!isMyMessage && user?.photoURL && (
            <Image source={{ uri: user.photoURL }} style={styles.messageAvatar} />
          )}
          <View style={[
            styles.calendarBubble,
            isMyMessage ? styles.myMessageBubble : styles.theirMessageBubble
          ]}>
            <View style={styles.calendarHeader}>
              <Icon name="calendar" size={20} color={isMyMessage ? '#fff' : colors.accent} />
              <Text style={styles.calendarTitle}>Swap Meetup Invitation</Text>
            </View>
            <View style={styles.calendarDetails}>
              <View style={styles.calendarDetailRow}>
                <Icon name="time-outline" size={16} color={colors.gray} />
                <Text style={styles.calendarDetailText}>{dateStr} at {timeStr}</Text>
              </View>
            </View>
            {status === 'pending' && !isMyMessage && (
              <View style={styles.calendarActions}>
                <TouchableOpacity
                  style={styles.calendarAcceptButton}
                  onPress={() => handleAcceptCalendarInvite(item)}
                >
                  <Icon name="checkmark-circle" size={18} color="#fff" />
                  <Text style={styles.calendarAcceptText}>Accept & Add to Calendar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.calendarDeclineButton}
                  onPress={() => handleDeclineCalendarInvite(item)}
                >
                  <Text style={styles.calendarDeclineText}>Decline</Text>
                </TouchableOpacity>
              </View>
            )}
            {status === 'accepted' && (
              <View style={styles.calendarActions}>
                {!isAdded ? (
                  <TouchableOpacity
                    style={styles.calendarAcceptButton}
                    onPress={() => addEventToCalendar(item.calendarDetails, item.id)}
                  >
                    <Icon name="calendar" size={18} color="#fff" />
                    <Text style={styles.calendarAcceptText}>Add to Calendar</Text>
                  </TouchableOpacity>
                ) : (
                  <Text
                    style={[
                      styles.calendarAcceptText,
                      { textAlign: 'center', color: isMyMessage ? '#fff' : colors.accent }
                    ]}
                  >
                    Added to Calendar ✓
                  </Text>
                )}
              </View>
            )}
            {status === 'declined' && (
              <View style={styles.calendarActions}>
                <Text style={styles.calendarDeclineText}>Rejected. Event request again.</Text>
              </View>
            )}
            <Text style={[
              styles.messageTime,
              isMyMessage ? styles.myMessageTime : styles.theirMessageTime
            ]}>
              {formatTime(item.createdAt)}
            </Text>
          </View>
        </View>
      );
    }
    
    // Render regular text message
    return (
      <View style={[
        styles.messageContainer,
        isMyMessage ? styles.myMessage : styles.theirMessage
      ]}>
        <TouchableOpacity
          style={[
            styles.messageBubble,
            isMyMessage ? styles.myMessageBubble : styles.theirMessageBubble
          ]}
          onLongPress={() => isMyMessage && handleDeleteMessage(item.id)}
          activeOpacity={isMyMessage ? 0.7 : 1}
        >
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
        </TouchableOpacity>
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
          <TouchableOpacity 
            onPress={() => navigation.navigate('SwapHistory')} 
            style={styles.headerIconButton}
          >
            <Icon name="time-outline" size={24} color={colors.dark} />
          </TouchableOpacity>
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
          keyExtractor={(item) => `${item.id}`}
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
            <TouchableOpacity style={styles.iconButton} onPress={() => setShowLocationModal(true)}>
              <Icon name="location-outline" size={24} color={colors.accent} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconButton} onPress={() => setShowCalendarModal(true)}>
              <Icon name="calendar-outline" size={24} color={colors.accent} />
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={[styles.sendButton, !newMessage.trim() && styles.sendButtonDisabled]}
            onPress={handleSendMessage}
            disabled={!newMessage.trim()}
          >
            <Icon
              name="send"
              size={25}
              color="#9ABEAA"
            />
          </TouchableOpacity>
        </View>

        {/* Location Modal */}
        <Modal
          visible={showLocationModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowLocationModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <Text style={styles.modalTitle}>Send Your Location</Text>
              <Text style={styles.modalSubtitle}>Enter your postal code</Text>
              <TextInput
                value={postalCode}
                onChangeText={setPostalCode}
                placeholder="e.g. 123456"
                keyboardType="number-pad"
                maxLength={6}
                style={styles.modalInput}
              />
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.modalCancelButton}
                  onPress={() => {
                    setShowLocationModal(false);
                    setPostalCode('');
                  }}
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalSendButton}
                  onPress={handleSendLocation}
                >
                  <Text style={styles.modalSendText}>Send Location</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Calendar Modal */}
        <Modal
          visible={showCalendarModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowCalendarModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <Text style={styles.modalTitle}>Suggest Swap Meetup</Text>
              <Text style={styles.modalSubtitle}>Choose date and time</Text>
              
              <View style={styles.calendarInputGroup}>

                <Text style={styles.inputLabel}>Date</Text>
                <TouchableOpacity 
                  style={styles.dateTimeButton}
                  onPress={() => { setPickerMode('date'); setShowDatePicker(true); }}
                >
                  <Icon name="calendar-outline" size={20} color={colors.gray} />
                  <Text style={styles.dateTimeText}>
                    {swapDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.calendarInputGroup}>
                <Text style={styles.inputLabel}>Time</Text>
                <TouchableOpacity 
                  style={styles.dateTimeButton}
                  onPress={() => { setPickerMode('time'); setShowTimePicker(true); }}
                >
                  <Icon name="time-outline" size={20} color={colors.gray} />
                  <Text style={styles.dateTimeText}>
                    {swapDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                  </Text>
                </TouchableOpacity>
              </View>

              <RNModalDateTimePicker
                isVisible={showDatePicker || showTimePicker}
                mode={pickerMode}
                date={swapDate}
                onConfirm={onDateTimePicked}
                onCancel={onPickerCancel}
                minimumDate={pickerMode === 'date' ? new Date() : undefined}
                display="spinner"
              />

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.modalCancelButton}
                  onPress={() => {
                    setShowCalendarModal(false);
                  }}
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalSendButton}
                  onPress={handleSendCalendarInvite}
                >
                  <Text style={styles.modalSendText}>Send Invite</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

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
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
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
  headerIconButton: {
    padding: spacing.xs,
  },
  messagesList: {
    padding: spacing.md,
    flexGrow: 1,
  },
  messageContainer: {
    flexDirection: 'row',
    marginVertical: spacing.sm,
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
    marginRight: spacing.sm,
  },
  messageBubble: {
    maxWidth: '75%',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  myMessageBubble: {
    backgroundColor: colors.accent,
    borderBottomRightRadius: 4,
  },
  theirMessageBubble: {
    backgroundColor: colors.secondary,
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
  statusMessageContainer: {
    alignItems: 'center',
    marginVertical: spacing.sm,
  },
  statusMessageBubble: {
    backgroundColor: '#E8E8E8',
    borderRadius: 16,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  statusMessageText: {
    fontSize: 13,
    color: '#666',
    fontStyle: 'italic',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F3E4',
    borderRadius: 20,
    paddingHorizontal: spacing.sm,
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    maxHeight: 100,
  },
  iconButton: {
    padding: spacing.xs,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ffffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  locationBubble: {
    padding: spacing.md,
    borderRadius: 12,
    maxWidth: '75%',
    backgroundColor: '#f0f0f0',
  },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  locationTitle: {
    fontFamily: fonts.header,
    fontSize: 14,
    fontWeight: '600',
    color: colors.dark,
    marginLeft: spacing.sm,
  },
  locationText: {
    fontFamily: fonts.sub,
    fontSize: 16,
    color: colors.dark,
    marginBottom: spacing.sm,
  },
  locationButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.accent,
    gap: 4,
  },
  locationButtonText: {
    fontSize: 12,
    color: colors.accent,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: spacing.lg,
    width: '80%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.dark,
    marginBottom: spacing.sm,
  },
  modalSubtitle: {
    fontSize: 14,
    color: colors.gray,
    marginBottom: spacing.md,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: spacing.md,
    fontSize: 16,
    marginBottom: spacing.md,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.md,
  },
  modalCancelButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  modalCancelText: {
    color: colors.gray,
    fontSize: 16,
  },
  modalSendButton: {
    backgroundColor: colors.accent,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 8,
  },
  modalSendText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
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
  calendarBubble: {
    padding: spacing.md,
    borderRadius: 12,
    maxWidth: '80%',
    backgroundColor: '#f0f0f0',
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  calendarTitle: {
    fontFamily: fonts.header,
    fontSize: 14,
    fontWeight: '600',
    color: colors.dark,
    marginLeft: spacing.sm,
  },
  calendarDetails: {
    marginBottom: spacing.md,
  },
  calendarDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  calendarDetailText: {
    fontFamily: fonts.sub,
    fontSize: 14,
    color: colors.dark,
    marginLeft: spacing.sm,
  },
  calendarActions: {
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  calendarAcceptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    borderRadius: 8,
    gap: spacing.xs,
  },
  calendarAcceptText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
  calendarDeclineButton: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  calendarDeclineText: {
    fontSize: 14,
    color: colors.gray,
    fontWeight: '600',
  },
  calendarInputGroup: {
    marginBottom: spacing.md,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.dark,
    marginBottom: spacing.xs,
  },
  dateTimeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: spacing.md,
    gap: spacing.sm,
  },
  dateTimeText: {
    fontSize: 16,
    color: colors.dark,
  },
});