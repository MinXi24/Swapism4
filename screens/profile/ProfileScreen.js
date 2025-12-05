import { useFocusEffect } from '@react-navigation/native';
import { getAuth } from 'firebase/auth';
import { collection, getDocs, getFirestore, query, where } from 'firebase/firestore';
import React, { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    Image,
    Modal,
    ScrollView,
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
  const [activeTab, setActiveTab] = useState('posts');
  const [stats, setStats] = useState({
    swaps: 0,
    followers: 0,
    following: 0,
  });
  const [userInfo, setUserInfo] = useState({
    bio: 'i overestimated how much i can achieve when i reached how old i am now',
    location: 'Singapore',
    area: '',
    rating: 4.8,
    reviewCount: 2,
  });
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [postalCode, setPostalCode] = useState('');

  const auth = getAuth();
  const db = getFirestore();
  const user = auth.currentUser;

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
    } catch (error) {
      console.error('Error loading posts:', error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadUserPosts();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  const handlePostPress = (post) => {
    navigation.navigate('PostDetails', { post });
  };

  const handleAddPost = () => {
    navigation.navigate('AddPost');
  };

  const handleEditProfile = () => {
    // Navigate to edit profile screen
    console.log('Edit profile');
  };

  const handleShareProfile = () => {
    // Share profile functionality
    console.log('Share profile');
  };

  const handleLocationPress = () => {
    setShowLocationModal(true);
  };

  const handleSaveLocation = async () => {
    // Singapore postal code districts mapping (simplified)
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
    };

    if (postalCode.length === 6) {
      const district = postalCode.substring(0, 2);
      const area = postalDistricts[district] || 'Unknown Area';
      
      setUserInfo(prev => ({
        ...prev,
        location: 'Singapore',
        area: area,
      }));
      
      // TODO: Save to Firestore user profile
      setShowLocationModal(false);
      setPostalCode('');
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
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>PROFILE</Text>
          <TouchableOpacity>
            <Icon name="menu-outline" size={28} color={colors.dark} />
          </TouchableOpacity>
        </View>

        {/* Profile Info */}
        <View style={styles.profileSection}>
          <View style={styles.profileImageContainer}>
            {user?.photoURL ? (
              <Image source={{ uri: user.photoURL }} style={styles.profileImage} />
            ) : (
              <View style={styles.profileImagePlaceholder}>
                <Icon name="person" size={60} color={colors.gray} />
              </View>
            )}
          </View>

          <Text style={styles.userName}>{user?.displayName || 'Ben'}</Text>
          
          {/* Bio */}
          <Text style={styles.userBio}>{userInfo.bio}</Text>
          
          {/* Location */}
          <TouchableOpacity style={styles.locationContainer} onPress={handleLocationPress}>
            <Icon name="location-outline" size={16} color={colors.dark} />
            <Text style={styles.locationText}>
              {userInfo.area ? `${userInfo.location}, ${userInfo.area}` : userInfo.location}
            </Text>
          </TouchableOpacity>

          {/* Stats */}
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{stats.swaps}</Text>
              <Text style={styles.statLabel}>posts</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{stats.followers}</Text>
              <Text style={styles.statLabel}>followers</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{stats.following}</Text>
              <Text style={styles.statLabel}>following</Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={handleEditProfile}
            >
              <Text style={styles.actionButtonText}>Follow</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={handleShareProfile}
            >
              <Text style={styles.actionButtonText}>Message</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Discover Closets Section */}
        <View style={styles.discoverSection}>
          <Text style={styles.sectionTitle}>Discover closets</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.discoverScroll}
          >
            <View style={styles.discoverCard}>
              <Text style={styles.discoverEmoji}>👕</Text>
              <Text style={styles.discoverText}>casual</Text>
            </View>
            <View style={styles.discoverCard}>
              <Text style={styles.discoverEmoji}>🔄</Text>
              <Text style={styles.discoverText}>swap</Text>
            </View>
            <View style={styles.discoverCard}>
              <Text style={styles.discoverEmoji}>🛍️</Text>
              <Text style={styles.discoverText}>don&apos;t shop</Text>
            </View>
          </ScrollView>
        </View>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'posts' && styles.activeTab]}
            onPress={() => setActiveTab('posts')}
          >
            <Icon name="grid" size={24} color={colors.dark} />
            <Text style={styles.tabText}>POSTS</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'mirror' && styles.activeTab]}
            onPress={() => setActiveTab('mirror')}
          >
            <Icon name="contrast-outline" size={24} color={colors.dark} />
            <Text style={styles.tabText}>MIRROR</Text>
          </TouchableOpacity>
        </View>

        {/* Rating Section */}
        <View style={styles.ratingSection}>
          <View style={styles.ratingHeader}>
            <Text style={styles.ratingScore}>{userInfo.rating}</Text>
            <Text style={styles.ratingName}>{user?.displayName || 'Ben'}</Text>
            <TouchableOpacity style={styles.rateButton}>
              <Text style={styles.rateButtonText}>Rate</Text>
            </TouchableOpacity>
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
          <Text style={styles.reviewsTitle}>Reviews</Text>
          
          {/* Sample Reviews */}
          <View style={styles.reviewItem}>
            <Icon name="person-circle" size={40} color={colors.gray} />
            <View style={styles.reviewContent}>
              <Text style={styles.reviewText}>Wow wow oww amazing</Text>
            </View>
          </View>
          <View style={styles.reviewItem}>
            <Icon name="person-circle" size={40} color={colors.gray} />
            <View style={styles.reviewContent}>
              <Text style={styles.reviewText}>Wow wow oww amazing</Text>
              <Text style={styles.reviewText}>Wow wow oww amazing Wow wow oww amazing</Text>
              <Text style={styles.reviewText}>Wow wow oww amazing</Text>
            </View>
          </View>
        </View>

        {/* Posts Grid */}
        <View style={styles.postsContainer}>
          {userPosts.length === 0 ? (
            <View style={styles.emptyState}>
              <Icon name="images-outline" size={64} color={colors.gray} />
              <Text style={styles.emptyStateText}>No posts yet</Text>
              <Text style={styles.emptyStateSubtext}>Start sharing your wardrobe!</Text>
            </View>
          ) : (
            <View style={styles.postsGrid}>
              {userPosts.map(post => (
                <TouchableOpacity
                  key={post.id}
                  style={styles.postItem}
                  onPress={() => handlePostPress(post)}
                >
                  <Image source={{ uri: post.url }} style={styles.postImage} />
                </TouchableOpacity>
              ))}
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
    </View>
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
    padding: spacing.md,
    paddingTop: 50,
    backgroundColor: '#fff',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    fontFamily: fonts.header,
    color: colors.dark,
  },
  profileSection: {
    backgroundColor: '#fff',
    alignItems: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  profileImageContainer: {
    marginBottom: spacing.md,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  profileImagePlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.dark,
    marginBottom: spacing.sm,
  },
  userBio: {
    fontSize: 14,
    color: colors.dark,
    textAlign: 'left',
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
    lineHeight: 18,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: spacing.md,
  },
  locationText: {
    fontSize: 14,
    color: colors.dark,
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingVertical: spacing.md,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.dark,
  },
  statLabel: {
    fontSize: 14,
    color: colors.gray,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#e0e0e0',
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
    backgroundColor: '#fff',
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
    height: 120,
    backgroundColor: colors.primary,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  discoverEmoji: {
    fontSize: 40,
    marginBottom: spacing.sm,
  },
  discoverText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.dark,
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
    backgroundColor: colors.light,
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
    color: colors.dark,
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
  reviewContent: {
    flex: 1,
  },
  reviewText: {
    fontSize: 14,
    color: colors.dark,
    marginBottom: 4,
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
  },
  postImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
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
});
