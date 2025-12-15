import { getAuth } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  getFirestore
} from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import Icon from '../../assets/icons/icons';
import { colors, fonts, spacing } from '../../lib/theme';

export default function BlockedUsersScreen({ navigation }) {
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const auth = getAuth();
  const db = getFirestore();
  const currentUser = auth.currentUser;

  useEffect(() => {
    loadBlockedUsers();
  }, []);

  const loadBlockedUsers = async () => {
    try {
      setLoading(true);
      if (!currentUser) return;

      // [UPDATED] Fetch from subcollection instead of array
      const q = collection(db, 'users', currentUser.uid, 'blocked_users');
      const snapshot = await getDocs(q);
      
      const users = snapshot.docs.map(doc => ({
        uid: doc.id, // The doc ID is the blocked user's ID
        ...doc.data(),
        // Map fields to match your UI expectation
        username: doc.data().blocked_user_name, 
        photoURL: doc.data().blocked_user_photo
      }));

      setBlockedUsers(users);
      
    } catch (error) {
      console.error('Error loading blocked users:', error);
      Alert.alert('Error', 'Failed to load blocked users');
    } finally {
      setLoading(false);
    }
  };

  const handleUnblock = async (userId, username) => {
    Alert.alert(
      'Unblock User',
      `Are you sure you want to unblock ${username}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unblock',
          style: 'destructive',
          onPress: async () => {
            try {
              // [UPDATED] Delete doc from subcollection
              await deleteDoc(doc(db, 'users', currentUser.uid, 'blocked_users', userId));

              // Update local state
              setBlockedUsers(prev => prev.filter(user => user.uid !== userId));
              
              Alert.alert('Success', `${username} has been unblocked`);
            } catch (error) {
              console.error('Error unblocking user:', error);
              Alert.alert('Error', 'Failed to unblock user');
            }
          }
        }
      ]
    );
  };

  const renderBlockedUser = ({ item }) => (
    <View style={styles.userItem}>
      <TouchableOpacity 
        style={styles.userInfo}
        onPress={() => navigation.navigate('UserProfile', { 
          userId: item.uid,
          username: item.username || item.displayName 
        })}
      >
        <View style={styles.avatarContainer}>
          {item.photoURL ? (
            <Image
              source={{ uri: item.photoURL }}
              style={styles.avatar}
            />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Icon name="person" size={24} color={colors.gray} />
            </View>
          )}
        </View>
        <View style={styles.userDetails}>
          <Text style={styles.username}>{item.username || item.displayName || 'User'}</Text>
          {/* Bio might not be saved in the block doc, so checking if it exists */}
          {item.bio && <Text style={styles.bio} numberOfLines={1}>{item.bio}</Text>}
        </View>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={styles.unblockButton}
        onPress={() => handleUnblock(item.uid, item.username || item.displayName)}
      >
        <Text style={styles.unblockButtonText}>Unblock</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#fff" barStyle="dark-content" />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color={colors.dark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Blocked Users</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.loadingText}>Loading blocked users...</Text>
        </View>
      ) : blockedUsers.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Icon name="ban-outline" size={64} color={colors.gray} />
          <Text style={styles.emptyTitle}>No Blocked Users</Text>
          <Text style={styles.emptyText}>
            Users you block will appear here
          </Text>
        </View>
      ) : (
        <FlatList
          data={blockedUsers}
          renderItem={renderBlockedUser}
          keyExtractor={(item) => item.uid}
          contentContainerStyle={styles.listContainer}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#dbdbdb',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: fonts.semiBold,
    fontWeight: '600',
    color: colors.dark,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: 16,
    color: colors.gray,
    fontFamily: fonts.regular,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: fonts.semiBold,
    fontWeight: '600',
    color: colors.dark,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.gray,
    textAlign: 'center',
  },
  listContainer: {
    paddingVertical: spacing.sm,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.light,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarContainer: {
    marginRight: 0,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  avatarPlaceholder: {
    backgroundColor: colors.lightGray,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userDetails: {
    marginLeft: spacing.md,
    flex: 1,
  },
  username: {
    fontSize: 16,
    fontFamily: fonts.semiBold,
    fontWeight: '600',
    color: colors.dark,
    marginBottom: 2,
  },
  bio: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: colors.gray,
  },
  unblockButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: colors.accent,
    borderRadius: 6,
  },
  unblockButtonText: {
    fontSize: 14,
    fontFamily: fonts.semiBold,
    fontWeight: '600',
    color: colors.dark,
  },
});