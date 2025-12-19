import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

// --- FIREBASE IMPORTS ---
import { getAuth } from 'firebase/auth';
import {
  addDoc,
  collection,
  doc,
  getDocs,
  getFirestore,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where
} from 'firebase/firestore';

// --- IMPORTS ---
import Icon from '../../assets/icons/icons';
import { colors, fonts, spacing } from '../../lib/theme';

// --- CONSTANTS ---
const CATEGORIES = ['General', 'Bug Report', 'Feature Request', 'Other'];

export default function SendFeedbackScreen({ navigation }) {
  const auth = getAuth();
  const db = getFirestore();
  const currentUser = auth.currentUser;

  // --- STATE ---
  const [category, setCategory] = useState('General');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  
  // History State
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // User Reply State
  const [replyModalVisible, setReplyModalVisible] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [userReplyText, setUserReplyText] = useState('');

  // 1. LOAD USER FEEDBACK HISTORY
  useEffect(() => {
    fetchMyFeedback();
  }, []);

  const fetchMyFeedback = async () => {
    if (!currentUser) return;
    setLoadingHistory(true);
    try {
      const q = query(
        collection(db, 'user_feedback'),
        where('userId', '==', currentUser.uid),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setHistory(data);
    } catch (error) {
      console.error('Error fetching history:', error);
    } finally {
      setLoadingHistory(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchMyFeedback();
  };

  // --- ACTIONS ---
  const handleSubmit = async () => {
    if (!message.trim()) {
      Alert.alert('Missing Information', 'Please enter your feedback message.');
      return;
    }

    setLoading(true);

    try {
      await addDoc(collection(db, 'user_feedback'), {
        userId: currentUser?.uid || 'anonymous',
        username: currentUser?.displayName || 'User',
        userEmail: currentUser?.email || 'No Email',
        category: category,
        message: message.trim(),
        status: 'pending',
        createdAt: serverTimestamp(),
      });

      Alert.alert(
        'Feedback Sent',
        'Thank you! We appreciate your input.',
        [{ text: 'OK', onPress: () => {
          setMessage('');
          fetchMyFeedback(); 
        }}]
      );
    } catch (error) {
      console.error('Error sending feedback:', error);
      Alert.alert('Error', 'Could not send feedback. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenUserReply = (item) => {
    setSelectedFeedback(item);
    setUserReplyText('');
    setReplyModalVisible(true);
  };

  const handleSendUserReply = async () => {
    if (!userReplyText.trim()) {
      Alert.alert("Error", "Please enter a message.");
      return;
    }

    setLoading(true);
    try {
      const feedbackRef = doc(db, 'user_feedback', selectedFeedback.id);
      
      await updateDoc(feedbackRef, {
        message: `${selectedFeedback.message}\n\nUser Follow-up: ${userReplyText.trim()}`,
        status: 'pending', 
        userRespondedAt: serverTimestamp(),
        adminReply: null 
      });

      setReplyModalVisible(false);
      Alert.alert("Sent", "Your reply has been sent back to the admin.");
      fetchMyFeedback();
    } catch (error) {
      Alert.alert("Error", "Could not send reply.");
    } finally {
      setLoading(false);
    }
  };

  const renderFeedbackItem = ({ item }) => (
    <View style={styles.historyCard}>
      <View style={styles.historyHeader}>
        <Text style={styles.historyCategory}>{item.category}</Text>
        <Text style={styles.historyDate}>
          {item.createdAt?.toDate ? item.createdAt.toDate().toLocaleDateString() : 'Just now'}
        </Text>
      </View>
      <Text style={styles.historyMessage}>{item.message}</Text>
      
      {item.adminReply ? (
        <View>
          <View style={styles.replyContainer}>
            <View style={styles.replyHeader}>
              <Icon name="chatbubble-ellipses" size={14} color={colors.accent} />
              <Text style={styles.replyLabel}>Swapism Admin Reply:</Text>
            </View>
            <Text style={styles.replyText}>{item.adminReply}</Text>
          </View>

          <TouchableOpacity 
            style={styles.replyBackBtn} 
            onPress={() => handleOpenUserReply(item)}
          >
            <Text style={styles.replyBackBtnText}>Reply Back</Text>
            <Icon name="arrow-forward" size={14} color={colors.accent} />
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.pendingBadge}>
          <Text style={styles.pendingText}>
            {item.status === 'pending' ? 'Awaiting review' : 'Reviewed'}
          </Text>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#fff" barStyle="dark-content" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color={colors.dark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Give Feedback</Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"} 
        style={{ flex: 1 }}
      >
        <FlatList
          data={history}
          renderItem={renderFeedbackItem}
          keyExtractor={item => item.id}
          ListHeaderComponent={
            <View style={styles.formContainer}>
              <Text style={styles.sectionLabel}>What is this about?</Text>
              <View style={styles.categoryContainer}>
                {CATEGORIES.map((cat) => (
                  <TouchableOpacity 
                    key={cat} 
                    style={[
                      styles.categoryChip, 
                      category === cat && styles.categoryChipActive
                    ]}
                    onPress={() => setCategory(cat)}
                  >
                    <Text style={[
                      styles.categoryText, 
                      category === cat && styles.categoryTextActive
                    ]}>
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.sectionLabel}>Your Message</Text>
              <TextInput 
                style={styles.textInput}
                placeholder="Tell us what you think..."
                placeholderTextColor={colors.gray}
                multiline
                textAlignVertical="top"
                value={message}
                onChangeText={setMessage}
                maxLength={1000}
              />
              <Text style={styles.charCount}>{message.length}/1000</Text>

              <TouchableOpacity 
                style={styles.submitButton} 
                onPress={handleSubmit}
                disabled={loading}
              >
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitButtonText}>Submit Feedback</Text>}
              </TouchableOpacity>

              <View style={styles.divider} />
              <Text style={styles.historyTitle}>My Feedback History</Text>
            </View>
          }
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          ListEmptyComponent={
            !loadingHistory && <Text style={styles.emptyText}>No feedback history yet.</Text>
          }
        />
      </KeyboardAvoidingView>

      <Modal visible={replyModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Reply to Admin</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Type your follow-up here..."
              multiline
              value={userReplyText}
              onChangeText={setUserReplyText}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setReplyModalVisible(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.sendBtn} onPress={handleSendUserReply}>
                <Text style={styles.sendBtnText}>Send</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#dbdbdb',
    backgroundColor: '#fff',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: fonts.semiBold,
    fontWeight: '600',
    color: colors.dark,
  },
  scrollContent: {
    paddingBottom: spacing.xl,
  },
  formContainer: {
    padding: spacing.md,
  },
  sectionLabel: {
    fontSize: 14,
    fontFamily: fonts.semiBold,
    fontWeight: '600',
    color: colors.dark,
    marginBottom: 12,
    marginTop: 8,
  },
  categoryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 24,
  },
  categoryChip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  categoryChipActive: {
    backgroundColor: colors.secondary,
    borderColor: colors.accent,
  },
  categoryText: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.gray,
  },
  categoryTextActive: {
    color: colors.dark,
    fontWeight: '600',
  },
  textInput: {
    backgroundColor: '#FAFAFA',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    fontFamily: fonts.regular,
    color: colors.dark,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    minHeight: 120,
  },
  charCount: {
    alignSelf: 'flex-end',
    marginTop: 8,
    fontSize: 12,
    color: colors.gray,
    marginBottom: 20,
  },
  submitButton: {
    backgroundColor: colors.accent, 
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  divider: {
    height: 1,
    backgroundColor: '#eee',
    marginVertical: 24,
  },
  historyTitle: {
    fontSize: 18,
    fontFamily: fonts.semiBold,
    color: colors.dark,
    marginBottom: 16,
  },
  historyCard: {
    marginHorizontal: spacing.md,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#eee',
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  historyCategory: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.accent,
    textTransform: 'uppercase',
  },
  historyDate: {
    fontSize: 12,
    color: colors.gray,
  },
  historyMessage: {
    fontSize: 15,
    color: colors.dark,
    lineHeight: 20,
    marginBottom: 12,
  },
  pendingBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  pendingText: {
    fontSize: 11,
    color: colors.gray,
    fontStyle: 'italic',
  },
  replyContainer: {
    backgroundColor: colors.secondary,
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: colors.accent,
  },
  replyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  replyLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.dark,
  },
  replyText: {
    fontSize: 14,
    color: colors.dark,
    lineHeight: 18,
  },
  replyBackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    marginTop: 10,
    gap: 4,
  },
  replyBackBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.accent,
  },
  emptyText: {
    textAlign: 'center',
    color: colors.gray,
    marginTop: 20,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: colors.dark,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 8,
    padding: 12,
    minHeight: 100,
    textAlignVertical: 'top',
    backgroundColor: '#fafafa',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 20,
    gap: 15,
  },
  cancelBtn: {
    padding: 10,
  },
  cancelBtnText: {
    color: colors.gray,
    fontWeight: '600',
  },
  sendBtn: {
    backgroundColor: colors.accent,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  sendBtnText: {
    color: '#fff',
    fontWeight: 'bold',
  }
});