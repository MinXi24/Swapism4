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
import Icon from '../../assets/icons/icons'; // Ensure this path matches your project
import { colors, fonts, spacing } from '../../lib/theme';

// --- COLORS FROM SCREENSHOT ---
const HEADER_BG = '#98C1A9';
const BEIGE_BG = '#F9F5EB'; // Light beige for the stats area

export default function ManageAccountScreen({ navigation }) {
  // State to simulate the post being present or deleted
  const [hasPost, setHasPost] = useState(true);
  
  // --- NAVIGATION STATE ---
  const [activeTab, setActiveTab] = useState('profiles');

  const handleBack = () => {
    navigation.goBack();
  };

  const handleDeletePost = () => {
    Alert.alert(
      "Delete Post",
      "Are you sure you want to remove this post for violating guidelines?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive",
          onPress: () => setHasPost(false) // This switches the UI to the "No post" state
        }
      ]
    );
  };

  // --- NAVBAR HANDLER ---
  const handleNavigation = (tab) => {
    setActiveTab(tab);
    switch(tab) {
      case 'home':
        // Navigate to Admin Home
        navigation.navigate('AdminHome');
        break;
      case 'profiles':
        // Already here
        break;
      case 'comments':
        // Navigate to Manage Comments
        navigation.navigate('ManageComments');
        break;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor={HEADER_BG} barStyle="dark-content" />

      {/* --- HEADER --- */}
      <View style={styles.headerContainer}>
        {/* Back Button */}
        <TouchableOpacity onPress={handleBack} style={styles.headerButton}>
           <Icon name="chevron-back-outline" size={28} color={colors.dark} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
           {/* Logo */}
           <Image 
              source={require('../../assets/images/swapism logo.png')} 
              style={styles.headerLogo}
              resizeMode="contain"
            />
            <Text style={styles.headerTitle}>PROFILE</Text>
        </View>

        <View style={styles.headerButton} /> 
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* --- PROFILE INFO SECTION --- */}
        <View style={styles.profileSection}>
            <View style={styles.avatarContainer}>
                <View style={styles.avatarPlaceholder}>
                    <Icon name="person" size={50} color="#FFF" />
                </View>
            </View>

            <View style={styles.statsContainer}>
                <Text style={styles.username}>Andy</Text>
                
                <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                        <Text style={styles.statNumber}>0</Text>
                        <Text style={styles.statLabel}>swaps</Text>
                    </View>
                    <View style={styles.statItem}>
                        <Text style={styles.statNumber}>3</Text>
                        <Text style={styles.statLabel}>followers</Text>
                    </View>
                    <View style={styles.statItem}>
                        <Text style={styles.statNumber}>1170</Text>
                        <Text style={styles.statLabel}>following</Text>
                    </View>
                </View>
            </View>
        </View>

        {/* --- RATINGS BAR --- */}
        <View style={styles.ratingBar}>
            <View style={styles.ratingRow}>
                <Text style={styles.ratingLabel}>Ratings:</Text>
                <View style={styles.stars}>
                    {[1, 2, 3, 4].map((_, i) => (
                         <Icon key={i} name="star" size={14} color="#D3D3D3" />
                    ))}
                </View>
            </View>
            <TouchableOpacity>
                <Text style={styles.viewReviewsText}>View Reviews</Text>
            </TouchableOpacity>
        </View>

        {/* --- POSTS SECTION --- */}
        <View style={styles.postsHeader}>
            <Text style={styles.postsTitle}>Posts</Text>
        </View>

        {/* --- POST CONTENT OR EMPTY STATE --- */}
        <View style={styles.contentArea}>
            {hasPost ? (
                // STATE 1: SUSPICIOUS POST
                <View style={styles.postCard}>
                    <Image 
                        source={{ uri: 'https://images.unsplash.com/photo-1605870445919-838d190e8e1b?q=80&w=2072&auto=format&fit=crop' }} 
                        style={styles.postImage}
                        resizeMode="cover"
                    />
                    
                    <View style={styles.postActionsRow}>
                        <View style={styles.leftActions}>
                            <TouchableOpacity style={styles.actionIcon}>
                                <Icon name="heart-outline" size={24} color={colors.dark} />
                                <Text style={styles.actionCount}>13</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.actionIcon}>
                                <Icon name="chatbubble-outline" size={22} color={colors.dark} />
                                <Text style={styles.actionCount}>4</Text>
                            </TouchableOpacity>
                        </View>

                        {/* DELETE BUTTON FOR ADMIN */}
                        <TouchableOpacity onPress={handleDeletePost}>
                            <Icon name="trash-outline" size={24} color="#98C1A9" />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.captionContainer}>
                        <Text style={styles.captionText}>
                            <Text style={styles.captionUsername}>Andy </Text>
                            Join us now!
                        </Text>
                        <Text style={styles.dateText}>November 11, 2025</Text>
                    </View>
                </View>
            ) : (
                // STATE 2: NO POST AVAILABLE (Deleted)
                <View style={styles.emptyStateContainer}>
                    <Text style={styles.emptyStateText}>- No post available -</Text>
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
  headerButton: {
    width: 40,
  },
  headerCenter: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  headerLogo: {
    width: 60,
    height: 40,
    position: 'absolute',
    left: -50, 
    top: -5,
    transform: [{ rotate: '-15deg' }]
  },
  headerTitle: {
    fontFamily: 'serif',
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    letterSpacing: 2,
  },

  // --- SCROLL CONTENT ---
  scrollContent: {
      paddingBottom: 100, // Ensure space for bottom nav
  },

  // --- PROFILE ---
  profileSection: {
    backgroundColor: HEADER_BG,
    paddingBottom: spacing.lg,
    alignItems: 'center',
  },
  avatarContainer: {
    marginBottom: spacing.sm,
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#ccc',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  statsContainer: {
    alignItems: 'center',
    width: '100%',
  },
  username: {
    fontFamily: fonts.header,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    paddingHorizontal: 40,
    backgroundColor: '#fff', 
    paddingVertical: 12,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontFamily: fonts.header,
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.dark,
  },
  statLabel: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.dark,
  },

  // --- RATINGS ---
  ratingBar: {
    backgroundColor: BEIGE_BG,
    paddingVertical: 8,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  ratingLabel: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: '#888',
    marginRight: 5,
  },
  stars: {
    flexDirection: 'row',
  },
  viewReviewsText: {
    fontFamily: fonts.body,
    fontSize: 12,
    textDecorationLine: 'underline',
    color: '#888',
  },

  // --- POSTS ---
  postsHeader: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  postsTitle: {
    fontFamily: 'serif',
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.dark,
  },
  contentArea: {
    paddingHorizontal: 0,
  },

  // --- POST CARD ---
  postCard: {
    marginBottom: spacing.xl,
  },
  postImage: {
    width: '100%',
    height: 350,
    backgroundColor: '#f0f0f0',
  },
  postActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  leftActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 15,
  },
  actionCount: {
    marginLeft: 4,
    fontFamily: fonts.body,
    fontSize: 14,
  },
  captionContainer: {
    paddingHorizontal: spacing.md,
    marginTop: 8,
  },
  captionText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.dark,
    lineHeight: 20,
  },
  captionUsername: {
    fontWeight: 'bold',
  },
  dateText: {
    fontFamily: fonts.body,
    fontSize: 10,
    color: '#999',
    marginTop: 4,
  },

  // --- EMPTY STATE ---
  emptyStateContainer: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyStateText: {
    fontFamily: 'serif',
    fontSize: 18,
    color: '#999',
    fontStyle: 'italic',
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