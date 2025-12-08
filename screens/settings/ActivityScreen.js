
import { useFocusEffect } from '@react-navigation/native';
import { getAuth } from 'firebase/auth';
import { collection, getDocs, getFirestore, query, where } from 'firebase/firestore';
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
import BottomNavBar from '../../components/BottomNavBar';
import { colors, fonts, spacing } from '../../lib/theme';

export default function ActivityScreen({ navigation }) {
  const [likesOnMyPosts, setLikesOnMyPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  const auth = getAuth();
  const db = getFirestore();
  const user = auth.currentUser;

  const loadLikesOnMyPosts = async () => {
    try {
      const uid = user?.uid;
      if (!uid) {
        setLoading(false);
        return;
      }

      console.log('Loading likes on my posts...');
      
      // First, get all user's posts
      const postsQuery = query(
        collection(db, 'wardrobe-plug-fyp/user/images'),
        where('ownerUid', '==', uid)
      );
      const postsSnapshot = await getDocs(postsQuery);
      const userPostIds = postsSnapshot.docs.map(doc => doc.id);
      
      if (userPostIds.length === 0) {
        setLikesOnMyPosts([]);
        setLoading(false);
        return;
      }

      // Get all likes on these posts
      const likesQuery = query(
        collection(db, 'likes'),
        where('postId', 'in', userPostIds.slice(0, 10)) // Firestore limit
      );
      const likesSnapshot = await getDocs(likesQuery);
      
      // Enrich likes with post data
      const likesData = await Promise.all(
        likesSnapshot.docs.map(async (likeDoc) => {
          const likeData = likeDoc.data();
          const postDoc = postsSnapshot.docs.find(doc => doc.id === likeData.postId);
          const postData = postDoc ? postDoc.data() : null;
          
          return {
            id: likeDoc.id,
            ...likeData,
            post: postData ? {
              id: postDoc.id,
              ...postData
            } : null,
          };
        })
      );

      // Sort by created date
      likesData.sort((a, b) => {
        const dateA = a.createdAt?.toDate?.() || new Date(0);
        const dateB = b.createdAt?.toDate?.() || new Date(0);
        return dateB - dateA;
      });
      
      console.log('Loaded likes:', likesData.length);
      setLikesOnMyPosts(likesData);
    } catch (error) {
      console.error('Error loading likes:', error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadLikesOnMyPosts();
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
        <Text style={styles.headerTitle}>Likes on My Posts</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : (
        <ScrollView style={styles.content}>
          {likesOnMyPosts.length === 0 ? (
            <View style={styles.emptyState}>
              <Icon name="heart-outline" size={64} color={colors.gray} />
              <Text style={styles.emptyText}>No likes yet</Text>
              <Text style={styles.emptySubtext}>
                When someone likes your posts, you&apos;ll see them here
              </Text>
            </View>
          ) : (
            likesOnMyPosts.map(like => (
              <TouchableOpacity 
                key={like.id} 
                style={styles.activityItem}
                onPress={() => handlePostPress(like.post)}
              >
                {like.post?.url && (
                  <Image 
                    source={{ uri: like.post.url }} 
                    style={styles.activityImage} 
                  />
                )}
                <View style={styles.activityInfo}>
                  <Text style={styles.activityTitle}>
                    <Text style={styles.userName}>{like.userName || 'Someone'}</Text>
                    {' liked your post'}
                  </Text>
                  {like.post?.title && (
                    <Text style={styles.activityDescription} numberOfLines={1}>
                      {like.post.title}
                    </Text>
                  )}
                  <View style={styles.activityMeta}>
                    <Icon name="heart" size={14} color="#ff4444" />
                    <Text style={styles.activityTime}>
                      {formatDate(like.createdAt)}
                    </Text>
                  </View>
                </View>
                <Icon name="chevron-forward" size={20} color={colors.gray} />
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}

      <BottomNavBar navigation={navigation} activeRoute="Profile" />
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
    marginTop: spacing.sm,
    textAlign: 'center',
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
