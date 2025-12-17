/**
 * SWAP REQUEST CARD COMPONENT
 * 
 * Displays a swap request message with:
 * - Status badge (pending/accepted/rejected)
 * - Both items involved in the swap
 * - Accept/Reject buttons (for receiver only)
 * - Timestamp
 */

import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from '../assets/icons/icons';
import { colors, fonts, spacing } from '../lib/theme';

export const SwapRequestCard = ({ 
  message, 
  isMyMessage, 
  currentUserId,
  onAccept, 
  onReject,
  formatTime 
}) => {
  const { swapDetails } = message;
  const { status, myItemImage, myItemTitle, theirItemImage, theirItemTitle } = swapDetails;
  const isReceiver = message.receiverId === currentUserId;
  const isPending = status === 'pending';

  const getStatusText = () => {
    if (status === 'pending') {
      return isMyMessage ? 'REQUEST SENT' : 'REQUESTED FOR SWAP';
    }
    if (status === 'accepted') return 'SWAP ACCEPTED';
    if (status === 'rejected') return 'SWAP REJECTED';
    return '';
  };

  const getStatusIcon = () => {
    if (status === 'accepted') return 'checkmark-circle';
    if (status === 'rejected') return 'close-circle';
    return 'time-outline';
  };

  return (
    <View style={[
      styles.swapContainer,
      isMyMessage ? styles.myMessage : styles.theirMessage
    ]}>
      <View style={[
        styles.swapCard,
        isMyMessage ? styles.mySwapCard : styles.theirSwapCard,
      ]}>
        {/* Centered Status Badge at Top */}
        <View style={styles.statusContainer}>
          <View style={[
            styles.statusBadge,
            status === 'pending' && styles.pendingBadge,
            status === 'accepted' && styles.acceptedBadge,
            status === 'rejected' && styles.rejectedBadge
          ]}>
            <Icon 
              name={
                status === 'accepted' ? 'checkmark-circle-outline' :
                status === 'rejected' ? 'close-circle-outline' :
                'time-outline'
              }
              size={16}
              color={
                status === 'accepted' ? '#4caf50' :
                status === 'rejected' ? '#f44336' :
                colors.dark
              }
            />
            <Text style={[
              styles.statusText,
              status === 'accepted' && styles.acceptedText,
              status === 'rejected' && styles.rejectedText
            ]}>{getStatusText()}</Text>
          </View>
        </View>

        {/* Horizontal Items Display */}
        <View style={styles.swapItems}>
          {/* Left Item */}
          <View style={styles.itemWrapper}>
            <Image 
              source={{ uri: isMyMessage ? myItemImage : theirItemImage }} 
              style={styles.swapItemImage} 
            />
            <Text style={styles.swapItemTitle} numberOfLines={1}>
              {isMyMessage ? myItemTitle : theirItemTitle}
            </Text>
          </View>
          
          {/* Swap Icon */}
          <View style={styles.iconWrapper}>
            <Icon 
              name="swap-horizontal" 
              size={28} 
              color={colors.dark} 
            />
          </View>
          
          {/* Right Item */}
          <View style={styles.itemWrapper}>
            <Image 
              source={{ uri: isMyMessage ? theirItemImage : myItemImage }} 
              style={styles.swapItemImage} 
            />
            <Text style={styles.swapItemTitle} numberOfLines={1}>
              {isMyMessage ? theirItemTitle : myItemTitle}
            </Text>
          </View>
        </View>

        {/* Timestamp */}
        <Text style={styles.swapTime}>{formatTime(message.createdAt)}</Text>
      </View>

      {/* Action Buttons (only for receiver and pending status) */}
      {isReceiver && isPending && (
        <View style={styles.swapActions}>
          <TouchableOpacity 
            style={styles.acceptButton}
            onPress={() => onAccept(message.id)}
          >
            <Icon name="checkmark" size={24} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.rejectButton}
            onPress={() => onReject(message.id)}
          >
            <Icon name="close" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  swapContainer: {
    marginVertical: spacing.sm,
  },
  myMessage: {
    alignItems: 'flex-end',
  },
  theirMessage: {
    alignItems: 'flex-start',
  },
  swapCard: {
    maxWidth: '85%',
    borderRadius: 20,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    overflow: 'hidden',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  mySwapCard: {
    backgroundColor: '#9abeaa',
    borderBottomRightRadius: 6,
  },
  theirSwapCard: {
    backgroundColor: colors.secondary,
    borderBottomLeftRadius: 6,
  },
  statusContainer: {
    alignItems: 'center',
    marginBottom: spacing.md,
    width: 276,
  },
  statusBadge: {
    width: '100%',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 8,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  pendingBadge: {
    backgroundColor: '#fff',
  },
  acceptedBadge: {
    backgroundColor: '#fff',
  },
  rejectedBadge: {
    backgroundColor: '#fff',
  },
  statusText: {
    fontSize: 13,
    fontFamily: fonts.header,
    color: colors.dark,
    letterSpacing: 0.3,
    fontWeight: 'bold',
  },
  acceptedText: {
    color: '#4caf50',
  },
  rejectedText: {
    color: '#f44336',
  },
  swapItems: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  itemWrapper: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.sm,
  },
  swapItemImage: {
    width: 100,
    height: 100,
    borderRadius: 12,
    backgroundColor: '#fff',
  },
  swapItemTitle: {
    fontSize: 11,
    fontFamily: fonts.medium,
    color: colors.dark,
    textAlign: 'center',
    paddingHorizontal: spacing.xs,
  },
  iconWrapper: {
    // No background or padding, just the icon
  },
  swapActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.sm,
    width: '85%',
  },
  acceptButton: {
    flex: 1,
    backgroundColor: '#4caf50',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  acceptButtonText: {
    color: '#fff',
    fontFamily: fonts.bold,
    fontSize: 14,
    letterSpacing: 0.5,
  },
  rejectButton: {
    flex: 1,
    backgroundColor: '#f44336',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: 25,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
    justifyContent: 'center',
  },
  rejectButtonText: {
    color: '#fff',
    fontFamily: fonts.bold,
    fontSize: 14,
    letterSpacing: 0.5,
  },
  swapTime: {
    fontSize: 11,
    color: colors.gray,
    fontFamily: fonts.regular,
    marginTop: spacing.xs,
    alignSelf: 'flex-end',
  },
});
