
import { useFocusEffect } from '@react-navigation/native';
import { getAuth } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  orderBy,
  query,
  where
} from 'firebase/firestore';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import Icon from '../../assets/icons/icons';
import BottomNavBar from '../../components/BottomNavBar';
import useGuest from '../../hooks/useGuest';
import { colors, fonts, spacing } from '../../lib/theme';

const { width } = Dimensions.get('window');
const COLUMN_COUNT = 3;
const SPACING = 2;
const ITEM_SIZE = (width - (COLUMN_COUNT + 1) * SPACING) / COLUMN_COUNT;

export default function FavouritesScreen({ navigation }) {
  const [favorites, setFavorites] = useState([]);
  const [favoriteOutfits, setFavoriteOutfits] = useState([]);
  const [favoriteSwaps, setFavoriteSwaps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('posts');

  const db = getFirestore();
  const auth = getAuth();
  const currentUser = auth.currentUser;
  const { isGuest } = useGuest();

  // Check if user is guest
  useEffect(() => {
    if (isGuest) {
      Alert.alert(
        'Login Required',
        'You must be logged in to access favourites!',
        [
          {
            text: 'Login',
            onPress: () => navigation.navigate('Welcome')
          }
        ],
        { cancelable: false }
      );
    }
  }, [isGuest, navigation]);

  useFocusEffect(
    useCallback(() => {
      loadFavorites();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  const loadFavorites = async () => {
    if (!currentUser) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // Load favorite posts
      const favoritesQuery = query(
        collection(db, 'favorites'),
        where('userId', '==', currentUser.uid),
        orderBy('createdAt', 'desc')
      );
      
      const favoritesSnapshot = await getDocs(favoritesQuery);
      const favoritesData = favoritesSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      
      setFavorites(favoritesData);
      
      // Load favorite outfits from virtual try-on with updated usernames
      const outfitsQuery = query(
        collection(db, 'favoriteOutfits'),
        where('userId', '==', currentUser.uid),
        orderBy('createdAt', 'desc')
      );
      
      const outfitsSnapshot = await getDocs(outfitsQuery);
      const outfitsData = [];
      
      // Fetch current usernames for each outfit
      for (const docSnap of outfitsSnapshot.docs) {
        const outfit = { id: docSnap.id, ...docSnap.data() };
        
        // Update topItem username if exists
        if (outfit.topItem && outfit.topItem.ownerUid) {
          try {
            const topUserDoc = await getDoc(doc(db, 'users', outfit.topItem.ownerUid));
            if (topUserDoc.exists()) {
              const userData = topUserDoc.data();
              outfit.topItem.userName = userData.username || userData.displayName || 'User';
            }
          } catch (err) {
            console.error('Error fetching top item user:', err);
          }
        }
        
        // Update bottomItem username if exists
        if (outfit.bottomItem && outfit.bottomItem.ownerUid) {
          try {
            const bottomUserDoc = await getDoc(doc(db, 'users', outfit.bottomItem.ownerUid));
            if (bottomUserDoc.exists()) {
              const userData = bottomUserDoc.data();
              outfit.bottomItem.userName = userData.username || userData.displayName || 'User';
            }
          } catch (err) {
            console.error('Error fetching bottom item user:', err);
          }
        }
        
        outfitsData.push(outfit);
      }
      setFavoriteOutfits(outfitsData);
      
      // Load favorite swaps
      const swapsQuery = query(
        collection(db, 'favoriteSwaps'),
        where('userId', '==', currentUser.uid),
        orderBy('createdAt', 'desc')
      );
      
      const swapsSnapshot = await getDocs(swapsQuery);
      const swapsData = swapsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      
      setFavoriteSwaps(swapsData);
    } catch (error) {
      console.error('Error loading favorites:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePostPress = (favorite) => {
    const post = {
      id: favorite.postId,
      url: favorite.postUrl,
      description: favorite.postDescription,
      ownerUid: favorite.ownerUid,
      userName: favorite.userName,
      userPhotoURL: favorite.userPhotoURL,
      uploadedAt: favorite.uploadedAt,
      swapStatus: null,
    };
    navigation.navigate('PostDetails', { post });
  };

  const renderFavoriteItem = ({ item }) => (
    <TouchableOpacity
      style={styles.gridItem}
      onPress={() => handlePostPress(item)}
    >
      <Image source={{ uri: item.postUrl }} style={styles.gridImage} />
    </TouchableOpacity>
  );

  const handleOutfitPress = (outfit) => {
    const items = [];
    
    if (outfit.topItem) {
      items.push({
        ...outfit.topItem,
        url: outfit.topItem.url,
        userName: outfit.topItem.userName || 'User',
        clothingType: 'top'
      });
    }
    
    if (outfit.bottomItem) {
      items.push({
        ...outfit.bottomItem,
        url: outfit.bottomItem.url,
        userName: outfit.bottomItem.userName || 'User',
        clothingType: 'bottom'
      });
    }
    
    navigation.navigate('TryOnScreen', {
      allItems: items,
      savedTransforms: outfit.transforms,
      fromFavorites: true
    });
  };

  const handleUnfavoriteOutfit = async (outfitId) => {
    Alert.alert(
      'Remove Outfit',
      'Are you sure you want to remove this outfit from your favorites?',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'favoriteOutfits', outfitId));
              setFavoriteOutfits(prev => prev.filter(outfit => outfit.id !== outfitId));
              Alert.alert('Success', 'Outfit removed from favorites');
            } catch (error) {
              console.error('Error removing outfit:', error);
              Alert.alert('Error', 'Failed to remove outfit. Please try again.');
            }
          }
        }
      ]
    );
  };

  const renderOutfitItem = ({ item }) => (
    <TouchableOpacity
      style={styles.outfitCard}
      onPress={() => handleOutfitPress(item)}
    >
      <TouchableOpacity
        style={styles.deleteOutfitButton}
        onPress={(e) => {
          e.stopPropagation();
          handleUnfavoriteOutfit(item.id);
        }}
      >
        <Icon name="close-circle" size={24} color="#ff4444" />
      </TouchableOpacity>
      <View style={styles.outfitImages}>
        {item.topItem && (
          <View style={styles.outfitItemContainer}>
            <Image source={{ uri: item.topItem.url }} style={styles.outfitItemImage} />
            <Text style={styles.outfitItemLabel} numberOfLines={1}>
              {item.topItem.title || 'Top'}
            </Text>
            <Text style={styles.outfitUserName} numberOfLines={1}>
              @{item.topItem.userName}
            </Text>
          </View>
        )}
        {item.bottomItem && (
          <View style={styles.outfitItemContainer}>
            <Image source={{ uri: item.bottomItem.url }} style={styles.outfitItemImage} />
            <Text style={styles.outfitItemLabel} numberOfLines={1}>
              {item.bottomItem.title || 'Bottom'}
            </Text>
            <Text style={styles.outfitUserName} numberOfLines={1}>
              @{item.bottomItem.userName}
            </Text>
          </View>
        )}
      </View>
      <View style={styles.outfitFooter}>
        <Text style={styles.outfitDate}>
          {item.createdAt?.toDate?.().toLocaleDateString() || 'Saved outfit'}
        </Text>
        <TouchableOpacity
          style={styles.tryAgainButton}
          onPress={() => handleOutfitPress(item)}
        >
          <Icon name="eye" size={16} color={colors.accent} />
          <Text style={styles.tryAgainText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const renderSwapItem = ({ item }) => (
    <TouchableOpacity
      style={styles.swapCard}
      onPress={() => {
        navigation.navigate('PostDetails', { 
          post: {
            id: item.itemId,
            url: item.itemImage,
            description: item.itemTitle || 'Item for swap',
            title: item.itemTitle,
            ownerUid: item.ownerUid,
            userName: item.userName || 'User',
            userPhotoURL: item.userPhotoURL || null,
            uploadedAt: item.createdAt || new Date(),
            swapStatus: 'available',
          }
        });
      }}
    >
      <Image source={{ uri: item.itemImage }} style={styles.swapImage} />
      <View style={styles.swapInfo}>
        <Text style={styles.swapTitle} numberOfLines={2}>
          {item.itemTitle}
        </Text>
        <View style={styles.swapRating}>
          <Icon name="star" size={14} color={colors.highlight} />
          <Text style={styles.swapRatingText}>
            {item.userRating?.toFixed(1) || '0.0'} ({item.reviews || 0})
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Favourites</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'posts' && styles.activeTab]}
          onPress={() => setActiveTab('posts')}
        >
          <Icon name="images-outline" size={20} color={colors.dark} />
          <Text style={styles.tabText}>Posts</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'swaps' && styles.activeTab]}
          onPress={() => setActiveTab('swaps')}
        >
          <Icon name="swap-horizontal-outline" size={20} color={colors.dark} />
          <Text style={styles.tabText}>Swaps</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'outfits' && styles.activeTab]}
          onPress={() => setActiveTab('outfits')}
        >
          <Icon name="shirt-outline" size={20} color={colors.dark} />
          <Text style={styles.tabText}>Outfits</Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.loadingText}>Loading favorites...</Text>
        </View>
      ) : activeTab === 'posts' ? (
        favorites.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Icon name="star-outline" size={64} color={colors.gray} />
            <Text style={styles.emptyText}>No favorite posts yet</Text>
            <Text style={styles.emptySubtext}>Start favoriting posts to see them here!</Text>
          </View>
        ) : (
          <FlatList
            key="posts"
            data={favorites}
            renderItem={renderFavoriteItem}
            keyExtractor={(item) => item.id}
            numColumns={COLUMN_COUNT}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.gridContainer}
          />
        )
      ) : activeTab === 'outfits' ? (
        favoriteOutfits.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Icon name="shirt-outline" size={64} color={colors.gray} />
            <Text style={styles.emptyText}>No favorite outfits yet</Text>
            <Text style={styles.emptySubtext}>Try on outfits in the virtual mirror and save your favorites!</Text>
          </View>
        ) : (
          <FlatList
            key="outfits"
            data={favoriteOutfits}
            renderItem={renderOutfitItem}
            keyExtractor={(item) => item.id}
            numColumns={2}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.twoColumnContainer}
            columnWrapperStyle={styles.columnWrapper}
          />
        )
      ) : (
        favoriteSwaps.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Icon name="swap-horizontal-outline" size={64} color={colors.gray} />
            <Text style={styles.emptyText}>No favorite swaps yet</Text>
            <Text style={styles.emptySubtext}>Heart swap items to save them here!</Text>
          </View>
        ) : (
          <FlatList
            key="swaps"
            data={favoriteSwaps}
            renderItem={renderSwapItem}
            keyExtractor={(item) => item.id}
            numColumns={2}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.twoColumnContainer}
            columnWrapperStyle={styles.columnWrapper}
          />
        )
      )}

      <BottomNavBar navigation={navigation} activeRoute="Favorites" />
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
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    fontFamily: fonts.header,
    color: colors.accent,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: 16,
    color: colors.gray,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  emptyText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.dark,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  emptySubtext: {
    fontSize: 16,
    color: colors.gray,
    textAlign: 'center',
  },
  gridContainer: {
    padding: spacing.sm,
    paddingBottom: 80,
  },
  twoColumnContainer: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: 100,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    paddingHorizontal: 0,
    marginBottom: spacing.md,
  },
  gridItem: {
    width: ITEM_SIZE,
    height: ITEM_SIZE,
    margin: SPACING / 2,
  },
  gridImage: {
    width: '100%',
    height: '100%',
    borderRadius: 4,
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
    gap: spacing.xs,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: colors.accent,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.dark,
  },
  outfitCard: {
    width: (width - spacing.md * 3) / 2,
    backgroundColor: '#fff',
    borderRadius: 12,
    margin: spacing.sm,
    marginHorizontal: spacing.xs,
    marginVertical: spacing.sm,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    position: 'relative',
  },
  deleteOutfitButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 10,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 2,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  outfitImages: {
    flexDirection: 'row',
    height: 180,
    gap: 2,
  },
  outfitItemContainer: {
    flex: 1,
    backgroundColor: '#f9f9f9',
  },
  outfitItemImage: {
    width: '100%',
    height: 120,
    resizeMode: 'cover',
  },
  outfitItemLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.dark,
    paddingHorizontal: 6,
    paddingTop: 4,
  },
  outfitUserName: {
    fontSize: 10,
    color: colors.gray,
    paddingHorizontal: 6,
    paddingBottom: 4,
  },
  outfitFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  outfitDate: {
    fontSize: 11,
    color: colors.gray,
  },
  tryAgainButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: colors.secondary,
    borderRadius: 12,
  },
  tryAgainText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.accent,
  },
  swapCard: {
    width: (width - spacing.md * 3) / 2,
    backgroundColor: '#fff',
    borderRadius: 8,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  swapImage: {
    width: '100%',
    height: 150,
    resizeMode: 'cover',
  },
  swapInfo: {
    padding: spacing.sm,
  },
  swapTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.dark,
    marginBottom: 4,
  },
  swapRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  swapRatingText: {
    fontSize: 12,
    color: colors.gray,
  },
});
