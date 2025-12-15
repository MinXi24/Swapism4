import { useFocusEffect } from '@react-navigation/native';
import { getAuth } from 'firebase/auth';
import { collection, deleteDoc, doc, getDoc, getDocs, getFirestore, query, setDoc, where } from 'firebase/firestore';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
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

export default function ProfileScreen({ navigation }) {
  const [userPosts, setUserPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('forFun');
  const [stats, setStats] = useState({
    swaps: 0,
    followers: 0,
    following: 0,
  });
  const [userInfo, setUserInfo] = useState({
    bio: 'i overestimated how much i can achieve when i reached how old i am now',
    location: 'Singapore',
    area: '',
    rating: 0,
    reviewCount: 0,
    reviews: [],
  });
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [postalCode, setPostalCode] = useState([]);
  const [discoverPosts, setDiscoverPosts] = useState([]);

  const auth = getAuth();
  const db = getFirestore();
  const user = auth.currentUser;

  useEffect(() => {
    loadUserProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadUserProfile = async () => {
    try {
      const uid = user?.uid;
      if (!uid) return;

      const userDocRef = doc(db, 'users', uid);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        
        // Load followers and following counts
        const followers = userData.followers || [];
        const following = userData.following || [];
        
        setUserInfo(prev => ({
          ...prev,
          username: userData.username || user?.displayName || 'User',
          location: userData.location || 'Singapore',
          area: userData.area || '',
          bio: userData.bio || prev.bio,
          rating: userData.rating || 0,
          reviewCount: userData.reviewCount || 0,
          reviews: userData.reviews || [],
        }));
        
        setStats(prev => ({
          ...prev,
          followers: followers.length,
          following: following.length,
        }));
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };

  const loadUserPosts = async () => {
    try {
      const uid = user?.uid;
      if (!uid) {
        setLoading(false);
        return;
      }

      console.log('Loading user posts...');
      const q = query(
        collection(db, 'wardrobe-plug-fyp/user/images'),
        where('ownerUid', '==', uid)
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
      
      console.log('Loaded posts:', posts.length);
      setUserPosts(posts);
      setStats(prev => ({ ...prev, swaps: posts.length }));
      
      // Load discover posts (other users' swap posts)
      await loadDiscoverPosts();
    } catch (error) {
      console.error('Error loading posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadDiscoverPosts = async () => {
    try {
      const uid = user?.uid;
      if (!uid) return;

      // Fetch all forSwap posts, then filter in JavaScript to avoid composite index
      const q = query(
        collection(db, 'wardrobe-plug-fyp/user/images'),
        where('postType', '==', 'forSwap')
      );
      const querySnapshot = await getDocs(q);
      const posts = querySnapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        .filter(post => post.ownerUid !== uid && post.swapStatus === 'available') // Filter out current user's posts and swapped out items
        .slice(0, 10); // Show only first 10 posts
      
      setDiscoverPosts(posts);
    } catch (error) {
      console.error('Error loading discover posts:', error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadUserProfile();
      loadUserPosts();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  const handlePostPress = (post) => {
    navigation.navigate('PostDetails', { post });
  };

  const handlePostMenu = (post) => {
    Alert.alert(
      'Post Options',
      'What would you like to do?',
      [
        {
          text: 'Delete Post',
          style: 'destructive',
          onPress: () => handleDeletePost(post),
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  const handleDeletePost = async (post) => {
    Alert.alert(
      'Delete Post',
      'Are you sure you want to delete this post? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'wardrobe-plug-fyp/user/images', post.id));
              // Refresh posts
              await loadUserPosts();
              Alert.alert('Success', 'Post deleted successfully');
            } catch (error) {
              console.error('Error deleting post:', error);
              Alert.alert('Error', 'Failed to delete post. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleAddPost = () => {
    navigation.navigate('AddPost');
  };

  const handleEditProfile = () => {
    navigation.navigate('EditProfile');
  };

  const handleShareProfile = () => {
    // Share profile functionality
    console.log('Share profile');
  };

  const handleLocationPress = () => {
    setShowLocationModal(true);
  };

  const handleSaveLocation = async () => {
    // Singapore postal code districts mapping
    const postalDistricts = {
      '01': 'Raffles Place, Cecil, Marina',
      '02': 'Anson, Tanjong Pagar',
      '03': 'Queenstown, Tiong Bahru',
      '04': 'Telok Blangah, Harbourfront',
      '05': 'Pasir Panjang, Hong Leong Garden',
      '06': 'High Street, Beach Road',
      '07': 'Middle Road, Golden Mile',
      '08': 'Little India',
      '09': 'Orchard, Cairnhill, River Valley',
      '10': 'Ardmore, Bukit Timah, Holland Road',
      '11': 'Watten Estate, Novena, Thomson',
      '12': 'Balestier, Toa Payoh',
      '13': 'Macpherson, Braddell',
      '14': 'Geylang, Eunos',
      '15': 'Katong, Joo Chiat, Amber Road',
      '16': 'Upper East Coast, Eastwood',
      '17': 'Loyang, Changi',
      '18': 'Tampines, Pasir Ris',
      '19': 'Serangoon Garden, Hougang',
      '20': 'Bishan, Ang Mo Kio',
      '21': 'Upper Bukit Timah, Clementi Park',
      '22': 'Jurong',
      '23': 'Hillview, Dairy Farm, Bukit Panjang',
      '24': 'Lim Chu Kang, Tengah',
      '25': 'Kranji, Woodgrove, Woodlands',
      '26': 'Upper Thomson, Springleaf',
      '27': 'Yishun, Sembawang',
      '28': 'Seletar',
      '29': 'Seletar',
      '30': 'Mandai',
      '31': 'Woodlands',
      '32': 'Woodlands',
      '33': 'Woodlands',
      '34': 'Sembawang',
      '35': 'Sembawang',
      '36': 'Sembawang',
      '37': 'Yishun',
      '38': 'Yishun',
      '39': 'Yishun',
      '40': 'Yishun',
      '41': 'Punggol',
      '42': 'Sengkang',
      '43': 'Sengkang',
      '44': 'Sengkang',
      '45': 'Hougang',
      '46': 'Hougang',
      '47': 'Hougang',
      '48': 'Serangoon',
      '49': 'Serangoon',
      '50': 'Serangoon',
      '51': 'Pasir Ris',
      '52': 'Toa Payoh',
      '53': 'Hougang',
      '54': 'Ang Mo Kio',
      '55': 'Serangoon North',
      '56': 'Bishan',
      '57': 'Bishan',
      '58': 'Thomson',
      '59': 'Thomson',
      '60': 'Bishan',
      '61': 'Clementi',
      '62': 'Jurong West',
      '63': 'Jurong West',
      '64': 'Jurong West',
      '65': 'Jurong West',
      '66': 'Jurong West',
      '67': 'Jurong West',
      '68': 'Jurong East',
      '69': 'Jurong East',
      '70': 'Jurong East',
      '71': 'Jurong East',
      '72': 'Boon Lay',
      '73': 'Pioneer',
      '74': 'Bukit Batok',
      '75': 'Bukit Batok',
      '76': 'Bukit Batok',
      '77': 'Choa Chu Kang',
      '78': 'Choa Chu Kang',
      '79': 'Choa Chu Kang',
      '80': 'Queenstown',
      '81': 'Buona Vista',
    };

    if (postalCode.length === 6 && /^\d{6}$/.test(postalCode)) {
      const district = postalCode.substring(0, 2);
      const area = postalDistricts[district];
      
      if (area) {
        setUserInfo(prev => ({
          ...prev,
          location: 'Singapore',
          area: area,
        }));
        
        // Save to Firestore user profile
        try {
          const uid = user?.uid;
          if (uid) {
            const userDocRef = doc(db, 'users', uid);
            await setDoc(userDocRef, {
              location: 'Singapore',
              area: area,
            }, { merge: true });
          }
        } catch (error) {
          console.error('Error saving location:', error);
        }
        
        setShowLocationModal(false);
        setPostalCode('');
      } else {
        alert('Postal code not recognized. Please check and try again.');
      }
    } else {
      alert('Please enter a valid 6-digit Singapore postal code');
    }
  };

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
        <Text style={styles.logo}>Profile</Text>
        <View style={styles.headerIcons}>
          <TouchableOpacity 
            style={styles.headerIcon}
            onPress={() => navigation.navigate('Settings')}
          >
            <Icon name="menu-outline" size={28} color={colors.dark} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Profile Info - Instagram Style */}
        <View style={styles.profileSection}>
          {/* Top Row: Profile Picture + Stats */}
          <View style={styles.profileTopRow}>
            {/* Profile Picture */}
            <View style={styles.profileImageContainer}>
              {user?.photoURL ? (
                <Image source={{ uri: user.photoURL }} style={styles.profileImage} />
              ) : (
                <View style={styles.profileImagePlaceholder}>
                  <Icon name="person" size={40} color={colors.gray} />
                </View>
              )}
            </View>

            {/* Stats */}
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{stats.swaps}</Text>
                <Text style={styles.statLabel}>posts</Text>
              </View>
              <TouchableOpacity style={styles.statItem} onPress={() => navigation.navigate('FollowList', { userId: user?.uid, type: 'followers' })}>
                <Text style={styles.statNumber}>{stats.followers}</Text>
                <Text style={styles.statLabel}>followers</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.statItem} onPress={() => navigation.navigate('FollowList', { userId: user?.uid, type: 'following' })}>
                <Text style={styles.statNumber}>{stats.following}</Text>
                <Text style={styles.statLabel}>following</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Username */}
          <Text style={styles.userName}>{userInfo.username || user?.displayName || 'User'}</Text>
          
          {/* Bio */}
          <Text style={styles.userBio}>{userInfo.bio}</Text>
          
          {/* Location */}
          <TouchableOpacity style={styles.locationContainer} onPress={handleLocationPress}>
            <Icon name="location-outline" size={16} color={colors.dark} />
            <Text style={styles.locationText}>
              {userInfo.area ? `${userInfo.location}, ${userInfo.area}` : userInfo.location}
            </Text>
          </TouchableOpacity>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={handleEditProfile}
            >
              <Text style={styles.actionButtonText}>Edit profile</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={handleShareProfile}
            >
              <Text style={styles.actionButtonText}>Share profile</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Discover Closets Section - Other Users' Swap Posts */}
        <View style={styles.discoverSection}>
          <Text style={styles.sectionTitle}>Discover Swap Closets</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.discoverScroll}
          >
            {discoverPosts.map((post) => (
              <TouchableOpacity
                key={post.id}
                style={styles.discoverCard}
                onPress={() => navigation.navigate('UserProfile', { 
                  userId: post.ownerUid, 
                  username: post.userName,
                  initialTab: 'forSwap'
                })}
              >
                <Image source={{ uri: post.url }} style={styles.discoverImage} />
                <Text style={styles.discoverUsername} numberOfLines={1}>{post.userName}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Rating Section */}
        <View style={styles.ratingSection}>
          <View style={styles.ratingHeader}>
            <Text style={styles.ratingScore}>{userInfo.rating.toFixed(1)}</Text>
          </View>
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
          <Text style={styles.reviewsTitle}>Reviews ({userInfo.reviewCount})</Text>
          {userInfo.reviewCount === 0 ? (
            <View style={styles.noReviewsContainer}>
              <Text style={styles.noReviewsText}>No reviews yet</Text>
            </View>
          ) : (
            (userInfo.reviews || []).map((review, index) => (
              <TouchableOpacity
                key={index}
                onPress={() => navigation.navigate('UserProfile', { userId: review.userId })}
              >
                <View style={styles.reviewItem}>
                  {review.userPhoto ? (
                    <Image source={{ uri: review.userPhoto }} style={styles.reviewUserImage} />
                  ) : (
                    <Icon name="person-circle" size={40} color={colors.gray} />
                  )}
                  <View style={styles.reviewContent}>
                    <Text style={styles.reviewAuthor}>{review.userName}</Text>
                    <Text style={styles.reviewText}>{review.text}</Text>
                    <View style={styles.reviewStars}>
                      {[1, 2, 3, 4, 5].map(star => (
                        <Icon
                          key={star}
                          name={star <= review.rating ? 'star' : 'star-outline'}
                          size={16}
                          color={colors.highlight}
                        />
                      ))}
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'forFun' && styles.activeTab]}
            onPress={() => setActiveTab('forFun')}
          >
            <Icon name="happy-outline" size={24} color={colors.dark} />
            <Text style={styles.tabText}>FOR FUN</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'forSwap' && styles.activeTab]}
            onPress={() => setActiveTab('forSwap')}
          >
            <Icon name="swap-horizontal-outline" size={24} color={colors.dark} />
            <Text style={styles.tabText}>FOR SWAP</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'mirror' && styles.activeTab]}
            onPress={() => setActiveTab('mirror')}
          >
            <Icon name="accessibility-outline" size={24} color={colors.dark} />
            <Text style={styles.tabText}>MIRROR</Text>
          </TouchableOpacity>
        </View>

        {/* Posts Grid */}
        <View style={styles.postsContainer}>
          {activeTab === 'forFun' && (
            userPosts.filter(p => p.postType === 'forFun' || !p.postType).length === 0 ? (
              <View style={styles.emptyState}>
                <Icon name="happy-outline" size={64} color={colors.gray} />
                <Text style={styles.emptyStateText}>No fun posts yet</Text>
                <Text style={styles.emptyStateSubtext}>Share your style with the world!</Text>
              </View>
            ) : (
              <View style={styles.postsGrid}>
                {userPosts
                  .filter(post => post.postType === 'forFun' || !post.postType)
                  .map(post => (
                    <TouchableOpacity
                      key={post.id}
                      style={styles.postItem}
                      onPress={() => handlePostPress(post)}
                    >
                      <Image source={{ uri: post.url }} style={styles.postImage} />
                      <TouchableOpacity
                        style={styles.postMenuButton}
                        onPress={(e) => {
                          e.stopPropagation();
                          handlePostMenu(post);
                        }}
                      >
                        <Icon name="ellipsis-vertical" size={20} color="#fff" />
                      </TouchableOpacity>
                    </TouchableOpacity>
                  ))}
              </View>
            ))
          }

          {activeTab === 'forSwap' && (
            userPosts.filter(p => p.postType === 'forSwap').length === 0 ? (
              <View style={styles.emptyState}>
                <Icon name="swap-horizontal-outline" size={64} color={colors.gray} />
                <Text style={styles.emptyStateText}>No swap posts yet</Text>
                <Text style={styles.emptyStateSubtext}>Post items you want to swap!</Text>
              </View>
            ) : (
              <View style={styles.postsGrid}>
                {userPosts
                  .filter(post => post.postType === 'forSwap')
                  .map(post => (
                    <TouchableOpacity
                      key={post.id}
                      style={styles.postItem}
                      onPress={() => handlePostPress(post)}
                    >
                      <Image source={{ uri: post.url }} style={styles.postImage} />
                      <TouchableOpacity
                        style={styles.postMenuButton}
                        onPress={(e) => {
                          e.stopPropagation();
                          handlePostMenu(post);
                        }}
                      >
                        <Icon name="ellipsis-vertical" size={20} color="#fff" />
                      </TouchableOpacity>
                      {/* Swap Status Badge */}
                      <View style={[
                        styles.swapStatusBadge,
                        post.swapStatus === 'swappedOut' && styles.swapStatusBadgeInactive
                      ]}>
                        <Text style={styles.swapStatusBadgeText}>
                          {post.swapStatus === 'available' ? 'Available' : 'Swapped Out'}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
              </View>
            ))
          }

          {activeTab === 'mirror' && (
            <View>
              <Text style={styles.sectionTitle}>Virtual Try-On Mirror</Text>
              {Array.isArray(userPosts) && (userPosts.filter(p => p.postType === 'forSwap' || p.postType === 'forFun').length === 0) ? (
                <View style={styles.emptyState}>
                  <Icon name="accessibility-outline" size={64} color={colors.gray} />
                  <Text style={styles.emptyStateText}>No items to try on</Text>
                  <Text style={styles.emptyStateSubtext}>Post your clothes to try them virtually!</Text>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.tryOnButton}
                  onPress={() => navigation.navigate('TryOnScreen', { 
                    allItems: (Array.isArray(userPosts) ? userPosts : []).filter(p => p.postType === 'forSwap' || p.postType === 'forFun')
                  })}
                >
                  <Icon name="shirt-outline" size={32} color={colors.accent} />
                  <Text style={styles.tryOnButtonText}>Open Virtual Mirror</Text>
                  <Text style={styles.tryOnButtonSubtext}>Try on your {(Array.isArray(userPosts) ? userPosts : []).filter(p => p.postType === 'forSwap' || p.postType === 'forFun').length} clothing items</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Floating Add Button */}
      <TouchableOpacity 
        style={styles.addButton}
        onPress={handleAddPost}
      >
        <Icon name="add" size={32} color="#fff" />
      </TouchableOpacity>

      {/* Location Modal */}
      <Modal
        visible={showLocationModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowLocationModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Set Your Location</Text>
            <Text style={styles.modalSubtitle}>Enter your Singapore postal code</Text>
            
            <TextInput
              style={styles.modalInput}
              placeholder="Enter 6-digit postal code"
              value={postalCode}
              onChangeText={setPostalCode}
              keyboardType="numeric"
              maxLength={6}
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => {
                  setShowLocationModal(false);
                  setPostalCode('');
                }}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSave]}
                onPress={handleSaveLocation}
              >
                <Text style={[styles.modalButtonText, styles.modalButtonTextSave]}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Bottom Navigation */}
      <BottomNavBar navigation={navigation} activeRoute="Profile" />
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
    marginBottom: spacing.md,
  },
  locationText: {
    fontSize: 14,
    color: colors.dark,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
    width: '100%',
    marginTop: spacing.sm,
  },
  actionButton: {
    flex: 1,
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.dark,
  },
  discoverSection: {
    backgroundColor: '#F5F3E4',
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.dark,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  discoverScroll: {
    paddingHorizontal: spacing.md,
  },
  discoverCard: {
    width: 120,
    height: 150,
    backgroundColor: '#DAD3A1',
    borderRadius: 12,
    overflow: 'hidden',
    marginRight: spacing.sm,
  },
  discoverImage: {
    width: '100%',
    height: 120,
    resizeMode: 'cover',
  },
  discoverUsername: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.dark,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
    textAlign: 'center',
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
  ratingSection: {
    backgroundColor: '#9abeaa',
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  ratingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
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
    borderColor: colors.dark,
    borderRadius: 6,
  },
  rateButtonText: {
    fontSize: 14,
    color: colors.dark,
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: spacing.md,
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
  reviewAuthor: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.dark,
    marginBottom: 4,
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
  postsContainer: {
    backgroundColor: '#fff',
    minHeight: 300,
    paddingTop: spacing.md,
  },
  postTypeSection: {
    marginBottom: spacing.lg,
  },
  postTypeSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: '#f8f8f8',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  postTypeSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.dark,
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
  addButton: {
    position: 'absolute',
    bottom: 80,
    right: spacing.md,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.highlight,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: spacing.lg,
    width: '85%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.dark,
    marginBottom: spacing.sm,
  },
  modalSubtitle: {
    fontSize: 14,
    color: colors.gray,
    marginBottom: spacing.md,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: spacing.md,
    fontSize: 16,
    marginBottom: spacing.lg,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  modalButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonCancel: {
    backgroundColor: '#f0f0f0',
  },
  modalButtonSave: {
    backgroundColor: colors.highlight,
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.dark,
  },
  modalButtonTextSave: {
    color: '#fff',
  },
  tryOnBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#9ABEAA',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tryOnBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#fff',
  },
  tryOnButton: {
    backgroundColor: '#f0f8f4',
    padding: spacing.xl,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.accent,
    borderStyle: 'dashed',
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  tryOnButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.accent,
    marginTop: spacing.sm,
  },
  tryOnButtonSubtext: {
    fontSize: 14,
    color: colors.gray,
    marginTop: 4,
  },
  postMenuButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
});
