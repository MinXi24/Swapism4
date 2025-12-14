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
  swapRequest, 
  db,
  messages 
}) => {
  const [userItems, setUserItems] = useState([]);
  const [showItemPicker, setShowItemPicker] = useState(false);

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
      const messageData = {
        type: 'swap_request',
        senderId: currentUser.uid,
        senderName: currentUser.displayName,
        receiverId: otherUserId,
        receiverName: otherUserName,
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
      await addDoc(collection(db, 'messages'), messageData);
      
      // Update conversation preview
      const conversationId = [currentUser.uid, otherUserId].sort().join('_');
      await setDoc(doc(db, 'conversations', conversationId), {
        participants: [currentUser.uid, otherUserId],
        lastMessage: 'Swap Request',
        lastMessageTime: new Date()
      }, { merge: true });

      Alert.alert('Success', 'Swap request sent!');
    } catch (error) {
      console.error('Error creating swap request:', error);
      Alert.alert('Error', 'Could not send swap request. Please try again.');
    }
  };

  const handleAcceptSwap = async (messageId) => {
    try {
      // Find the message to get item IDs
      const message = messages.find(m => m.id === messageId);
      if (!message?.swapDetails) return;
      
      const { myItemId, theirItemId } = message.swapDetails;

      // Update message to accepted
      await updateDoc(doc(db, 'messages', messageId), {
        'swapDetails.status': 'accepted'
      });

      // Mark BOTH items as swapped out
      await updateDoc(doc(db, 'wardrobe-plug-fyp/user/images', myItemId), {
        swapStatus: 'swapped out'
      });
      await updateDoc(doc(db, 'wardrobe-plug-fyp/user/images', theirItemId), {
        swapStatus: 'swapped out'
      });

      Alert.alert('Success', 'Swap accepted! Both items marked as swapped out.');
    } catch (error) {
      console.error('Error accepting swap:', error);
      Alert.alert('Error', 'Could not accept swap. Please try again.');
    }
  };

  const handleRejectSwap = async (messageId) => {
    try {
      // Just update message status
      await updateDoc(doc(db, 'messages', messageId), {
        'swapDetails.status': 'rejected'
      });
      Alert.alert('Rejected', 'Swap request has been declined.');
    } catch (error) {
      console.error('Error rejecting swap:', error);
      Alert.alert('Error', 'Could not reject swap. Please try again.');
    }
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
