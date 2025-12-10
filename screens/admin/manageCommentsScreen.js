import React, { useState } from 'react';
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
import Icon from '../../assets/icons/icons';
import { colors, fonts, spacing } from '../../lib/theme';

// --- THEME COLORS ---
const THEME_GREEN = '#9abeaa';
const THEME_CREAM = '#f5f3e4';
const ACTIVE_YELLOW = '#FDD835'; 
const FLAG_BG = '#FFF9C4'; // Softer yellow for flagged background
const ALERT_RED = '#FF6B6B';

export default function ManageCommentsScreen({ navigation }) {
  const [showFlaggedComment, setShowFlaggedComment] = useState(true);
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
      case 'home': navigation.navigate('AdminHome'); break;
      case 'profiles': navigation.navigate('ManageAccount'); break;
      case 'comments': break; // Already here
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#fff" barStyle="dark-content" />

      {/* --- HEADER --- */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
            <TouchableOpacity onPress={handleBack} style={styles.backButton}>
                <Icon name="arrow-back" size={24} color={colors.dark} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Manage Comments</Text>
        </View>
        <View style={styles.headerIcons}>
          <TouchableOpacity style={styles.headerIcon}>
            <Icon name="ellipsis-horizontal" size={24} color={colors.dark} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* --- POST HEADER --- */}
        <View style={styles.userHeader}>
            <View style={styles.avatar}>
                {/* Placeholder for Ben's avatar */}
                <Icon name="person" size={20} color="#fff" />
            </View>
            <Text style={styles.headerUsername}>Ben</Text>
            <TouchableOpacity style={{ marginLeft: 'auto' }}>
                <Icon name="ellipsis-horizontal" size={20} color={colors.dark} />
            </TouchableOpacity>
        </View>

        {/* --- POST IMAGE --- */}
        <Image 
            source={{ uri: 'https://images.unsplash.com/photo-1517404215738-15263e9f9178?q=80&w=2070&auto=format&fit=crop' }} 
            style={styles.postImage}
            resizeMode="cover"
        />

        {/* --- SWAP BANNER (Styled) --- */}
        <View style={styles.swapBanner}>
            <Text style={styles.swapBannerText}>Swap NOW!</Text>
            <Icon name="chevron-forward" size={18} color={colors.dark} />
        </View>

        {/* --- ENGAGEMENT BAR --- */}
        <View style={styles.engagementBar}>
            <View style={styles.leftIcons}>
                <Icon name="heart-outline" size={24} color={colors.dark} />
                <Text style={styles.engagementCount}>20</Text>
                
                <Icon name="chatbubble-outline" size={22} color={colors.dark} style={{ marginLeft: 15 }} />
                <Text style={styles.engagementCount}>100</Text>
            </View>
            
            <TouchableOpacity>
                <Icon name="bookmark-outline" size={22} color={colors.dark} />
            </TouchableOpacity>
        </View>

        {/* --- CAPTION --- */}
        <View style={styles.captionContainer}>
            <Text style={styles.captionText}>
                <Text style={styles.boldUsername}>Ben </Text>
                Rayban sunglasses! Love da heat
            </Text>
            <Text style={styles.hashtags}>#love it #fllw #ootd</Text>
            <Text style={styles.dateText}>2 hours ago</Text>
        </View>

        {/* --- SEPARATOR --- */}
        <View style={styles.separator} />

        {/* --- COMMENTS LIST --- */}
        <View style={styles.commentsList}>
            <Text style={styles.sectionTitle}>Comments</Text>
            
            {/* --- FLAGGED COMMENT (Highlighted) --- */}
            {showFlaggedComment && (
                <View style={styles.flaggedCommentContainer}>
                    <View style={styles.flaggedHeader}>
                        <Icon name="alert-circle" size={16} color={ALERT_RED} />
                        <Text style={styles.flaggedLabel}>Reported Content</Text>
                    </View>
                    
                    <View style={styles.commentContentRow}>
                        <View style={styles.commentAvatar}>
                             <Icon name="person" size={14} color="#fff" />
                        </View>
                        <View style={styles.commentBubble}>
                            <Text style={styles.commentText}>
                                <Text style={styles.boldUsername}>Zen</Text>
                                {'\n'}
                                <Text style={styles.flaggedText}>ur fit is shit</Text>
                            </Text>
                            <Text style={styles.replyText}>reply • 10m</Text>
                        </View>
                        
                        {/* Delete Action */}
                        <TouchableOpacity 
                            style={styles.deleteButton} 
                            onPress={handleDeleteComment}
                        >
                            <Icon name="trash-outline" size={20} color={ALERT_RED} />
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            {/* Standard Comments */}
            <View style={styles.commentItem}>
                <View style={styles.commentAvatar}><Icon name="person" size={14} color="#fff" /></View>
                <View>
                    <Text style={styles.commentText}>
                        <Text style={styles.boldUsername}>xixihaha</Text> Nice! I love the it is soo cutee
                    </Text>
                    <Text style={styles.replyText}>reply</Text>
                </View>
            </View>

            <View style={styles.commentItem}>
                <View style={styles.commentAvatar}><Icon name="person" size={14} color="#fff" /></View>
                <View>
                    <Text style={styles.commentText}>
                        <Text style={styles.boldUsername}>heheheh</Text> WOw i rate it 10/10
                    </Text>
                    <Text style={styles.replyText}>reply</Text>
                </View>
            </View>

            <View style={styles.commentItem}>
                <View style={styles.commentAvatar}><Icon name="person" size={14} color="#fff" /></View>
                <View>
                    <Text style={styles.commentText}>
                        <Text style={styles.boldUsername}>1000000</Text> Swap?
                    </Text>
                    <Text style={styles.replyText}>reply</Text>
                </View>
            </View>

        </View>

      </ScrollView>

      {/* --- BOTTOM NAVBAR (Active Yellow on Comments) --- */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem} onPress={() => handleNavigation('home')}>
          <Icon name="home-outline" size={24} color={colors.gray} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem} onPress={() => handleNavigation('profiles')}>
          <Icon name="people-outline" size={24} color={colors.gray} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem} onPress={() => handleNavigation('comments')}>
          <Icon name="chatbubbles" size={24} color={ACTIVE_YELLOW} /> 
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
  
  // --- HEADER (Standard White) ---
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#dbdbdb',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: {
    fontFamily: fonts.header,
    fontSize: 20, 
    fontWeight: '700',
    color: THEME_GREEN, 
  },
  headerIcons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  headerIcon: {
    padding: 4,
  },
  backButton: {
    padding: 4,
  },

  // --- SCROLL CONTENT ---
  scrollContent: {
      paddingBottom: 80,
  },

  // --- POST HEADER ---
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  headerUsername: {
    fontFamily: fonts.body,
    fontWeight: '600',
    fontSize: 14,
    color: colors.dark,
  },

  // --- POST CONTENT ---
  postImage: {
    width: '100%',
    height: 400, // Tall aesthetic
    backgroundColor: '#eee',
  },
  swapBanner: {
    backgroundColor: THEME_CREAM, // Cream/Beige banner
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  swapBannerText: {
    fontFamily: fonts.header,
    fontSize: 14,
    fontWeight: '600',
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
    fontWeight: '600',
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
    fontWeight: '700',
  },
  hashtags: {
    color: THEME_GREEN,
    fontSize: 14,
    marginTop: 4,
  },
  dateText: {
    color: colors.gray,
    fontSize: 10,
    marginTop: 6,
  },

  separator: {
      height: 1,
      backgroundColor: '#eee',
      marginVertical: 10,
  },

  // --- COMMENTS ---
  commentsList: {
    paddingHorizontal: spacing.md,
    paddingBottom: 20,
  },
  sectionTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.dark,
      marginBottom: 16,
  },
  commentItem: {
    flexDirection: 'row',
    marginBottom: 16,
    paddingRight: 20,
  },
  commentAvatar: {
      width: 24, height: 24, borderRadius: 12, backgroundColor: '#ccc', marginRight: 10,
      justifyContent: 'center', alignItems: 'center'
  },
  commentText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.dark,
    lineHeight: 18,
    flex: 1,
  },
  replyText: {
    color: colors.gray,
    fontSize: 12,
    marginTop: 4,
    fontWeight: '600',
  },

  // --- FLAGGED COMMENT ---
  flaggedCommentContainer: {
    backgroundColor: FLAG_BG, // Light yellow background
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  flaggedHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
      gap: 6,
  },
  flaggedLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: ALERT_RED,
      textTransform: 'uppercase',
  },
  commentContentRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
  },
  commentBubble: {
      flex: 1,
  },
  flaggedText: {
    color: colors.dark, 
    fontStyle: 'italic', // Emphasize flagged text
  },
  deleteButton: {
      padding: 4,
  },

  // --- NAVBAR ---
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});