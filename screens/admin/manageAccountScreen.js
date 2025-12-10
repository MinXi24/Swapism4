import React, { useState } from 'react';
import {
  Alert,
  Image,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

// --- FIREBASE IMPORTS ---
import { deleteDoc, doc, getFirestore, updateDoc } from 'firebase/firestore';

// --- IMPORTS ---
import Icon from '../../assets/icons/icons';
import { colors, fonts, spacing } from '../../lib/theme';

// --- THEME COLORS ---
const THEME_GREEN = '#9abeaa';
const THEME_YELLOW = '#ffd75c';
const THEME_CREAM = '#f5f3e4'; 

export default function ManageAccountScreen({ navigation, route }) {
  const [hasPost, setHasPost] = useState(true);
  const [activeTab, setActiveTab] = useState('posts');
  
  // 1. GET REPORT DATA
  // Check if we navigated here with a 'report' object from AdminHomeScreen
  const { report } = route.params || {};
  
  const db = getFirestore();

  // 2. DYNAMIC USER DATA
  // If a report exists, we show "Reported User" and the reason.
  // Otherwise, we fall back to the mock "Andy" data.
  const userInfo = {
      username: report ? 'Reported User' : 'Andy',
      bio: report ? `Report Reason: ${report.reason}` : 'hello check out my posts',
      location: 'Singapore',
      rating: 0.0,
      reviewCount: 0,
      posts: report ? 1 : 0,
      followers: 3,
      following: 1170
  };

  const handleBack = () => navigation.goBack();
  
  const handleNavigation = (tab) => {
    switch(tab) {
      case 'home': navigation.navigate('AdminHome'); break;
      case 'profiles': break; 
      case 'comments': navigation.navigate('ManageComments'); break;
    }
  };

  // --- DELETE LOGIC (Connects to Firebase) ---
  const handleDeletePost = async () => {
    // Fallback for mock mode (if you view the screen without clicking a report)
    if (!report) {
       Alert.alert("Delete Post", "Mock post deleted.", [{ text: "OK", onPress: () => setHasPost(false) }]);
       return;
    }

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
                    // A. Delete the image from the 'user/images' collection
                    // We use the ID stored in the report document
                    if (report.reported_clothes_id) {
                        await deleteDoc(doc(db, 'wardrobe-plug-fyp/user/images', report.reported_clothes_id));
                    }
                    
                    // B. Mark the report as 'resolved' in the 'report' collection
                    await updateDoc(doc(db, 'report', report.id), {
                        status: 'resolved',
                        resolved_at: new Date()
                    });

                    setHasPost(false);
                    Alert.alert("Success", "Post deleted.", [{ text: "Back", onPress: () => navigation.goBack() }]);
                } catch (error) {
                    console.error("Delete error:", error);
                    Alert.alert("Error", "Could not delete post. It might already be gone.");
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
          <View style={styles.profileTopRow}>
            <View style={styles.profileImageContainer}>
                <View style={styles.profileImagePlaceholder}>
                  <Icon name="person" size={40} color="#fff" />
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
                <Text style={styles.ratingScore}>{userInfo.rating.toFixed(1)}</Text>
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

        {/* --- TABS --- */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'posts' && styles.activeTab]}
            onPress={() => setActiveTab('posts')}
          >
            <Icon name="grid-outline" size={24} color={colors.dark} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'tags' && styles.activeTab]}
            onPress={() => setActiveTab('tags')}
          >
            <Icon name="pricetag-outline" size={24} color={colors.dark} />
          </TouchableOpacity>
        </View>

        {/* --- POSTS CONTENT --- */}
        <View style={styles.postsContainer}>
            {hasPost ? (
                <View style={styles.adminPostView}>
                      <View style={styles.postHeader}>
                        <View style={styles.smallAvatar}><Icon name="person" size={16} color="#fff"/></View>
                        <Text style={styles.postUsername}>{userInfo.username}</Text>
                        <Text style={styles.postTime}>
                            {report?.created_at?.toDate ? 'Recent' : '57mins ago'}
                        </Text>
                        <TouchableOpacity style={{ marginLeft: 'auto' }} onPress={handleDeletePost}>
                             <Icon name="trash-outline" size={20} color="#FF6B6B" />
                        </TouchableOpacity>
                    </View>

                    {/* DYNAMIC IMAGE: Uses report.snapshot_image_url if available */}
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
                            {/* Uses report.snapshot_description if available */}
                            {report ? report.snapshot_description : 'CLICK INTO THE LINK!!'}
                        </Text>
                        
                        {/* Show Red Flag Text if Report exists */}
                        {report && (
                            <Text style={{color: '#FF6B6B', fontSize: 12, marginTop: 5, fontWeight:'bold'}}>
                                FLAG REASON: {report.reason}
                            </Text>
                        )}

                        <Text style={styles.dateText}>
                            {report?.created_at?.toDate ? report.created_at.toDate().toDateString() : 'December 8, 2025'}
                        </Text>
                    </View>
                </View>
            ) : (
                <View style={styles.emptyState}>
                    <Icon name="image-outline" size={64} color={colors.gray} />
                    <Text style={styles.emptyStateText}>No active posts</Text>
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
      justifyContent: 'center', alignItems: 'center'
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