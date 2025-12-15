import { useFocusEffect } from '@react-navigation/native';
import { getAuth } from 'firebase/auth';
import { collection, deleteDoc, doc, getDocs, getFirestore, query, setDoc, where } from 'firebase/firestore';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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

export default function RecentlyDeletedScreen({ navigation }) {
  const [deletedPosts, setDeletedPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPosts, setSelectedPosts] = useState([]);
  const [selectionMode, setSelectionMode] = useState(false);

  const auth = getAuth();
  const db = getFirestore();
  const user = auth.currentUser;

  const loadDeletedPosts = async () => {
    try {
      const uid = user?.uid;
      if (!uid) {
        setLoading(false);
        return;
      }

      console.log('Loading recently deleted posts...');
      
      // Get all deleted posts by this user
      const deletedQuery = query(
        collection(db, 'deletedPosts'),
        where('ownerUid', '==', uid)
      );
      const deletedSnapshot = await getDocs(deletedQuery);
      
      if (deletedSnapshot.empty) {
        setDeletedPosts([]);
        setLoading(false);
        return;
      }

      const posts = deletedSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Sort by deletion date
      posts.sort((a, b) => {
        const dateA = a.deletedAt?.toDate?.() || new Date(0);
        const dateB = b.deletedAt?.toDate?.() || new Date(0);
        return dateB - dateA;
      });
      
      console.log('Loaded deleted posts:', posts.length);
      setDeletedPosts(posts);
    } catch (error) {
      console.error('Error loading deleted posts:', error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadDeletedPosts();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  const handlePostPress = (post) => {
    if (selectionMode) {
      toggleSelectPost(post.id);
    } else {
      navigation.navigate('PostDetails', { post });
    }
  };

  const toggleSelectPost = (postId) => {
    if (selectedPosts.includes(postId)) {
      setSelectedPosts(selectedPosts.filter(id => id !== postId));
    } else {
      setSelectedPosts([...selectedPosts, postId]);
    }
  };

  const handleSelectAll = () => {
    if (selectedPosts.length === deletedPosts.length) {
      setSelectedPosts([]);
    } else {
      setSelectedPosts(deletedPosts.map(post => post.id));
    }
  };

  const handleRestore = async () => {
    if (selectedPosts.length === 0) {
      Alert.alert('No Selection', 'Please select posts to restore');
      return;
    }

    Alert.alert(
      'Restore Posts',
      `Restore ${selectedPosts.length} post(s)?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Restore',
          onPress: async () => {
            try {
              setLoading(true);
              
              for (const postId of selectedPosts) {
                const deletedPost = deletedPosts.find(p => p.id === postId);
                if (deletedPost) {
                  // Restore to original collection
                  const { deletedAt, ...originalPost } = deletedPost;
                  await setDoc(doc(db, 'wardrobe-plug-fyp/user/images', postId), originalPost);
                  
                  // Remove from deletedPosts collection
                  await deleteDoc(doc(db, 'deletedPosts', postId));
                }
              }
              
              Alert.alert('Success', `${selectedPosts.length} post(s) restored successfully`);
              setSelectedPosts([]);
              setSelectionMode(false);
              await loadDeletedPosts();
            } catch (error) {
              console.error('Error restoring posts:', error);
              Alert.alert('Error', 'Failed to restore posts');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const handlePermanentDelete = async () => {
    if (selectedPosts.length === 0) {
      Alert.alert('No Selection', 'Please select posts to delete permanently');
      return;
    }

    Alert.alert(
      'Permanent Delete',
      `Permanently delete ${selectedPosts.length} post(s)? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              
              for (const postId of selectedPosts) {
                await deleteDoc(doc(db, 'deletedPosts', postId));
              }
              
              Alert.alert('Success', `${selectedPosts.length} post(s) permanently deleted`);
              setSelectedPosts([]);
              setSelectionMode(false);
              await loadDeletedPosts();
            } catch (error) {
              console.error('Error deleting posts permanently:', error);
              Alert.alert('Error', 'Failed to delete posts');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const renderPostItem = ({ item }) => {
    const isSelected = selectedPosts.includes(item.id);
    
    return (
      <TouchableOpacity 
        style={styles.postItem}
        onPress={() => handlePostPress(item)}
        onLongPress={() => {
          if (!selectionMode) {
            setSelectionMode(true);
            setSelectedPosts([item.id]);
          }
        }}
      >
        <Image source={{ uri: item.url }} style={styles.postImage} />
        {selectionMode && (
          <View style={styles.selectionOverlay}>
            <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
              {isSelected && <Icon name="checkmark" size={16} color="#fff" />}
            </View>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#fff" barStyle="dark-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Recently Deleted</Text>
        {!selectionMode ? (
          <TouchableOpacity 
            onPress={() => setSelectionMode(true)} 
            style={styles.selectButton}
          >
            <Text style={styles.selectText}>Select</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity 
            onPress={() => {
              setSelectionMode(false);
              setSelectedPosts([]);
            }} 
            style={styles.selectButton}
          >
            <Text style={styles.selectText}>Cancel</Text>
          </TouchableOpacity>
        )}
      </View>

      {selectionMode && (
        <View style={styles.selectionHeader}>
          <TouchableOpacity onPress={handleSelectAll}>
            <Text style={styles.selectAllText}>
              {selectedPosts.length === deletedPosts.length ? 'Deselect All' : 'Select All'}
            </Text>
          </TouchableOpacity>
          <Text style={styles.selectionCount}>
            {selectedPosts.length} selected
          </Text>
        </View>
      )}

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : deletedPosts.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Icon name="trash-outline" size={64} color="#666" />
          <Text style={styles.emptyText}>No recently deleted posts</Text>
          <Text style={styles.emptySubtext}>
            Posts you delete will be kept here for 30 days before being permanently removed
          </Text>
        </View>
      ) : (
        <FlatList
          data={deletedPosts}
          renderItem={renderPostItem}
          keyExtractor={(item) => item.id}
          numColumns={3}
          contentContainerStyle={styles.gridContainer}
          columnWrapperStyle={styles.gridRow}
        />
      )}

      {/* Action Buttons */}
      {selectionMode && selectedPosts.length > 0 && (
        <View style={styles.actionBar}>
          <TouchableOpacity 
            style={[styles.actionButton, styles.restoreButton]}
            onPress={handleRestore}
          >
            <Icon name="arrow-undo" size={20} color="#fff" />
            <Text style={styles.actionButtonText}>Restore</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.actionButton, styles.deleteButton]}
            onPress={handlePermanentDelete}
          >
            <Icon name="trash" size={20} color="#fff" />
            <Text style={styles.actionButtonText}>Delete Forever</Text>
          </TouchableOpacity>
        </View>
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
  selectButton: {
    padding: 4,
  },
  selectText: {
    fontSize: 16,
    color: '#4A9EFF',
    fontFamily: fonts.semiBold,
  },
  selectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: '#f0f0f0',
  },
  selectAllText: {
    fontSize: 14,
    color: '#4A9EFF',
    fontFamily: fonts.semiBold,
  },
  selectionCount: {
    fontSize: 14,
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
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  gridContainer: {
    paddingHorizontal: 2,
    paddingBottom: 100,
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
  selectionOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    padding: 8,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#fff',
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#4A9EFF',
    borderColor: '#4A9EFF',
  },
  actionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#dbdbdb',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: 8,
  },
  restoreButton: {
    backgroundColor: colors.accent,
  },
  deleteButton: {
    backgroundColor: '#ff4444',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    fontFamily: fonts.semiBold,
  },
});
