import { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from '../assets/icons/icons';
import { colors, fonts, spacing } from '../lib/theme';
import Button from './Button';

export default function Card({ 
  item, 
  isFavorited: initialFavorited = false,
  onPress, 
  onFavorite, 
  onSwap,
  style 
}) {
  const [isFavorited, setIsFavorited] = useState(initialFavorited);

  useEffect(() => {
    setIsFavorited(initialFavorited);
  }, [initialFavorited]);

  const handleFavorite = async () => {
    if (onFavorite) {
      const result = await onFavorite(item);
      // Only toggle if the action was successful (not blocked by guest prompt)
      if (result !== false) {
        setIsFavorited(!isFavorited);
      }
    }
  };

  return (
    <TouchableOpacity style={[styles.container, style]} onPress={onPress}>
      <View style={styles.imageContainer}>
        <Image source={item.image} style={styles.image} />
        <TouchableOpacity 
          style={styles.favoriteButton}
          onPress={handleFavorite}
        >
          <Icon 
            name={isFavorited ? "heart" : "heart-outline"} 
            size={20} 
            color={isFavorited ? "#ff0000" : colors.accent}
          />
        </TouchableOpacity>
      </View>
      
      <View style={styles.content}>
        <Text style={styles.title}>{item.title}</Text>
        <View style={styles.ratingContainer}>
          <Text style={styles.userRating}>User&apos;s Rating:</Text>
          <View style={styles.stars}>
            {[1,2,3,4,5].map((star) => (
              <Icon 
                key={star}
                name={star <= item.rating ? "star" : "star-outline"}
                size={12}
                color={colors.highlight}
              />
            ))}
            <Text style={styles.ratingText}>({item.reviews})</Text>
          </View>
        </View>
        
        <Button
          title="Swap Now"
          variant="primary"
          size="small"
          onPress={() => onSwap && onSwap(item)}
          style={styles.swapButton}
        />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.secondary,
    borderRadius: 12,
    padding: 12,
    margin: spacing.sm,
    flex: 1,
    maxWidth: '48%',
  },
  imageContainer: {
    position: 'relative',
    marginBottom: spacing.sm,
  },
  image: {
    width: '100%',
    height: 120,
    borderRadius: 8,
    resizeMode: 'cover',
  },
  favoriteButton: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderRadius: 12,
    padding: 4,
  },
  content: {
    flex: 1,
  },
  title: {
    fontFamily: fonts.header,
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.dark,
    marginBottom: 4,
  },
  ratingContainer: {
    marginBottom: spacing.sm,
  },
  userRating: {
    fontFamily: fonts.sub,
    fontSize: 12,
    color: colors.dark,
    marginBottom: 2,
  },
  stars: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontFamily: fonts.sub,
    fontSize: 10,
    color: colors.dark,
    marginLeft: 4,
  },
  swapButton: {
    marginTop: 'auto',
  },
});