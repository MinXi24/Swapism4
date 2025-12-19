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
  serverTimestamp,
  setDoc,
  updateDoc,
  where
} from 'firebase/firestore';
import { useCallback, useState } from 'react';
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

import Icon from '../../assets/icons/icons';
import BottomNavBar from '../../components/BottomNavBar';
import useGuest from '../../hooks/useGuest';
import { colors, fonts, spacing } from '../../lib/theme';

const ALERT_RED = '#FF6B6B';

export default function UserProfileScreen({ route, navigation }) {
  const { userId, username, initialTab } = route.params;

  // Data State
  const [userPosts, setUserPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(initialTab || 'forFun');
  const [stats, setStats] = useState({ posts: 0, followers: 0, following: 0 });
  const [userInfo, setUserInfo] = useState({
    bio: '', location: '', area: '', rating: 0, reviewCount: 0, reviews: [], photoURL: null, username: username || '',
  });

  // UI State
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewText, setReviewText] = useState('');

  // Relation State
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [followRequestStatus, setFollowRequestStatus] = useState(null);
  const [isPrivateAccount, setIsPrivateAccount] = useState(false);
  const [mutualFollowers, setMutualFollowers] = useState([]);
  const [showAllMutuals, setShowAllMutuals] = useState(false);

  // BLOCK & BAN STATE
  const [isBlockedByMe, setIsBlockedByMe] = useState(false);
  const [isUserBanned, setIsUserBanned] = useState(false);

  const db = getFirestore();
  const auth = getAuth();
  const currentUser = auth.currentUser;
  const { isGuest } = useGuest();

  // Show menu for report/block
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

  // Android custom modal for report/block
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

  const handleReport = async () => {
    if (!currentUser) {
      Alert.alert(
        'Login Required',
        'You must be logged in to report users',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Login', onPress: () => navigation.navigate('Login') }
        ]
      );
      return;
    }
    try {
      await addDoc(collection(db, 'reported_users'), {
        reporter_id: currentUser.uid,
        reporter_username: currentUser.displayName || 'User',
        reported_user_id: userId,
        reported_user_name: userInfo.username,
        reason: "Inappropriate behavior",
        status: 'pending',
        created_at: serverTimestamp(),
      });
      Alert.alert('Report Sent', 'User has been reported.');
    } catch (e) { Alert.alert('Error', 'Failed to report.'); }
  };

  const handleBlock = () => {
    if (!currentUser) {
      Alert.alert(
        'Login Required',
        'You must be logged in to block users',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Login', onPress: () => navigation.navigate('Login') }
        ]
      );
      return;
    }
    Alert.alert('Block User', 'Block this user?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Block', style: 'destructive', onPress: async () => {
          try {
            await setDoc(doc(db, 'users', currentUser.uid, 'blocked_users', userId), {
              blocked_user_id: userId, blocked_user_name: userInfo.username, blocked_at: serverTimestamp()
            });
            setIsBlockedByMe(true);
            Alert.alert('Blocked', 'User has been blocked.');
          } catch (e) { Alert.alert('Error', 'Failed to block.'); }
        }
      }
    ]);
  };

  const handleUnblock = async () => {
    try {
      await deleteDoc(doc(db, 'users', currentUser.uid, 'blocked_users', userId));
      setIsBlockedByMe(false);
      fetchScreenData();
      Alert.alert("Unblocked", "User unblocked.");
    } catch (e) { Alert.alert("Error", "Failed to unblock."); }
  };

  const openMapWithLocation = async () => {
    const location = userInfo.area ? `${userInfo.location}, ${userInfo.area}` : userInfo.location;
    if (!location) return;

    const encodedLocation = encodeURIComponent(location);

    const urls = [
      `comgooglemaps://?q=${encodedLocation}`,
      `https://www.google.com/maps/search/?api=1&query=${encodedLocation}`,
      `maps://maps.apple.com/?q=${encodedLocation}`,
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

  const fetchScreenData = async () => {
    setLoading(true);
    setIsUserBanned(false);
    setIsBlockedByMe(false);

    try {
      if (currentUser && currentUser.uid !== userId) {
        const blockRef = doc(db, 'users', currentUser.uid, 'blocked_users', userId);
        const blockSnap = await getDoc(blockRef);
        if (blockSnap.exists()) {
          setIsBlockedByMe(true);
          setLoading(false);
          return;
        }
      }

      const userDocRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        const userData = userDoc.data();

        if (userData.active === false || userData.isBanned === true) {
          setIsUserBanned(true);
          setLoading(false);
          return;
        }

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
      let viewerName = currentUser.displayName || 'Anonymous';
      try {
        const viewerDocRef = doc(db, 'users', currentUser.uid);
        const viewerDoc = await getDoc(viewerDocRef);
        if (viewerDoc.exists()) viewerName = viewerDoc.data().username || viewerName;
      } catch (err) { console.error(err); }

      await addDoc(collection(db, 'notifications'), {
        userId: userId,
        type: 'profile_view',
        message: `${viewerName} viewed your profile`,
        viewerId: currentUser.uid,
        viewerName: viewerName,
        read: false,
        createdAt: new Date(),
      });
    } catch (error) { console.error(error); }
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

                const requestQuery = query(collection(db, 'followRequests'), where('fromUserId', '==', currentUser.uid), where('toUserId', '==', userId));
                const requestSnapshot = await getDocs(requestQuery);
                requestSnapshot.docs.forEach(async (docSnapshot) => {
                  await deleteDoc(doc(db, 'followRequests', docSnapshot.id));
                });

                setIsFollowing(false);
                setFollowRequestStatus(null);
                setStats(prev => ({ ...prev, followers: prev.followers - 1 }));
              } catch (error) {
                console.error('Error unfollowing:', error);
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
                const requestQuery = query(collection(db, 'followRequests'), where('fromUserId', '==', currentUser.uid), where('toUserId', '==', userId));
                const requestSnapshot = await getDocs(requestQuery);
                requestSnapshot.docs.forEach(async (docSnapshot) => {
                  await deleteDoc(doc(db, 'followRequests', docSnapshot.id));
                });
                setFollowRequestStatus(null);
              } catch (error) {
                console.error('Error canceling request:', error);
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
          let reqName = currentUser.displayName || 'User';
          const userD = await getDoc(doc(db, 'users', currentUser.uid));
          if (userD.exists()) reqName = userD.data().username || reqName;
          await addDoc(collection(db, 'followRequests'), { fromUserId: currentUser.uid, fromUserName: reqName, toUserId: userId, status: 'pending', createdAt: new Date() });
          await addDoc(collection(db, 'notifications'), { userId, type: 'follow_request', message: `${reqName} requested to follow you`, fromUserId: currentUser.uid, read: false, createdAt: new Date() });
          setFollowRequestStatus('pending');
          Alert.alert('Request Sent');
        } else {
          await updateDoc(doc(db, 'users', userId), { followers: arrayUnion(currentUser.uid) });
          await updateDoc(doc(db, 'users', currentUser.uid), { following: arrayUnion(userId) });
          setIsFollowing(true);
          setStats(prev => ({ ...prev, followers: prev.followers + 1 }));
        }
      } catch (e) { console.error(e); } finally { setFollowLoading(false); }
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
      const userRef = doc(db, 'users', userId);
      let rName = currentUser?.displayName || 'Anon'; let rPhoto = null;
      const me = await getDoc(doc(db, 'users', currentUser.uid)); if (me.exists()) { rName = me.data().username; rPhoto = me.data().photoURL; }
      const rev = { userId: currentUser.uid, userName: rName, userPhoto: rPhoto, rating: reviewRating, text: reviewText.trim(), createdAt: new Date().toISOString() };
      await updateDoc(userRef, { reviews: arrayUnion(rev) });
      const updated = await getDoc(userRef); const allRevs = updated.data().reviews || [];
      const avg = allRevs.reduce((s, r) => s + r.rating, 0) / allRevs.length;
      await updateDoc(userRef, { rating: avg, reviewCount: allRevs.length });
      setShowReviewModal(false); setReviewRating(0); setReviewText(''); fetchScreenData(); Alert.alert('Success', 'Review submitted');
    } catch (e) { console.error(e); }
  };

  const handleDeleteReview = async (review) => {
    if (review.userId !== currentUser?.uid) return;
    Alert.alert('Delete', 'Delete review?', [{ text: 'Cancel' }, {
      text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          const userRef = doc(db, 'users', userId); await updateDoc(userRef, { reviews: arrayRemove(review) });
          const updated = await getDoc(userRef); const allRevs = updated.data().reviews || [];
          const avg = allRevs.length > 0 ? allRevs.reduce((s, r) => s + r.rating, 0) / allRevs.length : 0;
          await updateDoc(userRef, { rating: avg, reviewCount: allRevs.length });
          fetchScreenData(); Alert.alert('Success', 'Deleted');
        } catch (e) { console.error(e); }
      }
    }]);
  };

  const handlePostPress = (post) => { navigation.navigate('PostDetails', { post }); };

  // Filter posts
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
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerLeft}><Icon name="arrow-back" size={24} color={colors.dark} /></TouchableOpacity>
        <View style={styles.headerCenter} pointerEvents="none"><Text style={styles.logo} numberOfLines={1}>{userInfo.username}</Text></View>
        <TouchableOpacity onPress={showMenu} style={styles.headerRight}><Icon name="ellipsis-vertical" size={24} color={colors.dark} /></TouchableOpacity>
      </View>

      {Platform.OS === 'android' && renderAndroidMenu()}
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.profileSection}>
          <View style={styles.profileTopRow}>
            <View style={styles.profileImageContainer}>
              {userInfo.photoURL ? <Image source={{ uri: userInfo.photoURL }} style={styles.profileImage} /> : <View style={styles.profileImagePlaceholder}><Icon name="person" size={40} color={colors.gray} /></View>}
            </View>
            <View style={styles.statsRow}>
              <View style={styles.statItem}><Text style={styles.statNumber}>{stats.posts}</Text><Text style={styles.statLabel}>posts</Text></View>
              <TouchableOpacity style={styles.statItem} onPress={() => navigation.navigate('FollowList', { userId, type: 'followers' })}><Text style={styles.statNumber}>{stats.followers}</Text><Text style={styles.statLabel}>followers</Text></TouchableOpacity>
              <TouchableOpacity style={styles.statItem} onPress={() => navigation.navigate('FollowList', { userId, type: 'following' })}><Text style={styles.statNumber}>{stats.following}</Text><Text style={styles.statLabel}>following</Text></TouchableOpacity>
            </View>
          </View>
          <Text style={styles.userName}>{userInfo.username}</Text>
          <Text style={styles.userBio}>{userInfo.bio}</Text>
          {(userInfo.location || userInfo.area) && (
            <TouchableOpacity style={styles.locationContainer} onPress={openMapWithLocation}>
              <Icon name="location-outline" size={16} color={colors.dark} />
              <Text style={styles.locationText}>{userInfo.area ? `${userInfo.location}, ${userInfo.area}` : userInfo.location}</Text>
              <Icon name="open-outline" size={14} color={colors.gray} style={{ marginLeft: 4 }} />
            </TouchableOpacity>
          )}
          <View style={styles.actionButtons}>
            <TouchableOpacity style={[styles.actionButton, isFollowing && styles.followingButton]} onPress={handleFollowToggle} disabled={followLoading}>
              {followLoading ? <ActivityIndicator size="small" color={colors.dark} /> : <Text style={styles.actionButtonText}>{isFollowing ? 'Following' : followRequestStatus === 'pending' ? 'Requested' : isPrivateAccount ? 'Request' : 'Follow'}</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} onPress={handleMessage}><Text style={styles.actionButtonText}>Message</Text></TouchableOpacity>
          </View>
          {mutualFollowers.length > 0 && (
            <View style={styles.mutualFollowersSection}>
              <TouchableOpacity onPress={() => setShowAllMutuals(!showAllMutuals)} style={styles.mutualFollowersHeader}>
                <View style={styles.mutualAvatarsRow}>
                  {mutualFollowers.slice(0, showAllMutuals ? mutualFollowers.length : 1).map((mutual, index) => (
                    <Image key={mutual.uid} source={mutual.photoURL ? { uri: mutual.photoURL } : null} style={[styles.mutualAvatar, index > 0 && { marginLeft: -8, backgroundColor: '#ccc' }]} />
                  ))}
                </View>
                <Text style={styles.mutualFollowersText}>Followed by {mutualFollowers[0].username} {mutualFollowers.length > 1 && `and ${mutualFollowers.length - 1} others`}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={styles.ratingSection}>
          <View style={styles.ratingHeader}>
            <View style={styles.ratingLeft}>
              <Text style={styles.ratingScore}>{userInfo.rating.toFixed(1)}</Text>
              <div style={styles.starsContainer}>
                {[1, 2, 3, 4, 5].map(star => <Icon key={star} name={star <= Math.floor(userInfo.rating) ? 'star' : 'star-outline'} size={20} color={colors.highlight} />)}
              </div>
            </View>
            <TouchableOpacity style={styles.rateButton} onPress={handleRateUser}><Text style={styles.rateButtonText}>Rate</Text></TouchableOpacity>
          </View>
          <Text style={styles.reviewsTitle}>Reviews ({userInfo.reviewCount})</Text>
          {userInfo.reviews.map((r, i) => (
            <View key={i} style={styles.reviewItem}>
              <Image source={r.userPhoto ? { uri: r.userPhoto } : null} style={styles.reviewUserImage} />
              <View style={styles.reviewContent}>
                <View style={styles.reviewHeader}>
                  <Text style={styles.reviewAuthor}>{r.userName}</Text>
                  {r.userId === currentUser?.uid && <TouchableOpacity onPress={() => handleDeleteReview(r)}><Icon name="trash-outline" size={18} color={colors.gray} /></TouchableOpacity>}
                </View>
                <Text style={styles.reviewText}>{r.text}</Text>
                <View style={styles.reviewStars}>{[1, 2, 3, 4, 5].map(s => <Icon key={s} name={s <= r.rating ? 'star' : 'star-outline'} size={14} color={colors.highlight} />)}</View>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.tabsContainer}>
          <TouchableOpacity style={[styles.tab, activeTab === 'forFun' && styles.activeTab]} onPress={() => setActiveTab('forFun')}><Text style={styles.tabText}>For Fun</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.tab, activeTab === 'forSwap' && styles.activeTab]} onPress={() => setActiveTab('forSwap')}><Text style={styles.tabText}>For Swap</Text></TouchableOpacity>
        </View>

        <View style={styles.postsContainer}>
          {displayPosts.length === 0 ? (
            <View style={styles.emptyState}>
              <Icon name={activeTab === 'forFun' && !canViewForFunPosts ? 'lock-closed-outline' : 'images-outline'} size={64} color={colors.gray} />
              <Text style={styles.emptyStateText}>{activeTab === 'forFun' && !canViewForFunPosts ? 'This Account is Private' : `No ${activeTab === 'forFun' ? 'Fun' : 'Swap'} Posts`}</Text>
            </View>
          ) : (
            <View style={styles.postsGrid}>
              {displayPosts.map(post => (
                <TouchableOpacity key={post.id} style={styles.postItem} onPress={() => handlePostPress(post)}>
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
      <BottomNavBar navigation={navigation} activeRoute="Home" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
  mutualFollowersText: {
    flex: 1,
    fontSize: 13,
    color: colors.gray,
    marginLeft: spacing.xs,
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
});