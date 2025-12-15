
import { useFocusEffect } from '@react-navigation/native';
import { getAuth } from 'firebase/auth';
import {
  collection,
  getDocs,
  getFirestore,
  orderBy,
  query,
  where
} from 'firebase/firestore';
import React, { useCallback, useState } from 'react';
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
import { colors, fonts, spacing } from '../../lib/theme';

const { width } = Dimensions.get('window');
const COLUMN_COUNT = 3;
const SPACING = 2;
const ITEM_SIZE = (width - (COLUMN_COUNT + 1) * SPACING) / COLUMN_COUNT;

export default function FavouritesScreen({ navigation }) {
  const [favorites, setFavorites] = useState([]);
  const [favoriteOutfits, setFavoriteOutfits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('posts');

  const db = getFirestore();
  const auth = getAuth();
  const currentUser = auth.currentUser;

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
      
      // Load favorite outfits from virtual try-on
      const outfitsQuery = query(
        collection(db, 'favoriteOutfits'),
        where('userId', '==', currentUser.uid),
        orderBy('createdAt', 'desc')
      );
      
      const outfitsSnapshot = await getDocs(outfitsQuery);
      const outfitsData = outfitsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      
      setFavoriteOutfits(outfitsData);
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

  const renderOutfitItem = ({ item }) => (
    <TouchableOpacity
      style={styles.outfitCard}
      onPress={() => {
        Alert.alert(
          'Outfit Details',
          `Top: ${item.topName || 'Unknown'}\nBottom: ${item.bottomName || 'Unknown'}`,
          [{ text: 'OK' }]
        );
      }}
    >
      <View style={styles.outfitImages}>
        {item.topImage && (
          <Image source={{ uri: item.topImage }} style={styles.outfitItemImage} />
        )}
        {item.bottomImage && (
          <Image source={{ uri: item.bottomImage }} style={styles.outfitItemImage} />
        )}
      </View>
      <View style={styles.outfitInfo}>
        <Text style={styles.outfitText} numberOfLines={1}>
          {item.topName || 'Top'} + {item.bottomName || 'Bottom'}
        </Text>
        <Text style={styles.outfitDate}>
          {item.createdAt?.toDate?.().toLocaleDateString() || ''}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>FAVOURITES</Text>
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
            data={favorites}
            renderItem={renderFavoriteItem}
            keyExtractor={(item) => item.id}
            numColumns={COLUMN_COUNT}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.gridContainer}
          />
        )
      ) : (
        favoriteOutfits.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Icon name="shirt-outline" size={64} color={colors.gray} />
            <Text style={styles.emptyText}>No favorite outfits yet</Text>
            <Text style={styles.emptySubtext}>Try on outfits in the virtual mirror and save your favorites!</Text>
          </View>
        ) : (
          <FlatList
            data={favoriteOutfits}
            renderItem={renderOutfitItem}
            keyExtractor={(item) => item.id}
            numColumns={2}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.gridContainer}
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
    justifyContent: 'center',
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
    padding: SPACING,
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
    borderRadius: 8,
    margin: spacing.xs,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  outfitImages: {
    flexDirection: 'row',
    height: 150,
  },
  outfitItemImage: {
    flex: 1,
    height: '100%',
  },
  outfitInfo: {
    padding: spacing.sm,
  },
  outfitText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.dark,
    marginBottom: 4,
  },
  outfitDate: {
    fontSize: 12,
    color: colors.gray,
  },
});
