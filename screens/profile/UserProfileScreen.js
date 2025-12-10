import { useFocusEffect } from '@react-navigation/native';
import { getAuth } from 'firebase/auth';
import { addDoc, arrayRemove, arrayUnion, collection, doc, getDoc, getDocs, getFirestore, query, updateDoc, where } from 'firebase/firestore';
import { useCallback, useState } from 'react';
import {
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
  });
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  const db = getFirestore();
  const auth = getAuth();
  const currentUser = auth.currentUser;

  const logProfileView = async () => {
    if (!currentUser || currentUser.uid === userId) return;

    try {
      // Get current user's username
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

      // Create notification for profile owner
      await addDoc(collection(db, 'notifications'), {
        userId: userId,
        type: 'profile_view',
        message: `${viewerName} viewed your profile`,
        viewerId: currentUser.uid,
        viewerName: viewerName,
        read: false,
        createdAt: new Date(),
      });
    } catch (error) {
      console.error('Error logging profile view:', error);
    }
  };

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
        });
        
        // Load followers and following counts
        const followers = userData.followers || [];
        const following = userData.following || [];
        setStats(prev => ({
          ...prev,
          followers: followers.length,
          following: following.length,
        }));
        
        // Check if current user is following this user
        if (currentUser) {
          setIsFollowing(followers.includes(currentUser.uid));
        }
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };

  const loadUserPosts = async () => {
    try {
      setLoading(true);
      await loadUserProfile();
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
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadUserPosts();
      logProfileView();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  const handlePostPress = (post) => {
    navigation.navigate('PostDetails', { post });
  };

  const handleFollowToggle = async () => {
    if (!currentUser) {
      Alert.alert('Error', 'Please log in to follow users');
      return;
    }

    if (isFollowing) {
      // Show unfollow confirmation
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
                
                // Remove from target user's followers
                await updateDoc(userDocRef, {
                  followers: arrayRemove(currentUser.uid)
                });
                
                // Remove from current user's following
                await updateDoc(currentUserDocRef, {
                  following: arrayRemove(userId)
                });
                
                setIsFollowing(false);
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
    } else {
      // Follow
      try {
        setFollowLoading(true);
        const userDocRef = doc(db, 'users', userId);
        const currentUserDocRef = doc(db, 'users', currentUser.uid);
        
        // Add to target user's followers
        await updateDoc(userDocRef, {
          followers: arrayUnion(currentUser.uid)
        });
        
        // Add to current user's following
        await updateDoc(currentUserDocRef, {
          following: arrayUnion(userId)
        });
        
        setIsFollowing(true);
        setStats(prev => ({ ...prev, followers: prev.followers + 1 }));
      } catch (error) {
        console.error('Error following:', error);
        Alert.alert('Error', 'Failed to follow. Please try again.');
      } finally {
        setFollowLoading(false);
      }
    }
  };

  const handleMessage = () => {
    navigation.navigate('Messages');
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
      
      // Get current user's username
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

      // Add review to user's reviews array
      await updateDoc(userDocRef, {
        reviews: arrayUnion(newReview)
      });

      // Recalculate average rating
      const updatedUserDoc = await getDoc(userDocRef);
      const updatedReviews = updatedUserDoc.data().reviews || [];
      const avgRating = updatedReviews.reduce((sum, r) => sum + r.rating, 0) / updatedReviews.length;
      
      await updateDoc(userDocRef, {
        rating: avgRating,
        reviewCount: updatedReviews.length
      });

      // Reset modal
      setShowReviewModal(false);
      setReviewRating(0);
      setReviewText('');
      
      // Reload user profile
      await loadUserProfile();
      
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
              
              // Remove review from array
              await updateDoc(userDocRef, {
                reviews: arrayRemove(review)
              });

              // Recalculate average rating
              const updatedUserDoc = await getDoc(userDocRef);
              const updatedReviews = updatedUserDoc.data().reviews || [];
              const avgRating = updatedReviews.length > 0 
                ? updatedReviews.reduce((sum, r) => sum + r.rating, 0) / updatedReviews.length 
                : 0;
              
              await updateDoc(userDocRef, {
                rating: avgRating,
                reviewCount: updatedReviews.length
              });

              // Reload user profile
              await loadUserProfile();
              
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

  const forFunPosts = userPosts.filter(post => post.postType === 'forFun');
  const forSwapPosts = userPosts.filter(post => post.postType === 'forSwap');
  const displayPosts = activeTab === 'forFun' ? forFunPosts : forSwapPosts;

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#fff" barStyle="dark-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color={colors.dark} />
        </TouchableOpacity>
        <Text style={styles.logo}>{username}</Text>
        <View style={{ width: 24 }} />
      </View>

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
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{stats.followers}</Text>
                <Text style={styles.statLabel}>followers</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{stats.following}</Text>
                <Text style={styles.statLabel}>following</Text>
              </View>
            </View>
          </View>

          <Text style={styles.userName}>{username}</Text>
          
          {/* Bio */}
          <Text style={styles.userBio}>{userInfo.bio}</Text>
          
          {/* Location */}
          {(userInfo.location || userInfo.area) && (
            <View style={styles.locationContainer}>
              <Icon name="location-outline" size={16} color={colors.dark} />
              <Text style={styles.locationText}>
                {userInfo.area ? `${userInfo.location}, ${userInfo.area}` : userInfo.location}
              </Text>
            </View>
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
                  {isFollowing ? 'Following' : 'Follow'}
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
              <Icon name="images-outline" size={64} color={colors.gray} />
              <Text style={styles.emptyStateText}>No {activeTab === 'forFun' ? 'Fun' : 'Swap'} Posts</Text>
              <Text style={styles.emptyStateSubtext}>This user hasn&apos;t posted anything yet</Text>
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

                  {/* Rating Stars */}
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

                  {/* Review Text */}
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

                  {/* Submit Button */}
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
  container: {
    flex: 1,
    backgroundColor: colors.secondary,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
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
  logo: {
    fontFamily: fonts.header,
    fontSize: 20,
    fontWeight: '700',
    color: colors.dark,
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalScrollContent: {
    flexGrow: 1,
    justifyContent: 'flex-end',
    paddingBottom: spacing.lg,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: spacing.lg,
    maxHeight: '85%',
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
