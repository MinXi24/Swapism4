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
            data={items}
            renderItem={({ item }) => (
              <TouchableOpacity 
                style={styles.itemCard}
                onPress={() => onSelectItem(item)}
              >
                <Image source={{ uri: item.url }} style={styles.itemImage} />
                <Text style={styles.itemTitle} numberOfLines={2}>
                  {item.title || item.description?.substring(0, 50) || 'Item'}
                </Text>
              </TouchableOpacity>
            )}
            keyExtractor={(item) => item.id}
            numColumns={2}
            contentContainerStyle={styles.itemGrid}
            ListEmptyComponent={
              <View style={styles.emptyItemsContainer}>
                <Icon name="shirt-outline" size={64} color={colors.gray} />
                <Text style={styles.emptyItemsText}>No available items</Text>
                <Text style={styles.emptyItemsSubtext}>
                  Mark some items as available for swap first
                </Text>
              </View>
            }
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
    fontFamily: fonts.medium,
    color: colors.dark,
  },
  itemGrid: {
    padding: spacing.md,
  },
  itemCard: {
    flex: 1,
    margin: spacing.xs,
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
