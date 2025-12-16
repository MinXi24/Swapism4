import { useFocusEffect } from '@react-navigation/native';
import { getAuth } from 'firebase/auth';
import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  query,
  serverTimestamp, // Needed for Block/Report
  setDoc, // Needed for Block
  updateDoc,
  where
} from 'firebase/firestore';
import { useCallback, useState } from 'react';
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Linking, // Added from merge
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import Icon from '../../assets/icons/icons';
import BottomNavBar from '../../components/BottomNavBar';
import { colors, fonts, spacing } from '../../lib/theme';

export default function UserProfileScreen({ route, navigation }) {
  const { userId, username, initialTab } = route.params;
  const [userPosts, setUserPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(initialTab || 'forFun');
  const [stats, setStats] = useState({
    posts: 0,
    followers: 0,
    following: 0,
  });
  const [userInfo, setUserInfo] = useState({
    bio: '',
    location: '',
    area: '',
    rating: 0,
    reviewCount: 0,
    reviews: [],
    photoURL: null,
    username: username || '',
  });
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [followRequestStatus, setFollowRequestStatus] = useState(null); 
  const [isPrivateAccount, setIsPrivateAccount] = useState(false);
  const [mutualFollowers, setMutualFollowers] = useState([]);
  const [showAllMutuals, setShowAllMutuals] = useState(false);

  // [NEW] State to track if I have blocked this user
  const [isBlockedByMe, setIsBlockedByMe] = useState(false);

  // Define DB/Auth
  const db = getFirestore();
  const auth = getAuth();
  const currentUser = auth.currentUser;

  // --- MAIN DATA LOADING LOGIC (Fixes Race Condition) ---
  const fetchScreenData = async () => {
    setLoading(true);
    try {
        // 1. Check Block Status FIRST
        let isBlocked = false;
        if (currentUser && currentUser.uid !== userId) {
            const blockRef = doc(db, 'users', currentUser.uid, 'blocked_users', userId);
            const blockSnap = await getDoc(blockRef);
            isBlocked = blockSnap.exists();
        }

        setIsBlockedByMe(isBlocked);

        // 2. STOP if blocked. Do not load profile data.
        if (isBlocked) {
            setLoading(false);
            return; 
        }

        // 3. Load Profile & Posts only if NOT blocked
        await Promise.all([
            loadUserProfile(),
            loadUserPostsOnly()
        ]);

    } catch (error) {
        console.error("Error loading screen:", error);
    } finally {
        setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchScreenData();
      logProfileView();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId])
  );

  const loadUserProfile = async () => {
    try {
      const userDocRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        setUserInfo({
          bio: userData.bio || '',
          location: userData.location || '',
          area: userData.area || '',
          rating: userData.rating || 0,
          reviewCount: userData.reviewCount || 0,
          reviews: userData.reviews || [],
          photoURL: userData.photoURL || null,
          username: userData.username || username || 'User',
        });
        
        setIsPrivateAccount(userData.isPrivate || false);
        
        const followers = userData.followers || [];
        const following = userData.following || [];
        setStats(prev => ({
          ...prev,
          followers: followers.length,
          following: following.length,
        }));
        
        if (currentUser) {
          setIsFollowing(followers.includes(currentUser.uid));
          
          // Mutual Followers
          const currentUserDocRef = doc(db, 'users', currentUser.uid);
          const currentUserDoc = await getDoc(currentUserDocRef);
          if (currentUserDoc.exists()) {
            const currentUserFollowing = currentUserDoc.data().following || [];
            const mutuals = followers.filter(followerId => currentUserFollowing.includes(followerId));
            
            const mutualDetails = await Promise.all(
              mutuals.map(async (mutualId) => {
                const mutualDocRef = doc(db, 'users', mutualId);
                const mutualDoc = await getDoc(mutualDocRef);
                if (mutualDoc.exists()) {
                  const mutualData = mutualDoc.data();
                  return {
                    uid: mutualId,
                    username: mutualData.username || 'User',
                    photoURL: mutualData.photoURL || null,
                  };
                }
                return null;
              })
            );
            setMutualFollowers(mutualDetails.filter(m => m !== null));
          }
          
          // Follow Request Status
          const requestQuery = query(
            collection(db, 'followRequests'),
            where('fromUserId', '==', currentUser.uid),
            where('toUserId', '==', userId)
          );
          const requestSnapshot = await getDocs(requestQuery);
          
          if (!requestSnapshot.empty) {
            const requestData = requestSnapshot.docs[0].data();
            setFollowRequestStatus(requestData.status);
          } else {
            setFollowRequestStatus(null);
          }
        }
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };

  const loadUserPostsOnly = async () => {
    try {
      const q = query(
        collection(db, 'wardrobe-plug-fyp/user/images'),
        where('ownerUid', '==', userId)
      );
      const querySnapshot = await getDocs(q);
      const posts = querySnapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        .sort((a, b) => {
          const dateA = a.uploadedAt?.toDate?.() || new Date(0);
          const dateB = b.uploadedAt?.toDate?.() || new Date(0);
          return dateB - dateA;
        });
      
      setUserPosts(posts);
      setStats(prev => ({ ...prev, posts: posts.length }));
    } catch (error) {
      console.error('Error loading user posts:', error);
    }
  };

  const logProfileView = async () => {
    if (!currentUser || currentUser.uid === userId) return;
    try {
      let viewerName = currentUser.displayName || 'Anonymous';
      try {
        const viewerDocRef = doc(db, 'users', currentUser.uid);
        const viewerDoc = await getDoc(viewerDocRef);
        if (viewerDoc.exists()) {
          viewerName = viewerDoc.data().username || viewerName;
        }
      } catch (err) {
        console.error('Error fetching viewer name:', err);
      }

      await addDoc(collection(db, 'notifications'), {
        userId: userId,
        type: 'profile_view',
        message: `${viewerName} requested to follow`,
        viewerId: currentUser.uid,
        viewerName: viewerName,
        read: false,
        createdAt: new Date(),
      });
    } catch (error) {
      console.error('Error logging profile view:', error);
    }
  };

  // --- ACTION HANDLERS ---

  const [androidMenuVisible, setAndroidMenuVisible] = useState(false);
  const showMenu = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Report User', 'Block User'],
          destructiveButtonIndex: 2,
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) handleReport();
          if (buttonIndex === 2) handleBlock();
        }
      );
    } else {
      setAndroidMenuVisible(true);
    }
  };
  
  const renderAndroidMenu = () => (
    <Modal
      visible={androidMenuVisible}
      transparent
      animationType="fade"
      onRequestClose={() => setAndroidMenuVisible(false)}
    >
      <TouchableOpacity
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'flex-end' }}
        activeOpacity={1}
        onPress={() => setAndroidMenuVisible(false)}
      >
        <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 20 }}>
          <TouchableOpacity onPress={() => { setAndroidMenuVisible(false); handleReport(); }} style={{ paddingVertical: 16 }}>
            <Text style={{ color: '#d32f2f', fontSize: 16, textAlign: 'center' }}>Report User</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => { setAndroidMenuVisible(false); handleBlock(); }} style={{ paddingVertical: 16 }}>
            <Text style={{ color: '#d32f2f', fontSize: 16, textAlign: 'center' }}>Block User</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setAndroidMenuVisible(false)} style={{ paddingVertical: 16 }}>
            <Text style={{ color: '#333', fontSize: 16, textAlign: 'center' }}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  const openMapWithLocation = async () => {
    const location = userInfo.area ? `${userInfo.location}, ${userInfo.area}` : userInfo.location;
    if (!location) return;

    const encodedLocation = encodeURIComponent(location);
    
    // Try different map apps in order of preference
    const urls = [
      `comgooglemaps://?q=${encodedLocation}`, // Google Maps iOS
      `https://www.google.com/maps/search/?api=1&query=${encodedLocation}`, // Google Maps web (works on Android and iOS)
      `maps://maps.apple.com/?q=${encodedLocation}`, // Apple Maps
    ];

    for (const url of urls) {
      try {
        const supported = await Linking.canOpenURL(url);
        if (supported) {
          await Linking.openURL(url);
          return;
        }
      } catch (error) {
        console.log(`Cannot open ${url}`);
      }
    }

    Alert.alert('Error', 'No map app available');
  };

  const handleReport = async () => {
    try {
      if (!currentUser) {
        Alert.alert('Error', 'You must be logged in to report users.');
        return;
      }
      
      await addDoc(collection(db, 'reported_users'), {
        reporter_id: currentUser.uid,
        reporter_username: currentUser.displayName || 'User',
        reported_user_id: userId,
        reported_user_name: userInfo.username,
        reason: "Inappropriate behavior", 
        status: 'pending',
        created_at: serverTimestamp(),
      });

      Alert.alert('Report Sent', 'User has been reported. We will review this account.');
    } catch (error) {
      console.error("Error reporting:", error);
      Alert.alert('Error', 'Could not report user. Please try again.');
    }
  };

  const handleBlock = () => {
    if (!currentUser) return;

    Alert.alert(
      'Block User',
      'Are you sure? You will no longer see their posts and they won\'t be able to find your account.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          style: 'destructive',
          onPress: async () => {
            try {
              // Add to 'blocked_users' subcollection
              await setDoc(doc(db, 'users', currentUser.uid, 'blocked_users', userId), {
                blocked_user_id: userId,
                blocked_user_name: userInfo.username,
                blocked_user_photo: userInfo.photoURL,
                blocked_at: serverTimestamp()
              });

              // Update UI immediately
              setIsBlockedByMe(true);
              Alert.alert('Blocked', 'User has been blocked.');
            } catch (error) {
              console.error("Error blocking:", error);
              Alert.alert('Error', 'Could not block user.');
            }
          }
        }
      ]
    );
  };

  const handleUnblock = async () => {
    try {
        await deleteDoc(doc(db, 'users', currentUser.uid, 'blocked_users', userId));
        setIsBlockedByMe(false);
        fetchScreenData(); // Reload data
        Alert.alert("Unblocked", "You can now see this user's profile.");
    } catch (error) {
        Alert.alert("Error", "Could not unblock user.");
    }
  };

  const handlePostPress = (post) => {
    navigation.navigate('PostDetails', { post });
  };

  const handleFollowToggle = async () => {
    if (!currentUser) {
      Alert.alert('Error', 'Please log in to follow users');
      return;
    }

    if (isFollowing) {
      Alert.alert(
        'Unfollow',
        'Do you wish to unfollow?',
        [
          { text: 'No', style: 'cancel' },
          {
            text: 'Yes',
            onPress: async () => {
              try {
                setFollowLoading(true);
                const userDocRef = doc(db, 'users', userId);
                const currentUserDocRef = doc(db, 'users', currentUser.uid);
                
                await updateDoc(userDocRef, { followers: arrayRemove(currentUser.uid) });
                await updateDoc(currentUserDocRef, { following: arrayRemove(userId) });
                
                const requestQuery = query(
                  collection(db, 'followRequests'),
                  where('fromUserId', '==', currentUser.uid),
                  where('toUserId', '==', userId)
                );
                const requestSnapshot = await getDocs(requestQuery);
                requestSnapshot.docs.forEach(async (docSnapshot) => {
                  await deleteDoc(doc(db, 'followRequests', docSnapshot.id));
                });
                
                setIsFollowing(false);
                setFollowRequestStatus(null);
                setStats(prev => ({ ...prev, followers: prev.followers - 1 }));
              } catch (error) {
                console.error('Error unfollowing:', error);
                Alert.alert('Error', 'Failed to unfollow. Please try again.');
              } finally {
                setFollowLoading(false);
              }
            }
          }
        ]
      );
    } else if (followRequestStatus === 'pending') {
      Alert.alert(
        'Cancel Request',
        'Do you want to cancel your follow request?',
        [
          { text: 'No', style: 'cancel' },
          {
            text: 'Yes',
            onPress: async () => {
              try {
                setFollowLoading(true);
                const requestQuery = query(
                  collection(db, 'followRequests'),
                  where('fromUserId', '==', currentUser.uid),
                  where('toUserId', '==', userId)
                );
                const requestSnapshot = await getDocs(requestQuery);
                requestSnapshot.docs.forEach(async (docSnapshot) => {
                  await deleteDoc(doc(db, 'followRequests', docSnapshot.id));
                });
                setFollowRequestStatus(null);
              } catch (error) {
                console.error('Error canceling request:', error);
                Alert.alert('Error', 'Failed to cancel request. Please try again.');
              } finally {
                setFollowLoading(false);
              }
            }
          }
        ]
      );
    } else {
      try {
        setFollowLoading(true);
        if (isPrivateAccount) {
          let requesterName = currentUser.displayName || 'User';
          try {
            const requesterDocRef = doc(db, 'users', currentUser.uid);
            const requesterDoc = await getDoc(requesterDocRef);
            if (requesterDoc.exists()) {
              requesterName = requesterDoc.data().username || requesterName;
            }
          } catch (err) {
            console.error('Error fetching requester name:', err);
          }
          await addDoc(collection(db, 'followRequests'), {
            fromUserId: currentUser.uid,
            fromUserName: requesterName,
            toUserId: userId,
            status: 'pending',
            createdAt: new Date(),
          });
          await addDoc(collection(db, 'notifications'), {
            userId: userId,
            type: 'follow_request',
            message: `${requesterName} requested to follow you`,
            fromUserId: currentUser.uid,
            fromUserName: requesterName,
            read: false,
            createdAt: new Date(),
          });
          setFollowRequestStatus('pending');
          Alert.alert('Request Sent', 'Your follow request has been sent');
        } else {
          const userDocRef = doc(db, 'users', userId);
          const currentUserDocRef = doc(db, 'users', currentUser.uid);
          await updateDoc(userDocRef, { followers: arrayUnion(currentUser.uid) });
          await updateDoc(currentUserDocRef, { following: arrayUnion(userId) });
          setIsFollowing(true);
          setStats(prev => ({ ...prev, followers: prev.followers + 1 }));
        }
      } catch (error) {
        console.error('Error following/requesting:', error);
        Alert.alert('Error', 'Failed to follow/request. Please try again.');
      } finally {
        setFollowLoading(false);
      }
    }
  };

  const handleMessage = () => {
    navigation.navigate('Chat', { 
      user: {
        id: userId,
        uid: userId,
        name: userInfo.username,
        photoURL: userInfo.photoURL
      }
    });
  };

  const handleRateUser = () => {
    setShowReviewModal(true);
  };

  const handleSubmitReview = async () => {
    if (reviewRating === 0) {
      Alert.alert('Error', 'Please select a rating');
      return;
    }
    if (!reviewText.trim()) {
      Alert.alert('Error', 'Please write a review');
      return;
    }

    try {
      const userDocRef = doc(db, 'users', userId);
      let reviewerName = currentUser?.displayName || 'Anonymous';
      let reviewerPhoto = null;
      try {
        const reviewerDocRef = doc(db, 'users', currentUser.uid);
        const reviewerDoc = await getDoc(reviewerDocRef);
        if (reviewerDoc.exists()) {
          const reviewerData = reviewerDoc.data();
          reviewerName = reviewerData.username || reviewerName;
          reviewerPhoto = reviewerData.photoURL || null;
        }
      } catch (err) {
        console.error('Error fetching reviewer name:', err);
      }

      const newReview = {
        userId: currentUser.uid,
        userName: reviewerName,
        userPhoto: reviewerPhoto,
        rating: reviewRating,
        text: reviewText.trim(),
        createdAt: new Date().toISOString(),
      };

      await updateDoc(userDocRef, {
        reviews: arrayUnion(newReview)
      });

      const updatedUserDoc = await getDoc(userDocRef);
      const updatedReviews = updatedUserDoc.data().reviews || [];
      const avgRating = updatedReviews.reduce((sum, r) => sum + r.rating, 0) / updatedReviews.length;
      
      await updateDoc(userDocRef, {
        rating: avgRating,
        reviewCount: updatedReviews.length
      });

      setShowReviewModal(false);
      setReviewRating(0);
      setReviewText('');
      
      loadUserProfile();
      
      Alert.alert('Success', 'Your review has been submitted!');
    } catch (error) {
      console.error('Error submitting review:', error);
      Alert.alert('Error', 'Failed to submit review. Please try again.');
    }
  };

  const handleDeleteReview = async (review) => {
    if (review.userId !== currentUser?.uid) {
      Alert.alert('Error', 'You can only delete your own reviews');
      return;
    }

    Alert.alert(
      'Delete Review',
      'Are you sure you want to delete this review?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const userDocRef = doc(db, 'users', userId);
              await updateDoc(userDocRef, {
                reviews: arrayRemove(review)
              });

              const updatedUserDoc = await getDoc(userDocRef);
              const updatedReviews = updatedUserDoc.data().reviews || [];
              const avgRating = updatedReviews.length > 0 
                ? updatedReviews.reduce((sum, r) => sum + r.rating, 0) / updatedReviews.length 
                : 0;
              
              await updateDoc(userDocRef, {
                rating: avgRating,
                reviewCount: updatedReviews.length
              });

              loadUserProfile();
              Alert.alert('Success', 'Review deleted successfully');
            } catch (error) {
              console.error('Error deleting review:', error);
              Alert.alert('Error', 'Failed to delete review. Please try again.');
            }
          }
        }
      ]
    );
  };

  // Filter posts based on privacy and follow status
  const forFunPosts = userPosts.filter(post => post.postType === 'forFun');
  const forSwapPosts = userPosts.filter(post => post.postType === 'forSwap');
  const canViewForFunPosts = !isPrivateAccount || isFollowing || userId === currentUser?.uid;
  const displayPosts = activeTab === 'forFun' ? (canViewForFunPosts ? forFunPosts : []) : forSwapPosts;

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  // --- BLOCKED STATE RENDER ---
  if (isBlockedByMe) {
      return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerLeft}>
                    <Icon name="arrow-back" size={24} color={colors.dark} />
                </TouchableOpacity>
                <View style={styles.headerCenter}>
                    <Text style={styles.logo}>Blocked User</Text>
                </View>
                <View style={styles.headerRight} />
            </View>
            
            <View style={[styles.centerContent, {flex: 1, padding: 20}]}>
                <Icon name="ban" size={64} color={colors.gray} />
                <Text style={{fontSize: 18, fontWeight: 'bold', marginTop: 20, color: colors.dark}}>
                    You have blocked this user
                </Text>
                <Text style={{textAlign: 'center', color: colors.gray, marginTop: 10, marginBottom: 30}}>
                    You cannot see their posts or profile information.
                </Text>
                
                <TouchableOpacity 
                    style={{backgroundColor: colors.dark, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8}}
                    onPress={handleUnblock}
                >
                    <Text style={{color: '#fff', fontWeight: 'bold'}}>Unblock</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
      );
  }

  // --- NORMAL RENDER ---
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#fff" barStyle="dark-content" />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerLeft}>
          <Icon name="arrow-back" size={24} color={colors.dark} />
        </TouchableOpacity>
        <View style={styles.headerCenter} pointerEvents="none">
          <Text style={styles.logo} numberOfLines={1}>{userInfo.username}</Text>
        </View>
        <TouchableOpacity onPress={showMenu} style={styles.headerRight}>
          <Icon name="ellipsis-vertical" size={24} color={colors.dark} />
        </TouchableOpacity>
      </View>

      {Platform.OS === 'android' && renderAndroidMenu()}
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.profileSection}>
          <View style={styles.profileTopRow}>
            <View style={styles.profileImageContainer}>
              {userInfo.photoURL ? (
                <Image source={{ uri: userInfo.photoURL }} style={styles.profileImage} />
              ) : (
                <View style={styles.profileImagePlaceholder}>
                  <Icon name="person" size={40} color={colors.gray} />
                </View>
              )}
            </View>

            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{stats.posts}</Text>
                <Text style={styles.statLabel}>posts</Text>
              </View>
              <TouchableOpacity style={styles.statItem} onPress={() => navigation.navigate('FollowList', { userId, type: 'followers' })}>
                <Text style={styles.statNumber}>{stats.followers}</Text>
                <Text style={styles.statLabel}>followers</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.statItem} onPress={() => navigation.navigate('FollowList', { userId, type: 'following' })}>
                <Text style={styles.statNumber}>{stats.following}</Text>
                <Text style={styles.statLabel}>following</Text>
              </TouchableOpacity>
            </View>
          </View>

          <Text style={styles.userName}>{userInfo.username}</Text>
          <Text style={styles.userBio}>{userInfo.bio}</Text>
          
          {(userInfo.location || userInfo.area) && (
            <TouchableOpacity style={styles.locationContainer} onPress={openMapWithLocation}>
              <Icon name="location-outline" size={16} color={colors.dark} />
              <Text style={styles.locationText}>
                {userInfo.area ? `${userInfo.location}, ${userInfo.area}` : userInfo.location}
              </Text>
              <Icon name="open-outline" size={14} color={colors.gray} style={{ marginLeft: 4 }} />
            </TouchableOpacity>
          )}

          <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={[styles.actionButton, isFollowing && styles.followingButton]}
              onPress={handleFollowToggle}
              disabled={followLoading}
            >
              {followLoading ? (
                <ActivityIndicator size="small" color={colors.dark} />
              ) : (
                <Text style={styles.actionButtonText}>
                  {isFollowing ? 'Following' : followRequestStatus === 'pending' ? 'Requested' : isPrivateAccount ? 'Request' : 'Follow'}
                </Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} onPress={handleMessage}>
              <Text style={styles.actionButtonText}>Message</Text>
            </TouchableOpacity>
          </View>

          {mutualFollowers.length > 0 && (
            <View style={styles.mutualFollowersSection}>
              <TouchableOpacity 
                onPress={() => setShowAllMutuals(!showAllMutuals)}
                style={styles.mutualFollowersHeader}
              >
                <View style={styles.mutualAvatarsRow}>
                  {mutualFollowers.slice(0, showAllMutuals ? mutualFollowers.length : 1).map((mutual, index) => (
                    <TouchableOpacity
                      key={mutual.uid}
                      onPress={() => navigation.navigate('UserProfile', { userId: mutual.uid, username: mutual.username })}
                      style={[styles.mutualAvatar, index > 0 && { marginLeft: -8 }]}
                    >
                      {mutual.photoURL ? (
                        <Image source={{ uri: mutual.photoURL }} style={styles.mutualAvatarImage} />
                      ) : (
                        <View style={styles.mutualAvatarPlaceholder}>
                          <Icon name="person" size={16} color={colors.gray} />
                        </View>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={styles.mutualFollowersText}>
                  Followed by <Text style={styles.mutualFollowersName}>{mutualFollowers[0].username}</Text>
                  {mutualFollowers.length > 1 && <Text> and {mutualFollowers.length - 1} other{mutualFollowers.length > 2 ? 's' : ''} you follow</Text>}
                </Text>
                {mutualFollowers.length > 1 && <Icon name={showAllMutuals ? 'chevron-up' : 'chevron-down'} size={18} color={colors.gray} />}
              </TouchableOpacity>

              {showAllMutuals && mutualFollowers.length > 1 && (
                <View style={styles.mutualFollowersList}>
                  {mutualFollowers.slice(1).map((mutual) => (
                    <TouchableOpacity
                      key={mutual.uid}
                      style={styles.mutualFollowerItem}
                      onPress={() => navigation.navigate('UserProfile', { userId: mutual.uid, username: mutual.username })}
                    >
                      {mutual.photoURL ? (
                        <Image source={{ uri: mutual.photoURL }} style={styles.mutualFollowerItemImage} />
                      ) : (
                        <View style={styles.mutualFollowerItemPlaceholder}>
                          <Icon name="person" size={20} color={colors.gray} />
                        </View>
                      )}
                      <Text style={styles.mutualFollowerItemName}>{mutual.username}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          )}
        </View>

        <View style={styles.ratingSection}>
          <View style={styles.ratingHeader}>
            <View style={styles.ratingLeft}>
              <Text style={styles.ratingScore}>{userInfo.rating.toFixed(1)}</Text>
              <View style={styles.starsContainer}>
                {[1, 2, 3, 4, 5].map(star => (
                  <Icon 
                    key={star}
                    name={star <= Math.floor(userInfo.rating) ? 'star' : star === Math.ceil(userInfo.rating) ? 'star-half' : 'star-outline'}
                    size={20}
                    color={colors.highlight}
                  />
                ))}
              </View>
            </View>
            <TouchableOpacity style={styles.rateButton} onPress={handleRateUser}>
              <Text style={styles.rateButtonText}>Rate</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.reviewsTitle}>Reviews ({userInfo.reviewCount})</Text>
          {userInfo.reviewCount === 0 ? (
            <View style={styles.noReviewsContainer}>
              <Text style={styles.noReviewsText}>No reviews yet</Text>
            </View>
          ) : (
            userInfo.reviews.map((review, index) => (
              <View key={index} style={styles.reviewItem}>
                {review.userPhoto ? (
                  <Image source={{ uri: review.userPhoto }} style={styles.reviewUserImage} />
                ) : (
                  <Icon name="person-circle" size={40} color={colors.gray} />
                )}
                <View style={styles.reviewContent}>
                  <View style={styles.reviewHeader}>
                    <Text style={styles.reviewAuthor}>{review.userName}</Text>
                    {review.userId === currentUser?.uid && (
                      <TouchableOpacity onPress={() => handleDeleteReview(review)}>
                        <Icon name="trash-outline" size={18} color={colors.gray} />
                      </TouchableOpacity>
                    )}
                  </View>
                  <Text style={styles.reviewText}>{review.text}</Text>
                  <View style={styles.reviewStars}>
                    {[1, 2, 3, 4, 5].map(star => (
                      <Icon key={star} name={star <= review.rating ? 'star' : 'star-outline'} size={14} color={colors.highlight} />
                    ))}
                  </View>
                </View>
              </View>
            ))
          )}
        </View>

        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'forFun' && styles.activeTab]}
            onPress={() => setActiveTab('forFun')}
          >
            <Icon name="happy-outline" size={20} color={colors.dark} />
            <Text style={styles.tabText}>For Fun</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'forSwap' && styles.activeTab]}
            onPress={() => setActiveTab('forSwap')}
          >
            <Icon name="swap-horizontal-outline" size={20} color={colors.dark} />
            <Text style={styles.tabText}>For Swap</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.postsContainer}>
          {displayPosts.length === 0 ? (
            <View style={styles.emptyState}>
              <Icon name={activeTab === 'forFun' && !canViewForFunPosts ? 'lock-closed-outline' : 'images-outline'} size={64} color={colors.gray} />
              <Text style={styles.emptyStateText}>
                {activeTab === 'forFun' && !canViewForFunPosts 
                  ? 'This Account is Private'
                  : `No ${activeTab === 'forFun' ? 'Fun' : 'Swap'} Posts`}
              </Text>
              <Text style={styles.emptyStateSubtext}>
                {activeTab === 'forFun' && !canViewForFunPosts 
                  ? 'Follow this account to see their For Fun posts'
                  : 'This user hasn\'t posted anything yet'}
              </Text>
            </View>
          ) : (
            <View style={styles.postsGrid}>
              {displayPosts.map(post => (
                <TouchableOpacity
                  key={post.id}
                  style={styles.postItem}
                  onPress={() => handlePostPress(post)}
                >
                  <Image source={{ uri: post.url }} style={styles.postImage} />
                  {activeTab === 'forSwap' && (
                    <View style={[
                      styles.swapStatusBadge,
                      post.swapStatus === 'swappedOut' && styles.swapStatusBadgeInactive
                    ]}>
                      <Text style={styles.swapStatusBadgeText}>
                        {post.swapStatus === 'available' ? 'Available' : 'Swapped Out'}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Review Modal */}
      <Modal
        visible={showReviewModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowReviewModal(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <TouchableOpacity 
            style={styles.modalOverlay} 
            activeOpacity={1} 
            onPress={() => setShowReviewModal(false)}
          >
            <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
              <ScrollView 
                contentContainerStyle={styles.modalScrollContent}
                keyboardShouldPersistTaps="handled"
              >
                <View style={styles.modalContent}>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Rate</Text>
                    <TouchableOpacity onPress={() => setShowReviewModal(false)}>
                      <Icon name="close" size={24} color={colors.dark} />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.modalLabel}>Your Rating</Text>
                  <View style={styles.modalStarsContainer}>
                    {[1, 2, 3, 4, 5].map(star => (
                      <TouchableOpacity key={star} onPress={() => setReviewRating(star)}>
                        <Icon 
                          name={star <= reviewRating ? 'star' : 'star-outline'}
                          size={36}
                          color={colors.highlight}
                        />
                      </TouchableOpacity>
                    ))}
                  </View>
                  <Text style={styles.modalLabel}>Your Review</Text>
                  <TextInput
                    style={styles.reviewInput}
                    placeholder="Write your review here..."
                    value={reviewText}
                    onChangeText={setReviewText}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                  />
                  <TouchableOpacity style={styles.submitButton} onPress={handleSubmitReview}>
                    <Text style={styles.submitButtonText}>Submit Review</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>

      <BottomNavBar navigation={navigation} activeRoute="Home" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    position: 'relative',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    marginBottom: 4,
  },
  headerLeft: {
    position: 'absolute',
    left: 0,
    top: 0,
    height: 56,
    width: 56,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  headerRight: {
    position: 'absolute',
    right: 0,
    top: 0,
    height: 56,
    width: 56,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  headerCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    height: 56,
    marginHorizontal: 56,
  },
  logo: {
    fontFamily: fonts.header,
    fontSize: 20,
    color: colors.dark,
    fontWeight: 'bold',
    textAlign: 'center',
    maxWidth: '100%',
  },
  container: {
    flex: 1,
    backgroundColor: colors.secondary,
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
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  profileImagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f0f0f0',
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
    marginBottom: spacing.sm,
  },
  locationText: {
    fontSize: 14,
    color: colors.dark,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
    width: '100%',
    marginTop: spacing.md,
  },
  actionButton: {
    flex: 1,
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 8,
    alignItems: 'center',
  },
  followingButton: {
    backgroundColor: '#e0e0e0',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.dark,
  },
  mutualFollowersSection: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  mutualFollowersHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  mutualAvatarsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mutualAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#fff',
  },
  mutualAvatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  mutualAvatarPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mutualFollowersText: {
    flex: 1,
    fontSize: 13,
    color: colors.gray,
    marginLeft: spacing.xs,
  },
  mutualFollowersName: {
    fontWeight: '600',
    color: colors.dark,
  },
  mutualFollowersList: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  mutualFollowerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    gap: spacing.sm,
  },
  mutualFollowerItemImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  mutualFollowerItemPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mutualFollowerItemName: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.dark,
  },
  ratingSection: {
    backgroundColor: '#9abeaa',
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  ratingHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  ratingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  ratingScore: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffd75c',
  },
  ratingName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: colors.dark,
  },
  rateButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: '#ffd75c',
    borderRadius: 6,
    backgroundColor: '#ffd75c',
  },
  rateButtonText: {
    fontSize: 14,
    color: colors.dark,
    fontWeight: '600',
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 4,
  },
  reviewsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.dark,
    marginBottom: spacing.sm,
  },
  reviewItem: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: spacing.sm,
  },
  reviewUserImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  reviewContent: {
    flex: 1,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  reviewAuthor: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.dark,
  },
  reviewText: {
    fontSize: 14,
    color: colors.dark,
    marginBottom: 4,
  },
  reviewStars: {
    flexDirection: 'row',
    gap: 2,
  },
  noReviewsContainer: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  noReviewsText: {
    fontSize: 14,
    color: colors.gray,
    fontStyle: 'italic',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingVertical: spacing.xl * 1.5,
    paddingHorizontal: spacing.xl * 2,
    paddingBottom: spacing.xl * 2,
    width: '100%',
    maxWidth: 750,
    minWidth: 350,
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.dark,
  },
  modalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.dark,
    marginBottom: spacing.sm,
  },
  modalStarsContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
    justifyContent: 'center',
  },
  reviewInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: spacing.md,
    fontSize: 14,
    minHeight: 100,
    marginBottom: spacing.xl,
  },
  submitButton: {
    backgroundColor: colors.accent,
    padding: spacing.md,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
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
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.dark,
  },
  postsContainer: {
    backgroundColor: '#fff',
    minHeight: 300,
    paddingTop: spacing.md,
  },
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
  emptyStateSubtext: {
    fontSize: 14,
    color: colors.gray,
    marginTop: 4,
  },
  postsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 2,
  },
  postItem: {
    width: '33.33%',
    aspectRatio: 1,
    padding: 2,
    position: 'relative',
  },
  postImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  swapStatusBadge: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: '#9abeaa',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  swapStatusBadgeInactive: {
    backgroundColor: colors.gray,
  },
  swapStatusBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#fff',
  },
});