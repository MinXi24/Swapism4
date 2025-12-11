import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  getFirestore,
  orderBy,
  query,
  updateDoc,
  where
} from 'firebase/firestore';
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

// --- IMPORTS ---
import Icon from '../../assets/icons/icons';
import { colors, fonts, spacing } from '../../lib/theme';

// --- THEME COLORS ---
const THEME_GREEN = '#9abeaa';
const THEME_CREAM = '#f5f3e4';
const ACTIVE_YELLOW = '#FDD835'; 
const FLAG_BG = '#FFF9C4'; // Softer yellow for flagged background
const ALERT_RED = '#FF6B6B';

export default function ManageCommentsScreen({ navigation }) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('comments');

  const db = getFirestore();

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      const q = query(
        collection(db, 'reported_comments'),
        where('status', '==', 'pending'),
        orderBy('createdAt', 'desc')
      );
      
      const snapshot = await getDocs(q);
      const reportsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setReports(reportsData);
    } catch (error) {
      console.error('Error fetching comment reports:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchReports();
  };

  const handleBack = () => {
    navigation.goBack();
  };

  const handleDeleteComment = (report) => {
    Alert.alert(
      "Delete Comment",
      "Are you sure you want to remove this comment and resolve the report?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive",
          onPress: async () => {
            try {
              // 1. Delete the actual comment
              if (report.targetId) {
                await deleteDoc(doc(db, 'comments', report.targetId));
              }
              
              // 2. Mark report as resolved
              await updateDoc(doc(db, 'reported_comments', report.id), {
                status: 'resolved',
                resolution: 'deleted_comment'
              });

              // Remove from UI
              setReports(prev => prev.filter(item => item.id !== report.id));
              Alert.alert('Success', 'Comment deleted.');
            } catch (error) {
              console.error('Error deleting comment:', error);
              Alert.alert('Error', 'Failed to delete comment.');
            }
          } 
        }
      ]
    );
  };

  const handleDismissReport = (report) => {
    Alert.alert(
        "Dismiss Report",
        "Keep this comment and ignore the report?",
        [
            { text: "Cancel", style: "cancel" },
            { 
                text: "Keep Comment", 
                onPress: async () => {
                    try {
                        await updateDoc(doc(db, 'reported_comments', report.id), {
                            status: 'dismissed'
                        });
                        setReports(prev => prev.filter(item => item.id !== report.id));
                    } catch (error) {
                        console.error('Error dismissing report:', error);
                    }
                }
            }
        ]
    );
  };

  const handleNavigation = (tab) => {
    setActiveTab(tab);
    switch(tab) {
      case 'home': navigation.navigate('AdminHome'); break;
      case 'profiles': navigation.navigate('ManageAccount'); break;
      case 'comments': break; // Already here
    }
  };

  const renderReportItem = ({ item }) => (
    <View style={styles.flaggedCommentContainer}>
        {/* Report Reason Header */}
        <View style={styles.flaggedHeader}>
            <Icon name="alert-circle" size={16} color={ALERT_RED} />
            <Text style={styles.flaggedLabel}>
                {item.reason || 'Reported Content'}
            </Text>
            <Text style={styles.dateText}>
                 • {item.createdAt?.toDate ? item.createdAt.toDate().toLocaleDateString() : ''}
            </Text>
        </View>
        
        <View style={styles.commentContentRow}>
            <View style={styles.commentAvatar}>
                {/* Placeholder avatar or user image if available */}
                <Icon name="person" size={14} color="#fff" />
            </View>
            <View style={styles.commentBubble}>
                <Text style={styles.commentText}>
                    <Text style={styles.boldUsername}>{item.targetOwnerName || 'Unknown'} </Text>
                    {'\n'}
                    <Text style={styles.flaggedText}>"{item.targetContent}"</Text>
                </Text>
                
                <View style={styles.metaRow}>
                    <Text style={styles.replyText}>
                        Reported by: {item.reporterName}
                    </Text>
                </View>
            </View>
            
            {/* Actions */}
            <View style={styles.actionButtons}>
                {/* Dismiss Button */}
                <TouchableOpacity 
                    style={styles.actionButton} 
                    onPress={() => handleDismissReport(item)}
                >
                    <Icon name="checkmark-circle-outline" size={20} color={colors.dark} />
                </TouchableOpacity>

                {/* Delete Button */}
                <TouchableOpacity 
                    style={styles.actionButton} 
                    onPress={() => handleDeleteComment(item)}
                >
                    <Icon name="trash-outline" size={20} color={ALERT_RED} />
                </TouchableOpacity>
            </View>
        </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#fff" barStyle="dark-content" />

      {/* --- HEADER --- */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
            <TouchableOpacity onPress={handleBack} style={styles.backButton}>
                <Icon name="arrow-back" size={24} color={colors.dark} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Manage Comments</Text>
        </View>
        <View style={styles.headerIcons}>
          <TouchableOpacity style={styles.headerIcon}>
            <Icon name="ellipsis-horizontal" size={24} color={colors.dark} />
          </TouchableOpacity>
        </View>
      </View>

      {/* --- CONTENT --- */}
      {loading ? (
        <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={THEME_GREEN} />
        </View>
      ) : (
        <FlatList
            data={reports}
            renderItem={renderReportItem}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.scrollContent}
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
            }
            ListHeaderComponent={
                <View style={{ paddingBottom: 10 }}>
                     <Text style={styles.sectionTitle}>
                        {reports.length} Pending Reports
                     </Text>
                     {reports.length === 0 && (
                         <View style={styles.emptyState}>
                             <Icon name="checkmark-circle" size={40} color={THEME_GREEN} />
                             <Text style={styles.emptyText}>No reported comments!</Text>
                         </View>
                     )}
                </View>
            }
        />
      )}

      {/* --- BOTTOM NAVBAR (Active Yellow on Comments) --- */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem} onPress={() => handleNavigation('home')}>
          <Icon name="home-outline" size={24} color={colors.gray} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem} onPress={() => handleNavigation('profiles')}>
          <Icon name="people-outline" size={24} color={colors.gray} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem} onPress={() => handleNavigation('comments')}>
          <Icon name="chatbubbles" size={24} color={ACTIVE_YELLOW} /> 
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
  
  // --- HEADER (Standard White) ---
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
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: {
    fontFamily: fonts.header,
    fontSize: 20, 
    fontWeight: '700',
    color: THEME_GREEN, 
  },
  headerIcons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  headerIcon: {
    padding: 4,
  },
  backButton: {
    padding: 4,
  },

  // --- SCROLL CONTENT ---
  scrollContent: {
      padding: spacing.md,
      paddingBottom: 80,
  },
  sectionTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.dark,
      marginBottom: 16,
  },

  // --- FLAGGED COMMENT ---
  flaggedCommentContainer: {
    backgroundColor: FLAG_BG, // Light yellow background
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  flaggedHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
      gap: 6,
  },
  flaggedLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: ALERT_RED,
      textTransform: 'uppercase',
  },
  dateText: {
    color: colors.gray,
    fontSize: 10,
  },
  commentContentRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
  },
  commentAvatar: {
      width: 24, height: 24, borderRadius: 12, backgroundColor: '#ccc', marginRight: 10,
      justifyContent: 'center', alignItems: 'center'
  },
  commentBubble: {
      flex: 1,
      marginRight: 8,
  },
  commentText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.dark,
    lineHeight: 18,
  },
  boldUsername: {
    fontWeight: '700',
  },
  flaggedText: {
    color: colors.dark, 
    fontStyle: 'italic', // Emphasize flagged text
  },
  metaRow: {
      marginTop: 4,
  },
  replyText: {
    color: colors.gray,
    fontSize: 11,
    fontWeight: '600',
  },
  
  actionButtons: {
      flexDirection: 'column',
      gap: 12,
      paddingLeft: 4,
  },
  actionButton: {
      padding: 4,
  },

  // --- EMPTY STATE ---
  emptyState: {
      alignItems: 'center',
      marginTop: 40,
      gap: 10,
  },
  emptyText: {
      color: THEME_GREEN,
      fontWeight: '600',
  },

  // --- NAVBAR ---
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