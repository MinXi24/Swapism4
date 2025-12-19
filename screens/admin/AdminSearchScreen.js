import React, { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    SafeAreaView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

// --- FIREBASE IMPORTS ---
import { collection, doc, getDoc, getDocs, getFirestore, query, where } from 'firebase/firestore';

// --- IMPORTS ---
import Icon from '../../assets/icons/icons';
import { colors, fonts, spacing } from '../../lib/theme';

// --- CONSTANTS ---
const THEME_GREEN = '#9abeaa';
const ADMIN_TABS = ['User Reports', 'Post Reports', 'Comment Reports'];

export default function AdminSearchScreen({ navigation }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('User Reports');
  const [loading, setLoading] = useState(false);
  const [searchResults, setSearchResults] = useState([]);

  const db = getFirestore();

  // --- SEARCH LOGIC ---
  const handleSearch = useCallback(async (searchText) => {
    if (!searchText.trim()) {
      setSearchResults([]);
      return;
    }

    setLoading(true);
    setSearchResults([]);

    try {
      let results = [];
      const lowerSearch = searchText.toLowerCase();

      if (activeTab === 'User Reports') {
        const q = query(collection(db, 'reported_users'), where('status', '==', 'pending'));
        const snapshot = await getDocs(q);
        
        snapshot.docs.forEach(doc => {
            const data = doc.data();
            const name = data.reported_user_name || data.username || data.userName || 'Unknown User';
            const reason = data.reason || '';
            
            if (name.toLowerCase().includes(lowerSearch) || reason.toLowerCase().includes(lowerSearch)) {
                results.push({ 
                    id: doc.id, 
                    ...data, 
                    reportType: 'user',
                    displayTitle: name,
                    displaySubtitle: `Reason: ${reason}`
                });
            }
        });
        setSearchResults(results);

      } else if (activeTab === 'Post Reports') {
        const q = query(collection(db, 'report'), where('status', '==', 'pending'));
        const snapshot = await getDocs(q);

        // Use Promise.all to handle async fetching for missing names
        const postPromises = snapshot.docs.map(async (docSnap) => {
            const data = docSnap.data();
            let name = data.reported_user_name || data.userName || data.authorName || 'Unknown User';
            const reason = data.reason || '';
            const caption = data.snapshot_description || ''; 

            // [FIX START] Resolve Name if Unknown
            if (name === 'Unknown User') {
                const targetId = data.reported_clothes_id || data.post_id;
                let ownerId = data.reported_user_id;

                // 1. Fetch Post to find Owner ID if missing
                if (targetId && !ownerId) {
                    try {
                        let postSnap = await getDoc(doc(db, 'wardrobe-plug-fyp/user/images', targetId));
                        if (!postSnap.exists()) postSnap = await getDoc(doc(db, 'clothes', targetId));
                        if (postSnap.exists()) ownerId = postSnap.data().ownerUid;
                    } catch (e) { /* ignore */ }
                }

                // 2. Fetch User to find Username
                if (ownerId) {
                    try {
                        const userSnap = await getDoc(doc(db, 'users', ownerId));
                        if (userSnap.exists()) {
                            name = userSnap.data().username || 'Unknown User';
                        }
                    } catch (e) { /* ignore */ }
                }
            }
            // [FIX END]

            // Check matches
            const nameMatch = name.toLowerCase().includes(lowerSearch);
            const reasonMatch = reason.toLowerCase().includes(lowerSearch);
            const captionMatch = caption.toLowerCase().includes(lowerSearch);

            if (nameMatch || reasonMatch || captionMatch) {
                let subtitle = `Reason: ${reason}`;
                if (captionMatch) {
                    subtitle = `"${caption.trim()}"`; 
                }

                return { 
                    id: docSnap.id, 
                    ...data, 
                    reportType: 'post',
                    displayTitle: `Post by ${name}`, 
                    displaySubtitle: subtitle
                };
            }
            return null;
        });

        const resolvedPosts = await Promise.all(postPromises);
        setSearchResults(resolvedPosts.filter(item => item !== null));

      } else if (activeTab === 'Comment Reports') {
        const q = query(collection(db, 'reported_comments'), where('status', '==', 'pending'));
        const snapshot = await getDocs(q);

        snapshot.docs.forEach(doc => {
            const data = doc.data();
            const name = data.targetOwnerName || data.commentAuthorName || data.userName || 'Unknown User';
            const content = data.targetContent || data.commentText || '';
            const reason = data.reason || '';

            if (name.toLowerCase().includes(lowerSearch) || content.toLowerCase().includes(lowerSearch)) {
                results.push({ 
                    id: doc.id, 
                    ...data, 
                    reportType: 'comment',
                    displayTitle: `Comment by ${name}`,
                    displaySubtitle: `"${content}"`
                });
            }
        });
        setSearchResults(results);
      }

    } catch (error) {
      console.error('Error searching admin records:', error);
    } finally {
      setLoading(false);
    }
  }, [activeTab, db]);

  // --- NAVIGATION ---
  const handleItemPress = (item) => {
      if (item.reportType === 'comment') {
          navigation.navigate('ManageFeedback', { report: item }); 
      } else {
          navigation.navigate('ManageReport', { report: item });
      }
  };

  // --- RENDER ITEM ---
  const renderItem = ({ item }) => {
      let iconName = 'alert-circle-outline';
      let iconColor = '#FF6B6B';

      if (item.reportType === 'user') iconName = 'person-remove-outline';
      else if (item.reportType === 'comment') { iconName = 'chatbubble-ellipses-outline'; iconColor = '#FDD835'; }

      return (
        <TouchableOpacity style={styles.resultItem} onPress={() => handleItemPress(item)}>
            <View style={[styles.iconCircle, { backgroundColor: iconColor + '20' }]}>
                <Icon name={iconName} size={24} color={iconColor} />
            </View>
            <View style={styles.textContainer}>
                <Text style={styles.itemTitle}>{item.displayTitle}</Text>
                <Text style={styles.itemSubtitle} numberOfLines={2}>{item.displaySubtitle}</Text>
            </View>
            <Icon name="chevron-forward" size={20} color={colors.gray} />
        </TouchableOpacity>
      );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#fff" barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color={colors.dark} />
        </TouchableOpacity>
        <View style={styles.searchInputContainer}>
          <Icon name="search" size={20} color={colors.gray} />
          <TextInput
            style={styles.searchInput}
            placeholder={`Search ${activeTab.toLowerCase()}...`}
            placeholderTextColor={colors.gray}
            value={searchQuery}
            onChangeText={(text) => {
              setSearchQuery(text);
              handleSearch(text);
            }}
            autoFocus
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => { setSearchQuery(''); setSearchResults([]); }}>
              <Icon name="close-circle" size={20} color={colors.gray} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {ADMIN_TABS.map(tab => (
            <TouchableOpacity
                key={tab}
                style={[styles.tab, activeTab === tab && styles.activeTab]}
                onPress={() => { setActiveTab(tab); setSearchResults([]); setSearchQuery(''); }}
            >
                <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
                    {tab.replace(' Reports', '')} 
                </Text>
            </TouchableOpacity>
        ))}
      </View>

      {/* Results */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={THEME_GREEN} />
        </View>
      ) : searchQuery.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Icon name="search" size={64} color={colors.gray} />
          <Text style={styles.emptyText}>Admin Search</Text>
          <Text style={styles.emptySubtext}>
            Find pending reports by username, reason, or content.
          </Text>
        </View>
      ) : searchResults.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Icon name="alert-circle-outline" size={64} color={colors.gray} />
          <Text style={styles.emptyText}>No reports found</Text>
          <Text style={styles.emptySubtext}>Try a different keyword.</Text>
        </View>
      ) : (
        <FlatList
          data={searchResults}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.resultsList}
        />
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
    fontFamily: fonts.body,
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
    borderBottomColor: THEME_GREEN,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.gray,
    fontFamily: fonts.body,
  },
  activeTabText: {
    color: THEME_GREEN,
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
    fontFamily: fonts.header,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.gray,
    marginTop: spacing.sm,
    textAlign: 'center',
    fontFamily: fonts.body,
  },
  resultsList: {
    paddingVertical: spacing.sm,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.dark,
    marginBottom: 2,
    fontFamily: fonts.header,
  },
  itemSubtitle: {
    fontSize: 13,
    color: colors.gray,
    fontFamily: fonts.body,
  },
});