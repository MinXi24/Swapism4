import { useFocusEffect } from '@react-navigation/native';
import { getAuth } from 'firebase/auth';
import {
    collection,
    doc,
    getDoc,
    getDocs,
    getFirestore,
    orderBy,
    query,
    where
} from 'firebase/firestore';
import React, { useCallback, useState } from 'react';
import {
    FlatList,
    Image,
    Modal,
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import Icon from '../../assets/icons/icons';
import Input from '../../components/Input';
import { colors, fonts, spacing } from '../../lib/theme';

export default function SwapHistoryScreen({ navigation }) {
  const [swapHistory, setSwapHistory] = useState([]);
  const [latestUsernames, setLatestUsernames] = useState({}); // { uid: username }
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all'); // all, completed, accepted, pending, rejected
  const [loadedPhotos, setLoadedPhotos] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilterModal, setShowFilterModal] = useState(false);

  const db = getFirestore();
  const auth = getAuth();
  const currentUser = auth.currentUser;

  useFocusEffect(
    useCallback(() => {
      loadSwapHistory();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filter, searchQuery])
  );

  const handleSearch = (query) => {
    setSearchQuery(query);
  };

  // Helper to fetch latest username for a given uid
  const fetchLatestUsername = async (uid) => {
    if (!uid) return 'Unknown User';
    if (latestUsernames[uid]) return latestUsernames[uid];
    try {
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const username = userData.username || userData.displayName || 'Unknown User';
        setLatestUsernames(prev => ({ ...prev, [uid]: username }));
        return username;
      }
    } catch (_e) { /* ignore */ }
    return 'Unknown User';
  };

  const loadUserPhoto = async (userId) => {
    if (!userId || loadedPhotos[userId]) return loadedPhotos[userId];
    
    try {
      const userDocRef = doc(db, 'users', userId);
      const userDocSnap = await getDoc(userDocRef);
      
      if (userDocSnap.exists()) {
        const userData = userDocSnap.data();
        const photoURL = userData.photoURL || null;
        setLoadedPhotos(prev => ({ ...prev, [userId]: photoURL }));
        return photoURL;
      }
    } catch (error) {
      console.error('Error loading user photo:', error);
    }
    return null;
  };

  const loadSwapHistory = async () => {
    if (!currentUser) return;

    try {
      setLoading(true);
      const swapsQuery = query(
        collection(db, 'messages'),
        where('participants', 'array-contains', currentUser.uid),
        where('type', '==', 'swap_request'),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(swapsQuery);
      const swapsData = await Promise.all(querySnapshot.docs.map(async (doc) => {
        const data = doc.data();
        const isInitiatedByMe = data.senderId === currentUser?.uid;
        const otherUserId = isInitiatedByMe ? data.receiverId : data.senderId;
        // Fetch latest username
        const latestName = await fetchLatestUsername(otherUserId);
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate?.() || new Date(),
          latestOtherUserName: latestName,
        };
      }));

      // Store all swaps

      // Filter based on selected filter
      let filteredSwaps = swapsData;
      if (filter !== 'all') {
        filteredSwaps = swapsData.filter(swap => swap.swapDetails?.status === filter);
      }

      // Apply search filter if query exists
      if (searchQuery.trim() !== '') {
        filteredSwaps = filteredSwaps.filter(swap => {
          const myItemTitle = swap.swapDetails?.myItemTitle || '';
          const otherUserItemTitle = swap.swapDetails?.theirItemTitle || '';
          const searchLower = searchQuery.toLowerCase();
          return (
            swap.latestOtherUserName?.toLowerCase().includes(searchLower) ||
            myItemTitle.toLowerCase().includes(searchLower) ||
            otherUserItemTitle.toLowerCase().includes(searchLower)
          );
        });
      }

      setSwapHistory(filteredSwaps);

      // Load missing user photos
      const photosToLoad = [];
      swapsData.forEach(swap => {
        const isInitiatedByMe = swap.senderId === currentUser?.uid;
        const otherUserId = isInitiatedByMe ? swap.receiverId : swap.senderId;
        const otherUserPhoto = isInitiatedByMe ? swap.receiverPhoto : swap.senderPhoto;
        
        if (!otherUserPhoto && otherUserId && !loadedPhotos[otherUserId]) {
          photosToLoad.push(otherUserId);
        }
      });

      // Load all missing photos
      for (const userId of photosToLoad) {
        loadUserPhoto(userId);
      }
    } catch (error) {
      console.error('Error loading swap history:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date) => {
    if (!date) return '';
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return date.toLocaleDateString('en-US', { weekday: 'long' });
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
      });
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return '#4caf50';
      case 'accepted':
        return colors.accent;
      case 'pending':
        return '#d4a017';
      case 'rejected':
        return '#ff6b6b';
      default:
        return colors.gray;
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return 'checkmark-done-circle';
      case 'accepted':
        return 'checkmark-circle';
      case 'pending':
        return 'time';
      case 'rejected':
        return 'close-circle';
      default:
        return 'help-circle';
    }
  };

  const renderSwapItem = ({ item }) => {
    const isInitiatedByMe = item.senderId === currentUser?.uid;
    const status = item.swapDetails?.status || 'pending';
    
    // Get item details based on the actual data structure
    const myItemImage = isInitiatedByMe 
      ? item.swapDetails?.myItemImage 
      : item.swapDetails?.theirItemImage;
    const myItemTitle = isInitiatedByMe 
      ? item.swapDetails?.myItemTitle 
      : item.swapDetails?.theirItemTitle;
    
    const otherUserItemImage = isInitiatedByMe 
      ? item.swapDetails?.theirItemImage 
      : item.swapDetails?.myItemImage;
    const otherUserItemTitle = isInitiatedByMe 
      ? item.swapDetails?.theirItemTitle 
      : item.swapDetails?.myItemTitle;
    
    // Get other user's name and photo

    // Use latest username if available
    const otherUserName = item.latestOtherUserName || (isInitiatedByMe ? item.receiverName : item.senderName);
    
    const otherUserId = isInitiatedByMe 
      ? item.receiverId 
      : item.senderId;
    
    const otherUserPhoto = (isInitiatedByMe 
      ? item.receiverPhoto 
      : item.senderPhoto) || loadedPhotos[otherUserId];

    return (
      <TouchableOpacity 
        style={styles.swapCard}
        onPress={() => {
          navigation.navigate('SwapDetails', {
            swapItem: {
              ...item,
              currentUserId: currentUser?.uid,
            }
          });
        }}
      >
        <View style={styles.swapHeader}>
          <View style={styles.swapHeaderLeft}>
            {otherUserPhoto ? (
              <Image source={{ uri: otherUserPhoto }} style={styles.userAvatar} />
            ) : (
              <View style={styles.userAvatarPlaceholder}>
                <Icon name="person" size={14} color={colors.gray} />
              </View>
            )}
            <Text style={styles.swapWithText}>
              {otherUserName || 'Unknown User'}
            </Text>
            <Text style={styles.divider}>/</Text>
            <View style={styles.statusBadge}>
              <Icon 
                name={getStatusIcon(status)} 
                size={16} 
                color={getStatusColor(status)} 
              />
              <Text style={[styles.statusText, { color: getStatusColor(status) }]}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </Text>
            </View>
          </View>
          <Text style={styles.dateText}>{formatDate(item.createdAt)}</Text>
        </View>

        <View style={styles.itemsContainer}>
          {/* Other User's Item */}
          <View style={styles.itemCard}>
            {otherUserItemImage ? (
              <Image source={{ uri: otherUserItemImage }} style={styles.itemCardImage} />
            ) : (
              <View style={styles.itemCardImagePlaceholder}>
                <Icon name="image-outline" size={40} color={colors.gray} />
              </View>
            )}
            <View style={styles.itemCardDetails}>
              <Text style={styles.itemCardName} numberOfLines={2}>
                {otherUserItemTitle || 'Unknown Item'}
              </Text>
              <Text style={styles.itemCardLabel}>Their Item</Text>
            </View>
          </View>

          {/* Swap Icon */}
          <View style={styles.swapIconContainer}>
            <Icon name="swap-horizontal" size={24} color={colors.accent} />
          </View>

          {/* My Item */}
          <View style={styles.itemCard}>
            {myItemImage ? (
              <Image source={{ uri: myItemImage }} style={styles.itemCardImage} />
            ) : (
              <View style={styles.itemCardImagePlaceholder}>
                <Icon name="image-outline" size={40} color={colors.gray} />
              </View>
            )}
            <View style={styles.itemCardDetails}>
              <Text style={styles.itemCardName} numberOfLines={2}>
                {myItemTitle || 'Unknown Item'}
              </Text>
              <Text style={styles.itemCardLabel}>Your Item</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color={colors.dark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Swap History</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Search Bar */}
      <Input
        placeholder="search swap history..."
        value={searchQuery}
        onChangeText={handleSearch}
        leftIcon="search-outline"
        style={styles.searchBar}
      />

      {/* Filter Dropdown Button */}
      <View style={styles.filterContainer}>
        <TouchableOpacity style={styles.filterDropdown} onPress={() => setShowFilterModal(true)}>
          <Icon name="funnel-outline" size={20} color={colors.dark} />
          <Text style={styles.filterDropdownText}>
            Filter: {filter === 'all' ? 'All' : filter.charAt(0).toUpperCase() + filter.slice(1)}
          </Text>
          <Icon name="chevron-down" size={20} color={colors.dark} />
        </TouchableOpacity>
      </View>

      {/* Filter Modal */}
      <Modal
        visible={showFilterModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowFilterModal(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1}
          onPress={() => setShowFilterModal(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Filter Swaps</Text>
            
            <TouchableOpacity
              style={[styles.modalOption, filter === 'all' && styles.modalOptionActive]}
              onPress={() => {
                setFilter('all');
                setShowFilterModal(false);
              }}
            >
              <Icon name="list-outline" size={20} color={filter === 'all' ? colors.accent : colors.dark} />
              <Text style={[styles.modalOptionText, filter === 'all' && styles.modalOptionTextActive]}>
                All
              </Text>
              {filter === 'all' && <Icon name="checkmark" size={20} color={colors.accent} />}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modalOption, filter === 'completed' && styles.modalOptionActive]}
              onPress={() => {
                setFilter('completed');
                setShowFilterModal(false);
              }}
            >
              <Icon name="checkmark-done-circle-outline" size={20} color={filter === 'completed' ? colors.accent : colors.dark} />
              <Text style={[styles.modalOptionText, filter === 'completed' && styles.modalOptionTextActive]}>
                Completed
              </Text>
              {filter === 'completed' && <Icon name="checkmark" size={20} color={colors.accent} />}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modalOption, filter === 'accepted' && styles.modalOptionActive]}
              onPress={() => {
                setFilter('accepted');
                setShowFilterModal(false);
              }}
            >
              <Icon name="checkmark-circle-outline" size={20} color={filter === 'accepted' ? colors.accent : colors.dark} />
              <Text style={[styles.modalOptionText, filter === 'accepted' && styles.modalOptionTextActive]}>
                Accepted
              </Text>
              {filter === 'accepted' && <Icon name="checkmark" size={20} color={colors.accent} />}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modalOption, filter === 'pending' && styles.modalOptionActive]}
              onPress={() => {
                setFilter('pending');
                setShowFilterModal(false);
              }}
            >
              <Icon name="time-outline" size={20} color={filter === 'pending' ? colors.accent : colors.dark} />
              <Text style={[styles.modalOptionText, filter === 'pending' && styles.modalOptionTextActive]}>
                Pending
              </Text>
              {filter === 'pending' && <Icon name="checkmark" size={20} color={colors.accent} />}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modalOption, filter === 'rejected' && styles.modalOptionActive]}
              onPress={() => {
                setFilter('rejected');
                setShowFilterModal(false);
              }}
            >
              <Icon name="close-circle-outline" size={20} color={filter === 'rejected' ? colors.accent : colors.dark} />
              <Text style={[styles.modalOptionText, filter === 'rejected' && styles.modalOptionTextActive]}>
                Rejected
              </Text>
              {filter === 'rejected' && <Icon name="checkmark" size={20} color={colors.accent} />}
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Swap History List */}
      <FlatList
        data={swapHistory}
        renderItem={renderSwapItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="swap-horizontal" size={64} color={colors.gray} />
            <Text style={styles.emptyText}>No swap history</Text>
            <Text style={styles.emptySubtext}>
              {filter === 'all' 
                ? 'Your swap requests will appear here'
                : `No ${filter} swaps found`}
            </Text>
          </View>
        }
        refreshing={loading}
        onRefresh={loadSwapHistory}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
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
  backButton: {
    padding: 4,
    width: 40,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: fonts.semiBold,
    fontWeight: '600',
    color: colors.dark,
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  searchBar: {
    marginHorizontal: spacing.md,
    marginVertical: spacing.sm,
  },
  filterContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  filterDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.secondary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: 20,
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  filterDropdownText: {
    fontFamily: fonts.header,
    fontSize: 14,
    color: colors.dark,
    fontWeight: '600',
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: spacing.lg,
    width: '80%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.dark,
    marginBottom: spacing.md,
    fontFamily: fonts.header,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.sm,
    borderRadius: 8,
    gap: spacing.sm,
  },
  modalOptionActive: {
    backgroundColor: colors.secondary,
  },
  modalOptionText: {
    fontSize: 16,
    color: colors.dark,
    flex: 1,
  },
  modalOptionTextActive: {
    fontWeight: 'bold',
    color: colors.accent,
  },
  listContainer: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    flexGrow: 1,
  },
  swapCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  swapHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  swapHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: spacing.sm,
  },
  userAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  userAvatarPlaceholder: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  swapWithText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.dark,
    marginLeft: spacing.sm,
  },
  divider: {
    fontSize: 14,
    color: colors.gray,
    marginHorizontal: spacing.sm,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: colors.secondary,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  dateText: {
    fontSize: 12,
    color: colors.gray,
  },
  itemsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.secondary,
    borderRadius: 12,
    padding: spacing.sm,
    width: 140,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  itemCardImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
  },
  itemCardImagePlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  itemCardDetails: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  itemCardName: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.dark,
    marginBottom: 2,
  },
  itemCardLabel: {
    fontSize: 11,
    color: colors.gray,
  },
  swapIconContainer: {
    paddingHorizontal: spacing.sm,
  },
  swapFooter: {
    borderTopWidth: 1,
    borderTopColor: colors.secondary,
    paddingTop: spacing.sm,
    marginTop: spacing.xs,
  },
  initiatorText: {
    fontSize: 12,
    color: colors.gray,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.lg * 2,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.dark,
    marginTop: spacing.md,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.gray,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
});
