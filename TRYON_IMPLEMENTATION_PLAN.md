# Virtual Try-On Enhancement - Complete Implementation

## Summary of Requirements
1. Allow users to click "Try On Virtually" on other users' profile posts
2. Pre-select the clicked item in the Virtual Try-On screen
3. AI suggests matching items from other users' swap posts
4. Users can favorite complete outfits (sets) or individual items
5. Favorites appear in the Favourites screen under "Outfits" tab
6. Support trying on just top, just bottom, or complete set

## Implementation

### STEP 1: Add Try-On Button to Each Swap Post in UserProfileScreen

**Location:** `screens/profile/UserProfileScreen.js`

Add a "Try On" badge/button overlay on each swap post image:

```javascript
// Inside the post mapping (around line 1040)
{activeTab === 'forSwap' && post.swapStatus === 'available' && (
  <TouchableOpacity
    style={styles.tryOnBadge}
    onPress={(e) => {
      e.stopPropagation();
      navigation.navigate('TryOnScreen', {
        preSelectedItem: post,
        allItems: displayPosts.filter(p => p.postType === 'forSwap'),
        enableSuggestions: true,
        fromOtherUser: true
      });
    }}
  >
    <Icon name="shirt-outline" size={16} color="#fff" />
    <Text style={styles.tryOnBadgeText}>Try On</Text>
  </TouchableOpacity>
)}
```

**New Styles:**
```javascript
tryOnBadge: {
  position: 'absolute',
  bottom: 6,
  left: 6,
  flexDirection: 'row',
  alignItems: 'center',
  gap: 4,
  backgroundColor: colors.accent,
  paddingHorizontal: 8,
  paddingVertical: 4,
  borderRadius: 12,
},
tryOnBadgeText: {
  fontSize: 10,
  fontWeight: '600',
  color: '#fff',
},
```

### STEP 2: Update TryOnScreen to Handle Pre-Selected Items

**Location:** `screens/profile/TryOnScreen.js`

Modify the component to:
1. Accept `preSelectedItem` param
2. Pre-select the item based on its clothing type
3. Load matching suggestions from other users

```javascript
export default function TryOnScreen({ route, navigation }) {
  const { 
    allItems = [], 
    preSelectedItem = null,
    enableSuggestions = false,
    fromOtherUser = false 
  } = route.params || {};

  const [currentTopIndex, setCurrentTopIndex] = useState(0);
  const [currentBottomIndex, setCurrentBottomIndex] = useState(0);
  const [suggestedItems, setSuggestedItems] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [favoriteOutfits, setFavoriteOutfits] = useState([]);

  // Initialize with pre-selected item
  useEffect(() => {
    if (preSelectedItem) {
      const isTop = preSelectedItem.clothingType === 'top' || 
                    preSelectedItem.title?.toLowerCase().includes('shirt') ||
                    preSelectedItem.title?.toLowerCase().includes('top');
      
      if (isTop) {
        const topIndex = tops.findIndex(t => t.id === preSelectedItem.id);
        if (topIndex >= 0) setCurrentTopIndex(topIndex);
        
        // Load matching bottoms if enabled
        if (enableSuggestions) {
          loadMatchingBottoms(preSelectedItem);
        }
      } else {
        const bottomIndex = bottoms.findIndex(b => b.id === preSelectedItem.id);
        if (bottomIndex >= 0) setCurrentBottomIndex(bottomIndex);
        
        // Load matching tops if enabled
        if (enableSuggestions) {
          loadMatchingTops(preSelectedItem);
        }
      }
    }
  }, [preSelectedItem]);
  
  // Rest of component...
}
```

### STEP 3: Implement AI Matching Algorithm

**Location:** `screens/profile/TryOnScreen.js`

Add functions to fetch and match items:

```javascript
const loadMatchingTops = async (bottomItem) => {
  setLoadingSuggestions(true);
  try {
    const auth = getAuth();
    const currentUser = auth.currentUser;
    
    // Fetch all swap posts that are tops
    const q = query(
      collection(firestore, 'wardrobe-plug-fyp/user/images'),
      where('postType', '==', 'forSwap'),
      where('swapStatus', '==', 'available')
    );
    
    const querySnapshot = await getDocs(q);
    const allTops = [];
    
    for (const docSnap of querySnapshot.docs) {
      const post = { id: docSnap.id, ...docSnap.data() };
      
      // Skip own items
      if (post.ownerUid === currentUser?.uid) continue;
      
      // Check if it's a top
      const isTop = post.clothingType === 'top' ||
                    post.title?.toLowerCase().includes('shirt') ||
                    post.title?.toLowerCase().includes('top') ||
                    post.title?.toLowerCase().includes('jacket') ||
                    post.title?.toLowerCase().includes('blouse');
      
      if (isTop) {
        // Get latest owner info
        const userDoc = await getDoc(doc(firestore, 'users', post.ownerUid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          allTops.push({
            ...post,
            userName: userData.username || 'User',
            userPhotoURL: userData.photoURL || null
          });
        }
      }
    }
    
    // Simple matching algorithm
    const matchedTops = allTops.map(top => ({
      ...top,
      matchScore: calculateMatchScore(top, bottomItem)
    }))
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, 10); // Top 10 matches
    
    setSuggestedItems(matchedTops);
  } catch (error) {
    console.error('Error loading matching tops:', error);
  } finally {
    setLoadingSuggestions(false);
  }
};

const loadMatchingBottoms = async (topItem) => {
  // Similar implementation for bottoms
  // (mirror the logic above)
};

const calculateMatchScore = (item1, item2) => {
  let score = 0;
  
  // Color matching (basic implementation)
  const colors1 = extractColors(item1.title + ' ' + item1.description);
  const colors2 = extractColors(item2.title + ' ' + item2.description);
  
  if (colors1.some(c => colors2.includes(c))) score += 30;
  
  // Style matching
  const styles1 = extractStyles(item1.title + ' ' + item1.description);
  const styles2 = extractStyles(item2.title + ' ' + item2.description);
  
  if (styles1.some(s => styles2.includes(s))) score += 40;
  
  // Season matching
  const season1 = extractSeason(item1.title + ' ' + item1.description);
  const season2 = extractSeason(item2.title + ' ' + item2.description);
  
  if (season1 === season2) score += 20;
  
  // Rating bonus
  if (item1.rating > 4) score += 10;
  
  return score;
};

const extractColors = (text) => {
  const colorKeywords = ['black', 'white', 'red', 'blue', 'green', 'yellow', 'pink', 'purple', 'brown', 'gray', 'navy', 'beige'];
  return colorKeywords.filter(color => text.toLowerCase().includes(color));
};

const extractStyles = (text) => {
  const styleKeywords = ['casual', 'formal', 'sporty', 'vintage', 'modern', 'classic', 'streetwear'];
  return styleKeywords.filter(style => text.toLowerCase().includes(style));
};

const extractSeason = (text) => {
  if (text.toLowerCase().includes('summer') || text.toLowerCase().includes('short')) return 'summer';
  if (text.toLowerCase().includes('winter') || text.toLowerCase().includes('jacket')) return 'winter';
  if (text.toLowerCase().includes('spring')) return 'spring';
  if (text.toLowerCase().includes('fall') || text.toLowerCase().includes('autumn')) return 'fall';
  return 'all-season';
};
```

### STEP 4: Add Favorite Outfit Functionality

**Location:** `screens/profile/TryOnScreen.js`

Add favorite button and save logic:

```javascript
const saveOutfitToFavorites = async () => {
  try {
    const auth = getAuth();
    const currentUser = auth.currentUser;
    
    if (!currentUser) {
      Alert.alert('Login Required', 'Please login to save outfits');
      return;
    }
    
    const outfitData = {
      userId: currentUser.uid,
      topItem: selectedTop ? {
        id: selectedTop.id,
        url: selectedTop.url,
        title: selectedTop.title,
        ownerUid: selectedTop.ownerUid,
        userName: selectedTop.userName,
      } : null,
      bottomItem: selectedBottom ? {
        id: selectedBottom.id,
        url: selectedBottom.url,
        title: selectedBottom.title,
        ownerUid: selectedBottom.ownerUid,
        userName: selectedBottom.userName,
      } : null,
      transforms: {
        topScale: topScale._value,
        topTranslateX: topTranslateX._value,
        topTranslateY: topTranslateY._value,
        bottomScale: bottomScale._value,
        bottomTranslateX: bottomTranslateX._value,
        bottomTranslateY: bottomTranslateY._value,
      },
      createdAt: new Date(),
    };
    
    await addDoc(collection(firestore, 'favorite_outfits'), outfitData);
    
    Alert.alert('Success', 'Outfit saved to favorites!');
  } catch (error) {
    console.error('Error saving outfit:', error);
    Alert.alert('Error', 'Failed to save outfit');
  }
};

// Add UI button
<TouchableOpacity 
  style={styles.favoriteButton}
  onPress={saveOutfitToFavorites}
>
  <Icon name="heart-outline" size={24} color={colors.accent} />
  <Text style={styles.favoriteButtonText}>Save Outfit</Text>
</TouchableOpacity>
```

### STEP 5: Update FavouritesScreen to Show Outfits

**Location:** `screens/favourites/FavouritesScreen.js`

Add "Outfits" tab and display logic:

```javascript
export default function FavouritesScreen({ navigation }) {
  const [favorites, setFavorites] = useState([]);
  const [favoriteOutfits, setFavoriteOutfits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('posts'); // 'posts' or 'outfits'

  const loadFavoriteOutfits = async () => {
    try {
      const auth = getAuth();
      const currentUser = auth.currentUser;
      
      if (!currentUser) return;
      
      const q = query(
        collection(db, 'favorite_outfits'),
        where('userId', '==', currentUser.uid),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const outfits = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setFavoriteOutfits(outfits);
    } catch (error) {
      console.error('Error loading favorite outfits:', error);
    }
  };

  // Call in loadFavorites
  const loadFavorites = async () => {
    setLoading(true);
    await Promise.all([
      loadFavoritePosts(),
      loadFavoriteOutfits()
    ]);
    setLoading(false);
  };

  // Render outfit item
  const renderOutfit = ({ item }) => (
    <TouchableOpacity
      style={styles.outfitCard}
      onPress={() => {
        // Navigate to TryOnScreen with saved outfit
        const items = [];
        if (item.topItem) items.push(item.topItem);
        if (item.bottomItem) items.push(item.bottomItem);
        
        navigation.navigate('TryOnScreen', {
          allItems: items,
          savedTransforms: item.transforms
        });
      }}
    >
      <View style={styles.outfitPreview}>
        {item.topItem && (
          <Image 
            source={{ uri: item.topItem.url }} 
            style={styles.outfitItemImage}
          />
        )}
        {item.bottomItem && (
          <Image 
            source={{ uri: item.bottomItem.url }} 
            style={styles.outfitItemImage}
          />
        )}
      </View>
      <Text style={styles.outfitTitle}>
        {item.topItem?.title || ''} {item.bottomItem?.title || ''}
      </Text>
      <TouchableOpacity
        style={styles.deleteOutfitButton}
        onPress={() => deleteOutfit(item.id)}
      >
        <Icon name="trash-outline" size={20} color={colors.error} />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'posts' && styles.activeTab]}
          onPress={() => setActiveTab('posts')}
        >
          <Text style={[styles.tabText, activeTab === 'posts' && styles.activeTabText]}>
            Posts
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'outfits' && styles.activeTab]}
          onPress={() => setActiveTab('outfits')}
        >
          <Text style={[styles.tabText, activeTab === 'outfits' && styles.activeTabText]}>
            Outfits
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {activeTab === 'posts' ? (
        // Existing posts rendering
      ) : (
        <FlatList
          data={favoriteOutfits}
          renderItem={renderOutfit}
          keyExtractor={item => item.id}
          numColumns={2}
          contentContainerStyle={styles.outfitsList}
        />
      )}
    </SafeAreaView>
  );
}
```

## Summary of Changes

### Files to Modify:
1. **UserProfileScreen.js** - Add try-on badge to swap posts
2. **TryOnScreen.js** - Add pre-selection, AI matching, and favorites
3. **FavouritesScreen.js** - Add outfits tab and display

### New Firestore Collections:
- `favorite_outfits` - Stores saved outfit combinations

### Key Features:
- ✅ Try on other users' clothes
- ✅ Pre-select clicked item
- ✅ AI-powered matching suggestions
- ✅ Save complete outfits
- ✅ View saved outfits in Favourites
- ✅ Support individual items or sets

## Next Steps

Would you like me to implement these changes now? I can do them one file at a time, or all at once. Please confirm and I'll proceed with the implementation.
