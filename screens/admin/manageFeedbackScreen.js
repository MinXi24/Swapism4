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

import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  getFirestore,
  query,
  serverTimestamp,
  updateDoc,
  where
} from 'firebase/firestore';

// --- IMPORTS ---
import Icon from '../../assets/icons/icons';
import { colors, fonts, spacing } from '../../lib/theme';

// --- THEME COLORS ---
const THEME_GREEN = '#9abeaa';
const THEME_YELLOW = '#ffd75c';
const PENDING_BG = '#FFF9C4'; // Yellowish for pending
const REVIEWED_BG = '#F0FDF4'; // Greenish for reviewed
const ALERT_RED = '#FF6B6B';

export default function AdminFeedbackScreen({ navigation }) {
  const db = getFirestore();
  
  // --- STATE ---
  const [selectedTab, setSelectedTab] = useState('pending'); // 'pending' | 'reviewed'
  const [feedbackList, setFeedbackList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // --- REPLY STATE ---
  const [replyModalVisible, setReplyModalVisible] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [replyText, setReplyText] = useState('');

  // 1. LOAD DATA
  useEffect(() => {
    fetchFeedback();
  }, [selectedTab]);

  const fetchFeedback = async () => {
    setLoading(true);
    setFeedbackList([]);
    try {
      const q = query(
        collection(db, 'user_feedback'),
        where('status', '==', selectedTab)
      );
      
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Sort by Date (Newest First)
      data.sort((a, b) => {
          const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(0);
          const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(0);
          return dateB - dateA;
      });

      setFeedbackList(data);
    } catch (error) {
      console.error('Error fetching feedback:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchFeedback();
  };

  // --- ACTIONS ---

  const handleOpenReply = (item) => {
    setSelectedFeedback(item);
    setReplyText('');
    setReplyModalVisible(true);
  };

  const handleSendReply = async () => {
    if (!replyText.trim()) {
      Alert.alert("Error", "Please enter a reply.");
      return;
    }

    try {
      // Updates status to reviewed and attaches the admin's message
      await updateDoc(doc(db, 'user_feedback', selectedFeedback.id), { 
        status: 'reviewed',
        adminReply: replyText.trim(),
        repliedAt: serverTimestamp()
      });
      
      setReplyModalVisible(false);
      // Update UI locally
      setFeedbackList(prev => prev.filter(i => i.id !== selectedFeedback.id));
      Alert.alert("Success", "Reply sent to user.");
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Could not send reply.");
    }
  };

  const handleMarkResolved = async (item) => {
    try {
      await updateDoc(doc(db, 'user_feedback', item.id), { 
        status: 'reviewed',
        resolvedAt: serverTimestamp()
      });
      // Update UI locally
      setFeedbackList(prev => prev.filter(i => i.id !== item.id));
      Alert.alert("Success", "Feedback marked as resolved.");
    } catch (error) {
      Alert.alert("Error", "Could not resolve feedback.");
    }
  };

  const handleDelete = async (item) => {
    Alert.alert("Delete Feedback", "Are you sure?", [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: async () => {
            try {
                await deleteDoc(doc(db, 'user_feedback', item.id));
                setFeedbackList(prev => prev.filter(i => i.id !== item.id));
            } catch (e) { Alert.alert("Error", "Could not delete."); }
        }}
    ]);
  };

  // --- RENDER ---

  const renderItem = ({ item }) => {
    const isBug = item.category === 'Bug Report';
    
    return (
      <View style={[styles.card, selectedTab === 'pending' ? styles.cardPending : styles.cardReviewed]}>
        <View style={styles.cardHeader}>
            <View style={[styles.badge, isBug ? styles.badgeBug : styles.badgeFeature]}>
                <Text style={[styles.badgeText, isBug ? styles.textBug : styles.textFeature]}>
                    {item.category.toUpperCase()}
                </Text>
            </View>
            <Text style={styles.dateText}>
                {item.createdAt?.toDate ? item.createdAt.toDate().toLocaleDateString() : ''}
            </Text>
        </View>

        <Text style={styles.messageText}>"{item.message}"</Text>
        
        <View style={styles.userRow}>
            <Icon name="person-circle" size={16} color={colors.gray} />
            <Text style={styles.usernameText}>{item.username} ({item.userEmail})</Text>
        </View>

        {/* Display response if it exists (for the Reviewed tab) */}
        {selectedTab === 'reviewed' && item.adminReply && (
          <View style={styles.adminReplyContainer}>
            <Text style={styles.adminReplyLabel}>Admin Response:</Text>
            <Text style={styles.adminReplyText}>{item.adminReply}</Text>
          </View>
        )}

        <View style={styles.actionsRow}>
            {selectedTab === 'pending' && (
                <>
                  <TouchableOpacity style={styles.actionBtnPrimary} onPress={() => handleOpenReply(item)}>
                      <Icon name="arrow-undo" size={18} color={THEME_GREEN} />
                      <Text style={styles.actionTextPrimary}>Reply</Text>
                  </TouchableOpacity>
                </>
            )}
            <TouchableOpacity style={styles.actionBtnDestructive} onPress={() => handleDelete(item)}>
                <Icon name="trash-outline" size={18} color={ALERT_RED} />
                <Text style={styles.actionTextDestructive}>Delete</Text>
            </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#fff" barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                <Icon name="arrow-back" size={24} color={colors.dark} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>User Feedback</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
          <TouchableOpacity 
            style={[styles.tab, selectedTab === 'pending' && styles.activeTab]} 
            onPress={() => setSelectedTab('pending')}
          >
              <Text style={[styles.tabText, selectedTab === 'pending' && styles.activeTabText]}>Inbox (Pending)</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, selectedTab === 'reviewed' && styles.activeTab]} 
            onPress={() => setSelectedTab('reviewed')}
          >
              <Text style={[styles.tabText, selectedTab === 'reviewed' && styles.activeTabText]}>Reviewed</Text>
          </TouchableOpacity>
      </View>

      {/* List */}
      {loading ? (
          <View style={styles.centerContainer}>
              <ActivityIndicator size="large" color={THEME_GREEN} />
          </View>
      ) : (
          <FlatList 
            data={feedbackList}
            renderItem={renderItem}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.listContent}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
            ListEmptyComponent={
                <View style={styles.emptyState}>
                    <Icon name="mail-open-outline" size={48} color={colors.gray} />
                    <Text style={styles.emptyText}>No {selectedTab} feedback.</Text>
                </View>
            }
          />
      )}

      {/* Reply Modal */}
      <Modal visible={replyModalVisible} animationType="fade" transparent={true}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Reply to Feedback</Text>
            <Text style={styles.modalUserLabel}>To: {selectedFeedback?.username}</Text>
            <TextInput
              style={styles.replyInput}
              placeholder="Write your response here..."
              multiline
              value={replyText}
              onChangeText={setReplyText}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setReplyModalVisible(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.sendBtn} onPress={handleSendReply}>
                <Text style={styles.sendBtnText}>Send Reply</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Bottom Nav */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('AdminHome')}>
          <Icon name="home-outline" size={24} color={colors.gray} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('ManageReport')}>
          <Icon name="people-outline" size={24} color={colors.gray} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem}>
          <Icon name="chatbubbles" size={24} color={THEME_YELLOW} /> 
        </TouchableOpacity>
      </View>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Header
  header: { 
      flexDirection: 'row',
      alignItems: 'center',
      padding: spacing.md, 
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: '#dbdbdb',
      backgroundColor: '#fff',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: {
    fontFamily: fonts.header,
    fontSize: 22,
    fontWeight: '700',
    color: THEME_GREEN,
  },
  backButton: {
    padding: 4,
  },

  // Tabs
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  tab: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: colors.dark,
  },
  tabText: {
    fontSize: 14,
    color: colors.gray,
    fontWeight: '600',
  },
  activeTabText: {
    color: colors.dark,
    fontWeight: 'bold',
  },

  // List
  listContent: {
    padding: spacing.md,
    paddingBottom: 80,
  },
  
  // Card
  card: {
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  cardPending: {
    backgroundColor: PENDING_BG,
  },
  cardReviewed: {
    backgroundColor: REVIEWED_BG,
  },
  
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
  },
  badgeBug: {
    backgroundColor: '#ffebee',
    borderColor: ALERT_RED,
  },
  badgeFeature: {
    backgroundColor: '#e3f2fd',
    borderColor: '#2196F3',
  },
  
  badgeText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  textBug: {
    color: ALERT_RED,
  },
  textFeature: {
    color: '#2196F3',
  },
  
  dateText: {
    fontSize: 10,
    color: colors.gray,
  },
  
  messageText: {
    fontSize: 15,
    color: colors.dark,
    lineHeight: 22,
    marginBottom: 12,
    fontWeight: '500',
  },
  
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 15,
  },
  usernameText: {
    fontSize: 12,
    color: colors.gray,
  },

  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 15,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
    paddingTop: 10,
  },
  actionBtnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  actionTextPrimary: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.dark,
  },
  actionBtnDestructive: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  actionTextDestructive: {
    fontSize: 13,
    fontWeight: '600',
    color: ALERT_RED,
  },

  // Empty
  emptyState: {
    alignItems: 'center',
    marginTop: 50,
    gap: 10,
  },
  emptyText: {
    color: colors.gray,
    fontSize: 16,
    fontWeight: '500',
  },

  // Bottom Nav
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Admin Reply UI
  adminReplyContainer: {
    backgroundColor: 'rgba(0,0,0,0.03)',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: THEME_GREEN,
  },
  adminReplyLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: THEME_GREEN,
    marginBottom: 4,
  },
  adminReplyText: {
    fontSize: 14,
    color: colors.dark,
    fontStyle: 'italic',
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
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
    color: colors.dark,
  },
  modalUserLabel: {
    fontSize: 14,
    color: colors.gray,
    marginBottom: 15,
  },
  replyInput: {
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 8,
    padding: 12,
    height: 120,
    textAlignVertical: 'top',
    fontSize: 16,
    backgroundColor: '#fafafa',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 20,
  },
  cancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  cancelBtnText: {
    color: colors.gray,
    fontWeight: '600',
  },
  sendBtn: {
    backgroundColor: THEME_GREEN,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  sendBtnText: {
    color: '#fff',
    fontWeight: 'bold',
  }
});