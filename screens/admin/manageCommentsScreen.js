import { useState } from 'react';
import {
  Alert,
  Image,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

// --- IMPORTS ---
import Icon from '../../assets/icons/icons'; // Ensure this path matches your project
import { colors, fonts, spacing } from '../../lib/theme';

// --- COLORS ---
const HEADER_BG = '#98C1A9';
const FLAG_BG = '#FFE59E'; // Yellow highlight for flagged comment

export default function ManageCommentsScreen({ navigation }) {
  // State to track if the bad comment exists
  const [showFlaggedComment, setShowFlaggedComment] = useState(true);
  
  // --- NAVIGATION STATE ---
  const [activeTab, setActiveTab] = useState('comments');

  const handleDeleteComment = () => {
    Alert.alert(
      "Delete Comment",
      "Are you sure you want to remove this comment?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive",
          onPress: () => setShowFlaggedComment(false) 
        }
      ]
    );
  };

  const handleBack = () => {
    navigation.goBack();
  };

  // --- NAVBAR HANDLER ---
  const handleNavigation = (tab) => {
    setActiveTab(tab);
    switch(tab) {
      case 'home':
        // Navigate back to Admin Home
        navigation.navigate('AdminHome'); // Ensure this matches your Route Name in App.js
        break;
      case 'profiles':
        // Navigate to Manage Profiles
        navigation.navigate('ManageAccount');
        break;
      case 'comments':
        // Already here
        break;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor={HEADER_BG} barStyle="dark-content" />

      {/* --- HEADER --- */}
      <View style={styles.headerContainer}>
        {/* Back Button */}
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
           <Icon name="chevron-back-outline" size={28} color={colors.dark} />
        </TouchableOpacity>

        {/* Logo */}
        <Image 
            source={require('../../assets/images/swapism logo.png')} 
            style={styles.headerLogo}
            resizeMode="contain"
        />
        
        {/* Placeholder for right side balance */}
        <View style={styles.backButton} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* --- POST HEADER (USER) --- */}
        <View style={styles.userHeader}>
            <View style={styles.avatar}>
                <Image 
                    source={{ uri: 'https://via.placeholder.com/40' }} // Placeholder for Ben's avatar
                    style={styles.avatarImage} 
                />
            </View>
            <Text style={styles.headerUsername}>Ben</Text>
        </View>

        {/* --- POST IMAGE --- */}
        <Image 
            source={{ uri: 'https://images.unsplash.com/photo-1517404215738-15263e9f9178?q=80&w=2070&auto=format&fit=crop' }} 
            style={styles.postImage}
            resizeMode="cover"
        />

        {/* --- SWAP BANNER --- */}
        <TouchableOpacity style={styles.swapBanner}>
            <Text style={styles.swapBannerText}>Swap NOW!</Text>
            <Icon name="chevron-forward-outline" size={20} color={colors.dark} />
        </TouchableOpacity>

        {/* --- ENGAGEMENT BAR --- */}
        <View style={styles.engagementBar}>
            <View style={styles.leftIcons}>
                <Icon name="heart-outline" size={24} color={colors.dark} />
                <Text style={styles.engagementCount}>20</Text>
                
                <Icon name="chatbubble-outline" size={22} color={colors.dark} style={{ marginLeft: 15 }} />
                <Text style={styles.engagementCount}>100</Text>
            </View>
            
            {/* Post Delete Icon (Different from comment delete) */}
            <TouchableOpacity>
                <Icon name="trash-outline" size={24} color="#98C1A9" />
            </TouchableOpacity>
        </View>

        {/* --- CAPTION --- */}
        <View style={styles.captionContainer}>
            <Text style={styles.captionText}>
                <Text style={styles.boldUsername}>fashionlogy </Text>
                Rayban sunglasses! Love da heat
            </Text>
            <Text style={styles.hashtags}>#love it #fllw #ootd</Text>
        </View>

        {/* --- COMMENTS LIST --- */}
        <View style={styles.commentsList}>
            
            {/* Comment 1 */}
            <View style={styles.commentItem}>
                <Text style={styles.commentText}>
                    <Text style={styles.boldUsername}>xixihaha{'\n'}</Text>
                    Nice! I love the it is soo cutee
                </Text>
                <Text style={styles.replyText}>reply</Text>
            </View>

            {/* Comment 2 */}
            <View style={styles.commentItem}>
                <Text style={styles.commentText}>
                    <Text style={styles.boldUsername}>heheheh{'\n'}</Text>
                    WOw i rate it 10/10
                </Text>
                <Text style={styles.replyText}>reply</Text>
            </View>

            {/* Comment 3 */}
            <View style={styles.commentItem}>
                <Text style={styles.commentText}>
                    <Text style={styles.boldUsername}>1000000{'\n'}</Text>
                    Swap?
                </Text>
                <Text style={styles.replyText}>reply</Text>
            </View>

            {/* Comment 4 */}
            <View style={styles.commentItem}>
                <Text style={styles.commentText}>
                    <Text style={styles.boldUsername}>Author{'\n'}</Text>
                    Pm :)
                </Text>
                <Text style={styles.replyText}>reply</Text>
            </View>

            {/* --- FLAGGED COMMENT (Conditional Render) --- */}
            {showFlaggedComment && (
                <View style={styles.flaggedCommentContainer}>
                    <View style={styles.flaggedContent}>
                        <Text style={styles.commentText}>
                            <Text style={styles.boldUsername}>Zen{'\n'}</Text>
                            <Text style={styles.flaggedText}>ur fit is shit</Text>
                        </Text>
                        <Text style={styles.replyText}>reply</Text>
                    </View>
                    <TouchableOpacity onPress={handleDeleteComment}>
                        <Icon name="trash-outline" size={24} color={colors.dark} />
                    </TouchableOpacity>
                </View>
            )}

        </View>

      </ScrollView>

      {/* --- REUSABLE NAVBAR COMPONENT --- */}
      <View style={styles.bottomNav}>
        
        {/* Tab 1: Admin Home */}
        <TouchableOpacity 
          style={styles.navItem}
          onPress={() => handleNavigation('home')}
        >
          <Icon 
            name={activeTab === 'home' ? 'home' : 'home-outline'} 
            size={24} 
            color={activeTab === 'home' ? colors.accent : colors.dark} 
          />
          <Text style={[styles.navText, activeTab === 'home' && styles.navTextActive]}>
            Admin Home
          </Text>
        </TouchableOpacity>

        {/* Tab 2: Manage Profiles */}
        <TouchableOpacity 
          style={styles.navItem}
          onPress={() => handleNavigation('profiles')}
        >
          <Icon 
            name={activeTab === 'profiles' ? 'people' : 'people-outline'} 
            size={24} 
            color={activeTab === 'profiles' ? colors.accent : colors.dark} 
          />
          <Text style={[styles.navText, activeTab === 'profiles' && styles.navTextActive]}>
            Manage Profiles
          </Text>
        </TouchableOpacity>

        {/* Tab 3: Manage Comments */}
        <TouchableOpacity 
          style={styles.navItem}
          onPress={() => handleNavigation('comments')}
        >
          <Icon 
            name={activeTab === 'comments' ? 'chatbubbles' : 'chatbubbles-outline'} 
            size={24} 
            color={activeTab === 'comments' ? colors.accent : colors.dark} 
          />
          <Text style={[styles.navText, activeTab === 'comments' && styles.navTextActive]}>
            Manage Comments
          </Text>
        </TouchableOpacity>

      </View>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  
  // --- HEADER ---
  headerContainer: {
    backgroundColor: HEADER_BG,
    height: 100,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: 10,
  },
  headerLogo: {
    width: 100,
    height: 50,
    transform: [{ rotate: '-10deg' }]
  },
  backButton: {
    width: 40, 
    alignItems: 'flex-start',
  },

  // --- POST HEADER ---
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    marginRight: 10,
    backgroundColor: '#eee',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  headerUsername: {
    fontFamily: fonts.body,
    fontWeight: 'bold',
    fontSize: 14,
    color: colors.dark,
  },

  // --- POST CONTENT ---
  postImage: {
    width: '100%',
    height: 300,
    backgroundColor: '#eee',
  },
  swapBanner: {
    backgroundColor: '#FCE77D', // Yellow banner
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  swapBannerText: {
    fontFamily: 'serif',
    fontSize: 14,
    color: colors.dark,
  },

  // --- ENGAGEMENT ---
  engagementBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
  },
  leftIcons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  engagementCount: {
    marginLeft: 6,
    fontSize: 14,
    color: colors.dark,
  },

  // --- CAPTION ---
  captionContainer: {
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  captionText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.dark,
    lineHeight: 20,
  },
  boldUsername: {
    fontWeight: 'bold',
  },
  hashtags: {
    color: '#999',
    fontSize: 12,
    marginTop: 4,
  },

  // --- COMMENTS ---
  commentsList: {
    paddingHorizontal: spacing.md,
    paddingBottom: 40,
  },
  commentItem: {
    marginBottom: 16,
  },
  commentText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.dark,
    lineHeight: 20,
  },
  replyText: {
    color: '#aaa',
    fontSize: 12,
    marginTop: 2,
  },

  // --- FLAGGED COMMENT ---
  flaggedCommentContainer: {
    backgroundColor: FLAG_BG,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  flaggedContent: {
    flex: 1,
  },
  flaggedText: {
    color: '#FF4444', // Red text for bad word
  },
  
  // --- SCROLL CONTENT ---
  scrollContent: {
      paddingBottom: 100, // Ensure space for bottom nav
  },

  // --- NAVBAR ---
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
    paddingVertical: 4,
  },
  navText: {
    fontFamily: fonts.body,
    fontSize: 10,
    color: colors.dark,
    marginTop: 2,
  },
  navTextActive: {
    color: colors.accent,
    fontWeight: 'bold',
  },
}); 