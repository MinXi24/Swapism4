/**
 * SWAP REQUEST CUSTOM HOOK
 * 
 * Manages all swap request functionality including:
 * - Loading user's available swap items
 * - Creating swap request messages
 * - Accepting/rejecting swap requests
 * - Updating item statuses
 */

import {
    addDoc,
    collection,
    doc,
    getDoc,
    getDocs,
    query,
    serverTimestamp,
    setDoc,
    updateDoc,
    where,
} from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { Alert } from 'react-native';

export const useSwapRequest = ({ 
  currentUser, 
  otherUserId, 
  otherUserName,
  otherUserPhoto, 
  swapRequest, 
  db,
  messages,
  setMessages,
  loadMessages 
}) => {
  const [userItems, setUserItems] = useState([]);
  const [showItemPicker, setShowItemPicker] = useState(false);
  const [currentUserPhoto, setCurrentUserPhoto] = useState(null);

  // Load current user's profile photo from Firestore
  useEffect(() => {
    const loadCurrentUserPhoto = async () => {
      if (!currentUser?.uid) return;
      
      try {
        const userDocRef = doc(db, 'users', currentUser.uid);
        const userDocSnap = await getDoc(userDocRef);
        
        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          setCurrentUserPhoto(userData.photoURL || null);
        }
      } catch (error) {
        console.error('Error loading current user photo:', error);
      }
    };
    loadCurrentUserPhoto();
  }, [currentUser, db]);

  // Load items user can offer for swapping
  useEffect(() => {
    const loadUserItems = async () => {
      if (!currentUser) return;
      
      try {
        const q = query(
          collection(db, 'wardrobe-plug-fyp/user/images'),
          where('ownerUid', '==', currentUser.uid),
          where('postType', '==', 'forSwap'),
          where('swapStatus', '==', 'available')
        );
        const querySnapshot = await getDocs(q);
        const items = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setUserItems(items);
      } catch (error) {
        console.error('Error loading user items:', error);
      }
    };
    loadUserItems();
  }, [currentUser, db]);

  // Show modal when swap context detected
  useEffect(() => {
    if (swapRequest && userItems.length > 0) {
      setShowItemPicker(true);
    }
  }, [swapRequest, userItems]);

  const handleSelectMyItem = async (myItem) => {
    setShowItemPicker(false);
    
    try {
      // Check if the item's swap status is still available
      if (myItem.swapStatus !== 'available') {
        Alert.alert(
          'Item Unavailable',
          'This item is no longer available for swapping.',
          [{ text: 'OK' }]
        );
        return;
      }

      const messageData = {
        type: 'swap_request',
        senderId: currentUser.uid,
        senderName: currentUser.displayName,
        senderPhoto: currentUserPhoto || null,
        receiverId: otherUserId,
        receiverName: otherUserName,
        receiverPhoto: otherUserPhoto || null,
        message: 'Swap Request',
        swapDetails: {
          myItemId: myItem.id,
          myItemImage: myItem.url,
          myItemTitle: myItem.title,
          theirItemId: swapRequest.theirItemId,
          theirItemImage: swapRequest.theirItemImage,
          theirItemTitle: swapRequest.theirItemTitle,
          status: 'pending'
        },
        createdAt: serverTimestamp(),
        participants: [currentUser.uid, otherUserId]
      };

      // Save message
      const docRef = await addDoc(collection(db, 'messages'), messageData);
      
      // Update conversation preview
      const conversationId = [currentUser.uid, otherUserId].sort().join('_');
      await setDoc(doc(db, 'conversations', conversationId), {
        participants: [currentUser.uid, otherUserId],
        lastMessage: 'Swap Request',
        lastMessageTime: new Date()
      }, { merge: true });

      // Add message to local state immediately for instant UI update
      if (setMessages) {
        const newMessageWithId = {
          ...messageData,
          id: docRef.id,
          createdAt: new Date() // Use current date for immediate display
        };
        setMessages(prevMessages => [...prevMessages, newMessageWithId]);
      }
      
      Alert.alert('Success', 'Swap request sent!');
    } catch (error) {
      console.error('Error creating swap request:', error);
      Alert.alert('Error', 'Could not send swap request. Please try again.');
    }
  };

  const handleAcceptSwap = async (messageId) => {
    Alert.alert(
      'Accept Swap',
      'Are you sure you want to accept this swap? Both items will be marked as Reserved.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Accept',
          onPress: async () => {
            try {
              // Find the message to get item IDs
              const message = messages.find(m => m.id === messageId);
              if (!message?.swapDetails) return;
              
              const { myItemId, theirItemId } = message.swapDetails;

              // Update local state immediately for instant UI feedback
              if (setMessages) {
                setMessages(prevMessages => 
                  prevMessages.map(msg => 
                    msg.id === messageId 
                      ? { ...msg, swapDetails: { ...msg.swapDetails, status: 'accepted' } }
                      : msg
                  )
                );
              }

              // Update message to accepted
              await updateDoc(doc(db, 'messages', messageId), {
                'swapDetails.status': 'accepted'
              });

              // Mark BOTH items as reserved
              await updateDoc(doc(db, 'wardrobe-plug-fyp/user/images', myItemId), {
                swapStatus: 'reserved'
              });
              await updateDoc(doc(db, 'wardrobe-plug-fyp/user/images', theirItemId), {
                swapStatus: 'reserved'
              });

              // Create status message in chat
              const otherUserId = message.senderId === currentUser.uid ? message.receiverId : message.senderId;
              const statusMessage = {
                senderId: currentUser.uid,
                receiverId: otherUserId,
                text: "Reserved",
                type: 'status',
                createdAt: new Date(),
                participants: [currentUser.uid, otherUserId],
                read: false,
              };
              
              // Add to Firestore
              const statusDocRef = await addDoc(collection(db, 'messages'), {
                ...statusMessage,
                createdAt: serverTimestamp(),
              });

              // Add to local state immediately
              if (setMessages) {
                setMessages(prevMessages => [...prevMessages, {
                  ...statusMessage,
                  id: statusDocRef.id,
                }]);
              }

              // Create reminder badge message
              const reminderMessage = {
                senderId: currentUser.uid,
                receiverId: otherUserId,
                text: "Tap the 'Swap Ongoing' button at the top to view swap details and confirm receipt.",
                type: 'reminder',
                createdAt: new Date(),
                participants: [currentUser.uid, otherUserId],
                read: false,
              };
              
              // Add reminder to Firestore
              const reminderDocRef = await addDoc(collection(db, 'messages'), {
                ...reminderMessage,
                createdAt: serverTimestamp(),
              });

              // Add reminder to local state
              if (setMessages) {
                setMessages(prevMessages => [...prevMessages, {
                  ...reminderMessage,
                  id: reminderDocRef.id,
                }]);
              }

              Alert.alert(
                'Success', 
                'Swap accepted! Both items marked as reserved.\n\nTap the "Swap Ongoing" button at the top to view swap details and confirm receipt.'
              );
            } catch (error) {
              console.error('Error accepting swap:', error);
              Alert.alert('Error', 'Could not accept swap. Please try again.');
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  const handleRejectSwap = async (messageId) => {
    Alert.alert(
      'Reject Swap',
      'Are you sure you want to reject this swap request?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            try {
              // Update local state immediately for instant UI feedback
              if (setMessages) {
                setMessages(prevMessages => 
                  prevMessages.map(msg => 
                    msg.id === messageId 
                      ? { ...msg, swapDetails: { ...msg.swapDetails, status: 'rejected' } }
                      : msg
                  )
                );
              }

              // Update message status in Firestore
              await updateDoc(doc(db, 'messages', messageId), {
                'swapDetails.status': 'rejected'
              });

              // Create status message in chat
              const message = messages.find(m => m.id === messageId);
              if (message) {
                const otherUserId = message.senderId === currentUser.uid ? message.receiverId : message.senderId;
                const statusMessage = {
                  senderId: currentUser.uid,
                  receiverId: otherUserId,
                  text: "The swap was rejected",
                  type: 'status',
                  createdAt: new Date(),
                  participants: [currentUser.uid, otherUserId],
                  read: false,
                };
                
                // Add to Firestore
                const statusDocRef = await addDoc(collection(db, 'messages'), {
                  ...statusMessage,
                  createdAt: serverTimestamp(),
                });

                // Add to local state immediately
                if (setMessages) {
                  setMessages(prevMessages => [...prevMessages, {
                    ...statusMessage,
                    id: statusDocRef.id,
                  }]);
                }
              }

              Alert.alert('Rejected', 'Swap request has been declined.');
            } catch (error) {
              console.error('Error rejecting swap:', error);
              Alert.alert('Error', 'Could not reject swap. Please try again.');
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  return {
    userItems,
    showItemPicker,
    setShowItemPicker,
    handleSelectMyItem,
    handleAcceptSwap,
    handleRejectSwap,
  };
};
