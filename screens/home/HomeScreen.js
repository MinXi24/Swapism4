import { useState } from 'react';
import {
  FlatList,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
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
    image: { uri: 'https://via.placeholder.com/200x150' }, // Replace with your images
    rating: 4.3,
    reviews: 12,
  },
  {
    id: 2,
    title: 'kirthi dress',
    image: { uri: 'https://via.placeholder.com/200x150' },
    rating: 4.3,
    reviews: 19,
  },
  {
    id: 3,
    title: 'Jeans cool and baggy (fit)',
    image: { uri: 'https://via.placeholder.com/200x150' },
    rating: 4.3,
    reviews: 8,
  },
  {
    id: 4,
    title: 'Jeans cool and baggy (fit)',
    image: { uri: 'https://via.placeholder.com/200x150' },
    rating: 4.3,
    reviews: 15,
  },
];

export default function HomeScreen({ navigation }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredItems, setFilteredItems] = useState(sampleItems);

  const handleSearch = (query) => {
    setSearchQuery(query);
    const filtered = sampleItems.filter(item =>
      item.title.toLowerCase().includes(query.toLowerCase())
    );
    setFilteredItems(filtered);
  };

  const handleFilter = () => {
    console.log('Filter pressed');
  };

  const handleSort = () => {
    console.log('Sort pressed');
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
        <Text style={styles.illustrationText}>🌿 Sustainable Fashion Community 🌿</Text>
      </View>

      {/* Filter and Sort */}
      <View style={styles.filterContainer}>
        <TouchableOpacity style={styles.filterButton} onPress={handleFilter}>
          <Icon name="filter-outline" size={20} color={colors.dark} />
          <Text style={styles.filterText}>Filter</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.sortButton} onPress={handleSort}>
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.accent,
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
    backgroundColor: colors.primary,
    marginHorizontal: spacing.md,
    marginVertical: spacing.sm,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  illustrationText: {
    fontFamily: fonts.header,
    fontSize: 16,
    color: colors.dark,
    textAlign: 'center',
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
    paddingBottom: 20,
  },
});