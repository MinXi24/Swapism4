/**
 * ITEM PICKER MODAL COMPONENT
 * 
 * Modal that displays user's available swap items
 * Allows selecting an item to offer in exchange
 */

import React from 'react';
import { FlatList, Image, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from '../assets/icons/icons';
import { colors, fonts, spacing } from '../lib/theme';

export const ItemPickerModal = ({ 
  visible, 
  onClose, 
  items, 
  onSelectItem 
}) => {
  // Create a special "nothing" item
  const nothingItem = {
    id: 'nothing',
    url: null,
    title: 'Nothing',
    description: 'Request this item without offering anything in return',
    isNothing: true
  };

  // Combine nothing option with actual items
  const allItems = [nothingItem, ...items];

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select an Item to Swap</Text>
            <TouchableOpacity onPress={onClose}>
              <Icon name="close" size={24} color={colors.dark} />
            </TouchableOpacity>
          </View>
          
          <FlatList
            data={allItems}
            renderItem={({ item }) => (
              <TouchableOpacity 
                style={styles.itemCard}
                onPress={() => onSelectItem(item)}
              >
                {item.isNothing ? (
                  <View style={styles.nothingImageContainer}>
                    <Icon name="close-circle" size={48} color={colors.gray} />
                    <Text style={styles.nothingLabel}>Nothing</Text>
                  </View>
                ) : (
                  <Image source={{ uri: item.url }} style={styles.itemImage} />
                )}
                <Text style={styles.itemTitle} numberOfLines={2}>
                  {item.isNothing ? 'Swap for Nothing' : (item.title || item.description?.substring(0, 50) || 'Item')}
                </Text>
              </TouchableOpacity>
            )}
            keyExtractor={(item) => item.id}
            numColumns={2}
            contentContainerStyle={styles.itemGrid}
          />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: spacing.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: fonts.header,
    color: colors.accent,
  },
  itemGrid: {
    padding: spacing.md,
  },
  itemCard: {
    flex: 1,
    margin: spacing.sm,
    backgroundColor: colors.secondary,
    borderRadius: 12,
    padding: spacing.sm,
    alignItems: 'center',
    maxWidth: '48%',
  },
  itemImage: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 8,
    backgroundColor: colors.gray + '20',
  },
  itemTitle: {
    marginTop: spacing.xs,
    fontSize: 12,
    fontFamily: fonts.regular,
    color: colors.dark,
    textAlign: 'center',
  },
  nothingImageContainer: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 8,
    backgroundColor: colors.secondary,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.gray,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nothingLabel: {
    fontSize: 14,
    fontFamily: fonts.medium,
    color: colors.gray,
    marginTop: spacing.xs,
  },
  emptyItemsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    marginTop: spacing.xl,
  },
  emptyItemsText: {
    fontSize: 16,
    fontFamily: fonts.medium,
    color: colors.dark,
    marginTop: spacing.md,
  },
  emptyItemsSubtext: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.gray,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
});
