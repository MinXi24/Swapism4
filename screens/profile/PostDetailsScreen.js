import { getAuth } from 'firebase/auth';
import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, getFirestore, query, updateDoc, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import {
  Alert,
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
  const [currentSwapStatus, setCurrentSwapStatus] = useState(post.swapStatus);
  const [likes, setLikes] = useState([]);
  const [showLikes, setShowLikes] = useState(false);
  const [userPhotoURL, setUserPhotoURL] = useState(post.userPhotoURL || null);
  const [editingComment, setEditingComment] = useState(null);

  const db = getFirestore();
  const auth = getAuth();

  useEffect(() => {
    loadComments();
    checkIfLiked();
    loadLikes();
    logViewActivity();
    loadUserPhoto();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadUserPhoto = async () => {
    // If we already have the photo URL, no need to fetch
    if (post.userPhotoURL) {
      setUserPhotoURL(post.userPhotoURL);
      return;
    }

    // Fetch the user's photo from the users collection
    try {
      if (post.ownerUid) {
        const userDoc = await getDoc(doc(db, 'users', post.ownerUid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setUserPhotoURL(userData.photoURL || null);
        }
      }
    } catch (error) {
      console.error('Error loading user photo:', error);
    }
  };

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
          
          // Fetch username and photo from users collection
          let userName = commentData.userName || 'Anonymous';
          let userPhoto = null;
          if (commentData.userId) {
            try {
              const userDoc = await getDoc(doc(db, 'users', commentData.userId));
              if (userDoc.exists()) {
                const userData = userDoc.data();
                userName = userData.displayName || userData.username || userName;
                userPhoto = userData.photoURL || null;
              }
            } catch (err) {
              console.error('Error fetching user:', err);
            }
          }
          
          return {
            id: docSnapshot.id,
            ...commentData,
            userName,
            userPhoto,
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

  const handleDeleteComment = async (commentId, commentUserId) => {
    if (commentUserId !== auth.currentUser.uid) {
      Alert.alert('Error', 'You can only delete your own comments');
      return;
    }

    Alert.alert(
      'Delete Comment',
      'Are you sure you want to delete this comment?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'comments', commentId));
              loadComments();
            } catch (error) {
              console.error('Error deleting comment:', error);
              Alert.alert('Error', 'Failed to delete comment');
            }
          }
        }
      ]
    );
  };

  // --- NEW: REPORT COMMENT FUNCTIONS ---
  const handleReportComment = (comment) => {
    // Prevent reporting own comments (though UI hides button, good for safety)
    if (comment.userId === auth.currentUser.uid) return;

    Alert.alert(
      'Report Comment',
      'Please select a reason for reporting this comment:',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Spam or Scam', 
          onPress: () => submitCommentReport(comment, 'Spam') 
        },
        { 
          text: 'Inappropriate Content', 
          onPress: () => submitCommentReport(comment, 'Inappropriate Content') 
        },
        { 
          text: 'Harassment or Bullying', 
          onPress: () => submitCommentReport(comment, 'Harassment') 
        }
      ]
    );
  };

  const submitCommentReport = async (comment, reason) => {
    setLoading(true);
    try {
      // 1. Get Reporter User Info to save with report
      const reporterId = auth.currentUser.uid;
      const reporterDoc = await getDoc(doc(db, 'users', reporterId));
      const reporterName = reporterDoc.exists() ? (reporterDoc.data().username || reporterDoc.data().displayName) : 'Unknown';

      // 2. Create the Report Object for 'reported_comments' collection
      const reportData = {
        type: 'comment', 
        reason: reason,
        status: 'pending', // pending, reviewed, resolved
        createdAt: new Date(),
        
        // Target (The Comment) Details
        targetId: comment.id,
        targetContent: comment.text,
        targetOwnerId: comment.userId,
        targetOwnerName: comment.userName,
        
        // Context (The Post) Details
        postId: post.id,
        postTitle: post.title || 'Untitled Post',
        
        // Reporter Details
        reporterId: reporterId,
        reporterName: reporterName,
      };

      await addDoc(collection(db, 'reported_comments'), reportData);

      Alert.alert(
        'Report Submitted', 
        'Thank you for your report. We will review this comment shortly.'
      );

    } catch (error) {
      console.error('Error reporting comment:', error);
      Alert.alert('Error', 'Failed to submit report. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  // -------------------------------------

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

  const loadLikes = async () => {
    try {
      const q = query(
        collection(db, 'likes'),
        where('postId', '==', post.id)
      );
      const querySnapshot = await getDocs(q);
      const likesData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setLikes(likesData);
    } catch (error) {
      console.error('Error loading likes:', error);
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
        // Get username from Firestore
        let userName = auth.currentUser.displayName || auth.currentUser.email;
        try {
          const userDocRef = doc(db, 'users', auth.currentUser.uid);
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
            userName = userDoc.data().username || userName;
          }
        } catch (err) {
          console.error('Error fetching username:', err);
        }

        // Like
        const likeDoc = await addDoc(collection(db, 'likes'), {
          userId: auth.currentUser.uid,
          userName: userName,
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
      // Reload likes to update the list
      loadLikes();
    } catch (error) {
      console.error('Error toggling like:', error);
      alert('Failed to update like status');
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    setLoading(true);
    try {
      if (editingComment) {
        // Update the existing comment
        await updateDoc(doc(db, 'comments', editingComment.id), {
          text: newComment.trim(),
          updatedAt: new Date(),
        });
        setEditingComment(null);
      } else {
        // Get username from Firestore
        let userName = auth.currentUser.displayName || 'Anonymous';
        try {
          const userDocRef = doc(db, 'users', auth.currentUser.uid);
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
            userName = userDoc.data().username || userName;
          }
        } catch (err) {
          console.error('Error fetching username:', err);
        }

        await addDoc(collection(db, 'comments'), {
          postId: post.id,
          userId: auth.currentUser.uid,
          userName: userName,
          text: newComment.trim(),
          createdAt: new Date(),
        });

        // Add to activity
        await addDoc(collection(db, 'activity'), {
          userId: auth.currentUser.uid,
          postId: post.id,
          post: post,
          type: 'commented',
          timestamp: new Date(),
        });

        // Send notification to post owner
        if (post.ownerUid !== auth.currentUser.uid) {
          await addDoc(collection(db, 'notifications'), {
            userId: post.ownerUid,
            type: 'comment',
            message: `${userName} commented on your post`,
            postId: post.id,
            read: false,
            createdAt: new Date(),
          });
        }
      }

      setNewComment('');
      loadComments();
    } catch (error) {
      console.error('Error adding/editing comment:', error);
      alert('Failed to add/edit comment');
    } finally {
      setLoading(false);
    }
  };

  const handleEditComment = (comment) => {
    setEditingComment(comment);
    setNewComment(comment.text);
  };

  const handleSwapNow = () => {
    Alert.alert(
      'Request Swap',
      `Do you want to request a swap for "${post.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Request Swap',
          onPress: () => {
            Alert.alert('Swap Request Sent', 'The owner will be notified of your swap request.');
            // TODO: Implement actual swap request logic
          }
        }
      ]
    );
  };

  const handleChangeSwapStatus = async () => {
    const newStatus = currentSwapStatus === 'available' ? 'swappedOut' : 'available';
    
    Alert.alert(
      'Change Swap Status',
      `Mark this item as ${newStatus === 'available' ? 'Available for Swap' : 'Swapped Out'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              const postRef = doc(db, 'wardrobe-plug-fyp/user/images', post.id);
              await updateDoc(postRef, {
                swapStatus: newStatus
              });
              setCurrentSwapStatus(newStatus);
              post.swapStatus = newStatus; // Update the post object
              Alert.alert('Success', `Status changed to ${newStatus === 'available' ? 'Available' : 'Swapped Out'}`);
            } catch (error) {
              console.error('Error updating swap status:', error);
              Alert.alert('Error', 'Failed to update swap status');
            }
          }
        }
      ]
    );
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
            <View style={styles.userAvatar}>
              {userPhotoURL ? (
                <Image source={{ uri: userPhotoURL }} style={styles.userAvatarImage} />
              ) : (
                <Icon name="person-circle" size={40} color={colors.accent} />
              )}
            </View>
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

          {/* Swap Info Badge (if forSwap) */}
          {post.postType === 'forSwap' && (
            <View style={styles.swapInfoBadge}>
              <Icon name="swap-horizontal" size={20} color={colors.accent} />
              <Text style={styles.swapInfoText}>
                Available for Swap • Status: {currentSwapStatus === 'available' ? 'Available' : 'Swapped Out'}
              </Text>
            </View>
          )}

          {/* Swap Action Buttons */}
          {post.postType === 'forSwap' && (
            <View style={styles.swapActionsContainer}>
              {post.ownerUid !== auth.currentUser.uid ? (
                // Show "Swap Now" button for non-owners if available
                currentSwapStatus === 'available' && (
                  <TouchableOpacity 
                    style={styles.swapNowButton}
                    onPress={handleSwapNow}
                  >
                    <Icon name="swap-horizontal" size={20} color="#fff" />
                    <Text style={styles.swapNowButtonText}>Swap Now</Text>
                  </TouchableOpacity>
                )
              ) : (
                // Show status change button for owners
                <TouchableOpacity 
                  style={styles.changeStatusButton}
                  onPress={handleChangeSwapStatus}
                >
                  <Icon name="settings-outline" size={20} color={colors.dark} />
                  <Text style={styles.changeStatusButtonText}>
                    Change to {currentSwapStatus === 'available' ? 'Swapped Out' : 'Available'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity style={styles.actionButton} onPress={handleLike}>
              <Icon 
                name={liked ? "heart" : "heart-outline"} 
                size={24} 
                color={liked ? "#9ABEAA" : colors.dark} 
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

          {/* Likes Section */}
          {likes.length > 0 && (
            <View style={styles.likesSection}>
              <TouchableOpacity 
                style={styles.likesHeader}
                onPress={() => setShowLikes(!showLikes)}
              >
                <Icon name="heart" size={20} color="#9ABEAA" />
                <Text style={styles.likesCount}>
                  {likes.length} {likes.length === 1 ? 'like' : 'likes'}
                </Text>
                <Icon 
                  name={showLikes ? "chevron-up" : "chevron-down"} 
                  size={20} 
                  color={colors.gray} 
                />
              </TouchableOpacity>
              
              {showLikes && (
                <View style={styles.likesList}>
                  {likes.map(like => (
                    <View key={like.id} style={styles.likeItem}>
                      <Icon name="person-circle" size={32} color={colors.accent} />
                      <Text style={styles.likeUserName}>{like.userName || 'User'}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}
        </View>

        {/* Comments Section */}
        <View style={styles.commentsSection}>
          <Text style={styles.commentsTitle}>Comments</Text>
          {comments.length === 0 ? (
            <Text style={styles.noComments}>No comments yet. Be the first to comment!</Text>
          ) : (
            comments.map(comment => (
              <View key={comment.id} style={styles.comment}>
                {comment.userPhoto ? (
                  <Image source={{ uri: comment.userPhoto }} style={styles.commentUserImage} />
                ) : (
                  <Icon name="person-circle" size={32} color={colors.accent} />
                )}
                <View style={styles.commentContent}>
                  <View style={styles.commentHeader}>
                    <Text style={styles.commentUser}>{comment.userName}</Text>
                    
                    {/* CHANGED: Logic to show Edit/Delete for owner, or Report for others */}
                    {comment.userId === auth.currentUser.uid ? (
                      <View style={{ flexDirection: 'row' }}>
                        <TouchableOpacity
                          style={styles.editCommentButton}
                          onPress={() => handleEditComment(comment)}
                        >
                          <Icon name="create-outline" size={16} color="#9ABEAA" />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.deleteCommentButton}
                          onPress={() => handleDeleteComment(comment.id, comment.userId)}
                        >
                          <Icon name="trash-outline" size={16} color="#9ABEAA" />
                        </TouchableOpacity>
                      </View>
                    ) : (
                        /* Report Button for comments not owned by user */
                        <TouchableOpacity
                            style={styles.reportCommentButton}
                            onPress={() => handleReportComment(comment)}
                        >
                            <Icon name="flag-outline" size={16} color={colors.gray} />
                        </TouchableOpacity>
                    )}

                  </View>
                  <Text style={styles.commentText}>{comment.text}</Text>
                  <Text style={styles.commentDate}>
                    {comment.createdAt?.toDate?.().toLocaleDateString() || 'Just now'}
                    {comment.updatedAt ? ' (edited)' : ''}
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
          placeholderTextColor="#585555ff"
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
            size={25}
            color="#9ABEAA"
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
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    marginRight: spacing.sm,
    backgroundColor: colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userAvatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
  swapInfoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: '#e8f5e9',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    marginBottom: spacing.md,
  },
  swapInfoText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.dark,
  },
  swapActionsContainer: {
    marginBottom: spacing.md,
  },
  swapNowButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.accent,
    paddingVertical: spacing.md,
    borderRadius: 8,
  },
  swapNowButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  changeStatusButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: '#f0f0f0',
    paddingVertical: spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.dark,
  },
  changeStatusButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.dark,
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
    color: '#9ABEAA',
  },
  likesSection: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  likesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  likesCount: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.dark,
    flex: 1,
  },
  likesList: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  likeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  likeUserName: {
    fontSize: 14,
    color: colors.dark,
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
  commentUserImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  commentContent: {
    flex: 1,
    backgroundColor: '#f8f8f8',
    padding: spacing.sm,
    borderRadius: 12,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  commentUser: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.dark,
    flex: 1,
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
  deleteCommentButton: {
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editCommentButton: {
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  // ADDED: Style for the new report button
  reportCommentButton: {
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addCommentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#ffffffff',
    backgroundColor: '#fff',
  },
  commentInput: {
    flex: 1,
    backgroundColor: '#F5F3E4',
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
    backgroundColor: '#ffffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});