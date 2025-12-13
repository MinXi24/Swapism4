import { useFocusEffect } from '@react-navigation/native';
import { getAuth } from 'firebase/auth';
import { addDoc, arrayUnion, collection, deleteDoc, doc, getDoc, getDocs, getFirestore, query, updateDoc, where } from 'firebase/firestore';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from '../../assets/icons/icons';
import { colors, fonts, spacing } from '../../lib/theme';

export default function ActivityScreen({ navigation, route }) {
  const [activities, setActivities] = useState([]);
  const [followRequests, setFollowRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingRequest, setProcessingRequest] = useState(null);

  const auth = getAuth();
  const db = getFirestore();
  const user = auth.currentUser;

  // Clear unread notifications when screen is focused
  useFocusEffect(
    useCallback(() => {
      if (route.params?.clearNotifications) {
        // Notification cleared by visiting this screen
      }
    }, [route.params])
  );

  const loadActivities = async () => {
    try {
      const uid = user?.uid;
      if (!uid) {
        setLoading(false);
        return;
      }

      console.log('Loading activities on my posts...');
      
      // First, get all user's posts
      const postsQuery = query(
        collection(db, 'wardrobe-plug-fyp/user/images'),
        where('ownerUid', '==', uid)
      );
      const postsSnapshot = await getDocs(postsQuery);
      const userPostIds = postsSnapshot.docs.map(doc => doc.id);
      
      if (userPostIds.length === 0) {
        setActivities([]);
        setLoading(false);
        return;
      }

      const allActivities = [];

      // Get all likes on these posts
      const likesQuery = query(
        collection(db, 'likes'),
        where('postId', 'in', userPostIds.slice(0, 10)) // Firestore limit
      );
      const likesSnapshot = await getDocs(likesQuery);
      
      // Process likes
      const likesData = await Promise.all(
        likesSnapshot.docs.map(async (likeDoc) => {
          const likeData = likeDoc.data();
          const postDoc = postsSnapshot.docs.find(doc => doc.id === likeData.postId);
          const postData = postDoc ? postDoc.data() : null;
          
          return {
            id: likeDoc.id,
            type: 'like',
            ...likeData,
            post: postData ? {
              id: postDoc.id,
              ...postData
            } : null,
          };
        })
      );

      allActivities.push(...likesData);

      // Get all comments on these posts
      const commentsQuery = query(
        collection(db, 'comments'),
        where('postId', 'in', userPostIds.slice(0, 10))
      );
      const commentsSnapshot = await getDocs(commentsQuery);
      
      // Process comments
      const commentsData = await Promise.all(
        commentsSnapshot.docs.map(async (commentDoc) => {
          const commentData = commentDoc.data();
          const postDoc = postsSnapshot.docs.find(doc => doc.id === commentData.postId);
          const postData = postDoc ? postDoc.data() : null;
          
          return {
            id: commentDoc.id,
            type: 'comment',
            ...commentData,
            post: postData ? {
              id: postDoc.id,
              ...postData
            } : null,
          };
        })
      );

      allActivities.push(...commentsData);

      // Sort by created date
      allActivities.sort((a, b) => {
        const dateA = a.createdAt?.toDate?.() || new Date(0);
        const dateB = b.createdAt?.toDate?.() || new Date(0);
        return dateB - dateA;
      });
      
      console.log('Loaded activities:', allActivities.length);
      setActivities(allActivities);
    } catch (error) {
      console.error('Error loading activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadFollowRequests = async () => {
    try {
      const uid = user?.uid;
      if (!uid) return;

      const requestsQuery = query(
        collection(db, 'followRequests'),
        where('toUserId', '==', uid),
        where('status', '==', 'pending')
      );
      const requestsSnapshot = await getDocs(requestsQuery);
      
      const requestsData = await Promise.all(
        requestsSnapshot.docs.map(async (requestDoc) => {
          const requestData = requestDoc.data();
          
          // Get requester's photo
          let photoURL = null;
          try {
            const userDocRef = doc(db, 'users', requestData.fromUserId);
            const userDoc = await getDoc(userDocRef);
            if (userDoc.exists()) {
              photoURL = userDoc.data().photoURL || null;
            }
          } catch (err) {
            console.error('Error fetching user photo:', err);
          }
          
          return {
            id: requestDoc.id,
            ...requestData,
            photoURL,
          };
        })
      );
      
      setFollowRequests(requestsData);
    } catch (error) {
      console.error('Error loading follow requests:', error);
    }
  };

  const handleAcceptRequest = async (request) => {
    try {
      setProcessingRequest(request.id);
      
      const userDocRef = doc(db, 'users', user.uid);
      const requesterDocRef = doc(db, 'users', request.fromUserId);
      
      // Add to followers/following
      await updateDoc(userDocRef, {
        followers: arrayUnion(request.fromUserId)
      });
      await updateDoc(requesterDocRef, {
        following: arrayUnion(user.uid)
      });
      
      // Update request status
      await updateDoc(doc(db, 'followRequests', request.id), {
        status: 'accepted'
      });
      
      // Create notification for requester
      await addDoc(collection(db, 'notifications'), {
        userId: request.fromUserId,
        type: 'follow_accepted',
        message: `${user.displayName || 'Someone'} accepted your follow request`,
        read: false,
        createdAt: new Date(),
      });
      
      // Reload follow requests
      await loadFollowRequests();
    } catch (error) {
      console.error('Error accepting request:', error);
    } finally {
      setProcessingRequest(null);
    }
  };

  const handleRejectRequest = async (request) => {
    try {
      setProcessingRequest(request.id);
      
      // Delete the request
      await deleteDoc(doc(db, 'followRequests', request.id));
      
      // Reload follow requests
      await loadFollowRequests();
    } catch (error) {
      console.error('Error rejecting request:', error);
    } finally {
      setProcessingRequest(null);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadActivities();
      loadFollowRequests();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  const handlePostPress = (post) => {
    if (post) {
      navigation.navigate('PostDetails', { post });
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp?.toDate) return 'Recently';
    const date = timestamp.toDate();
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color={colors.dark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My post&apos;s activities</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : (
        <ScrollView style={styles.content}>
          {/* Follow Requests Section */}
          {followRequests.length > 0 && (
            <View style={styles.requestsSection}>
              <Text style={styles.sectionTitle}>Follow Requests</Text>
              {followRequests.map(request => (
                <View key={request.id} style={styles.requestOuterWrapper}>
                  <View style={styles.requestItem}>
                    <View style={styles.requestLeft}>
                      {request.photoURL ? (
                        <Image source={{ uri: request.photoURL }} style={styles.requestAvatar} />
                      ) : (
                        <Icon name="person-circle" size={50} color={colors.gray} />
                      )}
                      <View style={styles.requestInfo}>
                        <Text style={styles.requestName}>{request.fromUserName}</Text>
                        <Text style={styles.requestText}>wants to follow you</Text>
                      </View>
                    </View>
                    <TouchableOpacity 
                      onPress={() => navigation.navigate('UserProfile', { userId: request.fromUserId })}
                      style={styles.arrowButton}
                    >
                      <Icon name="chevron-forward" size={24} color={colors.gray} />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.requestActions}>
                    <TouchableOpacity 
                      style={[styles.requestButton, styles.acceptButton]}
                      onPress={() => handleAcceptRequest(request)}
                      disabled={processingRequest === request.id}
                    >
                      {processingRequest === request.id ? (
                        <ActivityIndicator size="small" color={colors.light} />
                      ) : (
                        <Text style={styles.acceptButtonText}>Accept</Text>
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.requestButton, styles.rejectButton]}
                      onPress={() => handleRejectRequest(request)}
                      disabled={processingRequest === request.id}
                    >
                      <Text style={styles.rejectButtonText}>Reject</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Activities Section */}
          {activities.length === 0 && followRequests.length === 0 ? (
            <View style={styles.emptyState}>
              <Icon name="heart-outline" size={64} color={colors.gray} />
              <Text style={styles.emptyText}>No activity yet</Text>
              <Text style={styles.emptySubtext}>
                When someone likes or comments on your posts, you&apos;ll see them here
              </Text>
            </View>
          ) : activities.length > 0 ? (
            <>
              <Text style={styles.sectionTitle}>Recent Activity</Text>
              {activities.map(activity => (
              <TouchableOpacity 
                key={activity.id} 
                style={styles.activityItem}
                onPress={() => handlePostPress(activity.post)}
              >
                {activity.post?.url && (
                  <Image 
                    source={{ uri: activity.post.url }} 
                    style={styles.activityImage} 
                  />
                )}
                <View style={styles.activityInfo}>
                  <Text style={styles.activityTitle}>
                    <Text 
                      style={styles.userName}
                      onPress={(e) => {
                        e.stopPropagation();
                        if (activity.userId) {
                          navigation.navigate('UserProfile', { 
                            userId: activity.userId,
                            username: activity.userName
                          });
                        }
                      }}
                    >
                      {activity.userName || 'Someone'}
                    </Text>
                    {activity.type === 'like' ? ' liked your post' : ' commented on your post'}
                  </Text>
                  {activity.type === 'comment' && activity.text && (
                    <Text style={styles.activityDescription} numberOfLines={2}>
                      {activity.text}
                    </Text>
                  )}
                  {activity.type === 'like' && activity.post?.title && (
                    <Text style={styles.activityDescription} numberOfLines={1}>
                      {activity.post.title}
                    </Text>
                  )}
                  <View style={styles.activityMeta}>
                    <Icon 
                      name={activity.type === 'like' ? 'heart' : 'chatbubble'} 
                      size={14} 
                      color={activity.type === 'like' ? '#ff4444' : colors.accent} 
                    />
                    <Text style={styles.activityTime}>
                      {formatDate(activity.createdAt)}
                    </Text>
                  </View>
                </View>
                <Icon name="chevron-forward" size={20} color={colors.gray} />
              </TouchableOpacity>
              ))}
            </>
          ) : null}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.secondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    paddingTop: 50,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    fontFamily: fonts.header,
    color: colors.dark,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
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
    borderBottomColor: colors.highlight,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.dark,
  },
  activeTabText: {
    color: colors.highlight,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg * 4,
    paddingHorizontal: spacing.lg,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.gray,
    marginTop: spacing.md,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.gray,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: fonts.semiBold,
    color: colors.dark,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
    marginHorizontal: spacing.lg,
  },
  requestsSection: {
    backgroundColor: colors.light,
    paddingBottom: spacing.md,
  },
  requestItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    backgroundColor: 'white',
    borderRadius: 8,
    marginBottom: spacing.sm,
  },
  requestLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  requestAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: spacing.md,
  },
  requestInfo: {
    flex: 1,
  },
  requestName: {
    fontSize: 16,
    fontFamily: fonts.semiBold,
    color: colors.dark,
    marginBottom: 2,
  },
  requestText: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: colors.gray,
  },
  requestOuterWrapper: {
    backgroundColor: '#F5F3E4',
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  requestActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  arrowButton: {
    padding: spacing.xs,
  },
  requestButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptButton: {
    backgroundColor: colors.accent,
  },
  acceptButtonText: {
    fontSize: 14,
    fontFamily: fonts.semiBold,
    color: colors.dark,
  },
  rejectButton: {
    backgroundColor: '#FFD75C',
  },
  rejectButtonText: {
    fontSize: 14,
    fontFamily: fonts.semiBold,
    color: colors.dark,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  activityImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: spacing.md,
  },
  activityInfo: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.dark,
    marginBottom: 4,
  },
  userName: {
    fontWeight: '700',
    color: colors.dark,
  },
  activityDescription: {
    fontSize: 14,
    color: colors.gray,
    marginBottom: 4,
  },
  activityMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  activityTime: {
    fontSize: 12,
    color: colors.gray,
  },
});
