import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
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

  const handleMarkReviewed = async (item) => {
    try {
      await updateDoc(doc(db, 'user_feedback', item.id), { status: 'reviewed' });
      // Remove from list locally for instant UI update
      setFeedbackList(prev => prev.filter(i => i.id !== item.id));
      Alert.alert("Success", "Feedback marked as reviewed.");
    } catch (error) {
      Alert.alert("Error", "Could not update status.");
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

        <View style={styles.actionsRow}>
            {selectedTab === 'pending' && (
                <TouchableOpacity style={styles.actionBtnPrimary} onPress={() => handleMarkReviewed(item)}>
                    <Icon name="checkmark-circle" size={18} color={THEME_GREEN} />
                    <Text style={styles.actionTextPrimary}>Mark Read</Text>
                </TouchableOpacity>
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
});