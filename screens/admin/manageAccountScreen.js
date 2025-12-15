import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

// --- FIREBASE IMPORTS ---
import {
  collection,
  deleteDoc,
  doc,
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

// --- THEME COLORS ---
const THEME_GREEN = '#9abeaa';
const THEME_YELLOW = '#ffd75c';
const THEME_CREAM = '#f5f3e4'; 
const FLAG_BG = '#FFF9C4'; 
const ALERT_RED = '#FF6B6B';

export default function ManageAccountScreen({ navigation, route }) {
  const db = getFirestore();
  const { report: paramReport } = route.params || {};

  // --- STATE ---
  const [viewMode, setViewMode] = useState(paramReport ? 'detail' : 'list');
  const [currentReport, setCurrentReport] = useState(paramReport || null);
  
  // List State
  const [reportsList, setReportsList] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Profile State
  const [loadingUser, setLoadingUser] = useState(false);
  const [userInfo, setUserInfo] = useState({
      username: 'Loading...',
      bio: '...',
      location: '...',
      rating: 0.0,
      reviewCount: 0,
      posts: 0,
      followers: 0,
      following: 0,
      photoURL: null,
      ownerUid: null
  });

  // 1. INITIAL LOAD
  useEffect(() => {
    fetchReportsList();
  }, []);

  // 2. HANDLE INCOMING PARAMS
  useEffect(() => {
    if (paramReport) {
        setCurrentReport(paramReport);
        setViewMode('detail');
    }
  }, [paramReport]);

  // 3. LOAD USER ON DETAIL VIEW
  useEffect(() => {
    if (viewMode === 'detail' && currentReport) {
        fetchUserDetails(currentReport);
    }
  }, [viewMode, currentReport]);

  // --- DATA FETCHING ---
  const fetchReportsList = async () => {
    try {
      // Fetch both Posts (report) and Users (reported_users)
      const postsQuery = query(collection(db, 'report'), where('status', '==', 'pending'));
      const usersQuery = query(collection(db, 'reported_users'), where('status', '==', 'pending'));

      const [postSnap, userSnap] = await Promise.all([ getDocs(postsQuery), getDocs(usersQuery) ]);

      const posts = postSnap.docs.map(doc => ({ id: doc.id, ...doc.data(), reportType: 'post' }));
      const users = userSnap.docs.map(doc => ({ id: doc.id, ...doc.data(), reportType: 'user' }));

      const allData = [...posts, ...users].sort((a, b) => {
          const dateA = a.created_at?.toDate ? a.created_at.toDate() : new Date(0);
          const dateB = b.created_at?.toDate ? b.created_at.toDate() : new Date(0);
          return dateB - dateA;
      });

      setReportsList(allData);
    } catch (error) {
      console.error('Error fetching list:', error);
    } finally {
      setLoadingList(false);
      setRefreshing(false);
    }
  };

  const fetchUserDetails = async (reportData) => {
    setLoadingUser(true);
    try {
        let ownerId = reportData.reported_user_id; 
        
        // If Post Report and no ownerId, find it from the post
        if (reportData.reportType !== 'user') {
            const targetId = reportData.reported_clothes_id || reportData.post_id || reportData.clothes_id;
            
            if (targetId) {
                let postSnap = await getDoc(doc(db, 'wardrobe-plug-fyp/user/images', targetId));
                if (!postSnap.exists()) postSnap = await getDoc(doc(db, 'clothes', targetId));
                if (!postSnap.exists()) postSnap = await getDoc(doc(db, 'userImages', targetId));

                if (postSnap.exists()) {
                    const postData = postSnap.data();
                    if (!ownerId) {
                        ownerId = postData.ownerUid || postData.userId || postData.uid;
                    }
                } else {
                    if (!ownerId) {
                        setUserInfo(prev => ({ ...prev, username: 'Post Deleted / Unknown User', bio: 'Item removed.' }));
                        return;
                    }
                }
            }
        }

        if (ownerId) {
            let userSnap = await getDoc(doc(db, 'users', ownerId));
            
            if (userSnap.exists()) {
                const userData = userSnap.data();
                setUserInfo({
                    username: userData.username || userData.display_name || 'No Name',
                    bio: userData.bio || 'No bio available',
                    location: userData.location || 'Singapore',
                    rating: userData.rating || 0.0,
                    reviewCount: userData.reviewCount || 0,
                    posts: Array.isArray(userData.posts) ? userData.posts.length : (userData.posts || 0),
                    followers: Array.isArray(userData.followers) ? userData.followers.length : (userData.followers || 0),
                    following: Array.isArray(userData.following) ? userData.following.length : (userData.following || 0),
                    photoURL: userData.photoURL || null,
                    ownerUid: ownerId
                });
            } else {
                 setUserInfo(prev => ({ ...prev, username: 'User Not Found', bio: 'Account might be deleted.' }));
            }
        }
    } catch (error) {
        console.error("Error details:", error);
    } finally {
        setLoadingUser(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchReportsList();
  };

  // --- ACTIONS ---
  const handleReviewItem = (item) => {
      setCurrentReport(item);
      setViewMode('detail');
  };

  const handleBack = () => {
      if (viewMode === 'detail' && !paramReport) {
          setViewMode('list');
          setCurrentReport(null);
      } else {
          navigation.goBack();
      }
  };

  const handleReportAction = async () => {
    if (!currentReport) return;
    
    const isUserReport = currentReport.reportType === 'user';
    const targetId = currentReport.reported_clothes_id || currentReport.post_id || currentReport.clothes_id;
    // Determine which collection the REPORT lives in
    const collectionName = isUserReport ? 'reported_users' : 'report';

    Alert.alert(
      "Take Action",
      isUserReport ? "Decide on this User Report" : "Decide on this Post Report",
      [
        { text: "Cancel", style: "cancel" },
        // OPTION 1: DISMISS (Keep Content)
        { 
            text: "Dismiss (Ignore)", 
            onPress: async () => {
                try {
                    await updateDoc(doc(db, collectionName, currentReport.id), {
                        status: 'resolved',
                        resolution: 'dismissed', 
                        resolved_at: new Date()
                    });
                    
                    finalizeAction("Report dismissed.");
                } catch (e) {
                    Alert.alert("Error", "Could not dismiss report.");
                }
            } 
        },
        // OPTION 2: DELETE / BAN
        { 
            text: isUserReport ? "BAN USER" : "DELETE POST", 
            style: "destructive", 
            onPress: async () => {
                try {
                    if (isUserReport) {
                        // --- BAN USER LOGIC REMOVED PER REQUEST ---
                        // Does NOTHING to the user document.
                        // It only updates the report status below.
                        console.log("Ban selected, but logic disabled. User remains active.");
                    } else {
                        // --- DELETE POST LOGIC (Kept Active) ---
                        if (targetId) {
                            await deleteDoc(doc(db, 'wardrobe-plug-fyp/user/images', targetId)).catch(()=>{});
                            await deleteDoc(doc(db, 'clothes', targetId)).catch(()=>{});
                            await deleteDoc(doc(db, 'userImages', targetId)).catch(()=>{});
                        }
                    }
                    
                    // Resolve the report ticket
                    await updateDoc(doc(db, collectionName, currentReport.id), {
                        status: 'resolved',
                        resolution: isUserReport ? 'banned_simulated' : 'deleted',
                        resolved_at: new Date()
                    });

                    finalizeAction(isUserReport ? "User report resolved (No Ban)." : "Post permanently deleted.");
                } catch (error) {
                    console.error(error);
                    Alert.alert("Error", "Could not complete action.");
                }
            } 
        }
      ]
    );
  };

  const finalizeAction = (message) => {
      setReportsList(prev => prev.filter(r => r.id !== currentReport.id));
      
      Alert.alert("Success", message, [
          { text: "OK", onPress: () => {
              if (paramReport) navigation.goBack();
              else setViewMode('list'); 
          }}
      ]);
  };

  const handleNavigation = (tab) => {
    switch(tab) {
      case 'home': navigation.navigate('AdminHome'); break;
      case 'profiles': break; 
      case 'comments': navigation.navigate('ManageComments'); break;
    }
  };

  // --- RENDER HELPERS ---
  
  // 1. User Detail View (Simplified Card)
  const renderUserDetail = () => (
    <View style={styles.adminPostView}>
        <View style={[styles.postHeader, {borderBottomWidth: 0, marginBottom: 5}]}>
            <Text style={{fontSize: 18, fontWeight: 'bold', color: ALERT_RED}}>USER REPORT</Text>
            <TouchableOpacity style={{ marginLeft: 'auto' }} onPress={handleReportAction}>
                <Icon name="hammer-outline" size={24} color={colors.dark} />
            </TouchableOpacity>
        </View>

        <View style={styles.userReportCard}>
            <Icon name="person-circle" size={60} color={colors.gray} />
            <Text style={{fontSize: 20, fontWeight:'bold', marginTop:10, color: colors.dark}}>{userInfo.username}</Text>
            <Text style={{color:colors.gray, marginBottom: 20}}>{userInfo.ownerUid}</Text>
            
            <View style={{width:'100%', padding: 15, backgroundColor:'#FFEBEE', borderRadius:8}}>
                <Text style={{color:ALERT_RED, fontWeight:'bold', marginBottom:5, fontSize: 12}}>REASON FOR REPORT:</Text>
                <Text style={{fontSize:16, color: colors.dark}}>{currentReport?.reason || "Inappropriate Behavior"}</Text>
            </View>
        </View>
    </View>
  );

  // 2. Post Detail View (Original Layout with Image)
  const renderPostDetail = () => (
    <View style={styles.adminPostView}>
        <View style={styles.postHeader}>
            <View style={styles.smallAvatar}>
                {userInfo.photoURL ? (
                    <Image source={{ uri: userInfo.photoURL }} style={{ width: 30, height: 30, borderRadius: 15 }} /> 
                ) : (
                    <Icon name="person" size={16} color="#fff"/>
                )}
            </View>
            <Text style={styles.postUsername}>{userInfo.username}</Text>
            <TouchableOpacity style={{ marginLeft: 'auto' }} onPress={handleReportAction}>
                <Icon name="hammer-outline" size={24} color={colors.dark} />
            </TouchableOpacity>
        </View>
        
        {currentReport?.snapshot_image_url ? (
            <Image source={{ uri: currentReport.snapshot_image_url }} style={styles.postImage} resizeMode="cover" />
        ) : (
            <View style={[styles.postImage, styles.postImagePlaceholder]}>
                <Text style={{color:colors.gray}}>Image Unavailable</Text>
            </View>
        )}
        
        <View style={styles.postFooter}>
            <View style={{marginTop: 10, padding: 8, backgroundColor: '#FFEBEE', borderRadius: 4}}>
                <Text style={{color: '#D32F2F', fontSize: 12, fontWeight:'bold'}}>
                    REPORT REASON: {currentReport?.reason}
                </Text>
            </View>
            {currentReport?.snapshot_description && (
                <Text style={styles.captionText}>
                    <Text style={{fontWeight: 'bold'}}>Caption: </Text>
                    {currentReport.snapshot_description}
                </Text>
            )}
        </View>
    </View>
  );

  // 3. List Item Renderer
  const renderListItem = ({ item }) => (
    <View style={styles.reportCard}>
        <View style={styles.cardHeader}>
            <View style={{flexDirection:'row', alignItems:'center', gap: 6}}>
                <Icon name={item.reportType === 'user' ? 'person' : 'alert-circle'} size={16} color={ALERT_RED} />
                <Text style={styles.flaggedLabel}>
                    {item.reportType === 'user' ? 'User Report' : (item.reason || "Reported")}
                </Text>
            </View>
            <Text style={styles.dateText}>
                {item.created_at?.toDate ? item.created_at.toDate().toLocaleDateString() : ''}
            </Text>
        </View>
        <View style={styles.cardContent}>
            {/* Show thumbnail only if it's a post report with an image */}
            {item.reportType !== 'user' && (
                item.snapshot_image_url ? (
                    <Image source={{ uri: item.snapshot_image_url }} style={styles.thumbnail} resizeMode="cover" />
                ) : (
                    <View style={[styles.thumbnail, styles.placeholderThumb]}>
                        <Icon name="image" size={20} color={colors.gray}/>
                    </View>
                )
            )}
            
            <View style={styles.textDetails}>
                 <Text style={styles.descriptionText} numberOfLines={2}>
                    <Text style={{fontWeight: 'bold'}}>{item.reportType === 'user' ? 'Subject: ' : 'User: '}</Text>
                    {item.reported_user_name || "Unknown"}
                 </Text>
                 <Text style={[styles.idText, {marginTop: 2}]}>
                    Reason: {item.reason}
                 </Text>
            </View>
            <TouchableOpacity style={styles.reviewButton} onPress={() => handleReviewItem(item)}>
                <Text style={styles.reviewButtonText}>Review</Text>
            </TouchableOpacity>
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
            <Text style={styles.headerLogo}>
                {viewMode === 'detail' ? 'Review Report' : 'Manage Reports'}
            </Text>
        </View>
        <View style={styles.headerIcons}>
          <TouchableOpacity style={styles.headerIcon}>
            <Icon name="ellipsis-horizontal" size={28} color={colors.dark} />
          </TouchableOpacity>
        </View>
      </View>

      {/* --- BODY CONTENT --- */}
      {viewMode === 'list' ? (
        // ---------------- LIST VIEW ----------------
        loadingList ? (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color={THEME_GREEN} />
            </View>
        ) : (
            <FlatList
                data={reportsList}
                renderItem={renderListItem}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.scrollContent}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
                }
                ListHeaderComponent={
                    <View style={{ paddingBottom: 10 }}>
                        <Text style={styles.sectionTitle}>
                            {reportsList.length} Pending Reports
                        </Text>
                        {reportsList.length === 0 && (
                            <View style={styles.emptyState}>
                                <Icon name="checkmark-circle" size={40} color={THEME_GREEN} />
                                <Text style={styles.emptyText}>No pending reports!</Text>
                            </View>
                        )}
                    </View>
                }
            />
        )
      ) : (
        // ---------------- DETAIL VIEW (PROFILE) ----------------
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            <View style={styles.profileSection}>
              {loadingUser ? (
                  <ActivityIndicator color={THEME_GREEN} style={{padding:20}} />
              ) : (
                <>
                  <View style={styles.profileTopRow}>
                    <View style={styles.profileImageContainer}>
                        <View style={styles.profileImagePlaceholder}>
                          {userInfo.photoURL ? (
                              <Image source={{ uri: userInfo.photoURL }} style={{ width: 80, height: 80, borderRadius: 40 }} />
                          ) : ( 
                              <Icon name="person" size={40} color="#fff" /> 
                          )}
                        </View>
                    </View>
                    <View style={styles.statsRow}>
                      <View style={styles.statItem}>
                          <Text style={styles.statNumber}>{userInfo.posts}</Text>
                          <Text style={styles.statLabel}>posts</Text>
                      </View>
                      <View style={styles.statItem}>
                          <Text style={styles.statNumber}>{userInfo.followers}</Text>
                          <Text style={styles.statLabel}>followers</Text>
                      </View>
                      <View style={styles.statItem}>
                          <Text style={styles.statNumber}>{userInfo.following}</Text>
                          <Text style={styles.statLabel}>following</Text>
                      </View>
                    </View>
                  </View>
                  <Text style={styles.userName}>{userInfo.username}</Text>
                  <Text style={styles.userBio}>{userInfo.bio}</Text>
                  <View style={styles.locationContainer}>
                    <Icon name="location-outline" size={16} color={colors.dark} />
                    <Text style={styles.locationText}>{userInfo.location}</Text>
                  </View>
                </>
              )}
            </View>

            {/* Reported Content Card */}
            <View style={styles.tabsContainer}>
                <View style={[styles.tab, styles.activeTab]}>
                    <Icon name="alert-circle-outline" size={20} color={colors.dark} />
                    <Text style={{fontFamily: fonts.header, fontWeight:'700', marginLeft: 5}}>
                        {currentReport?.reportType === 'user' ? 'Report Details' : 'Reported Content'}
                    </Text>
                </View>
            </View>

            <View style={styles.postsContainer}>
                {/* Dynamically choose layout based on report type */}
                {currentReport?.reportType === 'user' ? renderUserDetail() : renderPostDetail()}
            </View>
        </ScrollView>
      )}

      {/* --- BOTTOM NAVBAR --- */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem} onPress={() => handleNavigation('home')}>
          <Icon name="home-outline" size={24} color={colors.gray} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => handleNavigation('profiles')}>
          <Icon name="people" size={24} color={THEME_YELLOW} /> 
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => handleNavigation('comments')}>
          <Icon name="chatbubbles-outline" size={24} color={colors.gray} />
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
  headerLogo: {
    fontFamily: fonts.header,
    fontSize: 24, 
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
  
  // --- LIST CARD STYLES ---
  reportCard: {
    backgroundColor: FLAG_BG,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
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
  cardContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  thumbnail: {
    width: 60,
    height: 60,
    borderRadius: 6,
    backgroundColor: '#ccc',
  },
  placeholderThumb: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  textDetails: {
    flex: 1,
    marginHorizontal: 12,
    justifyContent: 'center',
  },
  descriptionText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.dark,
  },
  idText: {
    marginTop: 4,
    fontSize: 10,
    color: colors.gray,
  },
  reviewButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#dbdbdb',
    alignSelf: 'center',
  },
  reviewButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.dark,
  },

  // --- PROFILE VIEW STYLES ---
  profileSection: {
    backgroundColor: '#fff',
    paddingVertical: spacing.md,
  },
  profileTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  profileImageContainer: {
    marginRight: spacing.lg,
  },
  profileImagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#333', 
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  statsRow: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around', 
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.dark,
  },
  statLabel: {
    fontSize: 13,
    color: colors.gray,
    marginTop: 2,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.dark,
    marginBottom: spacing.xs,
    alignSelf: 'flex-start',
  },
  userBio: {
    fontSize: 14,
    color: colors.dark,
    textAlign: 'left',
    alignSelf: 'flex-start',
    marginBottom: spacing.sm,
    lineHeight: 18,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start'
  },
  locationText: {
    fontSize: 14,
    color: colors.dark,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginTop: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: colors.dark,
  },
  postsContainer: {
    backgroundColor: '#fff',
    minHeight: 300,
    paddingTop: spacing.md,
  },
  adminPostView: {
    marginBottom: 30,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  smallAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#ccc',
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  postUsername: {
    fontWeight: '600',
    fontSize: 14,
    color: colors.dark,
  },
  postImage: {
    width: '100%',
    height: 400,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
  },
  postImagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  postFooter: {
    marginTop: 10,
  },
  captionText: {
    marginTop: 6,
    fontSize: 14,
    color: colors.dark,
  },
  
  // --- USER REPORT CARD STYLES (NEW) ---
  userReportCard: {
    backgroundColor: '#FAFAFA',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#eee',
    padding: 20,
    alignItems: 'center',
    marginHorizontal: 4,
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