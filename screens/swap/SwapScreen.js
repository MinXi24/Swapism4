import { getAuth } from 'firebase/auth';
import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, getFirestore, query, serverTimestamp, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import Icon from '../../assets/icons/icons';
import BottomNavBar from '../../components/BottomNavBar';
import Card from '../../components/Card';
import Input from '../../components/Input';
import { colors, fonts, spacing } from '../../lib/theme';

export default function SwapScreen({ navigation }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [allItems, setAllItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [showSortModal, setShowSortModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [selectedSort, setSelectedSort] = useState('Newest to Oldest');
  const [selectedSizes, setSelectedSizes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [favoriteItemIds, setFavoriteItemIds] = useState(new Set());

  const db = getFirestore();
  const auth = getAuth();

  const sortOptions = [
    'Newest to Oldest',
    'Oldest to Newest',
    'Highest to Lowest Rating',
    'Lowest to Highest Rating',
  ];

  const sizeOptions = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

  useEffect(() => {
    loadSwapItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadSwapItems = async () => {
    try {
      setLoading(true);
      
      // Query only items that are available for swap and not swapped out
      const q = query(
        collection(db, 'wardrobe-plug-fyp/user/images'),
        where('postType', '==', 'forSwap'),
        where('swapStatus', '==', 'available')
      );
      
      const querySnapshot = await getDocs(q);
      
      // Fetch items with user data
      const itemsPromises = querySnapshot.docs.map(async (docSnapshot) => {
        const data = docSnapshot.data();
        
        // Fetch user data to get their rating
        let userRating = 0;
        let userName = 'User';
        let userReviewCount = 0;
        
        if (data.ownerUid) {
          try {
            console.log('Fetching user for ownerUid:', data.ownerUid);
            const userDocRef = doc(db, 'users', data.ownerUid);
            const userDocSnap = await getDoc(userDocRef);
            
            console.log('User doc exists?', userDocSnap.exists());
            
            if (userDocSnap.exists()) {
              const userData = userDocSnap.data();
              console.log('Found user data:', userData);
              userRating = userData.rating || 0;
              userName = userData.username || userData.displayName || 'User';
              userReviewCount = userData.reviewCount || 0;
              console.log('Set userRating:', userRating, 'userName:', userName, 'reviewCount:', userReviewCount);
            } else {
              console.log('No user document found for uid:', data.ownerUid);
            }
          } catch (userError) {
            console.error('Error fetching user data:', userError);
          }
        }
        
        return {
          id: docSnapshot.id,
          title: data.title || data.description || 'Item',
          image: { uri: data.url },
          rating: userRating,
          reviews: userReviewCount,
          datePosted: data.uploadedAt?.toDate?.() || new Date(),
          userName: userName,
          userRating: userRating,
          ...data
        };
      });
      
      let items = await Promise.all(itemsPromises);
      
      // Filter out current user's own items
      if (auth.currentUser) {
        items = items.filter(item => item.ownerUid !== auth.currentUser.uid);
        
        // Load favorite status
        const favQuery = query(
          collection(db, 'favoriteSwaps'),
          where('userId', '==', auth.currentUser.uid)
        );
        const favSnapshot = await getDocs(favQuery);
        const favIds = new Set(favSnapshot.docs.map(doc => doc.data().itemId));
        setFavoriteItemIds(favIds);
      }
      
      setAllItems(items);
      const sorted = applySorting(items, selectedSort);
      setFilteredItems(sorted);
    } catch (error) {
      console.error('Error loading swap items:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (query) => {
    setSearchQuery(query);
    applyFilters(query, selectedSizes);
  };

  const applyFilters = (query, sizes) => {
    let filtered = [...allItems];
    
    // Filter by search query
    if (query.trim() !== '') {
      filtered = filtered.filter(item =>
        item.title.toLowerCase().includes(query.toLowerCase())
      );
    }
    
    // Filter by sizes
    if (sizes.length > 0) {
      filtered = filtered.filter(item => {
        // Check multiple possible property names for size
        const itemSize = item.size || item.Size || item.clothingSize || item.apparelSize;
        return itemSize && sizes.includes(itemSize);
      });
    }
    
    const sorted = applySorting(filtered, selectedSort);
    setFilteredItems(sorted);
  };

  const applySorting = (items, sortType) => {
    const sorted = [...items];
    
    switch (sortType) {
      case 'Newest to Oldest':
        return sorted.sort((a, b) => new Date(b.datePosted) - new Date(a.datePosted));
      case 'Oldest to Newest':
        return sorted.sort((a, b) => new Date(a.datePosted) - new Date(b.datePosted));
      case 'Highest to Lowest Rating':
        return sorted.sort((a, b) => b.rating - a.rating);
      case 'Lowest to Highest Rating':
        return sorted.sort((a, b) => a.rating - b.rating);
      default:
        return sorted;
    }
  };

  const handleSort = (sortType) => {
    setSelectedSort(sortType);
    const sorted = applySorting(filteredItems, sortType);
    setFilteredItems(sorted);
    setShowSortModal(false);
  };

  const handleFilter = () => {
    setShowFilterModal(true);
  };

  const toggleSizeFilter = (size) => {
    let newSizes;
    if (selectedSizes.includes(size)) {
      newSizes = selectedSizes.filter(s => s !== size);
    } else {
      newSizes = [...selectedSizes, size];
    }
    setSelectedSizes(newSizes);
    applyFilters(searchQuery, newSizes);
  };

  const clearFilters = () => {
    setSelectedSizes([]);
    applyFilters(searchQuery, []);
  };

  const handleHistory = () => {
    if (!auth.currentUser) {
      Alert.alert(
        'Login Required',
        'You must be logged in to view swap history!',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Login', onPress: () => navigation.navigate('Login') }
        ]
      );
      return;
    }
    navigation.navigate('SwapHistory');
  };

  const handleFavorite = async (item) => {
    if (!auth.currentUser) {
      Alert.alert(
        'Login Required',
        'You must be logged in to save favorites!',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Login', onPress: () => navigation.navigate('Login') }
        ]
      );
      return false; // Return false to prevent visual state change
    }
    
    try {
      // Check if already favorited
      const favQuery = query(
        collection(db, 'favoriteSwaps'),
        where('userId', '==', auth.currentUser.uid),
        where('itemId', '==', item.id)
      );
      
      const favSnapshot = await getDocs(favQuery);
      
      if (!favSnapshot.empty) {
        // Already favorited, remove it
        await deleteDoc(doc(db, 'favoriteSwaps', favSnapshot.docs[0].id));
        setFavoriteItemIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(item.id);
          return newSet;
        });
        console.log('Removed from favorites:', item.title);
        return true;
      }
      
      // Not favorited yet, add it
      await addDoc(collection(db, 'favoriteSwaps'), {
        userId: auth.currentUser.uid,
        itemId: item.id,
        itemTitle: item.title,
        itemImage: item.image?.uri || item.url,
        ownerUid: item.ownerUid,
        userName: item.userName,
        userRating: item.userRating || 0,
        reviews: item.reviews || 0,
        createdAt: serverTimestamp(),
      });
      
      setFavoriteItemIds(prev => new Set([...prev, item.id]));
      console.log('Added to favorites:', item.title);
      return true; // Return true to allow visual state change
    } catch (error) {
      console.error('Error toggling favorite:', error);
      Alert.alert('Error', 'Failed to update favorites. Please try again.');
      return false;
    }
  };

  const handleSwap = async (item) => {
    if (!auth.currentUser) {
      Alert.alert(
        'Login Required',
        'You must be logged in to swap items!',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Login', onPress: () => navigation.navigate('Login') }
        ]
      );
      return;
    }

    // Check if trying to swap with yourself
    if (item.ownerUid === auth.currentUser.uid) {
      Alert.alert('Error', 'You cannot swap with yourself!');
      return;
    }

    try {
      console.log('Starting swap with item:', item.title);
      console.log('Item owner:', item.ownerUid);
      
      // Get the item owner's profile data
      const userDoc = await getDoc(doc(db, 'users', item.ownerUid));
      
      if (!userDoc.exists()) {
        Alert.alert('Error', 'Could not find user profile.');
        return;
      }
      
      const userData = userDoc.data();
      console.log('Owner data:', userData);

      const swapRequestData = {
        theirItemId: item.id,
        theirItemImage: item.image?.uri || item.url,
        theirItemTitle: item.title
      };
      
      console.log('Navigating to Chat with swapRequest:', swapRequestData);

      // Navigate to chat with swap data
      navigation.navigate('Chat', {
        user: {
          id: item.ownerUid,
          uid: item.ownerUid,
          name: userData.username || item.userName,
          photoURL: userData.photoURL
        },
        swapRequest: swapRequestData
      });
    } catch (error) {
      console.error('Error initiating swap:', error);
      Alert.alert('Error', 'Could not start swap request. Please try again.');
    }
  };

  const handleItemPress = (item) => {
    const post = {
      id: item.id,
      url: item.image?.uri || item.url,
      description: item.description || item.title,
      title: item.title,
      ownerUid: item.ownerUid,
      userName: item.userName || 'User',
      userPhotoURL: item.userPhotoURL || null,
      uploadedAt: item.uploadedAt || item.datePosted || new Date(),
      swapStatus: item.swapStatus || 'available',
      condition: item.condition || null,
      size: item.size || null,
      postType: item.postType || 'forSwap',
    };
    navigation.navigate('PostDetails', { post });
  };

  const renderItem = ({ item, index }) => (
    <Card
      item={item}
      isFavorited={favoriteItemIds.has(item.id)}
      onPress={() => handleItemPress(item)}
      onFavorite={handleFavorite}
      onSwap={handleSwap}
      style={{ marginRight: index % 2 === 0 ? spacing.sm : 0 }}
    />
  );

  const renderSortOption = (option) => {
    const isSelected = option === selectedSort;
    return (
      <TouchableOpacity
        key={option}
        style={[styles.sortOption, isSelected && styles.sortOptionSelected]}
        onPress={() => handleSort(option)}
      >
        <Text style={[styles.sortOptionText, isSelected && styles.sortOptionTextSelected]}>
          {option}
        </Text>
        {isSelected && (
          <Icon name="checkmark-outline" size={20} color={colors.accent} />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#fff" barStyle="dark-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.logo}>Swap</Text>
        <TouchableOpacity style={styles.headerIcon} onPress={handleHistory}>
          <Icon name="time-outline" size={28} color={colors.dark} />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <Input
        placeholder="search products..."
        value={searchQuery}
        onChangeText={handleSearch}
        leftIcon="search-outline"
        style={styles.searchBar}
      />

      {/* Filter and Sort */}
      <View style={styles.filterContainer}>
        <TouchableOpacity style={styles.filterButton} onPress={handleFilter}>
          <Icon name="filter-outline" size={20} color={colors.dark} />
          <Text style={styles.filterText}>Filter</Text>
          {selectedSizes.length > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{selectedSizes.length}</Text>
            </View>
          )}
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.sortButton} onPress={() => setShowSortModal(true)}>
          <Icon name="swap-vertical-outline" size={20} color={colors.dark} />
          <Text style={styles.sortText}>Sort By</Text>
        </TouchableOpacity>
      </View>

      {/* Items Grid */}
      <FlatList
        data={filteredItems}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        numColumns={2}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          loading ? (
            <Text style={{ textAlign: 'center', marginTop: 50, color: colors.dark }}>Loading items...</Text>
          ) : (
            <Text style={{ textAlign: 'center', marginTop: 50, color: colors.dark }}>No items available</Text>
          )
        }
      />

      {/* Bottom Navigation Bar */}
      <BottomNavBar navigation={navigation} activeRoute="Swap" />

      {/* Sort Modal */}
      <Modal
        visible={showSortModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowSortModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowSortModal(false)}
        >
          <TouchableOpacity
            style={styles.modalContent}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Sort By</Text>
              <TouchableOpacity onPress={() => setShowSortModal(false)}>
                <Icon name="close-outline" size={24} color={colors.dark} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.sortOptionsContainer}>
              {sortOptions.map(option => renderSortOption(option))}
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Filter Modal */}
      <Modal
        visible={showFilterModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowFilterModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowFilterModal(false)}
        >
          <TouchableOpacity
            style={styles.modalContent}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter by Size</Text>
              <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                <Icon name="close-outline" size={24} color={colors.dark} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.filterOptionsContainer}>
              <View style={styles.sizeGrid}>
                {sizeOptions.map(size => (
                  <TouchableOpacity
                    key={size}
                    style={[
                      styles.sizeOption,
                      selectedSizes.includes(size) && styles.sizeOptionSelected
                    ]}
                    onPress={() => toggleSizeFilter(size)}
                  >
                    <Text
                      style={[
                        styles.sizeOptionText,
                        selectedSizes.includes(size) && styles.sizeOptionTextSelected
                      ]}
                    >
                      {size}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              
              {selectedSizes.length > 0 && (
                <TouchableOpacity
                  style={styles.clearButton}
                  onPress={clearFilters}
                >
                  <Text style={styles.clearButtonText}>Clear All Filters</Text>
                </TouchableOpacity>
              )}
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  logo: {
    fontFamily: fonts.header,
    fontSize: 28,
    fontWeight: '700',
    color: colors.accent,
  },
  headerIcons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  headerIcon: {
    padding: 4,
  },
  searchBar: {
    marginHorizontal: spacing.md,
    marginVertical: spacing.sm,
  },
  illustrationContainer: {
    marginHorizontal: spacing.md,
    marginVertical: spacing.sm,
    borderRadius: 12,
    alignItems: 'center',
    overflow: 'hidden',
  },
  illustration: {
    width: '100%',
    height: 180,
  },
  filterContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.secondary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
  },
  filterText: {
    fontFamily: fonts.header,
    fontSize: 14,
    color: colors.dark,
    marginLeft: 4,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.secondary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
  },
  sortText: {
    fontFamily: fonts.header,
    fontSize: 14,
    color: colors.dark,
    marginLeft: 4,
  },
  listContainer: {
    paddingHorizontal: spacing.sm,
    paddingBottom: 100, // Space for bottom nav
  },
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#DAD3A1',
    paddingVertical: 8,
    paddingHorizontal: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.primary,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  navText: {
    fontFamily: fonts.body,
    fontSize: 10,
    color: colors.dark,
    marginTop: 2,
  },
  navTextActive: {
    color: colors.accent,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 30,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    fontFamily: fonts.header,
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.dark,
  },
  sortOptionsContainer: {
    padding: spacing.md,
  },
  sortOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: 8,
    marginBottom: spacing.sm,
    backgroundColor: '#F5F5F5',
  },
  sortOptionSelected: {
    backgroundColor: colors.secondary,
    borderWidth: 2,
    borderColor: colors.accent,
  },
  sortOptionText: {
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.dark,
  },
  sortOptionTextSelected: {
    fontWeight: 'bold',
    color: colors.accent,
  },
  filterBadge: {
    backgroundColor: colors.accent,
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  filterBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  filterOptionsContainer: {
    padding: spacing.md,
  },
  sizeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  sizeOption: {
    width: 80,
    height: 50,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  sizeOptionSelected: {
    backgroundColor: colors.secondary,
    borderColor: colors.accent,
  },
  sizeOptionText: {
    fontFamily: fonts.header,
    fontSize: 16,
    fontWeight: '600',
    color: colors.dark,
  },
  sizeOptionTextSelected: {
    color: colors.accent,
    fontWeight: 'bold',
  },
  clearButton: {
    backgroundColor: '#FF3B30',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  clearButtonText: {
    fontFamily: fonts.header,
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});