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
  updateDoc,
  where
} from 'firebase/firestore';
import { useCallback, useEffect, useState } from 'react';
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import useGuest from '../../hooks/useGuest';

import Icon from '../../assets/icons/icons';
import BottomNavBar from '../../components/BottomNavBar';
import { colors, fonts, spacing } from '../../lib/theme';

const ALERT_RED = '#FF6B6B';

export default function UserProfileScreen({ route, navigation }) {
  const { userId, username, initialTab } = route.params;

  // Data State
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
  const [reviewsWithUserData, setReviewsWithUserData] = useState([]);
  const [androidMenuVisible, setAndroidMenuVisible] = useState(false);
  
  // Relation State
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [followRequestStatus, setFollowRequestStatus] = useState(null); // null, 'pending', 'accepted', 'rejected'
  const [isPrivateAccount, setIsPrivateAccount] = useState(false);
  const [mutualFollowers, setMutualFollowers] = useState([]);
  const [showAllMutuals, setShowAllMutuals] = useState(false);

  // BLOCK & BAN STATE
  const [isBlockedByMe, setIsBlockedByMe] = useState(false);
  const [isUserBanned, setIsUserBanned] = useState(false); // [NEW] Added Ban State

  const db = getFirestore();
  const auth = getAuth();
  const currentUser = auth.currentUser;
  const { isGuest } = useGuest();

  // --- ENHANCED: Fetch latest username and photo for each review ---
  const fetchReviewsWithUserData = useCallback(async (reviews) => {
    if (!reviews || reviews.length === 0) return [];
    
    const updatedReviews = [];
    
    // First, deduplicate by userId (keep only latest review per user)
    const reviewsByUserId = new Map();
    reviews.forEach(review => {
      const existing = reviewsByUserId.get(review.userId);
      if (!existing) {
        reviewsByUserId.set(review.userId, review);
      } else {
        // Keep the review with the most recent createdAt
        const existingDate = existing.createdAt ? new Date(existing.createdAt) : new Date(0);
        const currentDate = review.createdAt ? new Date(review.createdAt) : new Date(0);
        if (currentDate > existingDate) {
          reviewsByUserId.set(review.userId, review);
        }
      }
    });
    
    // Now fetch current user data for each unique review
    for (const review of reviewsByUserId.values()) {
      try {
        const userDocRef = doc(db, 'users', review.userId);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists()) {
          const data = userDoc.data();
          updatedReviews.push({
            userId: review.userId,
            userName: data.username || 'Anonymous',
            userPhoto: data.photoURL || null,
            text: review.text,
            rating: review.rating,
            createdAt: review.createdAt,
          });
        } else {
          // User no longer exists, use stored data
          updatedReviews.push({
            userId: review.userId,
            userName: review.userName || 'Anonymous',
            userPhoto: review.userPhoto || null,
            text: review.text,
            rating: review.rating,
            createdAt: review.createdAt,
          });
        }
      } catch (err) {
        console.error('Error fetching user data for review:', err);
        // If fetch fails, use stored data
        updatedReviews.push({
          userId: review.userId,
          userName: review.userName || 'Anonymous',
          userPhoto: review.userPhoto || null,
          text: review.text,
          rating: review.rating,
          createdAt: review.createdAt,
        });
      }
    }
    
    // Sort by date (newest first)
    return updatedReviews.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
      const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
      return dateB - dateA;
    });
  }, [db]);
  
  // --- ENHANCED: Update reviews whenever userInfo.reviews changes ---
  useEffect(() => {
    const loadReviews = async () => {
      if (userInfo && Array.isArray(userInfo.reviews) && userInfo.reviews.length > 0) {
        try {
          const updatedReviews = await fetchReviewsWithUserData(userInfo.reviews);
          setReviewsWithUserData(updatedReviews);
        } catch (err) {
          console.error('Error fetching reviews with user data:', err);
          // Fallback to deduplicated original review data if fetch fails
          const uniqueMap = new Map();
          userInfo.reviews.forEach(r => {
            if (!uniqueMap.has(r.userId) || 
                (r.createdAt && (!uniqueMap.get(r.userId).createdAt || 
                new Date(r.createdAt) > new Date(uniqueMap.get(r.userId).createdAt)))) {
              uniqueMap.set(r.userId, r);
            }
          });
          setReviewsWithUserData(Array.from(uniqueMap.values()));
        }
      } else {
        setReviewsWithUserData([]);
      }
    };
    loadReviews();
  }, [userInfo, fetchReviewsWithUserData]);

  // --- MAIN DATA LOADING LOGIC ---
  const fetchScreenData = async () => {
    setLoading(true);
    setIsUserBanned(false); // Reset on reload
    setIsBlockedByMe(false);

    try {
        // 1. Check Block Status FIRST
        if (currentUser && currentUser.uid !== userId) {
            const blockRef = doc(db, 'users', currentUser.uid, 'blocked_users', userId);
            const blockSnap = await getDoc(blockRef);
            if (blockSnap.exists()) {
                setIsBlockedByMe(true);
                setLoading(false);
                return; // Stop here if blocked
            }
        }

        // 2. Load User Profile & CHECK BAN
        const userDocRef = doc(db, 'users', userId);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists()) {
            const userData = userDoc.data();

            // [NEW] CRITICAL BAN CHECK
            // Checks for EITHER 'active: false' OR 'isBanned: true'
            if (userData.active === false || userData.isBanned === true) {
                setIsUserBanned(true);
                setLoading(false);
                return; // Stop here if banned. Do NOT load posts.
            }

            // Map User Data
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
            setStats({
                posts: 0, // Will update when posts load
                followers: followers.length,
                following: following.length,
            });

            // Relationships (Follow status, etc.)
            if (currentUser) {
                setIsFollowing(followers.includes(currentUser.uid));
                await loadMutualsAndRequests(followers);
            }

            // 3. Load Posts (Only happens if NOT banned)
            await loadUserPostsOnly();
        }
    } catch (error) {
        console.error("Error loading profile:", error);
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

  // Split out helper to load posts (called only if active)
  const loadUserPostsOnly = async () => {
    try {
      const q = query(collection(db, 'wardrobe-plug-fyp/user/images'), where('ownerUid', '==', userId));
      const querySnapshot = await getDocs(q);
      const posts = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => (b.uploadedAt?.toDate?.() || new Date()) - (a.uploadedAt?.toDate?.() || new Date()));
      
      setUserPosts(posts);
      setStats(prev => ({ ...prev, posts: posts.length }));
    } catch (error) { console.error(error); }
  };

  // Split out helper for mutuals/requests
  const loadMutualsAndRequests = async (followers) => {
      try {
        const currentUserDocRef = doc(db, 'users', currentUser.uid);
        const currentUserDoc = await getDoc(currentUserDocRef);
        if (currentUserDoc.exists()) {
            const currentUserFollowing = currentUserDoc.data().following || [];
            const mutuals = followers.filter(followerId => currentUserFollowing.includes(followerId));
            const mutualDetails = await Promise.all(mutuals.map(async (mid) => {
                const mDoc = await getDoc(doc(db, 'users', mid));
                return mDoc.exists() ? { uid: mid, username: mDoc.data().username, photoURL: mDoc.data().photoURL } : null;
            }));
            setMutualFollowers(mutualDetails.filter(m => m));
        }
        
        const requestQuery = query(collection(db, 'followRequests'), where('fromUserId', '==', currentUser.uid), where('toUserId', '==', userId));
        const requestSnapshot = await getDocs(requestQuery);
        setFollowRequestStatus(!requestSnapshot.empty ? requestSnapshot.docs[0].data().status : null);
      } catch (e) { console.error(e); }
  };

  const logProfileView = async () => {
    if (!currentUser || currentUser.uid === userId) return;
    
    try {
      const userDocRef = doc(db, 'users', currentUser.uid);
      const userDoc = await getDoc(userDocRef);
      const viewerName = userDoc.exists() ? userDoc.data().username || 'Someone' : 'Someone';

      // Create notification for profile owner
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
  const showMenu = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: ['Cancel', 'Report User', 'Block User'], destructiveButtonIndex: 2, cancelButtonIndex: 0 },
        (idx) => { if (idx === 1) handleReport(); if (idx === 2) handleBlock(); }
      );
    } else { setAndroidMenuVisible(true); }
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

  const loadUserProfile = async () => {
    try {
      const userDocRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        const userData = userDoc.data();

        if (userData.active === false || userData.isBanned === true) {
          setIsUserBanned(true);
          setLoading(false);
          return;
        }

        const validReviews = (userData.reviews || []).filter(review => review.userId && review.userName);
        setUserInfo({
          bio: userData.bio || '',
          location: userData.location || '',
          area: userData.area || '',
          rating: userData.rating || 0,
          reviewCount: validReviews.length,
          reviews: validReviews,
          photoURL: userData.photoURL || null,
          username: userData.username || username || 'User',
        });

        setIsPrivateAccount(userData.isPrivate || false);

        const followers = userData.followers || [];
        const following = userData.following || [];
        setStats({
          posts: 0,
          followers: followers.length,
          following: following.length,
        });

        if (currentUser) {
          setIsFollowing(followers.includes(currentUser.uid));
          await loadMutualsAndRequests(followers);
        }

        await loadUserPostsOnly();
      }
    } catch (error) {
      console.error("Error loading profile:", error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchScreenData();
      logProfileView();
    }, [userId])
  );

  // Split out helper to load posts (called only if active)
  const loadUserPostsOnly = async () => {
    try {
      const q = query(collection(db, 'wardrobe-plug-fyp/user/images'), where('ownerUid', '==', userId));
      const querySnapshot = await getDocs(q);
      const posts = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => (b.uploadedAt?.toDate?.() || new Date()) - (a.uploadedAt?.toDate?.() || new Date()));
      
      setUserPosts(posts);
      setStats(prev => ({ ...prev, posts: posts.length }));
    } catch (error) { console.error(error); }
  };

  // Split out helper for mutuals/requests
  const loadMutualsAndRequests = async (followers) => {
      try {
        const currentUserDocRef = doc(db, 'users', currentUser.uid);
        const currentUserDoc = await getDoc(currentUserDocRef);
        if (currentUserDoc.exists()) {
            const currentUserFollowing = currentUserDoc.data().following || [];
            const mutuals = followers.filter(followerId => currentUserFollowing.includes(followerId));
            const mutualDetails = await Promise.all(mutuals.map(async (mid) => {
                const mDoc = await getDoc(doc(db, 'users', mid));
                return mDoc.exists() ? { uid: mid, username: mDoc.data().username, photoURL: mDoc.data().photoURL } : null;
            }));
            setMutualFollowers(mutualDetails.filter(m => m));
        }
        
        const requestQuery = query(collection(db, 'followRequests'), where('fromUserId', '==', currentUser.uid), where('toUserId', '==', userId));
        const requestSnapshot = await getDocs(requestQuery);
        setFollowRequestStatus(!requestSnapshot.empty ? requestSnapshot.docs[0].data().status : null);
      } catch (e) { console.error(e); }
  };

  const handlePostPress = (post) => {
    navigation.navigate('PostDetails', { post });
  };


  const handleFollowToggle = async () => {
    if (!currentUser) {
      Alert.alert(
        'Login Required',
        'Login to start following users!',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Login', onPress: () => navigation.navigate('Login') }
        ]
      );
      return;
    }

    if (isFollowing) {
        Alert.alert('Unfollow', 'Unfollow user?', [{ text: 'No', style: 'cancel' }, { text: 'Yes', onPress: async () => {
            try { setFollowLoading(true);
                const userDocRef = doc(db, 'users', userId); const currentUserDocRef = doc(db, 'users', currentUser.uid);
                await updateDoc(userDocRef, { followers: arrayRemove(currentUser.uid) }); await updateDoc(currentUserDocRef, { following: arrayRemove(userId) });
                
                const q = query(collection(db, 'followRequests'), where('fromUserId', '==', currentUser.uid), where('toUserId', '==', userId));
                const snap = await getDocs(q); snap.forEach(async (d) => await deleteDoc(doc(db, 'followRequests', d.id)));
                
                setIsFollowing(false); setFollowRequestStatus(null); setStats(prev => ({ ...prev, followers: prev.followers - 1 }));
            } catch (e) { console.error(e); } finally { setFollowLoading(false); }
        }}]);
    } else {
        try { setFollowLoading(true);
            if (isPrivateAccount) {
                // Request logic
                let reqName = currentUser.displayName || 'User';
                const userD = await getDoc(doc(db,'users',currentUser.uid)); if(userD.exists()) reqName = userD.data().username || reqName;
                await addDoc(collection(db,'followRequests'), { fromUserId: currentUser.uid, fromUserName: reqName, toUserId: userId, status: 'pending', createdAt: new Date() });
                await addDoc(collection(db,'notifications'), { userId, type: 'follow_request', message: `${reqName} requested follow`, fromUserId: currentUser.uid, read: false, createdAt: new Date() });
                setFollowRequestStatus('pending'); Alert.alert('Request Sent');
            } else {
                // Follow logic
                await updateDoc(doc(db,'users',userId), { followers: arrayUnion(currentUser.uid) });
                await updateDoc(doc(db,'users',currentUser.uid), { following: arrayUnion(userId) });
                setIsFollowing(true); setStats(prev => ({ ...prev, followers: prev.followers + 1 }));
            }
        } catch(e){ console.error(e); } finally { setFollowLoading(false); }
    }
  };

  const handleMessage = () => {
    if (isGuest) {
      Alert.alert(
        'Login Required',
        'Login to start messaging!',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Login', onPress: () => navigation.navigate('Welcome') }
        ],
        { cancelable: false }
      );
      return;
    }
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
    if (!currentUser) {
      Alert.alert('Login Required', 'You must be logged in to submit reviews!', [{ text: 'Cancel', style: 'cancel' }, { text: 'Login', onPress: () => navigation.navigate('Login') }]);
      return;
    }
    if (reviewRating === 0 || !reviewText.trim()) {
      Alert.alert('Error', 'Please select a rating and write a review');
      return;
    }
    try {
      const userDocRef = doc(db, 'users', userId);
      let reviewerName = currentUser?.displayName || 'Anonymous';
      let reviewerPhoto = null;
      const me = await getDoc(doc(db,'users',currentUser.uid));
      if(me.exists()) {
        reviewerName = me.data().username;
        reviewerPhoto = me.data().photoURL;
      }
      const rev = {
        userId: currentUser.uid,
        userName: reviewerName,
        userPhoto: reviewerPhoto,
        rating: reviewRating,
        text: reviewText.trim(),
        createdAt: new Date().toISOString()
      };
      await updateDoc(userDocRef, { reviews: arrayUnion(rev) });
      const updated = await getDoc(userDocRef);
      const allRevs = updated.data().reviews || [];
      const avg = allRevs.reduce((s,r)=>s+r.rating,0)/allRevs.length;
      await updateDoc(userDocRef, { rating: avg, reviewCount: allRevs.length });
      setShowReviewModal(false);
      setReviewRating(0);
      setReviewText('');
      fetchScreenData();
      Alert.alert('Success','Review submitted');
    } catch(_e) {
      console.error(_e);
      Alert.alert('Error', 'Failed to submit review');
    }
  };

  const handleDeleteReview = async (review) => {
      if (review.userId !== currentUser?.uid) return;
      Alert.alert('Delete', 'Delete review?', [{text:'Cancel'},{text:'Delete', style:'destructive', onPress: async()=>{
          try {
              const userRef = doc(db,'users',userId); await updateDoc(userRef, { reviews: arrayRemove(review) });
              const updated = await getDoc(userRef); const allRevs = updated.data().reviews || [];
              const avg = allRevs.length > 0 ? allRevs.reduce((s,r)=>s+r.rating,0)/allRevs.length : 0;
              await updateDoc(userRef, { rating: avg, reviewCount: allRevs.length });
              fetchScreenData(); Alert.alert('Success', 'Deleted');
          } catch(_e){ console.error(_e); }
      }}]);
  };

  // Filter posts
  const forFunPosts = userPosts.filter(post => post.postType === 'forFun');
  const forSwapPosts = userPosts.filter(post => post.postType === 'forSwap');
  
  const canViewForFunPosts = !isPrivateAccount || isFollowing || userId === currentUser?.uid;
  const displayPosts = activeTab === 'forFun' 
    ? (canViewForFunPosts ? forFunPosts : []) 
    : forSwapPosts;

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  // --- 1. BLOCKED VIEW ---
  if (isBlockedByMe) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerLeft}><Icon name="arrow-back" size={24} color={colors.dark} /></TouchableOpacity>
          <View style={styles.headerCenter}><Text style={styles.logo}>Blocked User</Text></View>
          <View style={styles.headerRight} />
        </View>
        <View style={[styles.centerContent, { flex: 1, padding: 20 }]}>
          <Icon name="ban" size={64} color={colors.gray} />
          <Text style={{ fontSize: 18, fontWeight: 'bold', marginTop: 20, color: colors.dark }}>Blocked</Text>
          <Text style={{ textAlign: 'center', color: colors.gray, marginTop: 10, marginBottom: 20 }}>You have blocked this user.</Text>
          <TouchableOpacity style={{ backgroundColor: colors.dark, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 }} onPress={handleUnblock}>
            <Text style={{ color: '#fff', fontWeight: 'bold' }}>Unblock</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // --- 2. BANNED VIEW ---
  if (isUserBanned) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerLeft}>
            <Icon name="arrow-back" size={24} color={colors.dark} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.logo}>Suspended</Text>
          </View>
          <View style={styles.headerRight} />
        </View>
        <View style={[styles.centerContent, { flex: 1, padding: 20 }]}>
          <Icon name="alert-circle" size={64} color={ALERT_RED} />
          <Text style={{ fontSize: 20, fontWeight: 'bold', marginTop: 20, color: colors.dark }}>
            Account Suspended
          </Text>
          <Text style={{ textAlign: 'center', color: colors.gray, marginTop: 10, fontSize: 14, lineHeight: 20 }}>
            This user has been banned for violating our community guidelines. Their posts and profile are no longer available.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // --- 3. NORMAL VIEW ---
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#fff" barStyle="dark-content" />
      
      {/* Header */}
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
        {/* Profile Info */}
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

          {/* Action Buttons */}
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
                  {isFollowing 
                    ? 'Following' 
                    : followRequestStatus === 'pending' 
                      ? 'Requested' 
                      : isPrivateAccount 
                        ? 'Request' 
                        : 'Follow'}
                </Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={handleMessage}
            >
              <Text style={styles.actionButtonText}>Message</Text>
            </TouchableOpacity>
          </View>

          {/* Mutual Followers Section */}
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
                  Followed by{' '}
                  <Text style={styles.mutualFollowersName}>
                    {mutualFollowers[0].username}
                  </Text>
                  {mutualFollowers.length > 1 && (
                    <Text>
                      {' '}and {mutualFollowers.length - 1} other{mutualFollowers.length > 2 ? 's' : ''} you follow
                    </Text>
                  )}
                </Text>
                {mutualFollowers.length > 1 && (
                  <Icon 
                    name={showAllMutuals ? 'chevron-up' : 'chevron-down'} 
                    size={18} 
                    color={colors.gray} 
                  />
                )}
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

        {/* Rating Section */}
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
            (reviewsWithUserData.length > 0 ? reviewsWithUserData : userInfo.reviews).map((review, index) => (
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
                      <Icon 
                        key={star}
                        name={star <= review.rating ? 'star' : 'star-outline'}
                        size={14}
                        color={colors.highlight}
                      />
                    ))}
                  </View>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Tabs */}
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

        {/* Posts Grid */}
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
                      post.swapStatus === 'reserved' && styles.swapStatusBadgeInactive,
                      (post.swapStatus === 'swappedOut' || post.swapStatus === 'swapped out') && styles.swapStatusBadgeSwappedOut
                    ]}>
                      <Text style={styles.swapStatusBadgeText}>
                        {post.swapStatus === 'available'
                          ? 'Available'
                          : post.swapStatus === 'reserved'
                            ? 'Reserved'
                            : 'Swapped Out'}
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
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
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
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  mutualAvatarPlaceholder: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#eee',
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
    fontWeight: 'bold',
    color: colors.dark,
  },
  mutualFollowersList: {
    marginTop: spacing.sm,
    paddingLeft: spacing.md,
  },
  mutualFollowerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  mutualFollowerItemImage: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: spacing.sm,
  },
  mutualFollowerItemPlaceholder: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#eee',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  mutualFollowerItemName: {
    fontSize: 13,
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
  noReviewsContainer: {
    padding: spacing.md,
    alignItems: 'center',
  },
  noReviewsText: {
    color: '#fff',
    fontStyle: 'italic',
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
    marginTop: spacing.xs,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
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
  swapStatusBadgeSwappedOut: {
    backgroundColor: colors.highlight,
  },
  swapStatusBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: colors.dark,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalScrollContent: {
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: spacing.lg,
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
    justifyContent: 'center',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  reviewInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: spacing.md,
    height: 100,
    marginBottom: spacing.lg,
    fontSize: 14,
    color: colors.dark,
  },
  submitButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.dark,
  },
});