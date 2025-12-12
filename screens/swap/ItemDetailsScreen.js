import { useState } from 'react';
import {
  Image,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import Icon from '../../assets/icons/icons';
import Button from '../../components/Button';
import { colors, fonts, spacing } from '../../lib/theme';

export default function ItemDetailsScreen({ route, navigation }) {
  const { item } = route.params;
  const [isFavorited, setIsFavorited] = useState(false);

  const handleFavorite = () => {
    setIsFavorited(!isFavorited);
  };

  const handleSwapNow = () => {
    console.log('Swap now:', item.title);
    // Add swap logic here
  };

  const handleBack = () => {
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#fff" barStyle="dark-content" />
      
      {/* Header with Back Button */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Icon name="arrow-back" size={28} color={colors.dark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Item Details</Text>
        <TouchableOpacity onPress={handleFavorite} style={styles.favoriteButton}>
          <Icon 
            name={isFavorited ? "heart" : "heart-outline"} 
            size={28} 
            color={isFavorited ? "#ff6b6b" : colors.dark} 
          />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Item Image */}
        <View style={styles.imageContainer}>
          <Image 
            source={item.image} 
            style={styles.itemImage}
            resizeMode="cover"
          />
        </View>

        {/* Item Information */}
        <View style={styles.infoContainer}>
          {/* Item Title */}
          <Text style={styles.itemTitle}>{item.title}</Text>

          {/* Rating */}
          <View style={styles.ratingContainer}>
            <Icon name="star" size={20} color={colors.highlight} />
            <Text style={styles.ratingText}>
              {item.rating} ({item.reviews} reviews)
            </Text>
          </View>

          {/* Description */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.description}>
              {item.description || 'This is a great item available for swap. In excellent condition and ready for a new owner!'}
            </Text>
          </View>

          {/* User Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Owner Information</Text>
            <View style={styles.userContainer}>
              <View style={styles.userAvatar}>
                <Icon name="person" size={32} color={colors.accent} />
              </View>
              <View style={styles.userInfo}>
                <Text style={styles.userName}>{item.userName || 'User'}</Text>
                <View style={styles.userRating}>
                  <Icon name="star" size={16} color={colors.highlight} />
                  <Text style={styles.userRatingText}>
                    {item.userRating || '4.5'} User Rating
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Additional Details */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Details</Text>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Condition:</Text>
              <Text style={styles.detailValue}>{item.condition || 'Excellent'}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Size:</Text>
              <Text style={styles.detailValue}>{item.size || 'M'}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Posted:</Text>
              <Text style={styles.detailValue}>
                {item.datePosted ? new Date(item.datePosted).toLocaleDateString() : 'Recently'}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Swap Now Button */}
      <View style={styles.bottomContainer}>
        <Button
          title="Swap Now"
          onPress={handleSwapNow}
          style={styles.swapButton}
        />
      </View>
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
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontFamily: fonts.header,
    fontSize: 20,
    fontWeight: '700',
    color: colors.dark,
  },
  favoriteButton: {
    padding: 4,
  },
  imageContainer: {
    width: '100%',
    height: 300,
    backgroundColor: colors.secondary,
  },
  itemImage: {
    width: '100%',
    height: '100%',
  },
  infoContainer: {
    padding: spacing.lg,
  },
  itemTitle: {
    fontFamily: fonts.header,
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.dark,
    marginBottom: spacing.sm,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  ratingText: {
    fontFamily: fonts.sub,
    fontSize: 16,
    color: colors.dark,
    marginLeft: spacing.sm,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontFamily: fonts.header,
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.dark,
    marginBottom: spacing.md,
  },
  description: {
    fontFamily: fonts.sub,
    fontSize: 16,
    color: colors.dark,
    lineHeight: 24,
  },
  userContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.secondary,
    padding: spacing.md,
    borderRadius: 12,
  },
  userAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontFamily: fonts.header,
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.dark,
    marginBottom: 4,
  },
  userRating: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userRatingText: {
    fontFamily: fonts.sub,
    fontSize: 14,
    color: colors.dark,
    marginLeft: spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  detailLabel: {
    fontFamily: fonts.sub,
    fontSize: 16,
    color: colors.gray,
  },
  detailValue: {
    fontFamily: fonts.sub,
    fontSize: 16,
    color: colors.dark,
    fontWeight: '600',
  },
  bottomContainer: {
    padding: spacing.lg,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  swapButton: {
    backgroundColor: colors.accent,
  },
});
