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
  FlatList,
  Image,
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
  const [allSwapHistory, setAllSwapHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all'); // all, completed, pending, rejected
  const [searchQuery, setSearchQuery] = useState('');

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
      const swapsData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || new Date(),
      }));

      // Store all swaps
      setAllSwapHistory(swapsData);

      // Filter based on selected filter
      let filteredSwaps = swapsData;
      if (filter !== 'all') {
        filteredSwaps = swapsData.filter(swap => swap.swapDetails?.status === filter);
      }

      // Apply search filter if query exists
      if (searchQuery.trim() !== '') {
        filteredSwaps = filteredSwaps.filter(swap => {
          const isInitiatedByMe = swap.senderId === currentUser?.uid;
          const otherUserName = isInitiatedByMe ? swap.receiverName : swap.senderName;
          const myItemTitle = isInitiatedByMe 
            ? swap.swapDetails?.myItemTitle 
            : swap.swapDetails?.theirItemTitle;
          const otherUserItemTitle = isInitiatedByMe 
            ? swap.swapDetails?.theirItemTitle 
            : swap.swapDetails?.myItemTitle;
          
          const searchLower = searchQuery.toLowerCase();
          return (
            otherUserName?.toLowerCase().includes(searchLower) ||
            myItemTitle?.toLowerCase().includes(searchLower) ||
            otherUserItemTitle?.toLowerCase().includes(searchLower)
          );
        });
      }

      setSwapHistory(filteredSwaps);
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
    const otherUserName = isInitiatedByMe 
      ? item.receiverName 
      : item.senderName;

    return (
      <TouchableOpacity style={styles.swapCard}>
        <View style={styles.swapHeader}>
          <View style={styles.swapHeaderLeft}>
            <View style={styles.userAvatarPlaceholder}>
              <Icon name="person" size={14} color={colors.gray} />
            </View>
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
        <Text style={styles.headerTitle}>Swap History</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color={colors.dark} />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <Input
        placeholder="search swap history..."
        value={searchQuery}
        onChangeText={handleSearch}
        leftIcon="search-outline"
        style={styles.searchBar}
      />

      {/* Filter Buttons */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'accepted' && styles.filterButtonActive]}
          onPress={() => setFilter(filter === 'accepted' ? 'all' : 'accepted')}
        >
          <Icon name="checkmark-circle-outline" size={18} color={filter === 'accepted' ? '#fff' : colors.dark} />
          <Text style={[styles.filterText, filter === 'accepted' && styles.filterTextActive]}>
            Accepted
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'pending' && styles.filterButtonActive]}
          onPress={() => setFilter(filter === 'pending' ? 'all' : 'pending')}
        >
          <Icon name="time-outline" size={18} color={filter === 'pending' ? '#fff' : colors.dark} />
          <Text style={[styles.filterText, filter === 'pending' && styles.filterTextActive]}>
            Pending
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'rejected' && styles.filterButtonActive]}
          onPress={() => setFilter(filter === 'rejected' ? 'all' : 'rejected')}
        >
          <Icon name="close-circle-outline" size={18} color={filter === 'rejected' ? '#fff' : colors.dark} />
          <Text style={[styles.filterText, filter === 'rejected' && styles.filterTextActive]}>
            Rejected
          </Text>
        </TouchableOpacity>
      </View>

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
  },
  headerTitle: {
    fontFamily: fonts.header,
    fontSize: 28,
    fontWeight: '700',
    color: colors.accent,
  },
  searchBar: {
    marginHorizontal: spacing.md,
    marginVertical: spacing.sm,
  },
  filterContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  filterButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.secondary,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm + 2,
    borderRadius: 20,
    marginHorizontal: 4,
  },
  filterButtonActive: {
    backgroundColor: colors.accent,
  },
  filterText: {
    fontFamily: fonts.header,
    fontSize: 12,
    color: colors.dark,
    marginLeft: 4,
  },
  filterTextActive: {
    fontWeight: 'bold',
    color: '#fff',
  },
  listContainer: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    flexGrow: 1,
  },
  swapCard: {
    backgroundColor: colors.secondary,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
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
  userAvatarPlaceholder: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
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
    backgroundColor: '#fff',
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
    borderRadius: 8,
    padding: spacing.sm,
    width: 140,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  itemCardImage: {
    width: 50,
    height: 50,
    borderRadius: 6,
  },
  itemCardImagePlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 6,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
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
