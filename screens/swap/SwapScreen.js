
import React, { useEffect, useState } from 'react';
import {
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
  const sampleItems = [
  {
    id: 1,
    title: 'Jeans cool and baggy (fit)',
    image: { uri: 'https://via.placeholder.com/200x150' },
    rating: 4.3,
    reviews: 12,
    datePosted: '2024-01-15',
  },
  {
    id: 2,
    title: 'kirthi dress',
    image: { uri: 'https://via.placeholder.com/200x150' },
    rating: 4.2,
    reviews: 19,
    datePosted: '2024-01-20',
  },
  {
    id: 3,
    title: 'Jeans cool and baggy (fit)',
    image: { uri: 'https://via.placeholder.com/200x150' },
    rating: 3.1,
    reviews: 8,
    datePosted: '2024-01-10',
  },
  {
    id: 4,
    title: 'Jeans cool and baggy (fit)',
    image: { uri: 'https://via.placeholder.com/200x150' },
    rating: 4.3,
    reviews: 15,
    datePosted: '2024-01-25',
  },
  {
    id: 5,
    title: 'Felicia cute pants',
    image: { uri: 'https://via.placeholder.com/200x150' },
    rating: 4.5,
    reviews: 15,
    datePosted: '2024-01-18',
  },
  {
    id: 6,
    title: 'mini skirt floral',
    image: { uri: 'https://via.placeholder.com/200x150' },
    rating: 4.0,
    reviews: 15,
    datePosted: '2024-01-22',
  },
];

  const [searchQuery, setSearchQuery] = useState('');
  const [filteredItems, setFilteredItems] = useState(sampleItems);
  const [showSortModal, setShowSortModal] = useState(false);
  const [selectedSort, setSelectedSort] = useState('Newest to Oldest');

  const sortOptions = [
    'Newest to Oldest',
    'Oldest to Newest',
    'Highest to Lowest Rating',
    'Lowest to Highest Rating',
  ];

  useEffect(() => {
    const sorted = applySorting(sampleItems, selectedSort);
    setFilteredItems(sorted);
  }, []);

  const handleSearch = (query) => {
    setSearchQuery(query);
    
    if (query.trim() === '') {
      const sorted = applySorting(sampleItems, selectedSort);
      setFilteredItems(sorted);
    } else {
      const filtered = sampleItems.filter(item =>
        item.title.toLowerCase().includes(query.toLowerCase())
      );
      const sorted = applySorting(filtered, selectedSort);
      setFilteredItems(sorted);
    }
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
    console.log('Filter pressed');
    // Add filter modal logic here
  };

  const handleHistory = () => {
    navigation.navigate('SwapHistory');
  };

  const handleFavorite = (item) => {
    console.log('Favorited:', item.title);
  };

  const handleSwap = (item) => {
    console.log('Swap:', item.title);
  };

  const handleItemPress = (item) => {
    navigation.navigate('ItemDetails', { item });
  };

  const renderItem = ({ item, index }) => (
    <Card
      item={item}
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
      <StatusBar backgroundColor={colors.accent} barStyle="dark-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.logo}>Swap</Text>
        <TouchableOpacity onPress={handleHistory}>
          <Icon name="time-outline" size={24} color={colors.dark} />
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
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Sort By</Text>
              <TouchableOpacity onPress={() => setShowSortModal(false)}>
                <Icon name="close-outline" size={24} color={colors.dark} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.sortOptionsContainer}>
              {sortOptions.map(option => renderSortOption(option))}
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

import React from 'react';

export default function SwapScreen({ navigation }) {
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>SWAP</Text>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.placeholderText}>Swap Screen</Text>
        <Text style={styles.placeholderSubtext}>Coming Soon</Text>
      </View>

      <BottomNavBar navigation={navigation} activeRoute="Swap" />
    </View>
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
    backgroundColor: colors.accent,
  },
  logo: {
    fontFamily: fonts.header,
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.dark,
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
    backgroundColor: colors.secondary,
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
    backgroundColor: colors.secondary,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 30,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.primary,
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
    backgroundColor: colors.secondary,
  },
  sortOptionSelected: {
    backgroundColor: colors.primary,
  },
  sortOptionText: {
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.dark,
  },
  sortOptionTextSelected: {
    fontWeight: 'bold',
    color: colors.accent,
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
  placeholderText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.dark,
    marginBottom: spacing.sm,
  },
  placeholderSubtext: {
    fontSize: 16,
    color: colors.gray,
  },
});
