import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

// --- NEW IMPORTS ---
import { useFocusEffect } from '@react-navigation/native';
import {
  collection,
  doc,
  getCountFromServer,
  getDoc,
  getDocs,
  getFirestore,
  query,
  updateDoc,
  where
} from 'firebase/firestore';

// --- IMPORTS ---
import Icon from '../../assets/icons/icons';
import { colors, fonts, spacing } from '../../lib/theme';

// --- CONSTANTS ---
const ACTIVE_YELLOW = '#FDD835'; 

// --- MOCK DATA ---
const feedbacksData = [
  { 
    id: '3', 
    name: 'Ben', 
    detail: 'Dear admins, i am unable to access to my profile.', 
    type: 'SYSTEM_ISSUE', 
  },
];

export default function AdminHomeScreen({ navigation }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('home');

  // --- NEW STATE FOR REAL DATA ---
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // New State for Dashboard Counts
  const [stats, setStats] = useState({
    pending: 0,
    users: 0,
    swaps: 0,
    feedback: 0
  });

  const db = getFirestore();

  // --- FETCH REPORTS & STATS LOGIC ---
  useFocusEffect(
    useCallback(() => {
      loadReports();
    }, [])
  );

  const loadReports = async () => {
    try {
      setLoading(true);
      
      // 1. Prepare Report Queries
      const postsQuery = query(
        collection(db, 'report'),
        where('status', '==', 'pending')
      );
      
      const commentsQuery = query(
        collection(db, 'reported_comments'),
        where('status', '==', 'pending')
      );
      
      // 2. Prepare Count Collections
      const usersColl = collection(db, 'users');
      const swapsColl = collection(db, 'swaps'); 
      const feedbackColl = collection(db, 'feedbacks');

      // 3. Run EVERYTHING in parallel
      const [
        postSnapshot, 
        commentSnapshot,
        usersSnap,
        swapsSnap,
        feedbackSnap
      ] = await Promise.all([
        getDocs(postsQuery),
        getDocs(commentsQuery),
        getCountFromServer(usersColl),
        getCountFromServer(swapsColl),
        getCountFromServer(feedbackColl)
      ]);
      
      // 4. Process Reports List
      
      // --- Process Posts (With Correct Field Name Check) ---
      const postPromises = postSnapshot.docs.map(async (docSnapshot) => {
        const data = docSnapshot.data();
        
        // CORRECTION: Use the field name from your screenshot
        const reportedId = data.reported_clothes_id; 

        if (reportedId) {
            // Check the 'swaps' collection for this ID
            const postRef = doc(db, 'swaps', reportedId);
            const postSnap = await getDoc(postRef);
            const postData = postSnap.exists() ? postSnap.data() : null;

            // Check if physically missing OR marked deleted in data
            const isPhysicallyDeleted = !postSnap.exists();
            const isMarkedDeleted = postData && (
                postData.status === 'deleted' || 
                postData.status === 'archived' || 
                postData.status === 'sold' ||
                postData.isDeleted === true
            );

            if (isPhysicallyDeleted || isMarkedDeleted) {
                console.log(`Auto-resolving report ${docSnapshot.id}. Item ${reportedId} is missing/deleted.`);
                
                // 1. Update Firestore to 'resolved'
                await updateDoc(doc(db, 'report', docSnapshot.id), {
                    status: 'resolved',
                    admin_note: 'System Auto-Resolve: Item deleted'
                });

                // 2. Return null to hide from screen immediately
                return null; 
            }
        }

        return {
            id: docSnapshot.id,
            ...data,
            reportType: 'post',
            name: data.reporter_user_id ? `User...${data.reporter_user_id.slice(-4)}` : 'Anonymous',
            detail: `Post: ${data.reason || 'Reported Content'}`,
            timestamp: data.created_at?.toDate ? data.created_at.toDate() : new Date(0),
            icon: 'alert-circle',
            iconColor: '#FF6B6B'
        };
      });

      // --- Process Comments ---
      const formattedComments = commentSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            ...data,
            reportType: 'comment',
            name: data.reporterName || 'Unknown Reporter',
            detail: `Comment: "${data.targetContent}"`, 
            timestamp: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(0),
            icon: 'chatbubble-ellipses',
            iconColor: '#FDD835'
        };
      });

      // Await all checks
      const resolvedPosts = await Promise.all(postPromises);
      
      // Filter out the nulls (the auto-resolved ones)
      const validPosts = resolvedPosts.filter(item => item !== null);

      const allReports = [...validPosts, ...formattedComments];
      allReports.sort((a, b) => b.timestamp - a.timestamp);

      setReports(allReports);

      // 5. Update Stats State
      setStats({
        pending: allReports.length,
        users: usersSnap.data().count,
        swaps: swapsSnap.data().count,
        feedback: feedbackSnap.data().count
      });

    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  // --- DYNAMIC STATS DATA ---
  const statsData = [
    { label: 'Pending', value: stats.pending, icon: 'alert-circle-outline', color: '#FF6B6B' },
    { label: 'Users', value: stats.users, icon: 'people-outline', color: colors.dark }, 
    { label: 'Swaps', value: stats.swaps, icon: 'swap-horizontal-outline', color: '#9abeaa' }, 
    { label: 'Feedback', value: stats.feedback, icon: 'chatbubble-outline', color: '#FCE77D' },
  ];

  // --- NAVIGATION LOGIC ---
  const handleViewItem = (item) => {
    if (item.reportType === 'comment') {
        navigation.navigate('ManageComments');
    } else {
        navigation.navigate('ManageAccount', { report: item });
    }
  };

  const handleNavigation = (tab) => {
    setActiveTab(tab);
    switch(tab) {
      case 'home': break;
      case 'profiles': navigation.navigate('ManageAccount'); break;
      case 'comments': navigation.navigate('ManageComments'); break;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#fff" barStyle="dark-content" />
      
      {/* --- HEADER --- */}
      <View style={styles.header}>
        <Text style={styles.logo}>Swapism Admin</Text>
        <View style={styles.headerIcons}>
          <TouchableOpacity style={styles.headerIcon}>
            <Icon name="notifications-outline" size={24} color={colors.dark} />
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
        
        {/* --- SEARCH BAR --- */}
        <View style={styles.searchContainer}>
            <View style={styles.searchBar}>
                <Icon name="search-outline" size={20} color={colors.gray} style={styles.searchIcon}/>
                <TextInput
                    placeholder="Search reports, users..."
                    placeholderTextColor={colors.gray}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    style={styles.searchInput}
                />
            </View>
        </View>

        {/* --- HERO SECTION --- */}
        <View style={styles.heroContainer}>
           <View style={styles.heroTextContainer}>
                <Text style={styles.greetingText}>Hello, Admin 👋</Text>
                <Text style={styles.subGreetingText}>You have {stats.pending} pending reports</Text>
           </View>
           <View style={styles.heroIconCircle}>
                <Icon name="shield-checkmark-outline" size={32} color="#9abeaa" />
           </View>
        </View>

        {/* --- STATS GRID --- */}
        <View style={styles.statsGrid}>
            {statsData.map((stat, index) => (
                <View key={index} style={styles.statCard}>
                    <View style={styles.statHeader}>
                        <Text style={styles.statValue}>
                            {loading && stat.value === 0 ? '...' : stat.value}
                        </Text>
                        <Icon name={stat.icon} size={20} color={stat.color} />
                    </View>
                    <Text style={styles.statLabel}>{stat.label}</Text>
                </View>
            ))}
        </View>

        {/* --- REPORTS SECTION --- */}
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
                <Text style={{textAlign:'center', color: colors.gray, padding: 20}}>No pending reports.</Text>
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

        {/* --- FEEDBACKS SECTION --- */}
        <View style={styles.sectionHeaderRow}>
             <Text style={styles.sectionTitle}>User Feedbacks</Text>
        </View>

        <View style={styles.listContainer}>
            {feedbacksData.map((item) => (
              <View key={item.id} style={styles.listItem}>
                <View style={styles.listItemLeft}>
                    <View style={[styles.statusIndicator, { backgroundColor: '#9abeaa' }]} />
                    <View style={styles.avatar}>
                         <Icon name="person" size={20} color={colors.gray} />
                    </View>
                    <View style={styles.textContainer}>
                        <Text style={styles.nameText}>{item.name}</Text>
                        <Text style={styles.detailText} numberOfLines={1}>
                            {item.detail}
                        </Text>
                    </View>
                </View>
                <TouchableOpacity 
                    style={styles.reviewButton}
                    onPress={() => {}}
                >
                    <Text style={styles.reviewButtonText}>Reply</Text>
                </TouchableOpacity>
              </View>
            ))}
        </View>

      </ScrollView>

      {/* --- BOTTOM NAVBAR --- */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem} onPress={() => handleNavigation('home')}>
          <Icon 
            name={activeTab === 'home' ? 'home' : 'home-outline'} 
            size={24} 
            color={activeTab === 'home' ? ACTIVE_YELLOW : colors.gray} 
          />
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem} onPress={() => handleNavigation('profiles')}>
          <Icon 
            name={activeTab === 'profiles' ? 'people' : 'people-outline'} 
            size={24} 
            color={activeTab === 'profiles' ? ACTIVE_YELLOW : colors.gray} 
          />
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem} onPress={() => handleNavigation('comments')}>
          <Icon 
            name={activeTab === 'comments' ? 'chatbubbles' : 'chatbubbles-outline'} 
            size={24} 
            color={activeTab === 'comments' ? ACTIVE_YELLOW : colors.gray} 
          />
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
  // --- HEADER ---
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
  // --- SEARCH ---
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
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, fontSize: 14, fontFamily: fonts.body, color: colors.dark, height: '100%' },
  // --- SCROLL CONTENT ---
  scrollContent: { 
    paddingBottom: 80 
  },
  // --- HERO ---
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
  heroTextContainer: { flex: 1 },
  greetingText: { fontFamily: fonts.header, fontSize: 18, fontWeight: '700', color: colors.dark },
  subGreetingText: { fontFamily: fonts.body, fontSize: 14, color: colors.gray, marginTop: 4 },
  heroIconCircle: {
      width: 48, height: 48, borderRadius: 24, backgroundColor: '#fff', 
      justifyContent: 'center', alignItems: 'center'
  },
  // --- STATS ---
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
    shadowOffset: { width: 0, height: 2 },
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
  statValue: { fontFamily: fonts.header, fontSize: 24, fontWeight: '700', color: colors.dark },
  statLabel: { fontFamily: fonts.body, fontSize: 12, color: colors.gray },
  // --- SECTIONS ---
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  sectionTitle: { fontFamily: fonts.header, fontSize: 16, fontWeight: '700', color: colors.dark },
  viewAllText: { fontFamily: fonts.body, fontSize: 14, color: '#9abeaa', fontWeight: '600' },
  // --- LIST ITEMS ---
  listContainer: { paddingHorizontal: spacing.md, marginBottom: spacing.sm },
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
  listItemLeft: { flexDirection: 'row', flex: 1, alignItems: 'center', marginRight: 10 },
  statusIndicator: { width: 4, height: 24, borderRadius: 2, marginRight: 12 },
  avatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: '#f5f5f5',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
  },
  textContainer: { flex: 1 },
  nameText: { fontFamily: fonts.body, fontWeight: '600', fontSize: 14, color: colors.dark, marginBottom: 2 },
  detailText: { fontFamily: fonts.body, fontSize: 12, color: colors.gray },
  reviewButton: {
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: '#dbdbdb',
  },
  reviewButtonText: { fontFamily: fonts.body, fontSize: 12, fontWeight: '600', color: colors.dark },
  // --- NAVBAR ---
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
});