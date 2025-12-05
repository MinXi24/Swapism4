import { getAuth } from 'firebase/auth';
import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, getFirestore, query, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import {
    Image,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import Icon from '../../assets/icons/icons';
import { colors, spacing } from '../../lib/theme';

export default function PostDetailsScreen({ route, navigation }) {
  const { post } = route.params;
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likeId, setLikeId] = useState(null);

  const db = getFirestore();
  const auth = getAuth();

  useEffect(() => {
    loadComments();
    checkIfLiked();
    logViewActivity();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadComments = async () => {
    try {
      const q = query(
        collection(db, 'comments'),
        where('postId', '==', post.id)
      );
      const querySnapshot = await getDocs(q);
      const commentsData = await Promise.all(
        querySnapshot.docs.map(async (docSnapshot) => {
          const commentData = docSnapshot.data();
          
          // Fetch username from users collection
          let userName = commentData.userName || 'Anonymous';
          if (commentData.userId) {
            try {
              const userDoc = await getDoc(doc(db, 'users', commentData.userId));
              if (userDoc.exists()) {
                userName = userDoc.data().displayName || userDoc.data().username || userName;
              }
            } catch (err) {
              console.error('Error fetching user:', err);
            }
          }
          
          return {
            id: docSnapshot.id,
            ...commentData,
            userName,
          };
        })
      );
      
      const sortedComments = commentsData.sort((a, b) => {
        const dateA = a.createdAt?.toDate?.() || new Date(0);
        const dateB = b.createdAt?.toDate?.() || new Date(0);
        return dateB - dateA;
      });
      
      setComments(sortedComments);
    } catch (error) {
      console.error('Error loading comments:', error);
    }
  };

  const checkIfLiked = async () => {
    try {
      const q = query(
        collection(db, 'likes'),
        where('userId', '==', auth.currentUser.uid),
        where('postId', '==', post.id)
      );
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        setLiked(true);
        setLikeId(querySnapshot.docs[0].id);
      }
    } catch (error) {
      console.error('Error checking like status:', error);
    }
  };

  const logViewActivity = async () => {
    try {
      // Check if already viewed recently (within last hour)
      const oneHourAgo = new Date(Date.now() - 3600000);
      const q = query(
        collection(db, 'activity'),
        where('userId', '==', auth.currentUser.uid),
        where('postId', '==', post.id),
        where('type', '==', 'viewed')
      );
      const querySnapshot = await getDocs(q);
      
      // Only log if not viewed recently
      const recentView = querySnapshot.docs.find(doc => {
        const timestamp = doc.data().timestamp?.toDate?.();
        return timestamp && timestamp > oneHourAgo;
      });

      if (!recentView) {
        await addDoc(collection(db, 'activity'), {
          userId: auth.currentUser.uid,
          postId: post.id,
          post: post,
          type: 'viewed',
          timestamp: new Date(),
        });
      }
    } catch (error) {
      console.error('Error logging view activity:', error);
    }
  };

  const handleLike = async () => {
    try {
      if (liked && likeId) {
        // Unlike
        await deleteDoc(doc(db, 'likes', likeId));
        // Remove from activity
        const activityQuery = query(
          collection(db, 'activity'),
          where('userId', '==', auth.currentUser.uid),
          where('postId', '==', post.id),
          where('type', '==', 'liked')
        );
        const activitySnapshot = await getDocs(activityQuery);
        activitySnapshot.docs.forEach(async (docSnapshot) => {
          await deleteDoc(doc(db, 'activity', docSnapshot.id));
        });
        setLiked(false);
        setLikeId(null);
      } else {
        // Like
        const likeDoc = await addDoc(collection(db, 'likes'), {
          userId: auth.currentUser.uid,
          postId: post.id,
          createdAt: new Date(),
        });
        // Add to activity
        await addDoc(collection(db, 'activity'), {
          userId: auth.currentUser.uid,
          postId: post.id,
          post: post,
          type: 'liked',
          timestamp: new Date(),
        });
        setLiked(true);
        setLikeId(likeDoc.id);
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      alert('Failed to update like status');
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    setLoading(true);
    try {
      await addDoc(collection(db, 'comments'), {
        postId: post.id,
        userId: auth.currentUser.uid,
        userName: auth.currentUser.displayName || 'Anonymous',
        text: newComment.trim(),
        createdAt: new Date(),
      });
      setNewComment('');
      loadComments();
    } catch (error) {
      console.error('Error adding comment:', error);
      alert('Failed to add comment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="arrow-back" size={24} color={colors.dark} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Post Details</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Post Image */}
        <Image source={{ uri: post.url }} style={styles.postImage} />

        {/* Post Info */}
        <View style={styles.postInfo}>
          <View style={styles.userInfo}>
            <Icon name="person-circle" size={40} color={colors.accent} />
            <View style={styles.userDetails}>
              <Text style={styles.userName}>{post.userName || 'User'}</Text>
              <Text style={styles.postDate}>
                {post.uploadedAt?.toDate?.().toLocaleDateString() || 'Recently'}
              </Text>
            </View>
          </View>

          {post.title && <Text style={styles.postTitle}>{post.title}</Text>}
          {post.description && (
            <Text style={styles.postDescription}>{post.description}</Text>
          )}

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity style={styles.actionButton} onPress={handleLike}>
              <Icon 
                name={liked ? "heart" : "heart-outline"} 
                size={24} 
                color={liked ? "#ff4444" : colors.dark} 
              />
              <Text style={[styles.actionText, liked && styles.likedText]}>
                {liked ? 'Liked' : 'Like'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
              <Icon name="chatbubble-outline" size={24} color={colors.dark} />
              <Text style={styles.actionText}>{comments.length} Comments</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
              <Icon name="share-social-outline" size={24} color={colors.dark} />
              <Text style={styles.actionText}>Share</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Comments Section */}
        <View style={styles.commentsSection}>
          <Text style={styles.commentsTitle}>Comments</Text>
          {comments.length === 0 ? (
            <Text style={styles.noComments}>No comments yet. Be the first to comment!</Text>
          ) : (
            comments.map(comment => (
              <View key={comment.id} style={styles.comment}>
                <Icon name="person-circle" size={32} color={colors.accent} />
                <View style={styles.commentContent}>
                  <Text style={styles.commentUser}>{comment.userName}</Text>
                  <Text style={styles.commentText}>{comment.text}</Text>
                  <Text style={styles.commentDate}>
                    {comment.createdAt?.toDate?.().toLocaleDateString() || 'Just now'}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Add Comment */}
      <View style={styles.addCommentContainer}>
        <TextInput
          style={styles.commentInput}
          placeholder="Add a comment..."
          value={newComment}
          onChangeText={setNewComment}
          multiline
        />
        <TouchableOpacity
          style={[styles.sendButton, !newComment.trim() && styles.sendButtonDisabled]}
          onPress={handleAddComment}
          disabled={loading || !newComment.trim()}
        >
          <Icon
            name="send"
            size={20}
            color={newComment.trim() ? colors.accent : colors.gray}
          />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.dark,
  },
  postImage: {
    width: '100%',
    height: 400,
    resizeMode: 'cover',
  },
  postInfo: {
    padding: spacing.md,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  userDetails: {
    marginLeft: spacing.sm,
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.dark,
  },
  postDate: {
    fontSize: 12,
    color: colors.gray,
    marginTop: 2,
  },
  postTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.dark,
    marginBottom: spacing.sm,
  },
  postDescription: {
    fontSize: 14,
    color: colors.dark,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionText: {
    fontSize: 14,
    color: colors.dark,
    marginLeft: 4,
  },
  likedText: {
    color: '#ff4444',
  },
  commentsSection: {
    padding: spacing.md,
    paddingBottom: 100,
  },
  commentsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.dark,
    marginBottom: spacing.md,
  },
  noComments: {
    fontSize: 14,
    color: colors.gray,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
  comment: {
    flexDirection: 'row',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  commentContent: {
    flex: 1,
    backgroundColor: '#f8f8f8',
    padding: spacing.sm,
    borderRadius: 12,
  },
  commentUser: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.dark,
    marginBottom: 4,
  },
  commentText: {
    fontSize: 14,
    color: colors.dark,
    lineHeight: 18,
  },
  commentDate: {
    fontSize: 11,
    color: colors.gray,
    marginTop: 4,
  },
  addCommentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    backgroundColor: '#fff',
  },
  commentInput: {
    flex: 1,
    backgroundColor: '#f8f8f8',
    borderRadius: 20,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginRight: spacing.sm,
    maxHeight: 100,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});
