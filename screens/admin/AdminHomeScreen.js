import React, { useState } from 'react';
import {
  Image,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

// --- IMPORTS ---
import Icon from '../../assets/icons/icons';
import { colors, fonts, spacing } from '../../lib/theme';

// --- COLORS ---
const HEADER_BG = '#98C1A9'; 
const SEARCH_BG = '#FAF9F4'; 

// --- MOCK DATA ---
const reportsData = [
  { 
    id: '1', 
    name: 'Andy', 
    detail: '(Sus Account)', 
    type: 'ACCOUNT_FLAG', 
    priority: 'high',
    rating: 1
  },
  { 
    id: '2', 
    name: 'Zen', 
    detail: 'ur fit is shit', 
    type: 'COMMENT_FLAG', 
    priority: 'medium'
  },
];

const feedbacksData = [
  { 
    id: '3', 
    name: 'Ben', 
    detail: 'Dear admins, i am unable to access to my profile.', 
    type: 'SYSTEM_ISSUE', 
  },
];

const statsData = [
    { label: 'Pending', value: '12', icon: 'alert-circle-outline', color: '#FF6B6B' },
    { label: 'Users', value: '1.2k', icon: 'people-outline', color: colors.dark }, 
    { label: 'Swaps', value: '340', icon: 'swap-horizontal-outline', color: '#98C1A9' }, 
    { label: 'Feedback', value: '5', icon: 'chatbubble-outline', color: '#FCE77D' },
];

export default function AdminHomeScreen({ navigation }) {
  const [searchQuery, setSearchQuery] = useState('');
  
  // Active tab defaults to 'home' here
  const [activeTab, setActiveTab] = useState('home');

  // --- NAVIGATION LOGIC ---
  const handleViewItem = (item) => {
    if (item.name === 'Andy') {
        navigation.navigate('ManageAccount');
    } else if (item.name === 'Zen') {
        navigation.navigate('ManageComments'); 
    } else {
        console.log("View Item:", item.id);
    }
  };

  // --- NAVBAR HANDLER ---
  const handleNavigation = (tab) => {
    setActiveTab(tab);
    switch(tab) {
      case 'home':
        // Already on Admin Home
        break;
      case 'profiles':
        // Navigate to the Manage Profiles screen
        navigation.navigate('ManageAccount');
        break;
      case 'comments':
        // Navigate to the Manage Comments screen
        navigation.navigate('ManageComments');
        break;
    }
  };

  // --- HELPER: RENDER STARS ---
  const renderStars = (count) => {
    return (
        <View style={styles.starRow}>
            {[1, 2, 3, 4, 5].map((star, index) => (
                <Icon 
                    key={index} 
                    name={index < count ? "star" : "star-outline"} 
                    size={14} 
                    color="#FFD700" 
                    style={{ marginRight: 2 }}
                />
            ))}
        </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor={HEADER_BG} barStyle="dark-content" />
      
      {/* --- HEADER --- */}
      <View style={styles.headerContainer}>
         <View style={styles.headerTopRow}>
            <View style={styles.headerLeft}>
                <Image 
                    source={require('../../assets/images/swapism logo.png')} 
                    style={styles.logoImage}
                    resizeMode="contain"
                />
            </View>
            <Text style={styles.headerTitle}>Welcome Back</Text>
            <View style={styles.headerRight}>
                <TouchableOpacity>
                    <Icon name="menu-outline" size={30} color="#fff" />
                </TouchableOpacity>
            </View>
         </View>

         <View style={styles.searchBarContainer}>
             <Icon name="search-outline" size={20} color="#999" style={styles.searchIcon}/>
             <TextInput
                placeholder=""
                value={searchQuery}
                onChangeText={setSearchQuery}
                style={styles.searchInput}
             />
         </View>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        
        {/* --- HERO SECTION --- */}
        <View style={styles.heroContainer}>
           <View style={styles.heroTextContainer}>
                <Text style={styles.greetingText}>Hello, Admin 👋</Text>
                <Text style={styles.subGreetingText}>Daily Overview</Text>
           </View>
           <Image 
            source={require('../../assets/images/admin home illustration.png')} 
            style={styles.heroImage}
            resizeMode="contain"
          />
        </View>

        {/* --- STATS GRID --- */}
        <View style={styles.statsGrid}>
            {statsData.map((stat, index) => (
                <View key={index} style={styles.statCard}>
                    <View style={[styles.statIconBg, { backgroundColor: colors.secondary }]}>
                        <Icon name={stat.icon} size={22} color={stat.color} />
                    </View>
                    <View>
                        <Text style={styles.statValue}>{stat.value}</Text>
                        <Text style={styles.statLabel}>{stat.label}</Text>
                    </View>
                </View>
            ))}
        </View>

        {/* --- REPORTS SECTION --- */}
        <View style={styles.sectionHeaderRow}>
             <Text style={styles.sectionTitle}>Recent Reports</Text>
             <TouchableOpacity style={styles.viewAllButton}>
                <Text style={styles.viewAllText}>View All</Text>
                <Icon name="chevron-forward-outline" size={16} color={colors.dark} />
             </TouchableOpacity>
        </View>

        <View style={styles.cardListContainer}>
            {reportsData.map((item) => (
              <View key={item.id} style={styles.adminCard}>
                <View style={styles.cardLeft}>
                    <View style={[styles.statusLine, { backgroundColor: item.priority === 'high' ? '#FF6B6B' : '#FCE77D' }]} />
                    <View style={styles.avatar}>
                        <Icon name="person-outline" size={20} color={colors.dark} />
                    </View>
                    <View style={styles.textContainer}>
                        <Text style={styles.nameText}>{item.name}</Text>
                        
                        {item.type === 'ACCOUNT_FLAG' ? (
                            <View style={styles.ratingDetailContainer}>
                                {renderStars(item.rating)} 
                                <Text style={styles.detailText}>{item.detail}</Text>
                            </View>
                        ) : (
                            <Text style={styles.detailText}>{item.detail}</Text>
                        )}

                    </View>
                </View>
                <TouchableOpacity 
                    style={styles.actionButton}
                    onPress={() => handleViewItem(item)}
                >
                    <Text style={styles.actionButtonText}>Review</Text>
                </TouchableOpacity>
              </View>
            ))}
        </View>

        {/* --- FEEDBACKS SECTION --- */}
        <View style={styles.sectionHeaderRow}>
             <Text style={styles.sectionTitle}>User Feedbacks</Text>
        </View>

        <View style={styles.cardListContainer}>
            {feedbacksData.map((item) => (
              <View key={item.id} style={styles.adminCard}>
                <View style={styles.cardLeft}>
                    <View style={[styles.statusLine, { backgroundColor: '#98C1A9' }]} />
                    <Image 
                        source={{ uri: 'https://via.placeholder.com/100' }} 
                        style={styles.avatarImage}
                    />
                    <View style={styles.textContainer}>
                        <Text style={styles.nameText}>{item.name}</Text>
                        <Text style={styles.detailText} numberOfLines={2}>
                            {item.detail}
                        </Text>
                    </View>
                </View>
                <TouchableOpacity 
                    style={styles.actionButton}
                    onPress={() => handleViewItem(item)}
                >
                    <Text style={styles.actionButtonText}>Reply</Text>
                </TouchableOpacity>
              </View>
            ))}
        </View>

      </ScrollView>

      {/* --- REUSABLE NAVBAR COMPONENT (Updated Tabs) --- */}
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
    backgroundColor: colors.accent,
  },
  
  // --- HEADER & SEARCH ---
  headerContainer: {
    backgroundColor: HEADER_BG,
    paddingHorizontal: spacing.md,
    paddingTop: 10,
    paddingBottom: 25,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  headerLeft: { flex: 1, alignItems: 'flex-start' },
  headerRight: { flex: 1, alignItems: 'flex-end' },
  logoImage: { width: 160, height: 70, marginLeft: -10 },
  headerTitle: {
    flex: 2, 
    fontFamily: 'serif', 
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center',
  },
  searchBarContainer: {
    backgroundColor: SEARCH_BG,
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    height: 40,
  },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, fontSize: 16, color: colors.dark, height: '100%' },

  // --- HERO ---
  heroContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.primary,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    marginBottom: spacing.md,
    padding: 20,
    borderRadius: 12,
  },
  heroTextContainer: { flex: 1 },
  greetingText: { fontFamily: fonts.header, fontSize: 18, fontWeight: 'bold', color: colors.dark },
  subGreetingText: { fontFamily: fonts.body, fontSize: 14, color: colors.dark, opacity: 0.8, marginTop: 4 },
  heroImage: { width: 80, height: 60 },

  // --- STATS ---
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  statCard: {
    width: '48%', 
    backgroundColor: colors.secondary,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
  },
  statIconBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  statValue: { fontFamily: fonts.header, fontSize: 18, fontWeight: 'bold', color: colors.dark },
  statLabel: { fontFamily: fonts.body, fontSize: 11, color: colors.dark, opacity: 0.7 },

  // --- SECTIONS ---
  scrollContent: { paddingBottom: 100 },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  sectionTitle: { fontFamily: fonts.header, fontSize: 16, fontWeight: 'bold', color: colors.dark },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.secondary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  viewAllText: { fontFamily: fonts.header, fontSize: 12, color: colors.dark, marginRight: 4 },

  // --- CARDS ---
  cardListContainer: { paddingHorizontal: spacing.md, marginBottom: spacing.sm },
  adminCard: {
      backgroundColor: colors.secondary, 
      borderRadius: 12,
      padding: spacing.md,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.sm,
  },
  cardLeft: { flexDirection: 'row', flex: 1, alignItems: 'center', marginRight: 10 },
  statusLine: { width: 4, height: 30, borderRadius: 2, marginRight: 12 },
  avatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
  },
  avatarImage: { width: 40, height: 40, borderRadius: 20, marginRight: 12 },
  textContainer: { flex: 1 },
  nameText: { fontFamily: fonts.body, fontWeight: 'bold', fontSize: 14, color: colors.dark, marginBottom: 2 },
  
  ratingDetailContainer: { flexDirection: 'row', alignItems: 'center' },
  starRow: { flexDirection: 'row', marginRight: 6 },
  detailText: { fontFamily: fonts.body, fontSize: 12, color: colors.dark, opacity: 0.7 },
  
  actionButton: {
      backgroundColor: colors.primary,
      paddingVertical: 6,
      paddingHorizontal: 16,
      borderRadius: 20,
  },
  actionButtonText: { fontFamily: fonts.body, fontSize: 12, fontWeight: 'bold', color: colors.dark },

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