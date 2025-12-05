// screens/HomeScreen.js
import { useState } from 'react';
import {
  FlatList,
  Image,
  Modal,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from '../../assets/icons/icons';
import Card from '../../components/Card';
import Input from '../../components/Input';
import { colors, fonts, spacing } from '../../lib/theme';

// Sample data - replace with your actual data
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

export default function HomeScreen({ navigation }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredItems, setFilteredItems] = useState(sampleItems);
  const [showSortModal, setShowSortModal] = useState(false);
  const [selectedSort, setSelectedSort] = useState('Newest to Oldest');
  const [activeTab, setActiveTab] = useState('home');

  const sortOptions = [
    'Newest to Oldest',
    'Oldest to Newest',
    'Highest to Lowest Rating',
    'Lowest to Highest Rating',
  ];

  const handleSearch = (query) => {
    setSearchQuery(query);
    let filtered = sampleItems.filter(item =>
      item.title.toLowerCase().includes(query.toLowerCase())
    );
    filtered = applySorting(filtered, selectedSort);
    setFilteredItems(filtered);
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

  const handleFavorite = (item) => {
    console.log('Favorited:', item.title);
  };

  const handleSwap = (item) => {
    console.log('Swap:', item.title);
  };

  const handleItemPress = (item) => {
    navigation.navigate('ItemDetails', { item });
  };

  const handleNavigation = (tab) => {
    setActiveTab(tab);
    // Add navigation logic based on tab
    switch(tab) {
      case 'home':
        // Already on home
        break;
      case 'swap':
        navigation.navigate('Swap');
        break;
      case 'chat':
        navigation.navigate('Messages');
        break;
      case 'favorites':
        navigation.navigate('Favorites');
        break;
      case 'profile':
        navigation.navigate('Profile');
        break;
    }
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
        <Text style={styles.logo}>Swapism</Text>
        <Icon name="person-outline" size={24} color={colors.dark} />
      </View>

      {/* Search Bar */}
      <Input
        placeholder="search products..."
        value={searchQuery}
        onChangeText={handleSearch}
        leftIcon="search-outline"
        style={styles.searchBar}
      />

      {/* Illustration */}
              <View style={styles.illustrationContainer}>
                <Image 
                  source={require('../../assets/images/home illustartion.png')} 
                  style={styles.illustration}
                  resizeMode="contain"
                />
              </View>

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
      <View style={styles.bottomNav}>
        <TouchableOpacity 
          style={styles.navItem}
          onPress={() => handleNavigation('home')}
        >
          <Icon 
            name={activeTab === 'home' ? 'home' : 'home-outline'} 
            size={24} 
            color={activeTab === 'home' ? colors.accent : colors.dark} 
          />
          <Text style={[styles.navText, activeTab === 'home' && styles.navTextActive]}>
            Home
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.navItem}
          onPress={() => handleNavigation('swap')}
        >
          <Icon 
            name={activeTab === 'swap' ? 'swap-horizontal' : 'swap-horizontal-outline'} 
            size={24} 
            color={activeTab === 'swap' ? colors.accent : colors.dark} 
          />
          <Text style={[styles.navText, activeTab === 'swap' && styles.navTextActive]}>
            Swap
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.navItem}
          onPress={() => handleNavigation('chat')}
        >
          <Icon 
            name={activeTab === 'chat' ? 'chatbubble' : 'chatbubble-outline'} 
            size={24} 
            color={activeTab === 'chat' ? colors.accent : colors.dark} 
          />
          <Text style={[styles.navText, activeTab === 'chat' && styles.navTextActive]}>
            Chat
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.navItem}
          onPress={() => handleNavigation('favorites')}
        >
          <Icon 
            name={activeTab === 'favorites' ? 'heart' : 'heart-outline'} 
            size={24} 
            color={activeTab === 'favorites' ? colors.accent : colors.dark} 
          />
          <Text style={[styles.navText, activeTab === 'favorites' && styles.navTextActive]}>
            Favorites
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.navItem}
          onPress={() => handleNavigation('profile')}
        >
          <Icon 
            name={activeTab === 'profile' ? 'person' : 'person-outline'} 
            size={24} 
            color={activeTab === 'profile' ? colors.accent : colors.dark} 
          />
          <Text style={[styles.navText, activeTab === 'profile' && styles.navTextActive]}>
            Profile
          </Text>
        </TouchableOpacity>
      </View>

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
  },
});