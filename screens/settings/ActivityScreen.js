import { useFocusEffect } from '@react-navigation/native';
import { getAuth } from 'firebase/auth';
import { collection, getDocs, getFirestore, query, where } from 'firebase/firestore';
import { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import Icon from '../../assets/icons/icons';
import BottomNavBar from '../../components/BottomNavBar';
import { colors, fonts, spacing } from '../../lib/theme';

export default function ActivityScreen({ navigation }) {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('liked'); // 'liked' or 'viewed'

  const auth = getAuth();
  const db = getFirestore();
  const user = auth.currentUser;

  const loadActivities = async () => {
    try {
      const uid = user?.uid;
      if (!uid) {
        setLoading(false);
        return;
      }

      console.log('Loading activities...');
      const q = query(
        collection(db, 'activity'),
        where('userId', '==', uid),
        where('type', '==', activeTab)
      );
      const querySnapshot = await getDocs(q);
      const activitiesData = querySnapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        .sort((a, b) => {
          const dateA = a.timestamp?.toDate?.() || new Date(0);
          const dateB = b.timestamp?.toDate?.() || new Date(0);
          return dateB - dateA;
        });
      
      console.log('Loaded activities:', activitiesData.length);
      setActivities(activitiesData);
    } catch (error) {
      console.error('Error loading activities:', error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadActivities();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab])
  );

  const handlePostPress = (activity) => {
    if (activity.post) {
      navigation.navigate('PostDetails', { post: activity.post });
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp?.toDate) return 'Recently';
    const date = timestamp.toDate();
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color={colors.dark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Activity</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'liked' && styles.activeTab]}
          onPress={() => setActiveTab('liked')}
        >
          <Icon 
            name={activeTab === 'liked' ? 'heart' : 'heart-outline'} 
            size={20} 
            color={activeTab === 'liked' ? colors.highlight : colors.dark} 
          />
          <Text style={[styles.tabText, activeTab === 'liked' && styles.activeTabText]}>
            Liked Posts
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'viewed' && styles.activeTab]}
          onPress={() => setActiveTab('viewed')}
        >
          <Icon 
            name={activeTab === 'viewed' ? 'eye' : 'eye-outline'} 
            size={20} 
            color={activeTab === 'viewed' ? colors.highlight : colors.dark} 
          />
          <Text style={[styles.tabText, activeTab === 'viewed' && styles.activeTabText]}>
            Recently Viewed
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : (
        <ScrollView style={styles.content}>
          {activities.length === 0 ? (
            <View style={styles.emptyState}>
              <Icon 
                name={activeTab === 'liked' ? 'heart-outline' : 'eye-outline'} 
                size={64} 
                color={colors.gray} 
              />
              <Text style={styles.emptyText}>
                {activeTab === 'liked' 
                  ? 'No liked posts yet' 
                  : 'No recently viewed posts'}
              </Text>
              <Text style={styles.emptySubtext}>
                {activeTab === 'liked'
                  ? 'Posts you like will appear here'
                  : 'Posts you view will appear here'}
              </Text>
            </View>
          ) : (
            activities.map(activity => (
              <TouchableOpacity 
                key={activity.id} 
                style={styles.activityItem}
                onPress={() => handlePostPress(activity)}
              >
                {activity.post?.url && (
                  <Image 
                    source={{ uri: activity.post.url }} 
                    style={styles.activityImage} 
                  />
                )}
                <View style={styles.activityInfo}>
                  <Text style={styles.activityTitle} numberOfLines={2}>
                    {activity.post?.title || 'Post'}
                  </Text>
                  {activity.post?.description && (
                    <Text style={styles.activityDescription} numberOfLines={1}>
                      {activity.post.description}
                    </Text>
                  )}
                  <View style={styles.activityMeta}>
                    <Icon 
                      name={activeTab === 'liked' ? 'heart' : 'eye'} 
                      size={14} 
                      color={activeTab === 'liked' ? '#ff4444' : colors.gray} 
                    />
                    <Text style={styles.activityTime}>
                      {formatDate(activity.timestamp)}
                    </Text>
                  </View>
                </View>
                <Icon name="chevron-forward" size={20} color={colors.gray} />
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}

      <BottomNavBar navigation={navigation} activeRoute="Profile" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.secondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    paddingTop: 50,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    fontFamily: fonts.header,
    color: colors.dark,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: colors.highlight,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.dark,
  },
  activeTabText: {
    color: colors.highlight,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg * 4,
    paddingHorizontal: spacing.lg,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.gray,
    marginTop: spacing.md,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.gray,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  activityImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: spacing.md,
  },
  activityInfo: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.dark,
    marginBottom: 4,
  },
  activityDescription: {
    fontSize: 14,
    color: colors.gray,
    marginBottom: 4,
  },
  activityMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  activityTime: {
    fontSize: 12,
    color: colors.gray,
  },
});
