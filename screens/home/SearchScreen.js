import { getAuth, listUsers } from 'firebase/auth';
import { collection, getDocs, getFirestore, query, where } from 'firebase/firestore';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from '../../assets/icons/icons';
import { colors, fonts, spacing } from '../../lib/theme';


export default function SearchScreen({ navigation }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('Accounts'); // 'Accounts', 'For Fun', 'For Swap'
  const [loading, setLoading] = useState(false);
  const [searchResults, setSearchResults] = useState([]);

  const db = getFirestore();
  const auth = getAuth();
  const currentUser = auth.currentUser;

  // Renamed parameter from 'query' to 'searchText' to avoid shadowing Firestore's query function
  const handleSearch = useCallback(async (searchText) => {
    if (!searchText.trim()) {
      setSearchResults([]);
      return;
    }

    setLoading(true);
    try {
      if (activeTab === 'Accounts') {
        // Get authenticated user UIDs (client-side workaround: filter by currentUser only, or use a cloud function for full list)
        // Here, we only show the current user and users in Firestore for demo purposes
        const usersQuery = collection(db, 'users');
        const usersSnapshot = await getDocs(usersQuery);

        const results = [];
        usersSnapshot.docs.forEach(doc => {
          const userData = doc.data();
          const username = userData.username || '';
          // Only show if not deleted/inactive and not admin
          if ((userData.deleted === true || userData.active === false) || (userData.role && userData.role.toLowerCase() === 'admin') || (userData.username && userData.username.toLowerCase().includes('admin'))) {
            return;
          }
          // Only show if matches search and is current user or not (simulate auth check)
          if (username.toLowerCase().includes(searchText.toLowerCase()) && (doc.id === currentUser?.uid || doc.id)) {
            results.push({
              type: 'account',
              uid: doc.id,
              username: userData.username,
              photoURL: userData.photoURL || null,
              followers: userData.followers || [],
              following: userData.following || [],
            });
          }
        });

        // Check for mutual followers
        if (currentUser) {
          const currentUserDoc = await getDocs(query(collection(db, 'users'), where('__name__', '==', currentUser.uid)));
          const currentUserFollowing = currentUserDoc.docs[0]?.data()?.following || [];

          results.forEach(result => {
            const mutualFollowers = result.followers.filter(uid => currentUserFollowing.includes(uid));
            result.mutualCount = mutualFollowers.length;
            result.followerCount = result.followers.length;
          });
        }

        setSearchResults(results);
      } else {
        // Search for posts
        const postType = activeTab === 'For Fun' ? 'forFun' : 'forSwap';
        const postsQuery = collection(db, 'wardrobe-plug-fyp/user/images');
        const postsSnapshot = await getDocs(postsQuery);

        const results = [];
        postsSnapshot.docs.forEach(doc => {
          const postData = doc.data();
          const title = postData.title || '';
          const description = postData.description || '';
          const category = postData.category || postData.postType || '';

          // Only show posts of the correct type
          const isCorrectType = (postType === 'forFun' && (category.toLowerCase() === 'forfun' || postData.postType === 'forFun')) ||
                                (postType === 'forSwap' && (category.toLowerCase() === 'forswap' || postData.postType === 'forSwap'));
          const matchesSearch = title.toLowerCase().includes(searchText.toLowerCase()) ||
                               description.toLowerCase().includes(searchText.toLowerCase());

          if (isCorrectType && matchesSearch) {
            results.push({
              type: 'post',
              id: doc.id,
              ...postData,
            });
          }
        });

        setSearchResults(results);
      }
    } catch (error) {
      console.error('Error searching:', error);
    } finally {
      setLoading(false);
    }
  }, [activeTab, currentUser, db]);

  const renderAccountItem = ({ item }) => (
    <TouchableOpacity
      style={styles.accountItem}
      onPress={() => navigation.navigate('UserProfile', { userId: item.uid, username: item.username })}
    >
      <View style={styles.accountAvatar}>
        {item.photoURL ? (
          <Image source={{ uri: item.photoURL }} style={styles.accountAvatarImage} />
        ) : (
          <Icon name="person" size={40} color={colors.gray} />
        )}
      </View>
      <View style={styles.accountInfo}>
        <Text style={styles.accountUsername}>{item.username}</Text>
        {item.mutualCount > 0 && (
          <Text style={styles.accountFollowedBy}>
            Followed by {item.mutualCount} user{item.mutualCount > 1 ? 's' : ''} you follow
          </Text>
        )}
        {item.mutualCount === 0 && item.followerCount > 0 && (
          <Text style={styles.accountFollowedBy}>
            {item.followerCount} follower{item.followerCount > 1 ? 's' : ''}
          </Text>
        )}
      </View>
      <Icon name="chevron-forward" size={20} color={colors.gray} />
    </TouchableOpacity>
  );

  const renderPostItem = ({ item }) => (
    <TouchableOpacity
      style={styles.postItem}
      onPress={() => navigation.navigate('PostDetails', { post: item })}
    >
      <Image source={{ uri: item.url }} style={styles.postImage} />
      <View style={styles.postOverlay}>
        <Text style={styles.postUsername}>{item.userName}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color={colors.dark} />
        </TouchableOpacity>
        <View style={styles.searchInputContainer}>
          <Icon name="search" size={20} color={colors.gray} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search"
            value={searchQuery}
            onChangeText={(text) => {
              setSearchQuery(text);
              handleSearch(text);
            }}
            autoFocus
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => {
              setSearchQuery('');
              setSearchResults([]);
            }}>
              <Icon name="close-circle" size={20} color={colors.gray} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'Accounts' && styles.activeTab]}
          onPress={() => {
            setActiveTab('Accounts');
            setSearchResults([]);
          }}
        >
          <Text style={[styles.tabText, activeTab === 'Accounts' && styles.activeTabText]}>
            Accounts
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'For Fun' && styles.activeTab]}
          onPress={() => {
            setActiveTab('For Fun');
            setSearchResults([]);
          }}
        >
          <Text style={[styles.tabText, activeTab === 'For Fun' && styles.activeTabText]}>
            For Fun
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'For Swap' && styles.activeTab]}
          onPress={() => {
            setActiveTab('For Swap');
            setSearchResults([]);
          }}
        >
          <Text style={[styles.tabText, activeTab === 'For Swap' && styles.activeTabText]}>
            For Swap
          </Text>
        </TouchableOpacity>
      </View>

      {/* Results */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : searchQuery.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Icon name="search" size={64} color={colors.gray} />
          <Text style={styles.emptyText}>Search for accounts or posts</Text>
          <Text style={styles.emptySubtext}>
            Try searching for people, clothing items, or styles
          </Text>
        </View>
      ) : searchResults.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Icon name="alert-circle-outline" size={64} color={colors.gray} />
          <Text style={styles.emptyText}>No results found</Text>
          <Text style={styles.emptySubtext}>
            Try searching with different keywords
          </Text>
        </View>
      ) : activeTab === 'Accounts' ? (
        <FlatList
          data={searchResults}
          renderItem={renderAccountItem}
          keyExtractor={(item) => item.uid}
          contentContainerStyle={styles.resultsList}
        />
      ) : (
        <FlatList
          data={searchResults}
          renderItem={renderPostItem}
          keyExtractor={(item) => item.id}
          numColumns={3}
          contentContainerStyle={styles.postsGrid}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.secondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    gap: spacing.sm,
  },
  backButton: {
    padding: spacing.xs,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: spacing.sm,
    color: colors.dark,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: colors.dark,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.gray,
  },
  activeTabText: {
    color: colors.dark,
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
    paddingHorizontal: spacing.xl,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.dark,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.gray,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  resultsList: {
    paddingVertical: spacing.sm,
  },
  accountItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    gap: spacing.md,
  },
  accountAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  accountAvatarImage: {
    width: '100%',
    height: '100%',
  },
  accountInfo: {
    flex: 1,
  },
  accountUsername: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.dark,
    marginBottom: 2,
  },
  accountFollowedBy: {
    fontSize: 13,
    color: colors.gray,
  },
  postsGrid: {
    paddingTop: 2,
  },
  postItem: {
    width: '33.33%',
    aspectRatio: 1,
    padding: 1,
  },
  postImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f0f0f0',
  },
  postOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 1,
    right: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: spacing.xs,
  },
  postUsername: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '500',
  },
});
