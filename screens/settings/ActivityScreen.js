import { useFocusEffect } from '@react-navigation/native';
import { getAuth } from 'firebase/auth';
import { collection, doc, getDoc, getDocs, getFirestore, query, where } from 'firebase/firestore';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from '../../assets/icons/icons';
import { colors, fonts, spacing } from '../../lib/theme';

export default function ActivityScreen({ navigation }) {
  const [likedPosts, setLikedPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortOrder, setSortOrder] = useState('newest');
  const [showSortModal, setShowSortModal] = useState(false);

  const auth = getAuth();
  const db = getFirestore();
  const user = auth.currentUser;

  const loadLikedPosts = async () => {
    try {
      const uid = user?.uid;
      if (!uid) {
        setLoading(false);
        return;
      }

      console.log('Loading liked posts...');
      
      // Get all likes by this user
      const likesQuery = query(
        collection(db, 'likes'),
        where('userId', '==', uid)
      );
      const likesSnapshot = await getDocs(likesQuery);
      
      if (likesSnapshot.empty) {
        setLikedPosts([]);
        setLoading(false);
        return;
      }

      // Get the posts that were liked
      const postsData = await Promise.all(
        likesSnapshot.docs.map(async (likeDoc) => {
          const likeData = likeDoc.data();
          
          try {
            const postDocRef = doc(db, 'wardrobe-plug-fyp/user/images', likeData.postId);
            const postDoc = await getDoc(postDocRef);
            
            if (postDoc.exists()) {
              return {
                id: postDoc.id,
                likeId: likeDoc.id,
                likedAt: likeData.createdAt,
                ...postDoc.data(),
              };
            }
          } catch (err) {
            console.error('Error fetching post:', err);
          }
          return null;
        })
      );

      // Filter out null values and sort by liked date
      const validPosts = postsData.filter(post => post !== null);
      validPosts.sort((a, b) => {
        const dateA = a.likedAt?.toDate?.() || new Date(0);
        const dateB = b.likedAt?.toDate?.() || new Date(0);
        return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
      });
      
      console.log('Loaded liked posts:', validPosts.length);
      setLikedPosts(validPosts);
    } catch (error) {
      console.error('Error loading liked posts:', error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadLikedPosts();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sortOrder])
  );

  const handleSortChange = (order) => {
    setSortOrder(order);
    setShowSortModal(false);
  };

  const handlePostPress = (post) => {
    if (post) {
      navigation.navigate('PostDetails', { post });
    }
  };

  const renderPostItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.postItem}
      onPress={() => handlePostPress(item)}
    >
      <Image source={{ uri: item.url }} style={styles.postImage} />
      {item.postType === 'forSwap' && (
        <View style={styles.swapBadge}>
          <Icon name="repeat" size={12} color="#fff" />
        </View>
      )}
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
        <Text style={styles.headerTitle}>Likes</Text>
        <TouchableOpacity onPress={() => {/* Add Select functionality if needed */}} style={styles.selectButton}>
          <Text style={styles.selectText}>Select</Text>
        </TouchableOpacity>
      </View>

      {/* Filter Buttons */}
      <View style={styles.filterContainer}>
        <TouchableOpacity style={styles.filterButton} onPress={() => setShowSortModal(true)}>
          <Text style={styles.filterText}>{sortOrder === 'newest' ? 'Newest to oldest' : 'Oldest to newest'}</Text>
          <Icon name="chevron-down" size={16} color="#000" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.filterButton}>
          <Text style={styles.filterText}>All dates</Text>
          <Icon name="chevron-down" size={16} color="#000" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : likedPosts.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Icon name="heart-outline" size={64} color="#666" />
          <Text style={styles.emptyText}>No liked posts yet</Text>
          <Text style={styles.emptySubtext}>
            Posts you like will appear here
          </Text>
        </View>
      ) : (
        <FlatList
          data={likedPosts}
          renderItem={renderPostItem}
          keyExtractor={(item) => item.id}
          numColumns={3}
          contentContainerStyle={styles.gridContainer}
          columnWrapperStyle={styles.gridRow}
        />
      )}

      {/* Sort Modal */}
      <Modal
        visible={showSortModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowSortModal(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowSortModal(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Sort by</Text>
            
            <TouchableOpacity 
              style={styles.modalOption}
              onPress={() => handleSortChange('newest')}
            >
              <Text style={styles.modalOptionText}>Newest to oldest</Text>
              {sortOrder === 'newest' && (
                <Icon name="checkmark" size={20} color={colors.accent} />
              )}
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.modalOption}
              onPress={() => handleSortChange('oldest')}
            >
              <Text style={styles.modalOptionText}>Oldest to newest</Text>
              {sortOrder === 'oldest' && (
                <Icon name="checkmark" size={20} color={colors.accent} />
              )}
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
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
  selectButton: {
    padding: 4,
  },
  selectText: {
    fontSize: 16,
    color: '#4A9EFF',
    fontFamily: fonts.semiBold,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    backgroundColor: '#fff',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 20,
    gap: 4,
  },
  filterText: {
    fontSize: 13,
    color: '#000',
    fontFamily: fonts.regular,
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
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  gridContainer: {
    paddingHorizontal: 2,
    paddingBottom: 20,
  },
  gridRow: {
    gap: 4,
  },
  postItem: {
    flex: 1,
    aspectRatio: 0.75,
    backgroundColor: '#f0f0f0',
    marginBottom: 4,
    position: 'relative',
  },
  postImage: {
    width: '100%',
    height: '100%',
  },
  swapBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 12,
    padding: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: spacing.lg,
    width: '80%',
    maxWidth: 300,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: fonts.semiBold,
    color: '#000',
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalOptionText: {
    fontSize: 16,
    fontFamily: fonts.regular,
    color: '#000',
  },
});
