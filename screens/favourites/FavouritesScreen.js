import { useFocusEffect } from '@react-navigation/native';
import { getAuth } from 'firebase/auth';
import { collection, getDocs, getFirestore, query, where } from 'firebase/firestore';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Image, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import BottomNavBar from '../../components/BottomNavBar';
import { useAuth } from '../../context/GuestContext';
import { colors, fonts, spacing } from '../../lib/theme';

export default function FavouritesScreen({ navigation }) {
  const { isGuest } = useAuth();
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const db = getFirestore();
  const auth = getAuth();
  const currentUser = auth.currentUser;

  useFocusEffect(
    useCallback(() => {
      if (!isGuest) {
        loadFavorites();
      }
    }, [isGuest])
  );

  const loadFavorites = async () => {
    if (!currentUser) return;

    try {
      setLoading(true);
      
      // Get user's favorites
      const favoritesQuery = query(
        collection(db, 'favorites'),
        where('userId', '==', currentUser.uid)
      );
      const favoritesSnapshot = await getDocs(favoritesQuery);
      const postIds = favoritesSnapshot.docs.map(doc => doc.data().postId);

      if (postIds.length === 0) {
        setFavorites([]);
        setLoading(false);
        return;
      }

      // Get post details for each favorited post
      const postsData = [];
      for (const postId of postIds) {
        const postsQuery = query(
          collection(db, 'wardrobe-plug-fyp/user/images'),
          where('__name__', '==', postId)
        );
        const postsSnapshot = await getDocs(postsQuery);
        
        postsSnapshot.forEach(doc => {
          postsData.push({
            id: doc.id,
            ...doc.data()
          });
        });
      }

      setFavorites(postsData);
    } catch (error) {
      console.error('Error loading favorites:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadFavorites();
  };

  const handlePostPress = (post) => {
    navigation.navigate('PostDetails', { post });
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.gridItem}
      onPress={() => handlePostPress(item)}
    >
      <Image source={{ uri: item.url }} style={styles.gridImage} />
    </TouchableOpacity>
  );

  // If guest, show login prompt
  if (isGuest) {
    return (
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>FAVOURITES</Text>
        </View>

        {/* Guest Content */}
        <View style={styles.content}>
          <Image 
            source={require('../../assets/images/logo.png')} 
            style={styles.logo} 
            resizeMode="contain" 
          />
          <Text style={styles.guestMessage}>Please login to access Favourites</Text>
          <TouchableOpacity 
            style={styles.loginButton}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.loginButtonText}>Login</Text>
          </TouchableOpacity>
        </View>

        <BottomNavBar navigation={navigation} activeRoute="Favorites" />
      </View>
    );
  }

  // Normal screen content for logged-in users
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>FAVOURITES</Text>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : favorites.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No saved posts yet</Text>
          <Text style={styles.emptySubtext}>Tap the star icon on posts to save them here</Text>
        </View>
      ) : (
        <FlatList
          data={favorites}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          numColumns={3}
          contentContainerStyle={styles.gridContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
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
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.dark,
    marginBottom: spacing.sm,
    fontFamily: fonts.body,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.gray,
    textAlign: 'center',
    fontFamily: fonts.body,
  },
  gridContainer: {
    padding: 2,
  },
  gridItem: {
    flex: 1,
    margin: 2,
    aspectRatio: 1,
    maxWidth: '33.33%',
  },
  gridImage: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.secondary,
  },
  logo: {
    width: 300,
    height: 300,
    marginBottom: spacing.sm,
  },
  guestMessage: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.dark,
    textAlign: 'center',
    marginBottom: spacing.lg,
    fontFamily: fonts.header,
  },
  loginButton: {
    backgroundColor: colors.dark,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
    borderRadius: 25,
    padding: 20,
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.light,
    fontFamily: fonts.header,
  },

});