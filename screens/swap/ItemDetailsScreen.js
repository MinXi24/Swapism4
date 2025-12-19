import { doc, getDoc, getFirestore } from 'firebase/firestore';
import { useEffect, useState } from 'react';
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
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const db = getFirestore();

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      console.log('=== Starting to load user data ===');
      console.log('Item ownerUid:', item.ownerUid);
      console.log('Full item:', item);
      
      if (item.ownerUid) {
        const userDocRef = doc(db, 'users', item.ownerUid);
        const userSnapshot = await getDoc(userDocRef);
        
        console.log('User doc exists?', userSnapshot.exists());
        
        if (userSnapshot.exists()) {
          const user = userSnapshot.data();
          console.log('=== FULL USER DATA ===', JSON.stringify(user, null, 2));
          console.log('User rating:', user.rating);
          console.log('User reviewCount:', user.reviewCount);
          console.log('User photoURL:', user.photoURL);
          console.log('User username:', user.username);
          console.log('User displayName:', user.displayName);
          setUserData(user);
          console.log('User data set successfully');
        } else {
          console.log('No user found for uid:', item.ownerUid);
        }
      } else {
        console.log('No ownerUid in item');
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
      console.log('Loading finished, userData:', userData);
    }
  };

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

  const handleViewProfile = () => {
    if (item.ownerUid) {
      navigation.navigate('UserProfile', { 
        userId: item.ownerUid, 
        username: userData?.username || userData?.displayName || item.userName || 'User' 
      });
    }
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
        <View style={styles.headerSpacer} />
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
            <TouchableOpacity 
              style={styles.userContainer}
              onPress={handleViewProfile}
              activeOpacity={0.7}
            >
              {userData?.photoURL ? (
                <Image 
                  source={{ uri: userData.photoURL }} 
                  style={styles.userAvatarImage}
                />
              ) : (
                <View style={styles.userAvatar}>
                  <Icon name="person" size={32} color={colors.accent} />
                </View>
              )}
              <View style={styles.userInfo}>
                <Text style={styles.userName}>
                  {userData?.username || userData?.displayName || item.userName || 'User'}
                </Text>
                <View style={styles.userRating}>
                  <Icon name="star" size={16} color={colors.highlight} />
                  <Text style={styles.userRatingText}>
                    {loading ? 'Loading...' : `${userData?.rating?.toFixed(1) || '0'} (${userData?.reviewCount || 0} reviews)`}
                  </Text>
                </View>
              </View>
              <Icon name="chevron-forward" size={24} color={colors.gray} />
            </TouchableOpacity>
          </View>

          {/* Additional Details */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Details</Text>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Condition:</Text>
              <Text style={styles.detailValue}>{item.condition || 'N/A'}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Size:</Text>
              <Text style={styles.detailValue}>{item.size || 'N/A'}</Text>
            </View>
            {item.additionalDetails && item.additionalDetails !== 'N/A' && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>More Info:</Text>
                <Text style={styles.detailValue}>{item.additionalDetails}</Text>
              </View>
            )}
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
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 36,
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
  userAvatarImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
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
