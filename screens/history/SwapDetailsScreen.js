import React, { useEffect, useState } from 'react';
import {
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { collection, doc, getDoc, getDocs, getFirestore, query, where } from 'firebase/firestore';
import Icon from '../../assets/icons/icons';
import { colors, fonts, spacing } from '../../lib/theme';

export default function SwapDetailsScreen({ route, navigation }) {
  const { swapItem } = route.params;
  const [meetupDetails, setMeetupDetails] = useState(null);
  const [locationDetails, setLocationDetails] = useState(null);
  const [loadedUserPhoto, setLoadedUserPhoto] = useState(null);
  
  const isInitiatedByMe = swapItem.senderId === swapItem.currentUserId;
  const status = swapItem.swapDetails?.status || 'pending';
  
  // Get item details
  const myItemImage = isInitiatedByMe 
    ? swapItem.swapDetails?.myItemImage 
    : swapItem.swapDetails?.theirItemImage;
  const myItemTitle = isInitiatedByMe 
    ? swapItem.swapDetails?.myItemTitle 
    : swapItem.swapDetails?.theirItemTitle;
  
  const otherUserItemImage = isInitiatedByMe 
    ? swapItem.swapDetails?.theirItemImage 
    : swapItem.swapDetails?.myItemImage;
  const otherUserItemTitle = isInitiatedByMe 
    ? swapItem.swapDetails?.theirItemTitle 
    : swapItem.swapDetails?.myItemTitle;
  
  const otherUserName = isInitiatedByMe 
    ? swapItem.receiverName 
    : swapItem.senderName;
  
  const otherUserPhoto = isInitiatedByMe 
    ? swapItem.receiverPhoto 
    : swapItem.senderPhoto;

  const otherUserId = isInitiatedByMe
    ? swapItem.receiverId
    : swapItem.senderId;

  // Load user photo if missing
  useEffect(() => {
    const loadUserPhoto = async () => {
      if (!otherUserId || otherUserPhoto) return;

      try {
        const db = getFirestore();
        const userDocRef = doc(db, 'users', otherUserId);
        const userDocSnap = await getDoc(userDocRef);
        
        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          setLoadedUserPhoto(userData.photoURL || null);
        }
      } catch (error) {
        console.error('Error loading user photo:', error);
      }
    };
    loadUserPhoto();
  }, [otherUserId, otherUserPhoto]);

  // Load meetup and location details
  useEffect(() => {
    const loadSwapDetails = async () => {
      if (!swapItem.currentUserId || !otherUserId) return;

      const db = getFirestore();
      const participants = [swapItem.currentUserId, otherUserId].sort();

      try {
        // Query for calendar invites and location messages
        const messagesQuery = query(
          collection(db, 'messages'),
          where('participants', '==', participants)
        );

        const querySnapshot = await getDocs(messagesQuery);
        const messages = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        // Find most recent accepted calendar invite
        const acceptedCalendar = messages
          .filter(msg => 
            msg.type === 'calendar_invite' && 
            msg.calendarDetails?.status === 'accepted'
          )
          .sort((a, b) => {
            const aTime = a.createdAt?.toDate?.() || new Date(0);
            const bTime = b.createdAt?.toDate?.() || new Date(0);
            return bTime - aTime;
          })[0];

        if (acceptedCalendar?.calendarDetails) {
          setMeetupDetails(acceptedCalendar.calendarDetails);
        }

        // Find most recent location message
        const acceptedLocation = messages
          .filter(msg => msg.type === 'location')
          .sort((a, b) => {
            const aTime = a.createdAt?.toDate?.() || new Date(0);
            const bTime = b.createdAt?.toDate?.() || new Date(0);
            return bTime - aTime;
          })[0];

        if (acceptedLocation?.text) {
          setLocationDetails({ postalCode: acceptedLocation.text });
        }
      } catch (error) {
        console.error('Error loading swap details:', error);
      }
    };

    loadSwapDetails();
  }, [swapItem.currentUserId, otherUserId]);

  const formatDate = (date) => {
    if (!date) return '';
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    const time = date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });

    if (diffDays === 0) {
      return `Today at ${time}`;
    } else if (diffDays === 1) {
      return `Yesterday at ${time}`;
    } else if (diffDays < 7) {
      const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
      return `${dayName} at ${time}`;
    } else {
      const dateStr = date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
      });
      return `${dateStr} at ${time}`;
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

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color={colors.dark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Swap Details</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        {/* Status Section */}
        <View style={styles.statusSection}>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(status) }]}>
            <Icon name={getStatusIcon(status)} size={24} color="#fff" />
            <Text style={styles.statusText}>
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </Text>
          </View>
        </View>

        {/* Other User Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Swap With</Text>
          <View style={styles.userCard}>
            {(otherUserPhoto || loadedUserPhoto) ? (
              <Image source={{ uri: otherUserPhoto || loadedUserPhoto }} style={styles.userAvatar} />
            ) : (
              <View style={styles.userAvatarPlaceholder}>
                <Icon name="person" size={32} color={colors.gray} />
              </View>
            )}
            <Text style={styles.userName}>{otherUserName || 'Unknown User'}</Text>
          </View>
        </View>

        {/* Items Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Items</Text>
          
          <View style={styles.itemsHorizontalCard}>
            {/* Their Item */}
            <View style={styles.itemColumn}>
              <Text style={styles.itemLabel}>Their Item</Text>
              {otherUserItemImage ? (
                <Image source={{ uri: otherUserItemImage }} style={styles.itemImageHorizontal} />
              ) : (
                <View style={styles.itemImagePlaceholderHorizontal}>
                  <Icon name="image-outline" size={40} color={colors.gray} />
                </View>
              )}
              <Text style={styles.itemTitleHorizontal} numberOfLines={2}>{otherUserItemTitle || 'Unknown Item'}</Text>
            </View>

            {/* Swap Icon */}
            <View style={styles.swapIconHorizontal}>
              <Icon name="swap-horizontal" size={24} color={colors.accent} />
            </View>

            {/* My Item */}
            <View style={styles.itemColumn}>
              <Text style={styles.itemLabel}>Your Item</Text>
              {myItemImage ? (
                <Image source={{ uri: myItemImage }} style={styles.itemImageHorizontal} />
              ) : (
                <View style={styles.itemImagePlaceholderHorizontal}>
                  <Icon name="image-outline" size={40} color={colors.gray} />
                </View>
              )}
              <Text style={styles.itemTitleHorizontal} numberOfLines={2}>{myItemTitle || 'Unknown Item'}</Text>
            </View>
          </View>
        </View>

        {/* Calendar Event Section - if scheduled */}
        {meetupDetails?.dateTime && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Scheduled Meetup</Text>
            <View style={styles.meetupCard}>
              <View style={styles.meetupRow}>
                <Icon name="calendar" size={20} color={colors.accent} />
                <Text style={styles.meetupText}>
                  {new Date(meetupDetails.dateTime).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </Text>
              </View>
              <View style={styles.meetupRow}>
                <Icon name="time" size={20} color={colors.accent} />
                <Text style={styles.meetupText}>
                  {new Date(meetupDetails.dateTime).toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true
                  })}
                </Text>
              </View>
              {locationDetails?.postalCode && (
                <View style={styles.meetupRow}>
                  <Icon name="location" size={20} color={colors.accent} />
                  <Text style={styles.meetupText}>
                    Singapore {locationDetails.postalCode}
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Date Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Request Date</Text>
          <Text style={styles.dateText}>{formatDate(swapItem.createdAt)}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.secondary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 4,
    width: 40,
  },
  headerTitle: {
    fontFamily: fonts.semiBold,
    fontSize: 20,
    fontWeight: '600',
    color: colors.dark,
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.md,
  },
  statusSection: {
    alignItems: 'center',
    marginBottom: spacing.lg,
    paddingVertical: spacing.lg,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md + 2,
    borderRadius: 25,
    gap: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
    minWidth: 160,
    justifyContent: 'center',
  },
  statusText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    fontFamily: fonts.header,
    letterSpacing: 0.5,
  },
  section: {
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.gray,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
    fontFamily: fonts.sub,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: '#fff',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  userAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: spacing.md,
  },
  userAvatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  userName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.dark,
    fontFamily: fonts.header,
  },
  itemContainer: {
    marginBottom: spacing.md,
  },
  itemsHorizontalCard: {
    flexDirection: 'row',
    padding: spacing.lg,
    backgroundColor: '#fff',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  itemColumn: {
    flex: 1,
    alignItems: 'center',
  },
  swapIconHorizontal: {
    marginHorizontal: spacing.md,
  },
  itemLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.gray,
    marginBottom: spacing.sm,
    fontFamily: fonts.sub,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  itemImageHorizontal: {
    width: 100,
    height: 100,
    borderRadius: 12,
    marginBottom: spacing.sm,
  },
  itemImagePlaceholderHorizontal: {
    width: 100,
    height: 100,
    borderRadius: 12,
    backgroundColor: colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  itemTitleHorizontal: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.dark,
    textAlign: 'center',
    fontFamily: fonts.semiBold,
  },
  itemCard: {
    flexDirection: 'row',
    padding: spacing.md,
    backgroundColor: '#fff',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  itemImage: {
    width: 90,
    height: 90,
    borderRadius: 12,
    marginRight: spacing.md,
  },
  itemImagePlaceholder: {
    width: 90,
    height: 90,
    borderRadius: 12,
    backgroundColor: colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  itemInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.dark,
    fontFamily: fonts.header,
    lineHeight: 22,
  },
  swapIconWrapper: {
    alignItems: 'center',
    marginVertical: spacing.md,
    backgroundColor: colors.accent,
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignSelf: 'center',
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  dateText: {
    fontSize: 16,
    color: colors.dark,
    fontFamily: fonts.sub,
    backgroundColor: '#fff',
    padding: spacing.md,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  meetupCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    gap: spacing.md,
  },
  meetupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  meetupText: {
    fontSize: 16,
    color: colors.dark,
    fontFamily: fonts.sub,
    fontWeight: '500',
    flex: 1,
  },
  locationCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  locationText: {
    fontSize: 16,
    color: colors.dark,
    fontFamily: fonts.sub,
    fontWeight: '500',
    flex: 1,
  },
});
