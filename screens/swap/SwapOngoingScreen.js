import { useFocusEffect } from '@react-navigation/native';
import { getAuth } from 'firebase/auth';
import { addDoc, collection, doc, getDoc, getDocs, getFirestore, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import Icon from '../../assets/icons/icons';
import { colors, fonts, spacing } from '../../lib/theme';




export default function SwapOngoingScreen({ route, navigation }) {
  const { swapDetails, otherUser, swapSenderId } = route.params || {};
  const [confirmationStatus, setConfirmationStatus] = useState({
    myConfirmation: false,
    theirConfirmation: false
  });
  const [otherUserName, setOtherUserName] = useState(otherUser?.name || 'Other User');
  // Fetch latest username for the other user
  useEffect(() => {
    const fetchOtherUserName = async () => {
      try {
        const otherUserId = otherUser?.id || otherUser?.uid;
        if (otherUserId) {
          const userDoc = await getDoc(doc(db, 'users', otherUserId));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setOtherUserName(userData.username || userData.displayName || 'Other User');
          } else {
            setOtherUserName('Other User');
          }
        }
      } catch (error) {
        console.error('Error fetching other user name:', error);
        setOtherUserName('Other User');
      }
    };
    fetchOtherUserName();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otherUser]);

  const db = getFirestore();
  const auth = getAuth();
  const currentUser = auth.currentUser;

  // Determine which item the current user will receive
  // If current user sent the swap, they receive theirItem; otherwise they receive myItem
  const iAmSender = currentUser?.uid === swapSenderId;
  const itemIWillReceive = iAmSender 
    ? { image: swapDetails?.theirItemImage, title: swapDetails?.theirItemTitle }
    : { image: swapDetails?.myItemImage, title: swapDetails?.myItemTitle };
  const itemIAmGiving = iAmSender
    ? { image: swapDetails?.myItemImage, title: swapDetails?.myItemTitle }
    : { image: swapDetails?.theirItemImage, title: swapDetails?.theirItemTitle };

  // Debug: Log the swapDetails to see what we're receiving
  console.log('SwapOngoingScreen - currentUser.uid:', currentUser?.uid);
  console.log('SwapOngoingScreen - swapSenderId:', swapSenderId);
  console.log('SwapOngoingScreen - iAmSender:', iAmSender);
  console.log('SwapOngoingScreen - swapDetails:', JSON.stringify(swapDetails, null, 2));
  console.log('SwapOngoingScreen - itemIWillReceive:', itemIWillReceive);
  console.log('SwapOngoingScreen - itemIAmGiving:', itemIAmGiving);

  // Load confirmation status from Firestore
  const loadConfirmationStatus = useCallback(async () => {
    if (!currentUser || !swapDetails || !otherUser) return;

    try {
      const otherUserId = otherUser.id || otherUser.uid;
      const messagesQuery = query(
        collection(db, 'messages'),
        where('participants', 'array-contains', currentUser.uid),
        where('type', '==', 'swap_request')
      );

      const querySnapshot = await getDocs(messagesQuery);
      
      // Find the swap message between current user and other user
      const swapMessage = querySnapshot.docs.find(docSnap => {
        const data = docSnap.data();
        return (
          data.participants.includes(otherUserId) &&
          data.swapDetails?.status === 'accepted'
        );
      });

      if (swapMessage) {
        const data = swapMessage.data();
        const confirmations = data.confirmations || {};
        
        setConfirmationStatus({
          myConfirmation: confirmations[currentUser.uid] || false,
          theirConfirmation: confirmations[otherUserId] || false
        });
      }
    } catch (error) {
      console.error('Error loading confirmation status:', error);
    }
  }, [currentUser, swapDetails, otherUser, db]);

  // Load status when screen is focused
  useFocusEffect(
    useCallback(() => {
      loadConfirmationStatus();
    }, [loadConfirmationStatus])
  );

  const handleWithdrawSwap = async () => {
    Alert.alert(
      'Withdraw Swap',
      'Are you sure you want to withdraw from this swap? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Withdraw',
          style: 'destructive',
          onPress: async () => {
            try {
              if (!currentUser || !otherUser) {
                Alert.alert('Error', 'User information not available');
                return;
              }

              const otherUserId = otherUser.id || otherUser.uid;
              
              // Find and update the swap message in Firestore
              const messagesQuery = query(
                collection(db, 'messages'),
                where('participants', 'array-contains', currentUser.uid),
                where('type', '==', 'swap_request')
              );

              const querySnapshot = await getDocs(messagesQuery);
              
              const swapMessage = querySnapshot.docs.find(docSnap => {
                const data = docSnap.data();
                return (
                  data.participants.includes(otherUserId) &&
                  data.swapDetails?.status === 'accepted'
                );
              });

              if (swapMessage) {
                const msgRef = doc(db, 'messages', swapMessage.id);
                const swapData = swapMessage.data();
                const { myItemId, theirItemId, isNothingSwap } = swapData.swapDetails;
                
                // Update status to withdrawn
                await updateDoc(msgRef, {
                  'swapDetails.status': 'withdrawn',
                  withdrawnBy: currentUser.uid,
                  updatedAt: serverTimestamp(),
                });
                
                // Revert items back to available
                // For nothing swaps, only update the item that exists
                if (isNothingSwap) {
                  if (theirItemId) {
                    await updateDoc(doc(db, 'wardrobe-plug-fyp/user/images', theirItemId), {
                      swapStatus: 'available'
                    });
                  }
                } else {
                  // Normal swap: revert BOTH items
                  await updateDoc(doc(db, 'wardrobe-plug-fyp/user/images', myItemId), {
                    swapStatus: 'available'
                  });
                  await updateDoc(doc(db, 'wardrobe-plug-fyp/user/images', theirItemId), {
                    swapStatus: 'available'
                  });
                }
                
                // Send notification to other user
                await addDoc(collection(db, 'messages'), {
                  senderId: currentUser.uid,
                  receiverId: otherUserId,
                  text: 'The swap has been withdrawn.',
                  createdAt: serverTimestamp(),
                  participants: [currentUser.uid, otherUserId],
                  read: false,
                  type: 'status',
                });
                
                Alert.alert('Success', 'Swap withdrawn successfully', [
                  {
                    text: 'OK',
                    onPress: () => navigation.goBack(),
                  },
                ]);
              } else {
                Alert.alert('Error', 'Could not find swap information');
              }
            } catch (error) {
              console.error('Error withdrawing swap:', error);
              Alert.alert('Error', 'Could not withdraw swap. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleConfirmReceived = async () => {
    Alert.alert(
      'Confirm Receipt',
      'Have you received the item from the swap?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              if (!currentUser || !otherUser) {
                Alert.alert('Error', 'User information not available');
                return;
              }

              const otherUserId = otherUser.id || otherUser.uid;
              
              // Find and update the swap message in Firestore
              const messagesQuery = query(
                collection(db, 'messages'),
                where('participants', 'array-contains', currentUser.uid),
                where('type', '==', 'swap_request')
              );

              const querySnapshot = await getDocs(messagesQuery);
              
              const swapMessage = querySnapshot.docs.find(docSnap => {
                const data = docSnap.data();
                return (
                  data.participants.includes(otherUserId) &&
                  data.swapDetails?.status === 'accepted'
                );
              });

              if (swapMessage) {
                const msgRef = doc(db, 'messages', swapMessage.id);
                const swapData = swapMessage.data();
                const confirmations = swapData.confirmations || {};
                
                // Check if other user has already confirmed
                const bothConfirmed = confirmations[otherUserId] === true;
                
                await updateDoc(msgRef, {
                  [`confirmations.${currentUser.uid}`]: true,
                  ...(bothConfirmed && { 'swapDetails.status': 'completed' }),
                  updatedAt: serverTimestamp(),
                });

                setConfirmationStatus(prev => ({
                  ...prev,
                  myConfirmation: true
                }));
                
                // If both confirmed, mark items as swapped out and send completion notification
                if (bothConfirmed) {
                  const { myItemId, theirItemId } = swapData.swapDetails;
                  
                  // Mark BOTH items as swapped out
                  await updateDoc(doc(db, 'wardrobe-plug-fyp/user/images', myItemId), {
                    swapStatus: 'swapped out'
                  });
                  await updateDoc(doc(db, 'wardrobe-plug-fyp/user/images', theirItemId), {
                    swapStatus: 'swapped out'
                  });
                  
                  await addDoc(collection(db, 'messages'), {
                    senderId: currentUser.uid,
                    receiverId: otherUserId,
                    text: 'Swap completed! Both parties have confirmed receipt.',
                    createdAt: serverTimestamp(),
                    participants: [currentUser.uid, otherUserId],
                    read: false,
                    type: 'status',
                  });
                }
                
                Alert.alert('Success', 'You have confirmed receiving the item!');
              } else {
                Alert.alert('Error', 'Could not find swap information');
              }
            } catch (error) {
              console.error('Error confirming receipt:', error);
              Alert.alert('Error', 'Could not confirm receipt. Please try again.');
            }
          },
        },
      ]
    );
  };

  if (!swapDetails) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Icon name="arrow-back" size={24} color={colors.dark} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Swap Ongoing</Text>
            <View style={{ width: 40 }} />
          </View>
          <View style={styles.content}>
            <Text style={styles.placeholderText}>No swap details available</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Icon name="arrow-back" size={24} color={colors.dark} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Swap Ongoing</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          {/* Item Image - what you're receiving */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>You Will Receive</Text>
            <View style={styles.detailCard}>
            {itemIWillReceive.image && itemIWillReceive.title !== 'Nothing' ? (
              <Image 
                source={{ uri: itemIWillReceive.image }} 
                style={styles.largeItemImage}
                onError={(e) => console.log('Image load error:', e.nativeEvent.error)}
              />
            ) : (
              <View style={styles.placeholderContainer}>
                <Icon name="hand-right" size={80} color={colors.accent} />
                <Text style={styles.placeholderText}>
                  {itemIWillReceive.title === 'Nothing' ? 'Nothing' : 'No swap details available'}
                </Text>
              </View>
            )}
            </View>
          </View>

          {/* Swap Details - if available */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Swap Details</Text>
            <View style={styles.detailCard}>
            <View style={styles.itemsRow}>
                <View style={styles.itemContainer}>
                  {itemIAmGiving.image && itemIAmGiving.title !== 'Nothing' ? (
                    <Image 
                      source={{ uri: itemIAmGiving.image }} 
                      style={styles.itemImage}
                    />
                  ) : (
                    <View style={[styles.itemImage, styles.nothingItemContainer]}>
                      <Icon name="close-circle" size={40} color={colors.gray} />
                    </View>
                  )}
                  <Text style={styles.itemTitle} numberOfLines={1}>
                    {itemIAmGiving.title || 'Item'}
                  </Text>
                  <Text style={styles.itemLabel}>You give</Text>
                </View>
                <Icon name={swapDetails?.isNothingSwap ? "arrow-forward" : "swap-horizontal"} size={32} color={colors.dark} />
                <View style={styles.itemContainer}>
                  {itemIWillReceive.image && itemIWillReceive.title !== 'Nothing' ? (
                    <Image 
                      source={{ uri: itemIWillReceive.image }} 
                      style={styles.itemImage}
                    />
                  ) : (
                    <View style={[styles.itemImage, styles.nothingItemContainer]}>
                      <Icon name="close-circle" size={40} color={colors.gray} />
                    </View>
                  )}
                  <Text style={styles.itemTitle} numberOfLines={1}>
                    {itemIWillReceive.title || 'Item'}
                  </Text>
                  <Text style={styles.itemLabel}>You receive</Text>
                </View>
              </View>
              </View>
            </View>

          {/* Meetup Details */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Meetup Details</Text>
            <View style={styles.detailCard}>
            {route.params?.meetupDetails && route.params.meetupDetails.dateTime &&
              typeof route.params.meetupDetails.dateTime === 'number' &&
              route.params.meetupDetails.dateTime > 0 ? (
              <View style={styles.meetupInfo}>
                <View style={styles.meetupRow}>
                  <Icon name="calendar" size={20} color={colors.accent} />
                  <Text style={styles.meetupText}>
                    {new Date(route.params.meetupDetails.dateTime).toLocaleDateString('en-US', {
                      weekday: 'long',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </Text>
                </View>
                <View style={styles.meetupRow}>
                  <Icon name="time-outline" size={20} color={colors.accent} />
                  <Text style={styles.meetupText}>
                    {new Date(route.params.meetupDetails.dateTime).toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit',
                      hour12: true
                    })}
                  </Text>
                </View>
              </View>
            ) : (
              <View style={styles.placeholderContainer}>
                <Icon name="calendar-outline" size={32} color={colors.gray} />
                <Text style={styles.placeholderText}>
                  Meetup date and time not set yet.
                </Text>
              </View>
            )}
            </View>
          </View>

          {/* Location Details */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Meetup Location</Text>
            <View style={styles.detailCard}>
            {(() => {
              const details = route.params?.locationDetails;
              const code = details?.postalCode;
              const swapStatus = swapDetails?.status;
              // Only show location if swap is completed, otherwise always show placeholder until updated from chat
              if (
                swapStatus === 'completed' &&
                typeof code === 'string' &&
                code.trim().length > 0 &&
                code !== '000000' &&
                code !== '123456' &&
                code !== 'N/A'
              ) {
                return (
                  <View style={styles.meetupInfo}>
                    <View style={styles.meetupRow}>
                      <Icon name="location" size={20} color={colors.accent} />
                      <Text style={styles.meetupText}>
                        Singapore {code}
                      </Text>
                    </View>
                  </View>
                );
              } else {
                return (
                  <View style={styles.placeholderContainer}>
                    <Icon name="location-outline" size={32} color={colors.gray} />
                    <Text style={styles.placeholderText}>
                      Meetup location not set yet.
                    </Text>
                  </View>
                );
              }
            })()}
            </View>
          </View>

          {/* Confirmation Status */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Confirmation Status</Text>
            <View style={styles.detailCard}>
            <View style={styles.statusRow}>
              <View style={styles.statusItem}>
                <Icon 
                  name={confirmationStatus.theirConfirmation ? "checkmark-circle" : "ellipse-outline"} 
                  size={24} 
                  color={confirmationStatus.theirConfirmation ? "#4caf50" : colors.gray} 
                />
                <Text style={styles.statusText}>
                  {otherUserName}
                </Text>
              </View>
              
              <View style={styles.statusItem}>
                <Icon 
                  name={confirmationStatus.myConfirmation ? "checkmark-circle" : "ellipse-outline"} 
                  size={24} 
                  color={confirmationStatus.myConfirmation ? "#4caf50" : colors.gray} 
                />
                <Text style={styles.statusText}>You</Text>
              </View>
            </View>
            </View>
          </View>

          {/* Confirm Button */}
          {!confirmationStatus.myConfirmation && (
            <TouchableOpacity 
              style={styles.confirmButton}
              onPress={handleConfirmReceived}
            >
              <Icon name="checkmark-circle" size={20} color="#fff" />
              <Text style={styles.confirmButtonText}>Confirm I Received the Item</Text>
            </TouchableOpacity>
          )}

          {/* Waiting Message */}
          {confirmationStatus.myConfirmation && !confirmationStatus.theirConfirmation && (
            <View style={styles.waitingCard}>
              <Icon name="time-outline" size={32} color={colors.accent} />
              <Text style={styles.waitingText}>
                Waiting for {otherUserName || 'the other user'} to confirm...
              </Text>
            </View>
          )}

          {/* Completion Message */}
          {confirmationStatus.myConfirmation && confirmationStatus.theirConfirmation && (
            <View style={styles.completionCard}>
              <Icon name="checkmark-circle" size={48} color="#4caf50" />
              <Text style={styles.completionTitle}>Swap Completed!</Text>
              <Text style={styles.completionText}>
                Both parties have confirmed. Thank you for swapping!
              </Text>
            </View>
          )}

          {/* Withdraw Button - only show if not completed */}
          {!(confirmationStatus.myConfirmation && confirmationStatus.theirConfirmation) && (
            <TouchableOpacity 
              style={styles.withdrawButton}
              onPress={handleWithdrawSwap}
            >
              <Icon name="close-circle-outline" size={20} color="#fff" />
              <Text style={styles.withdrawButtonText}>Withdraw Swap</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.secondary,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: spacing.xs,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: fonts.semiBold,
    fontWeight: '600',
    color: colors.dark,
    flex: 1,
    textAlign: 'center',
  },
  content: {
    padding: spacing.md,
  },
  largeItemImage: {
    width: '100%',
    height: 250,
    borderRadius: 12,
    alignSelf: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    fontFamily: fonts.header,
    color: colors.dark,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: fonts.body,
    color: colors.gray,
    textAlign: 'center',
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.md,
  },

  section: {
    width: '100%',
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
  detailCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  itemsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  itemContainer: {
    alignItems: 'center',
    flex: 1,
  },
  itemImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
    marginBottom: spacing.sm,
  },
  nothingItemContainer: {
    backgroundColor: colors.secondary,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.gray,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemTitle: {
    fontSize: 14,
    fontFamily: fonts.body,
    color: colors.dark,
    textAlign: 'center',
  },
  itemLabel: {
    fontSize: 12,
    fontFamily: fonts.body,
    color: colors.gray,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  meetupInfo: {
    gap: spacing.md,
  },
  meetupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  meetupText: {
    fontSize: 16,
    fontFamily: fonts.body,
    color: colors.dark,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statusItem: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  statusText: {
    fontSize: 14,
    fontFamily: fonts.body,
    color: colors.dark,
  },
  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4caf50',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 12,
    width: '100%',
    gap: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: fonts.semiBold,
  },
  waitingCard: {
    alignItems: 'center',
    padding: spacing.xl,
    backgroundColor: '#fff',
    borderRadius: 12,
    width: '100%',
    gap: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  waitingText: {
    fontSize: 16,
    fontFamily: fonts.body,
    color: colors.gray,
    textAlign: 'center',
  },
  completionCard: {
    alignItems: 'center',
    padding: spacing.xl,
    backgroundColor: '#fff',
    borderRadius: 12,
    width: '100%',
    gap: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  completionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    fontFamily: fonts.header,
    color: '#4caf50',
  },
  completionText: {
    fontSize: 16,
    fontFamily: fonts.body,
    color: colors.gray,
    textAlign: 'center',
  },
  withdrawButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f44336',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 12,
    width: '100%',
    gap: spacing.sm,
    marginTop: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  withdrawButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: fonts.semiBold,
  },
  placeholderContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.sm,
  },
  placeholderText: {
    fontSize: 14,
    fontFamily: fonts.body,
    color: colors.gray,
    textAlign: 'center',
    paddingHorizontal: spacing.md,
  },
});
