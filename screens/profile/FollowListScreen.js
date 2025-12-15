import { doc, getDoc, getFirestore } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from '../../assets/icons/icons';
import { colors, fonts, spacing } from '../../lib/theme';

export default function FollowListScreen({ route, navigation }) {
  const { userId, type } = route.params; // type: 'followers' or 'following'
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      try {
        const db = getFirestore();
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (!userDoc.exists()) {
          setUsers([]);
          setLoading(false);
          return;
        }
        const userData = userDoc.data();
        const ids = userData[type] || [];
        const userList = [];
        for (const id of ids) {
          const uDoc = await getDoc(doc(db, 'users', id));
          if (uDoc.exists()) {
            const uData = uDoc.data();
            userList.push({
              id,
              username: uData.username || 'User',
              photoURL: uData.photoURL || null,
            });
          }
        }
        setUsers(userList);
      } catch (e) {
        setUsers([]);
      }
      setLoading(false);
    };
    fetchUsers();
  }, [userId, type]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{type === 'followers' ? 'Followers' : 'Following'}</Text>
      {loading ? (
        <ActivityIndicator size="large" color={colors.accent} />
      ) : users.length === 0 ? (
        <Text style={styles.emptyText}>No users found.</Text>
      ) : (
        <FlatList
          data={users}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.userRow} onPress={() => navigation.navigate('UserProfile', { userId: item.id, username: item.username })}>
              <View style={styles.avatarContainer}>
                {item.photoURL ? (
                  <Image source={{ uri: item.photoURL }} style={styles.avatar} />
                ) : (
                  <Icon name="person" size={32} color={colors.gray} />
                )}
              </View>
              <Text style={styles.username}>{item.username}</Text>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: spacing.lg,
  },
  title: {
    fontFamily: fonts.header,
    fontSize: 22,
    fontWeight: '700',
    color: colors.dark,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  emptyText: {
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.gray,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
    overflow: 'hidden',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  username: {
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.dark,
  },
});
