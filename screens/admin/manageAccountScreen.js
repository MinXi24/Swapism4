import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

// --- FIREBASE IMPORTS ---
import { deleteDoc, doc, getDoc, getFirestore, updateDoc } from 'firebase/firestore';

// --- IMPORTS ---
import Icon from '../../assets/icons/icons';
import { colors, fonts, spacing } from '../../lib/theme';

// --- THEME COLORS ---
const THEME_GREEN = '#9abeaa';
const THEME_YELLOW = '#ffd75c';
const THEME_CREAM = '#f5f3e4'; 

export default function ManageAccountScreen({ navigation, route }) {
  const [hasPost, setHasPost] = useState(true);
  
  // 1. GET REPORT DATA
  const { report } = route.params || {};
  const db = getFirestore();

  // 2. STATE FOR REAL USER INFO
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

  const [loadingUser, setLoadingUser] = useState(true);

  // 3. FETCH REAL USER DETAILS
  useEffect(() => {
    const fetchRealOwnerDetails = async () => {
        // Validation: If report or clothes_id is missing/empty, stop.
        if (!report || !report.reported_clothes_id) {
            console.log("No valid reported_clothes_id found in report");
            setUserInfo(prev => ({ ...prev, username: 'Andy', bio: 'CLICK THE LINK' }));
            setLoadingUser(false);
            return;
        }

        try {
            // STEP A: Fetch the Reported Post (to find who posted it)
            // Path matches your HomeScreen: 'wardrobe-plug-fyp/user/images'
            const postRef = doc(db, 'wardrobe-plug-fyp/user/images', report.reported_clothes_id);
            const postSnap = await getDoc(postRef);

            let ownerId = null;

            if (postSnap.exists()) {
                const postData = postSnap.data();
                // Get the Owner ID (Checking ownerUid or owner_id)
                ownerId = postData.ownerUid || postData.owner_id || postData.userId;
            } else {
                // Post might be deleted, but we check if report has a backup reporter_user_id just in case
                // (Usually we want the offender, not the reporter, so we stick to post owner)
                setUserInfo(prev => ({ ...prev, username: 'Post Deleted', bio: 'Content no longer exists' }));
                setHasPost(false);
            }

            // STEP B: Fetch the User Profile from 'users' collection
            // (Your screenshot 'image_fc1812.png' shows bio/rating/photoURL is inside 'users')
            if (ownerId) {
                const userRef = doc(db, 'users', ownerId);
                const userSnap = await getDoc(userRef);

                if (userSnap.exists()) {
                    const userData = userSnap.data();
                    
                    // Map Firestore data to UI
                    setUserInfo({
                        username: userData.username || userData.display_name || 'No Name',
                        bio: userData.bio || 'No bio available',
                        location: userData.location || userData.area || 'Singapore', // 'area' seen in screenshot
                        rating: userData.rating || 0.0,
                        reviewCount: userData.reviewCount || 0,
                        // Check if these are numbers or array lengths
                        posts: typeof userData.posts === 'number' ? userData.posts : (userData.posts?.length || 0),
                        followers: typeof userData.followers === 'number' ? userData.followers : (userData.followers?.length || 0),
                        following: typeof userData.following === 'number' ? userData.following : (userData.following?.length || 0),
                        photoURL: userData.photoURL || null,
                        ownerUid: ownerId
                    });
                } else {
                    setUserInfo(prev => ({ ...prev, username: 'User Not Found', bio: 'User account deleted' }));
                }
            }
        } catch (error) {
            console.error("Error fetching user details:", error);
        } finally {
            setLoadingUser(false);
        }
    };

    fetchRealOwnerDetails();
  }, [report]);

  const handleBack = () => navigation.goBack();
  
  const handleNavigation = (tab) => {
    switch(tab) {
      case 'home': navigation.navigate('AdminHome'); break;
      case 'profiles': break; 
      case 'comments': navigation.navigate('ManageComments'); break;
    }
  };

  // 4. DELETE LOGIC
  const handleDeletePost = async () => {
    if (!report) return;

    Alert.alert(
      "Confirm Deletion",
      "This will permanently delete the post and resolve the report.",
      [
        { text: "Cancel", style: "cancel" },
        { 
            text: "Delete", 
            style: "destructive", 
            onPress: async () => {
                try {
                    // Delete image
                    if (report.reported_clothes_id) {
                        await deleteDoc(doc(db, 'wardrobe-plug-fyp/user/images', report.reported_clothes_id));
                    }
                    
                    // Resolve report
                    await updateDoc(doc(db, 'report', report.id), {
                        status: 'resolved',
                        resolved_at: new Date()
                    });

                    setHasPost(false);
                    Alert.alert("Success", "Post deleted.", [{ text: "Back", onPress: () => navigation.goBack() }]);
                } catch (error) {
                    console.error("Delete error:", error);
                    Alert.alert("Error", "Could not delete post.");
                }
            } 
        }
      ]
    );
  };

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
                {report ? 'Review Report' : 'Manage Profile'}
            </Text>
        </View>
        <View style={styles.headerIcons}>
          <TouchableOpacity style={styles.headerIcon}>
            <Icon name="ellipsis-horizontal" size={28} color={colors.dark} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* --- PROFILE INFO SECTION --- */}
        <View style={styles.profileSection}>
          {loadingUser ? (
              <ActivityIndicator color={THEME_GREEN} style={{padding:20}} />
          ) : (
            <>
              <View style={styles.profileTopRow}>
                <View style={styles.profileImageContainer}>
                    <View style={styles.profileImagePlaceholder}>
                      {userInfo.photoURL ? (
                          <Image 
                            source={{ uri: userInfo.photoURL }} 
                            style={{ width: 80, height: 80, borderRadius: 40 }} 
                          />
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

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => Alert.alert("Action", "Reset Password Email Sent")}
            >
              <Text style={styles.actionButtonText}>Reset Password</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => Alert.alert("Action", "User Suspended")}
            >
              <Text style={styles.actionButtonText}>Suspend User</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* --- RATING SECTION --- */}
        <View style={styles.ratingSection}>
            <View style={styles.ratingHeader}>
                <Text style={styles.ratingScore}>{Number(userInfo.rating).toFixed(1)}</Text>
            </View>
            <View style={styles.starsContainer}>
                {[1, 2, 3, 4, 5].map(star => (
                    <Icon key={star} name="star-outline" size={20} color={THEME_YELLOW} />
                ))}
            </View>
            <Text style={styles.reviewsTitle}>Reviews ({userInfo.reviewCount})</Text>
            <View style={styles.noReviewsContainer}>
                <Text style={styles.noReviewsText}>No reviews yet</Text>
            </View>
        </View>

        {/* --- ONE TAB SECTION (Reported Posts Only) --- */}
        <View style={styles.tabsContainer}>
             <View style={[styles.tab, styles.activeTab]}>
                <Icon name="alert-circle-outline" size={20} color={colors.dark} />
                <Text style={{fontFamily: fonts.header, fontWeight:'700', marginLeft: 5}}>Reported Content</Text>
             </View>
        </View>

        {/* --- POSTS CONTENT --- */}
        <View style={styles.postsContainer}>
            {hasPost ? (
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
                        <Text style={styles.postTime}>
                            {report?.created_at?.toDate ? 'Recent' : '57mins ago'}
                        </Text>
                        <TouchableOpacity style={{ marginLeft: 'auto' }} onPress={handleDeletePost}>
                             <Icon name="trash-outline" size={20} color="#FF6B6B" />
                        </TouchableOpacity>
                    </View>

                    {/* Report Image */}
                    <Image 
                        source={
                            report && report.snapshot_image_url 
                            ? { uri: report.snapshot_image_url } 
                            : require('../../assets/images/gambling.png')
                        } 
                        style={styles.postImage}
                        resizeMode="cover"
                    />

                    <View style={styles.postFooter}>
                        <View style={{flexDirection:'row', alignItems:'center', gap:5}}>
                            <Icon name="heart-outline" size={24} color={colors.dark} />
                            <Text style={{fontWeight:'600'}}>0 likes</Text>
                        </View>
                        <Text style={styles.captionText}>
                            <Text style={{fontWeight: 'bold'}}>{userInfo.username} </Text>
                            {report ? report.snapshot_description : 'CLICK INTO THE LINK!!'}
                        </Text>
                        
                        {/* Red Flag Warning */}
                        {report && (
                            <View style={{marginTop: 10, padding: 8, backgroundColor: '#FFEBEE', borderRadius: 4}}>
                                <Text style={{color: '#D32F2F', fontSize: 12, fontWeight:'bold'}}>
                                    REPORTED FOR: {report.reason}
                                </Text>
                            </View>
                        )}

                        <Text style={styles.dateText}>
                            {report?.created_at?.toDate ? report.created_at.toDate().toDateString() : 'December 8, 2025'}
                        </Text>
                    </View>
                </View>
            ) : (
                <View style={styles.emptyState}>
                    <Icon name="checkmark-circle-outline" size={64} color={colors.gray} />
                    <Text style={styles.emptyStateText}>Report Resolved / Post Deleted</Text>
                </View>
            )}
        </View>

      </ScrollView>

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
  scrollContent: {
      paddingBottom: 80,
  },
  profileSection: {
    backgroundColor: '#fff',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
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
    alignSelf: 'flex-start',
    marginBottom: spacing.md,
  },
  locationText: {
    fontSize: 14,
    color: colors.dark,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
    width: '100%',
    marginTop: spacing.sm,
  },
  actionButton: {
    flex: 1,
    backgroundColor: THEME_CREAM, 
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.dark,
  },
  ratingSection: {
    backgroundColor: THEME_GREEN, 
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  ratingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: 4,
  },
  ratingScore: {
    fontSize: 32,
    fontWeight: 'bold',
    color: THEME_YELLOW, 
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: spacing.md,
  },
  reviewsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff', 
    marginBottom: spacing.sm,
  },
  noReviewsContainer: {
    alignItems: 'flex-start',
  },
  noReviewsText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    fontStyle: 'italic',
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
      paddingHorizontal: spacing.md,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  smallAvatar: {
      width: 30, height: 30, borderRadius: 15, backgroundColor: '#ccc', marginRight: 10,
      justifyContent: 'center', alignItems: 'center', overflow: 'hidden'
  },
  postUsername: { fontWeight: '600', fontSize: 14, color: colors.dark },
  postTime: { fontSize: 12, color: colors.gray, marginLeft: 8 },
  postImage: {
      width: '100%',
      height: 400,
      borderRadius: 12,
      backgroundColor: '#f0f0f0',
  },
  postFooter: { marginTop: 10 },
  captionText: { marginTop: 6, fontSize: 14, color: colors.dark },
  dateText: { marginTop: 4, fontSize: 10, color: colors.gray },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.lg * 3,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.gray,
    marginTop: spacing.md,
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingVertical: 12, 
    paddingHorizontal: spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});