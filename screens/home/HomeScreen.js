import { useFocusEffect } from '@react-navigation/native';
import { getAuth } from 'firebase/auth';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  query,
  serverTimestamp,
  where
} from 'firebase/firestore';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  Image,
  PanResponder,
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
import Icon from '../../assets/icons/icons';
import BottomNavBar from '../../components/BottomNavBar';
import { colors, fonts, spacing } from '../../lib/theme';

export default function HomeScreen({ navigation }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState(null);
  const [notificationAnim] = useState(new Animated.Value(-100));
  const [suggestedUsers, setSuggestedUsers] = useState([]);
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(false);

  const db = getFirestore();
  const auth = getAuth();
  const currentUser = auth.currentUser;

  // Pan responder for swipe-to-dismiss notification
  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderMove: (_, gestureState) => {
      if (gestureState.dy < 0) {
        notificationAnim.setValue(gestureState.dy);
      }
    },
    onPanResponderRelease: (_, gestureState) => {
      if (gestureState.dy < -50) {
        dismissNotification();
      } else {
        Animated.spring(notificationAnim, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
      }
    },
  });

  useFocusEffect(
    useCallback(() => {
      loadPosts();
      loadSuggestedUsers();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  useEffect(() => {
    const checkNotifications = setInterval(() => {
      loadNotifications();
    }, 5000);

    return () => clearInterval(checkNotifications);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadPosts = async () => {
    try {
      setLoading(true);

      // 1. [NEW] Fetch Blocked Users List First
      let blockedIds = [];
      if (currentUser) {
        const blockedSnap = await getDocs(collection(db, 'users', currentUser.uid, 'blocked_users'));
        blockedIds = blockedSnap.docs.map(doc => doc.id);
      }

      const q = query(
        collection(db, 'wardrobe-plug-fyp/user/images'),
        where('postType', '==', 'forFun')
      );
      const querySnapshot = await getDocs(q);
      
      const postsData = await Promise.all(
        querySnapshot.docs.map(async (docSnapshot) => {
          const postData = docSnapshot.data();
          
          const likesQuery = query(
            collection(db, 'likes'),
            where('postId', '==', docSnapshot.id)
          );
          const likesSnapshot = await getDocs(likesQuery);
          const likeCount = likesSnapshot.size;
          
          const commentsQuery = query(
            collection(db, 'comments'),
            where('postId', '==', docSnapshot.id)
          );
          const commentsSnapshot = await getDocs(commentsQuery);
          const commentCount = commentsSnapshot.size;
          
          const userLiked = likesSnapshot.docs.some(
            doc => doc.data().userId === currentUser?.uid
          );
          
          // Load user profile picture and privacy settings
          let userPhotoURL = null;
          let isPrivate = false;
          let isFollowing = false;
          
          if (postData.ownerUid) {
            try {
              const userDocRef = doc(db, 'users', postData.ownerUid);
              const userDoc = await getDoc(userDocRef);
              if (userDoc.exists()) {
                const userData = userDoc.data();
                userPhotoURL = userData.photoURL || null;
                isPrivate = userData.isPrivate || false;
                
                // Check if current user is following
                if (currentUser) {
                  const followers = userData.followers || [];
                  isFollowing = followers.includes(currentUser.uid);
                }
              }
            } catch (error) {
              console.error('Error loading user data:', error);
            }
          }
          
          return {
            id: docSnapshot.id,
            ...postData,
            likeCount,
            commentCount,
            userLiked,
            userPhotoURL,
            isPrivate,
            isFollowing,
            uploadedAt: postData.uploadedAt?.toDate?.() || new Date(),
          };
        })
      );
      
      // Filter out private posts AND BLOCKED USERS
      const filteredPosts = postsData.filter(post => {
        // [NEW] Hide post if the owner is blocked
        if (blockedIds.includes(post.ownerUid)) return false;

        // Show post if it's not private
        if (!post.isPrivate) return true;
        
        // Show post if it's the current user's post
        if (currentUser && post.ownerUid === currentUser.uid) return true;
        
        // Show post if current user is following the owner
        if (post.isFollowing) return true;
        
        // Hide private post
        return false;
      });
      
      filteredPosts.sort((a, b) => b.uploadedAt - a.uploadedAt);
      setPosts(filteredPosts);
    } catch (error) {
      console.error('Error loading posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSuggestedUsers = async () => {
    try {
      if (!currentUser) {
        setSuggestedUsers([]);
        return;
      }

      // [NEW] Fetch Blocked Users for Suggestions too
      let blockedIds = [];
      const blockedSnap = await getDocs(collection(db, 'users', currentUser.uid, 'blocked_users'));
      blockedIds = blockedSnap.docs.map(doc => doc.id);

      // Get current user's following list
      const currentUserDocRef = doc(db, 'users', currentUser.uid);
      const currentUserDoc = await getDoc(currentUserDocRef);
      const currentUserFollowing = currentUserDoc.exists() ? (currentUserDoc.data().following || []) : [];
      
      // Get all users from Firebase
      const usersQuery = query(collection(db, 'users'));
      const usersSnapshot = await getDocs(usersQuery);
      
      const suggestedUsersData = [];
      
      usersSnapshot.docs.forEach(userDoc => {
        const userData = userDoc.data();
        const userUid = userDoc.id;

        // [NEW] Skip Blocked Users
        if (blockedIds.includes(userUid)) {
            return;
        }

        // Skip current user and users already being followed
        if (userUid === currentUser.uid || currentUserFollowing.includes(userUid)) {
          return;
        }

        // Exclude admin accounts (by role or username)
        if ((userData.role && userData.role.toLowerCase() === 'admin') || (userData.username && userData.username.toLowerCase().includes('admin'))) {
          return;
        }

        // Exclude deleted, inactive, or invalid accounts
        if (userData.deleted === true || userData.active === false || !userData.username || typeof userData.username !== 'string' || userData.username.trim() === '') {
          return;
        }

        const followers = userData.followers || [];
        const following = userData.following || [];

        // Calculate mutual following (how many people current user follows that this user also follows)
        const mutualCount = following.filter(uid => currentUserFollowing.includes(uid)).length;

        suggestedUsersData.push({
          uid: userUid,
          userName: userData.username,
          photoURL: userData.photoURL || null,
          followerCount: followers.length,
          mutualCount: mutualCount,
        });
      });
      
      // Sort by: 1) mutual connections first, 2) then by follower count
      suggestedUsersData.sort((a, b) => {
        if (b.mutualCount !== a.mutualCount) {
          return b.mutualCount - a.mutualCount;
        }
        return b.followerCount - a.followerCount;
      });
      
      // Take top 10 suggestions
      setSuggestedUsers(suggestedUsersData.slice(0, 10));
    } catch (error) {
      console.error('Error loading suggested users:', error);
    }
  };

  const loadNotifications = async () => {
    if (!currentUser) return;

    try {
      const q = query(
        collection(db, 'notifications'),
        where('userId', '==', currentUser.uid),
        where('read', '==', false)
      );
      const querySnapshot = await getDocs(q);
      
      // Set red dot indicator if there are unread notifications
      setHasUnreadNotifications(!querySnapshot.empty);
      
      if (!querySnapshot.empty) {
        const notifData = querySnapshot.docs[0].data();
        showNotification(notifData);
        await deleteDoc(querySnapshot.docs[0].ref);
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  };

  const showNotification = (notif) => {
    setNotification(notif);

    Animated.timing(notificationAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();

    setTimeout(() => {
      dismissNotification();
    }, 5000); // Notification disappears after 5 seconds
  };

  const dismissNotification = () => {
    Animated.timing(notificationAnim, {
      toValue: -100,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setNotification(null);
    });
  };

  const handleNotificationPress = () => {
    navigation.navigate('Activity');
    setHasUnreadNotifications(false); // Only reset when user navigates to Activity screen
  };

  const handleLike = async (post) => {
    if (!currentUser) return;

    try {
      if (post.userLiked) {
        const likesQuery = query(
          collection(db, 'likes'),
          where('postId', '==', post.id),
          where('userId', '==', currentUser.uid)
        );
        const likesSnapshot = await getDocs(likesQuery);
        if (!likesSnapshot.empty) {
          await deleteDoc(likesSnapshot.docs[0].ref);
        }
      } else {
        let userName = currentUser.displayName || currentUser.email;
        try {
          const userDocRef = doc(db, 'users', currentUser.uid);
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
            userName = userDoc.data().username || userName;
          }
        } catch (err) {
          console.error('Error fetching username:', err);
        }

        await addDoc(collection(db, 'likes'), {
          postId: post.id,
          userId: currentUser.uid,
          userName: userName,
          createdAt: new Date(),
        });

        if (post.ownerUid !== currentUser.uid) {
          await addDoc(collection(db, 'notifications'), {
            userId: post.ownerUid,
            type: 'like',
            message: `${userName} liked your post`,
            postId: post.id,
            read: false,
            createdAt: new Date(),
          });
        }
      }
      
      loadPosts();
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  const handleComment = (post) => {
    navigation.navigate('PostDetails', { post });
  };
  const handleFavorite = async (post) => {
    if (!currentUser) return;

    try {
      const favoritesQuery = query(
        collection(db, 'favorites'),
        where('userId', '==', currentUser.uid),
        where('postId', '==', post.id)
      );
      const favoritesSnapshot = await getDocs(favoritesQuery);

      if (!favoritesSnapshot.empty) {
        // Remove from favorites
        await deleteDoc(favoritesSnapshot.docs[0].ref);
        setPosts(posts.map(p => 
          p.id === post.id ? { ...p, userFavorited: false } : p
        ));
      } else {
        // Add to favorites
        await addDoc(collection(db, 'favorites'), {
          userId: currentUser.uid,
          postId: post.id,
          postUrl: post.url,
          postDescription: post.description || post.title,
          ownerUid: post.ownerUid,
          userName: post.userName,
          userPhotoURL: post.userPhotoURL,
          uploadedAt: post.uploadedAt,
          createdAt: serverTimestamp(),
        });
        setPosts(posts.map(p => 
          p.id === post.id ? { ...p, userFavorited: true } : p
        ));
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };
  const handlePostPress = (post) => {
    navigation.navigate('PostDetails', { post });
  };

  const formatTime = (date) => {
    if (!date) return '';
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                    'July', 'August', 'September', 'October', 'November', 'December'];
    const month = months[date.getMonth()];
    const day = date.getDate();
    const year = date.getFullYear();
    return `${month} ${day}, ${year}`;
  };

  const formatRelativeTime = (date) => {
    if (!date) return '';
    const now = new Date();
    const diffInMs = now - date;
    const diffInMinutes = Math.floor(diffInMs / 60000);
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInDays > 0) return `${diffInDays}d`;
    if (diffInHours > 0) return `${diffInHours}h`;
    if (diffInMinutes > 0) return `${diffInMinutes}mins ago`;
    return 'Just now';
  };

  const handleUserProfilePress = (user) => {
    navigation.navigate('UserProfile', { userId: user.uid, username: user.userName });
  };

  const handlePostOptions = (post) => {
    const isOwner = post.ownerUid === currentUser?.uid;
    
    if (isOwner) {
      Alert.alert(
        'Post Options',
        'What would you like to do?',
        [
          {
            text: 'Delete Post',
            style: 'destructive',
            onPress: () => handleDeletePost(post)
          },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
    } else {
      Alert.alert(
        'Post Options',
        'What would you like to do?',
        [
          {
            text: 'Report Post',
            // FIXED: Added setTimeout to prevent Alert chaining issues on Android
            onPress: () => setTimeout(() => handleReportPost(post), 500)
          },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
    }
  };

  const handleDeletePost = async (post) => {
    try {
      await deleteDoc(doc(db, 'wardrobe-plug-fyp/user/images', post.id));
      Alert.alert('Success', 'Post deleted successfully');
      loadPosts();
    } catch (error) {
      console.error('Error deleting post:', error);
      Alert.alert('Error', 'Failed to delete post');
    }
  };

  // --- UPDATED FUNCTION: Added Debugging & ServerTimestamp ---
  const handleReportPost = async (post) => {
    if (!currentUser) {
      Alert.alert('Error', 'You must be logged in to report posts.');
      return;
    }
    
    // Debug log to ensure function is called
    console.log("Initiating report for post:", post.id);

    Alert.alert(
      'Report Post',
      'Are you sure you want to report this post?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Report',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log("Sending report to Firestore...");
              
              const reportData = {
                reporter_user_id: currentUser.uid,
                reported_clothes_id: post.id,
                reason: 'Inappropriate Content',
                status: 'pending',
                // FIXED: Using serverTimestamp for consistency with Admin sorting
                created_at: serverTimestamp(), 
                snapshot_image_url: post.url || '',
                snapshot_description: post.description || ''
              };

              // Explicitly log the data being sent
              console.log("Report Data:", reportData);

              await addDoc(collection(db, 'report'), reportData);
              
              console.log("Report successfully added to DB.");
              Alert.alert('Report Sent', 'Thank you. We will review this post.');
            } catch (error) {
              console.error('Error reporting post:', error);
              Alert.alert('Error', 'Failed to send report. Please check your internet.');
            }
          },
        },
      ]
    );
  };

  const renderPost = ({ item }) => (
    <View style={styles.postContainer}>
      <View style={styles.postHeader}>
        <View style={styles.userInfo}>
          <TouchableOpacity 
            style={styles.avatar}
            onPress={() => {
              if (item.ownerUid && item.ownerUid !== currentUser?.uid) {
                navigation.navigate('UserProfile', { userId: item.ownerUid, username: item.userName || 'User' });
              }
            }}
          >
            {item.userPhotoURL ? (
              <Image source={{ uri: item.userPhotoURL }} style={styles.avatarImage} />
            ) : (
              <Icon name="person" size={24} color={colors.gray} />
            )}
          </TouchableOpacity>
          <View>
            <Text style={styles.userName}>{item.userName || 'User'}</Text>
            <Text style={styles.postTime}>{formatRelativeTime(item.uploadedAt)}</Text>
          </View>
        </View>
        <TouchableOpacity onPress={() => handlePostOptions(item)}>
          <Icon name="ellipsis-horizontal" size={24} color={colors.dark} />
        </TouchableOpacity>
      </View>

      <TouchableOpacity onPress={() => handlePostPress(item)}>
        <Image source={{ uri: item.url }} style={styles.postImage} />
      </TouchableOpacity>

      <View style={styles.actionsContainer}>
        <View style={styles.leftActions}>
          <TouchableOpacity onPress={() => handleLike(item)} style={styles.actionButton}>
            <Icon 
              name={item.userLiked ? 'heart' : 'heart-outline'} 
              size={28} 
              color={item.userLiked ? '#9ABEAA' : colors.dark} 
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleComment(item)} style={styles.actionButton}>
            <Icon name="chatbubble-outline" size={26} color={colors.dark} />
          </TouchableOpacity>
        </View>
        <TouchableOpacity onPress={() => handleFavorite(item)}>
          <Icon 
            name={item.userFavorited ? 'star' : 'star-outline'} 
            size={26} 
            color={item.userFavorited ? '#F4C430' : colors.dark} 
          />
        </TouchableOpacity>
      </View>

      {item.likeCount > 0 && (
        <Text style={styles.likeCount}>{item.likeCount} {item.likeCount === 1 ? 'like' : 'likes'}</Text>
      )}

      <View style={styles.captionContainer}>
        <Text style={styles.caption}>
          <Text style={styles.captionUsername}>{item.userName || 'User'}</Text>
          {' '}{item.description || item.title}
        </Text>
      </View>

      {item.commentCount > 0 && (
        <TouchableOpacity onPress={() => handleComment(item)}>
          <Text style={styles.viewComments}>
            View all {item.commentCount} comment{item.commentCount !== 1 ? 's' : ''}
          </Text>
        </TouchableOpacity>
      )}

      <Text style={styles.postDate}>{formatTime(item.uploadedAt)}</Text>
    </View>
  );

  const renderHeader = () => (
    <>
      {/* Home Illustration */}
      <View style={styles.illustrationContainer}>
        <Image
          source={require('../../assets/images/home-illustration.png')}
          style={styles.illustration}
          resizeMode="contain"
        />
      </View>

      {/* Search Bar */}
      <TouchableOpacity
        style={styles.searchBarContainer}
        onPress={() => navigation.navigate('Search')}
      >
        <Icon name="search" size={20} color={colors.gray} />
        <Text style={styles.searchPlaceholder}>Search for accounts or posts...</Text>
      </TouchableOpacity>

      {/* Suggested Accounts Section */}
      {suggestedUsers.length > 0 && (
        <View style={styles.suggestedSection}>
          <Text style={styles.suggestedTitle}>Suggested Accounts</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.suggestedScroll}
          >
            {suggestedUsers.map((user) => (
              <TouchableOpacity
                key={user.uid}
                style={styles.suggestedUser}
                onPress={() => handleUserProfilePress(user)}
              >
                <View style={styles.suggestedAvatar}>
                  {user.photoURL ? (
                    <Image source={{ uri: user.photoURL }} style={styles.suggestedAvatarImage} />
                  ) : (
                    <Icon name="person" size={32} color={colors.gray} />
                  )}
                </View>
                <Text style={styles.suggestedUsername} numberOfLines={1}>
                  {user.userName}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor={colors.accent} barStyle="dark-content" />
      
      {notification && (
        <TouchableWithoutFeedback onPress={handleNotificationPress}>
          <Animated.View 
            style={[
              styles.notificationBanner,
              { transform: [{ translateY: notificationAnim }] }
            ]}
            {...panResponder.panHandlers}
          >
            <View style={styles.notificationContent}>
              <Icon name="notifications" size={20} color="#F4C430" />
              <Text style={styles.notificationText}>{notification.message}</Text>
            </View>
            <TouchableOpacity onPress={dismissNotification}>
              <Icon name="close" size={20} color={colors.dark} />
            </TouchableOpacity>
          </Animated.View>
        </TouchableWithoutFeedback>
      )}
      
      <View style={styles.header}>
        <Text style={styles.logo}>Swapism</Text>
        <View style={styles.headerIcons}>
          <TouchableOpacity 
            style={styles.headerIcon} 
            onPress={() => {
              navigation.navigate('Activity');
            }}
          >
            <Icon 
              name={hasUnreadNotifications ? "heart" : "heart-outline"} 
              size={28} 
              color={hasUnreadNotifications ? "#F4C430" : colors.dark} 
            />
            {hasUnreadNotifications && (
              <View style={styles.notificationDot} />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Suggested Accounts Section */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.loadingText}>Loading posts...</Text>
        </View>
      ) : posts.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Icon name="images-outline" size={64} color={colors.gray} />
          <Text style={styles.emptyText}>No posts yet</Text>
          <Text style={styles.emptySubtext}>Start following people or create your first post!</Text>
        </View>
      ) : (
        <FlatList
          data={posts}
          renderItem={renderPost}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={renderHeader}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={loadPosts} />
          }
        />
      )}

      <BottomNavBar navigation={navigation} activeRoute="Home" />
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
    position: 'relative',
  },
  notificationDot: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ff0000',
  },
  notificationBanner: {
    position: 'absolute',
    top: 50,
    left: spacing.md,
    right: spacing.md,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: 12,
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  notificationContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  notificationText: {
    color: colors.dark,
    fontFamily: fonts.body,
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  postContainer: {
    marginBottom: spacing.md,
    backgroundColor: '#fff',
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  userName: {
    fontFamily: fonts.header,
    fontSize: 14,
    fontWeight: '600',
    color: '#9abeaa',
  },
  postTime: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.gray,
  },
  postImage: {
    width: '100%',
    height: 400,
    backgroundColor: colors.secondary,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  leftActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  actionButton: {
    padding: 4,
  },
  likeCount: {
    fontFamily: fonts.body,
    fontSize: 14,
    fontWeight: '600',
    color: colors.dark,
    paddingHorizontal: spacing.md,
    marginBottom: 4,
  },
  captionContainer: {
    paddingHorizontal: spacing.md,
    marginBottom: 4,
  },
  caption: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.dark,
    lineHeight: 18,
  },
  captionUsername: {
    fontWeight: '600',
  },
  viewComments: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.gray,
    paddingHorizontal: spacing.md,
    paddingTop: 4,
  },
  postDate: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.gray,
    paddingHorizontal: spacing.md,
    marginTop: spacing.xs,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.gray,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyText: {
    fontFamily: fonts.header,
    fontSize: 18,
    fontWeight: '600',
    color: colors.dark,
    marginTop: spacing.md,
  },
  emptySubtext: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.gray,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  illustrationContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  illustration: {
    width: '100%',
    height: 200,
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  searchPlaceholder: {
    fontSize: 14,
    color: colors.gray,
    flex: 1,
  },
  suggestedSection: {
    backgroundColor: '#f5f3e4',
    borderBottomWidth: 1,
    borderBottomColor: '#dbdbdb',
    paddingVertical: spacing.md,
  },
  suggestedTitle: {
    fontFamily: fonts.header,
    fontSize: 16,
    fontWeight: '700',
    color: colors.dark,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  suggestedScroll: {
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },
  suggestedUser: {
    alignItems: 'center',
    width: 80,
  },
  suggestedAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#dbdbdb',
    marginBottom: spacing.xs,
    overflow: 'hidden',
  },
  suggestedAvatarImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  suggestedUsername: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.dark,
    textAlign: 'center',
  },
});