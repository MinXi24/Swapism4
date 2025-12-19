import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View
} from 'react-native';

// --- IMPORTS ---
import { useFocusEffect } from '@react-navigation/native';
import {
  collection,
  getCountFromServer,
  getDocs,
  getFirestore,
  query,
  where
} from 'firebase/firestore';

import Icon from '../../assets/icons/icons';
import { colors, fonts, spacing } from '../../lib/theme';

// --- CONSTANTS ---
const ACTIVE_YELLOW = '#FDD835'; 

export default function AdminHomeScreen({ navigation }) {
  const [activeTab, setActiveTab] = useState('home');

  // --- DATA STATE ---
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [stats, setStats] = useState({
    pending: 0,
    users: 0,
    listings: 0,
    resolved: 0
  });

  // --- MODAL STATE ---
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedStatData, setSelectedStatData] = useState(null);

  const db = getFirestore();

  // --- FETCH REPORTS LOGIC ---
  useFocusEffect(
    useCallback(() => {
      loadReports();
    }, [])
  );

  const loadReports = async () => {
    try {
      setLoading(true);
      
      const postsQuery = query(collection(db, 'report'), where('status', '==', 'pending'));
      const commentsQuery = query(collection(db, 'reported_comments'), where('status', '==', 'pending')); 
      const usersReportQuery = query(collection(db, 'reported_users'), where('status', '==', 'pending'));
      
      const usersColl = collection(db, 'users');
      const clothesColl = collection(db, 'clothes'); 
      const resolvedQuery = query(collection(db, 'report'), where('status', '==', 'resolved'));

      const [
        postSnap, 
        commentSnap,
        userReportSnap,
        totalUsersSnap,
        totalClothesSnap,
        resolvedSnap
      ] = await Promise.all([
        getDocs(postsQuery),
        getDocs(commentsQuery),
        getDocs(usersReportQuery),
        getCountFromServer(usersColl),
        getCountFromServer(clothesColl),
        getCountFromServer(resolvedQuery)
      ]);
      
      // Process Lists
      const formattedPosts = postSnap.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            ...data,
            reportType: 'post',
            name: 'Reported Post',
            detail: `Reason: ${data.reason || 'Flagged Content'}`,
            timestamp: data.created_at?.toDate ? data.created_at.toDate() : new Date(0),
            icon: 'alert-circle',
            iconColor: '#FF6B6B' 
        };
      });

      const formattedComments = commentSnap.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            ...data,
            reportType: 'comment',
            name: data.targetOwnerName || 'Unknown User',
            detail: `Comment: "${data.targetContent || 'Hidden'}"`, 
            timestamp: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(0),
            icon: 'chatbubble-ellipses',
            iconColor: '#FDD835'
        };
      });

      const formattedUserReports = userReportSnap.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            ...data,
            reportType: 'user', 
            name: data.reported_user_name || 'Reported User',
            detail: `Reason: ${data.reason || 'User Behavior'}`, 
            timestamp: data.created_at?.toDate ? data.created_at.toDate() : new Date(0),
            icon: 'person-remove', 
            iconColor: '#FF6B6B'
        };
      });

      const allReports = [...formattedPosts, ...formattedComments, ...formattedUserReports];
      allReports.sort((a, b) => b.timestamp - a.timestamp); 

      setReports(allReports);

      const totalPending = postSnap.size + commentSnap.size + userReportSnap.size;

      setStats({
        pending: totalPending,
        users: totalUsersSnap.data().count,
        listings: totalClothesSnap.data().count,
        resolved: resolvedSnap.data().count
      });

    } catch (error) {
      console.error('Error loading admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewItem = (item) => {
    navigation.navigate('ManageReport', { report: item });
  };

  const handleNavigation = (tab) => {
    setActiveTab(tab);
    switch(tab) {
      case 'home': break;
      case 'profiles': navigation.navigate('ManageReport'); break;
      case 'comments': navigation.navigate('ManageFeedback'); break;
    }
  };

  const handleLogout = () => {
    navigation.navigate('Welcome');
  };

  const handleStatPress = (stat) => {
    let breakdown = [];
    let description = "";
    let showDetailsButton = false; 

    switch (stat.label) {
        case 'Pending':
            const postCount = reports.filter(r => r.reportType === 'post').length;
            const commentCount = reports.filter(r => r.reportType === 'comment').length;
            const userReportCount = reports.filter(r => r.reportType === 'user').length;

            description = "Items currently awaiting moderator review.";
            showDetailsButton = true; 
            breakdown = [
                { label: 'Reported Posts', value: postCount },
                { label: 'Reported Comments', value: commentCount },
                { label: 'Reported Users', value: userReportCount }
            ];
            break;
            
        case 'Users':
            description = "Total registered users.";
            breakdown = [
                { label: 'Total Accounts', value: stats.users },
            ];
            break;
            
        case 'Listings':
            description = "Total active wardrobe items.";
            breakdown = [
                { label: 'Active Items', value: stats.listings },
            ];
            break;
            
        case 'Resolved':
            description = "Total closed cases.";
            breakdown = [
                { label: 'Cases Closed', value: stats.resolved },
            ];
            break;
    }

    setSelectedStatData({ ...stat, description, breakdown, showDetailsButton });
    setModalVisible(true);
  };

  const handleSeeMoreDetails = () => {
    setModalVisible(false);
    navigation.navigate('ManageReport'); 
  };

  const statsData = [
    { label: 'Pending', value: stats.pending, icon: 'alert-circle-outline', color: '#FF6B6B' },
    { label: 'Users', value: stats.users, icon: 'people-outline', color: colors.dark }, 
    { label: 'Listings', value: stats.listings, icon: 'shirt-outline', color: '#9abeaa' }, 
    { label: 'Resolved', value: stats.resolved, icon: 'checkmark-done-circle-outline', color: '#FCE77D' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#fff" barStyle="dark-content" />
      
      <View style={styles.header}>
        <Text style={styles.logo}>Swapism Admin</Text>
        <View style={styles.headerIcons}>
          <TouchableOpacity style={styles.headerIcon} onPress={handleLogout}>
            <Icon name="log-out-outline" size={24} color={colors.dark} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
            <RefreshControl refreshing={loading} onRefresh={loadReports} />
        }
      >
        
        {/* --- SEARCH BAR (NAVIGATES TO ADMIN SEARCH) --- */}
        <TouchableOpacity 
            style={styles.searchContainer} 
            activeOpacity={0.9}
            onPress={() => navigation.navigate('AdminSearch')} 
        >
            <View style={styles.searchBar}>
                <Icon name="search-outline" size={20} color={colors.gray} style={styles.searchIcon}/>
                <Text style={styles.placeholderText}>Search reports, users...</Text>
            </View>
        </TouchableOpacity>

        <View style={styles.heroContainer}>
           <View style={styles.heroTextContainer}>
                <Text style={styles.greetingText}>Hello, Admin 👋</Text>
                <Text style={styles.subGreetingText}>You have {stats.pending} pending reports</Text>
           </View>
           <View style={styles.heroIconCircle}>
                <Icon name="shield-checkmark-outline" size={32} color="#9abeaa" />
           </View>
        </View>

        <View style={styles.statsGrid}>
            {statsData.map((stat, index) => (
                <TouchableOpacity 
                    key={index} 
                    style={styles.statCard}
                    onPress={() => handleStatPress(stat)}
                    activeOpacity={0.7}
                >
                    <View style={styles.statHeader}>
                        <Text style={styles.statValue}>
                            {loading && stat.value === 0 ? '...' : stat.value}
                        </Text>
                        <Icon name={stat.icon} size={20} color={stat.color} />
                    </View>
                    <Text style={styles.statLabel}>{stat.label}</Text>
                    <Text style={styles.statActionText}>View Details →</Text>
                </TouchableOpacity>
            ))}
        </View>

        <View style={styles.sectionHeaderRow}>
             <Text style={styles.sectionTitle}>Recent Reports</Text>
             <TouchableOpacity onPress={loadReports}>
                <Text style={styles.viewAllText}>Refresh</Text>
             </TouchableOpacity>
        </View>

        <View style={styles.listContainer}>
            {loading ? (
                <ActivityIndicator size="small" color={colors.dark} style={{padding:20}} />
            ) : reports.length === 0 ? (
                <Text style={styles.emptyText}>
                    No pending reports.
                </Text>
            ) : (
                reports.map((item) => (
                <View key={item.id} style={styles.listItem}>
                    <View style={styles.listItemLeft}>
                        <View style={[styles.statusIndicator, { backgroundColor: item.iconColor }]} />
                        <View style={styles.avatar}>
                            <Icon name={item.icon} size={20} color={colors.gray} />
                        </View>
                        <View style={styles.textContainer}>
                            <Text style={styles.nameText}>{item.name}</Text>
                            <Text style={styles.detailText} numberOfLines={1}>{item.detail}</Text>
                        </View>
                    </View>
                    
                    <TouchableOpacity 
                        style={styles.reviewButton}
                        onPress={() => handleViewItem(item)}
                    >
                        <Text style={styles.reviewButtonText}>Review</Text>
                    </TouchableOpacity>
                </View>
                ))
            )}
        </View>

      </ScrollView>

      {/* --- STAT DETAILS MODAL --- */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity 
            style={styles.modalOverlay} 
            activeOpacity={1} 
            onPress={() => setModalVisible(false)}
        >
            <TouchableWithoutFeedback>
                <View style={styles.modalContent}>
                    {selectedStatData && (
                        <>
                            <View style={styles.modalHeader}>
                                <View style={[styles.modalIconCircle, { backgroundColor: selectedStatData.color + '20' }]}>
                                    <Icon name={selectedStatData.icon} size={28} color={selectedStatData.color} />
                                </View>
                                <View>
                                    <Text style={styles.modalTitle}>{selectedStatData.label}</Text>
                                    <Text style={styles.modalBigValue}>{selectedStatData.value}</Text>
                                </View>
                            </View>
                            
                            <Text style={styles.modalDescription}>{selectedStatData.description}</Text>
                            
                            <View style={styles.breakdownContainer}>
                                <Text style={styles.breakdownHeader}>INSIGHTS</Text>
                                {selectedStatData.breakdown.map((item, i) => (
                                    <View key={i} style={styles.breakdownRow}>
                                        <View style={{flexDirection:'row', alignItems:'center'}}>
                                            <Text style={styles.breakdownLabel}>{item.label}</Text>
                                        </View>
                                        <Text style={styles.breakdownValue}>{item.value}</Text>
                                    </View>
                                ))}
                            </View>

                            {selectedStatData.showDetailsButton && (
                                <TouchableOpacity 
                                    style={styles.detailsButton}
                                    onPress={handleSeeMoreDetails}
                                >
                                    <Text style={styles.detailsButtonText}>See More Details</Text>
                                </TouchableOpacity>
                            )}

                            <TouchableOpacity 
                                style={styles.closeButton}
                                onPress={() => setModalVisible(false)}
                            >
                                <Text style={styles.closeButtonText}>Close</Text>
                            </TouchableOpacity>
                        </>
                    )}
                </View>
            </TouchableWithoutFeedback>
        </TouchableOpacity>
      </Modal>

      {/* --- BOTTOM NAVBAR --- */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem} onPress={() => handleNavigation('home')}>
          <Icon name={activeTab === 'home' ? 'home' : 'home-outline'} size={24} color={activeTab === 'home' ? ACTIVE_YELLOW : colors.gray} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => handleNavigation('profiles')}>
          <Icon name={activeTab === 'profiles' ? 'people' : 'people-outline'} size={24} color={activeTab === 'profiles' ? ACTIVE_YELLOW : colors.gray} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => handleNavigation('comments')}>
          <Icon name={activeTab === 'comments' ? 'chatbubbles' : 'chatbubbles-outline'} size={24} color={activeTab === 'comments' ? ACTIVE_YELLOW : colors.gray} />
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#dbdbdb',
    backgroundColor: '#fff',
  },
  logo: {
    fontFamily: fonts.header,
    fontSize: 28,
    fontWeight: '700',
    color: '#9abeaa',
  },
  headerIcons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  headerIcon: {
    padding: 4,
  },
  scrollContent: {
    paddingBottom: 80,
  },
  searchContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  searchBar: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 40,
    borderWidth: 1,
    borderColor: '#eee',
  },
  searchIcon: {
    marginRight: 10,
  },
  placeholderText: {
    flex: 1,
    fontSize: 14,
    fontFamily: fonts.body,
    color: colors.gray, 
  },
  heroContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f5f3e4',
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#eee',
  },
  heroTextContainer: {
    flex: 1,
  },
  greetingText: {
    fontFamily: fonts.header,
    fontSize: 18,
    fontWeight: '700',
    color: colors.dark,
  },
  subGreetingText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.gray,
    marginTop: 4,
  },
  heroIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  statCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: '#dbdbdb',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontFamily: fonts.header,
    fontSize: 24,
    fontWeight: '700',
    color: colors.dark,
  },
  statLabel: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.gray,
  },
  statActionText: {
    fontSize: 10,
    color: '#9abeaa',
    marginTop: 8,
    fontWeight: '600'
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  sectionTitle: {
    fontFamily: fonts.header,
    fontSize: 16,
    fontWeight: '700',
    color: colors.dark,
  },
  viewAllText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: '#9abeaa',
    fontWeight: '600',
  },
  listContainer: {
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  listItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: '#eee',
  },
  listItemLeft: {
    flexDirection: 'row',
    flex: 1,
    alignItems: 'center',
    marginRight: 10,
  },
  statusIndicator: {
    width: 4,
    height: 24,
    borderRadius: 2,
    marginRight: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  nameText: {
    fontFamily: fonts.body,
    fontWeight: '600',
    fontSize: 14,
    color: colors.dark,
    marginBottom: 2,
  },
  detailText: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.gray,
  },
  reviewButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#dbdbdb',
  },
  reviewButtonText: {
    fontFamily: fonts.body,
    fontSize: 12,
    fontWeight: '600',
    color: colors.dark,
  },
  emptyText: {
    textAlign: 'center',
    color: colors.gray,
    padding: 20,
    fontFamily: fonts.body,
  },
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#dbdbdb',
    elevation: 0,
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  // --- MODAL STYLES ---
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    width: '85%',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalIconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  modalTitle: {
    fontFamily: fonts.header,
    fontSize: 16,
    color: colors.gray,
  },
  modalBigValue: {
    fontFamily: fonts.header,
    fontSize: 32,
    fontWeight: '700',
    color: colors.dark,
  },
  modalDescription: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    lineHeight: 20,
  },
  breakdownContainer: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15, 
  },
  breakdownHeader: {
    fontFamily: fonts.body,
    fontSize: 10,
    fontWeight: '700',
    color: '#999',
    marginBottom: 8,
    letterSpacing: 1,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2, 
    paddingVertical: 4, 
  },
  breakdownLabel: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.dark,
  },
  breakdownValue: {
    fontFamily: fonts.body,
    fontSize: 14,
    fontWeight: '600',
    color: colors.dark,
  },
  detailsButton: {
    backgroundColor: '#9abeaa',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  detailsButtonText: {
    color: '#fff',
    fontFamily: fonts.header,
    fontWeight: '600',
    fontSize: 16,
  },
  closeButton: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#eee',
  },
  closeButtonText: {
    color: colors.gray,
    fontFamily: fonts.header,
    fontWeight: '600',
    fontSize: 16,
  },
});