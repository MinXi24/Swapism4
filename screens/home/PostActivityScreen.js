import { useFocusEffect } from '@react-navigation/native';
import { getAuth } from 'firebase/auth';
import { collection, doc, getDoc, getDocs, getFirestore, query, where } from 'firebase/firestore';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from '../../assets/icons/icons';
import { colors, fonts, spacing } from '../../lib/theme';

export default function PostActivityScreen({ navigation }) {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  const auth = getAuth();
  const db = getFirestore();
  const user = auth.currentUser;

  const loadActivities = async () => {
    try {
      const uid = user?.uid;
      if (!uid) {
        setLoading(false);
        return;
      }

      console.log('Loading post activities...');
      
      // Get all user's posts
      const postsQuery = query(
        collection(db, 'wardrobe-plug-fyp/user/images'),
        where('ownerUid', '==', uid)
      );
      const postsSnapshot = await getDocs(postsQuery);
      
      if (postsSnapshot.empty) {
        setActivities([]);
        setLoading(false);
        return;
      }

      const postIds = postsSnapshot.docs.map(doc => doc.id);
      const allActivities = [];

      // Get likes on user's posts
      for (const postId of postIds) {
        const likesQuery = query(
          collection(db, 'likes'),
          where('postId', '==', postId)
        );
        const likesSnapshot = await getDocs(likesQuery);
        
        for (const likeDoc of likesSnapshot.docs) {
          const likeData = likeDoc.data();
          
          // Skip if user liked their own post
          if (likeData.userId === uid) continue;
          
          try {
            // Get user info
            const userDoc = await getDoc(doc(db, 'users', likeData.userId));
            // Get post info
            const postDoc = await getDoc(doc(db, 'wardrobe-plug-fyp/user/images', postId));
            
            if (userDoc.exists() && postDoc.exists()) {
              const userData = userDoc.data();
              const postData = postDoc.data();
              
              allActivities.push({
                id: likeDoc.id,
                type: 'like',
                userId: likeData.userId,
                username: userData.username || 'Unknown',
                userPhoto: userData.photoURL,
                postId: postId,
                postImage: postData.url,
                postTitle: postData.title || 'Cool fit',
                createdAt: likeData.createdAt,
              });
            }
          } catch (err) {
            console.error('Error fetching like data:', err);
          }
        }

        // Get comments on user's posts
        const commentsQuery = query(
          collection(db, 'comments'),
          where('postId', '==', postId)
        );
        const commentsSnapshot = await getDocs(commentsQuery);
        
        for (const commentDoc of commentsSnapshot.docs) {
          const commentData = commentDoc.data();
          
          // Skip if user commented on their own post
          if (commentData.userId === uid) continue;
          
          try {
            // Get user info
            const userDoc = await getDoc(doc(db, 'users', commentData.userId));
            // Get post info
            const postDoc = await getDoc(doc(db, 'wardrobe-plug-fyp/user/images', postId));
            
            if (userDoc.exists() && postDoc.exists()) {
              const userData = userDoc.data();
              const postData = postDoc.data();
              
              allActivities.push({
                id: commentDoc.id,
                type: 'comment',
                userId: commentData.userId,
                username: userData.username || 'Unknown',
                userPhoto: userData.photoURL,
                postId: postId,
                postImage: postData.url,
                postTitle: postData.title || 'Cool fit',
                commentText: commentData.text,
                createdAt: commentData.createdAt,
              });
            }
          } catch (err) {
            console.error('Error fetching comment data:', err);
          }
        }
      }

      // Sort by date
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

  useFocusEffect(
    useCallback(() => {
      loadActivities();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  const getTimeAgo = (timestamp) => {
    if (!timestamp) return '';
    
    const date = timestamp.toDate?.() || new Date(timestamp);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);
    
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return `${Math.floor(seconds / 604800)}w ago`;
  };

  const handleActivityPress = (activity) => {
    navigation.navigate('PostDetails', { 
      post: { 
        id: activity.postId,
        url: activity.postImage,
        title: activity.postTitle
      } 
    });
  };

  const handleUserPress = (userId, username) => {
    navigation.navigate('UserProfile', { userId, username });
  };

  const renderActivityItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.activityItem}
      onPress={() => handleActivityPress(item)}
    >
      <TouchableOpacity onPress={() => handleUserPress(item.userId, item.username)}>
        {item.userPhoto ? (
          <Image source={{ uri: item.userPhoto }} style={styles.userPhoto} />
        ) : (
          <View style={styles.userPhotoPlaceholder}>
            <Icon name="person" size={24} color="#999" />
          </View>
        )}
      </TouchableOpacity>
      
      <View style={styles.activityContent}>
        <Text style={styles.activityText}>
          <Text style={styles.username}>{item.username}</Text>
          {item.type === 'like' ? ' liked your post' : ' commented on your post'}
        </Text>
        <Text style={styles.postTitle}>{item.postTitle}</Text>
        {item.type === 'comment' && item.commentText && (
          <Text style={styles.commentText}>{item.commentText}</Text>
        )}
        <View style={styles.timeContainer}>
          <Icon 
            name={item.type === 'like' ? 'heart' : 'chatbubble'} 
            size={12} 
            color={item.type === 'like' ? '#ff4444' : '#999'} 
          />
          <Text style={styles.timeText}>{getTimeAgo(item.createdAt)}</Text>
        </View>
      </View>

      <Image source={{ uri: item.postImage }} style={styles.postThumbnail} />
      
      <Icon name="chevron-forward" size={20} color="#999" />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#fff" barStyle="dark-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My post&apos;s activities</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Recent Activity Section */}
      {!loading && activities.length > 0 && (
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
        </View>
      )}

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : activities.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Icon name="notifications-outline" size={64} color="#999" />
          <Text style={styles.emptyText}>No activity yet</Text>
          <Text style={styles.emptySubtext}>
            When someone likes or comments on your posts, you&apos;ll see it here
          </Text>
        </View>
      ) : (
        <FlatList
          data={activities}
          renderItem={renderActivityItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
        />
      )}
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#dbdbdb',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: fonts.semiBold,
    color: '#000',
  },
  sectionHeader: {
    backgroundColor: '#F5F5F5',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: fonts.semiBold,
    color: '#333',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    backgroundColor: '#fff',
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  listContainer: {
    paddingBottom: spacing.lg,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  userPhoto: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: spacing.md,
  },
  userPhotoPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: spacing.md,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  activityContent: {
    flex: 1,
    marginRight: spacing.sm,
  },
  activityText: {
    fontSize: 15,
    fontFamily: fonts.regular,
    color: '#000',
    marginBottom: 2,
  },
  username: {
    fontWeight: '600',
    fontFamily: fonts.semiBold,
    color: '#000',
  },
  postTitle: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: '#666',
    marginBottom: 2,
  },
  commentText: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: '#666',
    marginBottom: 4,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeText: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: '#999',
  },
  postThumbnail: {
    width: 50,
    height: 50,
    borderRadius: 4,
    marginRight: spacing.sm,
  },
});
