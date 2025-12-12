import { getAuth } from 'firebase/auth';
import { collection, doc, getDoc, getFirestore, onSnapshot, query, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
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
import BottomNavBar from '../../components/BottomNavBar';
import Input from '../../components/Input';
import { useAuth } from '../../context/GuestContext';
import { colors, fonts, spacing } from '../../lib/theme';

export default function MessagesScreen({ navigation }) {
  const { isGuest } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const auth = getAuth();
  const db = getFirestore();
  const currentUser = auth.currentUser;
  
  // Load conversations in real-time
  useEffect(() => {
    if (!currentUser || isGuest) {
      setLoading(false);
      return;
    }
    
    const messagesRef = collection(db, 'messages');
    const q = query(
      messagesRef,
      where('participants', 'array-contains', currentUser.uid)
    );
    
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      try {
        const conversationMap = new Map();
        
        snapshot.forEach((doc) => {
          const data = doc.data();
          const otherUserId = data.participants.find(id => id !== currentUser.uid);
          
          if (!otherUserId) return;
          
          if (!conversationMap.has(otherUserId) || 
              (data.createdAt && conversationMap.get(otherUserId).createdAt < data.createdAt)) {
            conversationMap.set(otherUserId, {
              id: otherUserId,
              lastMessage: data.message,
              lastMessageTime: data.createdAt,
              senderId: data.senderId,
            });
          }
        });
        
        const conversationsList = [];
        for (const [userId, convData] of conversationMap) {
          try {
            const userDocRef = doc(db, 'users', userId);
            const userDoc = await getDoc(userDocRef);
            
            if (userDoc.exists()) {
              const userData = userDoc.data();
              conversationsList.push({
                id: userId,
                uid: userId,
                name: userData.username || userData.displayName || 'User',
                userName: userData.username || userData.displayName || 'User',
                photoURL: userData.photoURL,
                message: convData.lastMessage || 'No messages yet',
                time: formatTime(convData.lastMessageTime),
                avatar: userData.photoURL || 'https://via.placeholder.com/50/9abeaa/FFFFFF?text=' + (userData.username?.[0] || 'U'),
                unread: convData.senderId !== currentUser.uid,
              });
            }
          } catch (err) {
            console.error('Error fetching user data:', err);
          }
        }
        
        conversationsList.sort((a, b) => {
          const timeA = a.time || '';
          const timeB = b.time || '';
          return timeB.localeCompare(timeA);
        });
        
        setConversations(conversationsList);
      } catch (error) {
        console.error('Error processing conversations:', error);
      } finally {
        setLoading(false);
      }
    });
    
    return () => unsubscribe();
  }, [currentUser, isGuest]);
  
  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 60) return diffMins + 'm';
    if (diffHours < 24) return diffHours + 'h';
    if (diffDays < 7) return diffDays + 'd';
    return date.toLocaleDateString();
  };

  // If guest, show login prompt
  if (isGuest) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar backgroundColor={colors.accent} barStyle="dark-content" />
        
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Text style={styles.logo}>Swapism</Text>
          </View>
          <Text style={styles.pageTitle}>Messages</Text>
          <TouchableOpacity style={styles.menuButton}>
            <Icon name="menu-outline" size={24} color={colors.dark} />
          </TouchableOpacity>
        </View>

        {/* Guest Content */}
        <View style={[styles.messagesContainer, styles.guestContent]}>
          <Image source={require('../../assets/images/logo.png')} style={styles.logoImage} resizeMode="contain" />
          <Text style={styles.guestMessage}>Please login to access Messages</Text>
          <TouchableOpacity 
            style={styles.loginButton}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.loginButtonText}>Login</Text>
          </TouchableOpacity>
        </View>

        <BottomNavBar navigation={navigation} activeRoute="Messages" />
      </SafeAreaView>
    );
  }

  // Normal screen content for logged-in users
  const handleMessagePress = (conversation) => {
    navigation.navigate('Chat', { user: conversation });
  };

  const renderMessageItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.messageItem}
      onPress={() => handleMessagePress(item)}
    >
      <Image source={{ uri: item.avatar }} style={styles.avatar} />
      <View style={styles.messageContent}>
        <View style={styles.messageHeader}>
          <Text style={styles.userName}>{item.name}</Text>
          <Text style={styles.time}>{item.time}</Text>
        </View>
        <Text style={styles.messageText}>{item.message}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor={colors.accent} barStyle="dark-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <Text style={styles.logo}>Swapism</Text>
        </View>
        <Text style={styles.pageTitle}>Messages</Text>
        <TouchableOpacity style={styles.menuButton}>
          <Icon name="menu-outline" size={24} color={colors.dark} />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Input
          placeholder="Search..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          leftIcon="search-outline"
          style={styles.searchBar}
        />
      </View>

      {/* Messages List */}
      <View style={styles.messagesContainer}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.accent} />
          </View>
        ) : (
          <FlatList
            data={conversations.filter(conv => 
              conv.name.toLowerCase().includes(searchQuery.toLowerCase())
            )}
            renderItem={renderMessageItem}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
          />
        )}
      </View>

      {/* Bottom Navigation */}
      <BottomNavBar navigation={navigation} activeRoute="Messages" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.light,
  },
  header: {
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logoContainer: {
    flex: 1,
  },
  logo: {
    fontFamily: fonts.header,
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.dark,
  },
  pageTitle: {
    fontFamily: fonts.header,
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.dark,
    flex: 2,
    textAlign: 'center',
  },
  menuButton: {
    flex: 1,
    alignItems: 'flex-end',
  },
  searchContainer: {
    backgroundColor: colors.light,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
   searchBar: {
    marginHorizontal: spacing.md,
    marginVertical: spacing.sm,
  },
  messagesContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  messageItem: {
    flexDirection: 'row',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: spacing.md,
  },
  messageContent: {
    flex: 1,
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  userName: {
    fontFamily: fonts.header,
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.dark,
  },
  time: {
    fontFamily: fonts.sub,
    fontSize: 12,
    color: colors.gray,
  },
  messageText: {
    fontFamily: fonts.sub,
    fontSize: 14,
    color: colors.gray,
  },
  guestContent: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  logoImage: {
    width: 300,
    height: 300,
    marginBottom: spacing.lg,
  },
  guestMessage: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.dark,
    textAlign: 'center',
    marginBottom: spacing.lg,
    fontFamily: fonts.header,
  },
  loginButton: {
    backgroundColor: colors.dark,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
    borderRadius: 25,
    padding: 20,
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.light,
    fontFamily: fonts.header,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: colors.secondary,
    paddingVertical: 8,
    paddingHorizontal: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.primary,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
});