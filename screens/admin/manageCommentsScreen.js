import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  query,
  updateDoc,
  where
} from 'firebase/firestore';

// --- IMPORTS ---
import Icon from '../../assets/icons/icons';
import { colors, fonts, spacing } from '../../lib/theme';

// --- THEME COLORS ---
const THEME_GREEN = '#9abeaa';
const ACTIVE_YELLOW = '#ffd75c'; 
const FLAG_BG = '#FFF9C4'; // Yellow background for list items
const HIGHLIGHT_BG = '#FFF9C4'; // Yellow highlight for reported comment
const ALERT_RED = '#FF6B6B';
const COMMENT_BG = '#f8f8f8'; // Standard gray for normal comments

export default function ManageCommentsScreen({ navigation }) {
  const db = getFirestore();
  
  // --- STATE ---
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'detail'
  const [currentReport, setCurrentReport] = useState(null);
  
  // List State
  const [reportsList, setReportsList] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Detail State
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [postData, setPostData] = useState(null);
  const [commentsList, setCommentsList] = useState([]);
  const [postStatus, setPostStatus] = useState('loading'); 

  // 1. INITIAL LOAD
  useEffect(() => {
    fetchReportsList();
  }, []);

  // --- DATA FETCHING (LIST) ---
  const fetchReportsList = async () => {
    try {
      const q = query(
        collection(db, 'reported_comments'), 
        where('status', '==', 'pending')
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Sort: Newest First
      const sorted = data.sort((a, b) => {
          const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(0);
          const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(0);
          return dateB - dateA;
      });

      setReportsList(sorted);
    } catch (error) {
      console.error('Error fetching list:', error);
    } finally {
      setLoadingList(false);
      setRefreshing(false);
    }
  };

  // --- DATA FETCHING (DETAIL) ---
  const fetchReportDetails = async (report) => {
    setLoadingDetail(true);
    setCurrentReport(report);
    setViewMode('detail');
    setPostData(null);
    setCommentsList([]);
    
    try {
        // 1. RESOLVE POST ID
        let postId = report.postId || report.post_id;
        
        // Fallback: Check target comment doc if ID is missing in report
        if (!postId && report.targetId) {
            const commentSnap = await getDoc(doc(db, 'comments', report.targetId));
            if (commentSnap.exists()) {
                postId = commentSnap.data().postId;
            }
        }

        postId = postId ? postId.trim() : null;

        if (postId) {
            // 2. FETCH POST (Targeting wardrobe-plug-fyp/user/images)
            let postSnap = await getDoc(doc(db, 'wardrobe-plug-fyp', 'user', 'images', postId));
            
            // Fallback to 'clothes' or 'userImages' only if not found in main path
            if (!postSnap.exists()) postSnap = await getDoc(doc(db, 'clothes', postId));
            if (!postSnap.exists()) postSnap = await getDoc(doc(db, 'userImages', postId));

            if (postSnap.exists()) {
                setPostData(postSnap.data());
                setPostStatus('found');

                // 3. FETCH COMMENTS
                const commentsQ = query(collection(db, 'comments'), where('postId', '==', postId));
                const commentsSnap = await getDocs(commentsQ);
                
                const comments = commentsSnap.docs.map(c => ({ id: c.id, ...c.data() }));
                
                // Sort: Oldest First (Conversation Flow)
                comments.sort((a, b) => {
                    const timeA = a.createdAt?.toDate ? a.createdAt.toDate() : 0;
                    const timeB = b.createdAt?.toDate ? b.createdAt.toDate() : 0;
                    return timeA - timeB;
                });

                setCommentsList(comments);
            } else {
                setPostStatus('missing');
            }
        } else {
            setPostStatus('missing');
        }
    } catch (error) {
        console.error("Error loading detail:", error); // No need to escape in JS console.error
        setPostStatus('error');
    } finally {
        setLoadingDetail(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchReportsList();
  };

  // --- ACTIONS ---
  const handleBack = () => {
      if (viewMode === 'detail') {
          setViewMode('list');
          setCurrentReport(null);
      } else {
          navigation.goBack();
      }
  };

  const handleDismiss = async () => {
      Alert.alert(
        "Dismiss Report", 
        "Keep this comment?", 
        [
          { text: "Cancel", style: "cancel" },
          { text: "Dismiss", onPress: async () => {
              try {
                  await updateDoc(doc(db, 'reported_comments', currentReport.id), {
                      status: 'resolved', resolution: 'dismissed'
                  });
                  finalizeAction();
              } catch (e) { Alert.alert("Error", "Action failed"); }
          }}
        ]
      );
  };

  const handleDelete = async () => {
      Alert.alert(
        "Delete Comment", 
        "Permanently delete?", 
        [
          { text: "Cancel", style: "cancel" },
          { text: "Delete", style: "destructive", onPress: async () => {
              try {
                  if (currentReport.targetId) {
                      await deleteDoc(doc(db, 'comments', currentReport.targetId));
                  }
                  await updateDoc(doc(db, 'reported_comments', currentReport.id), {
                      status: 'resolved', resolution: 'deleted_comment'
                  });
                  finalizeAction();
              } catch (e) { Alert.alert("Error", "Action failed"); }
          }}
        ]
      );
  };

  const finalizeAction = () => {
      setReportsList(prev => prev.filter(item => item.id !== currentReport.id));
      setViewMode('list');
      setCurrentReport(null);
  };

  const handleNavigation = (tab) => {
    switch(tab) {
      case 'home': navigation.navigate('AdminHome'); break;
      case 'profiles': navigation.navigate('ManageAccount'); break;
      case 'comments': break; 
    }
  };

  // --- RENDER HELPERS ---

  // 1. List Item (Summary Card)
  const renderListItem = ({ item }) => (
    <View style={styles.reportCard}>
        <View style={styles.cardHeader}>
            <View style={{flexDirection:'row', alignItems:'center', gap: 6}}>
                <Icon name="alert-circle" size={16} color={ALERT_RED} />
                <Text style={styles.flaggedLabel}>{item.reason || "Reported"}</Text>
            </View>
            <Text style={styles.dateText}>
                {item.createdAt?.toDate ? item.createdAt.toDate().toLocaleDateString() : ''}
            </Text>
        </View>
        <View style={styles.cardContent}>
            <View style={styles.textDetails}>
                 <Text style={styles.descriptionText} numberOfLines={2}>
                    <Text style={{fontWeight: 'bold'}}>Comment: </Text>
                    &quot;{item.targetContent}&quot;
                 </Text>
                 <Text style={[styles.idText, {marginTop: 4}]}>
                    By: {item.targetOwnerName || "Unknown"}
                 </Text>
            </View>
            <TouchableOpacity style={styles.reviewButton} onPress={() => fetchReportDetails(item)}>
                <Text style={styles.reviewButtonText}>Review</Text>
            </TouchableOpacity>
        </View>
    </View>
  );

  // 2. Detail View (Full Post + Comments)
  const renderDetailView = () => {
      if (loadingDetail) {
          return <View style={styles.centerContainer}><ActivityIndicator size="large" color={THEME_GREEN} /></View>;
      }

      const isMissing = postStatus !== 'found';
      const postImgSource = postData?.url || postData?.imageUrl || postData?.image;
      const captionText = postData?.title || postData?.description || '';
      const ownerName = postData?.userName || postData?.ownerName || 'User';
      const ownerPhoto = postData?.userPhotoURL || null;

      return (
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
              
              {/* --- POST CARD --- */}
              <View style={styles.detailCard}>
                  {/* User Header */}
                  <View style={styles.postHeader}>
                      <View style={styles.avatarContainer}>
                          {ownerPhoto ? (
                              <Image source={{ uri: ownerPhoto }} style={styles.avatarImage} />
                          ) : (
                              <Icon name="person-circle" size={40} color={colors.accent} />
                          )}
                      </View>
                      <View style={{marginLeft: 10}}>
                          <Text style={styles.userName}>{isMissing ? 'Post Unavailable' : ownerName}</Text>
                          {!isMissing && <Text style={styles.postDate}>Original Post</Text>}
                      </View>
                  </View>

                  {/* Post Image */}
                  {isMissing || !postImgSource ? (
                      <View style={styles.missingImageContainer}>
                          <Icon name="image-outline" size={40} color={colors.gray} />
                          <Text style={{color: colors.gray, marginTop: 5}}>
                              {isMissing ? 'Post Deleted' : 'No Image'}
                          </Text>
                      </View>
                  ) : (
                      <Image source={{ uri: postImgSource }} style={styles.postImage} resizeMode="cover" />
                  )}

                  {/* Caption */}
                  <View style={styles.captionArea}>
                      <Text style={styles.captionText}>
                          <Text style={{fontWeight: 'bold'}}>{ownerName} </Text>
                          {captionText}
                      </Text>
                  </View>
              </View>

              {/* --- COMMENTS SECTION --- */}
              <View style={styles.commentsContainer}>
                  <Text style={styles.sectionTitle}>Conversation ({commentsList.length})</Text>
                  
                  {commentsList.length === 0 ? (
                      // Fallback: If comments empty, show report data
                      <View style={styles.reportedWrapper}>
                          <View style={styles.reportedHeader}>
                              <Icon name="alert-circle" size={14} color={ALERT_RED} />
                              <Text style={styles.reportReasonLabel}>Reported: {currentReport.reason}</Text>
                          </View>
                          <View style={[styles.commentBubble, {backgroundColor: '#fff'}]}>
                              <Text style={styles.commentUser}>{currentReport.targetOwnerName}</Text>
                              <Text style={styles.commentText}>{currentReport.targetContent}</Text>
                          </View>
                          <View style={styles.actionRow}>
                              <TouchableOpacity style={styles.actionBtn} onPress={handleDismiss}>
                                  <Icon name="checkmark-circle" size={20} color={colors.dark} />
                                  <Text style={styles.actionBtnText}>Keep</Text>
                              </TouchableOpacity>
                              <TouchableOpacity style={styles.actionBtn} onPress={handleDelete}>
                                  <Icon name="trash" size={20} color={ALERT_RED} />
                                  <Text style={[styles.actionBtnText, {color: ALERT_RED}]}>Delete</Text>
                              </TouchableOpacity>
                          </View>
                      </View>
                  ) : (
                      commentsList.map(comment => {
                          const isReported = comment.id === currentReport.targetId;
                          
                          if (isReported) {
                              // REPORTED ITEM (Highlighted)
                              return (
                                  <View key={comment.id} style={styles.reportedWrapper}>
                                      <View style={styles.reportedHeader}>
                                          <Icon name="alert-circle" size={14} color={ALERT_RED} />
                                          <Text style={styles.reportReasonLabel}>Reported: {currentReport.reason}</Text>
                                      </View>
                                      <View style={[styles.commentBubble, {backgroundColor: '#fff'}]}>
                                          <Text style={styles.commentUser}>{comment.userName || 'User'}</Text>
                                          <Text style={styles.commentText}>{comment.text || comment.content}</Text>
                                      </View>
                                      <View style={styles.actionRow}>
                                          <TouchableOpacity style={styles.actionBtn} onPress={handleDismiss}>
                                              <Icon name="checkmark-circle" size={20} color={colors.dark} />
                                              <Text style={styles.actionBtnText}>Keep</Text>
                                          </TouchableOpacity>
                                          <TouchableOpacity style={styles.actionBtn} onPress={handleDelete}>
                                              <Icon name="trash" size={20} color={ALERT_RED} />
                                              <Text style={[styles.actionBtnText, {color: ALERT_RED}]}>Delete</Text>
                                          </TouchableOpacity>
                                      </View>
                                  </View>
                              );
                          } else {
                              // NORMAL COMMENT (Standard Look)
                              return (
                                  <View key={comment.id} style={styles.normalCommentRow}>
                                      <View style={styles.smallAvatar}>
                                          <Icon name="person-circle" size={32} color={colors.accent} />
                                      </View>
                                      <View style={styles.commentBubble}>
                                          <Text style={styles.commentUser}>{comment.userName || 'User'}</Text>
                                          <Text style={styles.commentText}>{comment.text || comment.content}</Text>
                                      </View>
                                  </View>
                              );
                          }
                      })
                  )}
              </View>
          </ScrollView>
      );
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
            <Text style={styles.headerTitle}>
                {viewMode === 'detail' ? 'Review Comment' : 'Manage Comments'}
            </Text>
        </View>
      </View>

      {/* --- BODY --- */}
      {viewMode === 'list' ? (
          loadingList ? (
              <View style={styles.centerContainer}><ActivityIndicator size="large" color={THEME_GREEN} /></View>
          ) : (
              <FlatList
                  data={reportsList}
                  renderItem={renderListItem}
                  keyExtractor={item => item.id}
                  contentContainerStyle={styles.scrollContent}
                  refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
                  ListHeaderComponent={
                      <View style={{ paddingBottom: 10 }}>
                          <Text style={styles.sectionTitle}>{reportsList.length} Pending Reports</Text>
                          {reportsList.length === 0 && (
                              <View style={styles.emptyState}>
                                  <Icon name="checkmark-circle" size={40} color={THEME_GREEN} />
                                  <Text style={styles.emptyText}>No reported comments!</Text>
                              </View>
                          )}
                      </View>
                  }
              />
          )
      ) : (
          renderDetailView()
      )}

      {/* --- BOTTOM NAV --- */}
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
  container: { flex: 1, backgroundColor: '#fff' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  // Header
  header: { 
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', 
      padding: spacing.md, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#dbdbdb', backgroundColor: '#fff'
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerTitle: { fontFamily: fonts.header, fontSize: 22, fontWeight: '700', color: THEME_GREEN },
  backButton: { padding: 4 },

  scrollContent: { padding: spacing.md, paddingBottom: 80 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.dark, marginBottom: 16 },

  // --- LIST CARD STYLE ---
  reportCard: {
    backgroundColor: FLAG_BG, borderRadius: 8, padding: 12, marginBottom: 16,
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)',
  },
  cardHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 8, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  flaggedLabel: { fontSize: 12, fontWeight: '700', color: ALERT_RED, textTransform: 'uppercase' },
  dateText: { color: colors.gray, fontSize: 10 },
  cardContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  textDetails: { flex: 1, marginRight: 10 },
  descriptionText: { fontFamily: fonts.body, fontSize: 14, color: colors.dark },
  idText: { fontSize: 11, color: colors.gray },
  reviewButton: {
    paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6,
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#dbdbdb',
  },
  reviewButtonText: { fontSize: 12, fontWeight: '600', color: colors.dark },

  // --- DETAIL VIEW STYLES ---
  detailCard: {
      backgroundColor: '#fff', marginBottom: 20,
      borderBottomWidth: 1, borderBottomColor: '#f0f0f0', paddingBottom: 15
  },
  postHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  avatarContainer: {
      width: 40, height: 40, borderRadius: 20, backgroundColor: '#ccc',
      justifyContent: 'center', alignItems: 'center', overflow: 'hidden'
  },
  avatarImage: { width: 40, height: 40 },
  userName: { fontSize: 16, fontWeight: '700', color: colors.dark },
  postDate: { fontSize: 12, color: colors.gray },
  postImage: { width: '100%', height: 350, borderRadius: 12, backgroundColor: '#f0f0f0' },
  missingImageContainer: {
      width: '100%', height: 200, backgroundColor: '#f5f5f5', borderRadius: 12,
      justifyContent: 'center', alignItems: 'center'
  },
  captionArea: { marginTop: 10 },
  captionText: { fontSize: 14, color: colors.dark, lineHeight: 20 },

  // --- COMMENTS STYLES ---
  commentsContainer: { marginTop: 10 },
  
  // Normal Comment
  normalCommentRow: { flexDirection: 'row', marginBottom: 15, gap: 10 },
  smallAvatar: { width: 32, height: 32, justifyContent: 'flex-start', alignItems: 'center' },
  commentBubble: {
      flex: 1, backgroundColor: COMMENT_BG, padding: 10, borderRadius: 12,
  },
  commentUser: { fontSize: 13, fontWeight: '700', color: colors.dark, marginBottom: 2 },
  commentText: { fontSize: 14, color: colors.dark },

  // Reported Comment (Highlighted)
  reportedWrapper: {
      marginBottom: 15, backgroundColor: HIGHLIGHT_BG, borderRadius: 12, padding: 10,
      borderWidth: 1, borderColor: '#ffe082'
  },
  reportedHeader: { flexDirection: 'row', gap: 6, alignItems: 'center', marginBottom: 8 },
  reportReasonLabel: { fontSize: 11, color: ALERT_RED, fontWeight: '700', textTransform: 'uppercase' },
  actionRow: {
      flexDirection: 'row', justifyContent: 'flex-end', gap: 15, marginTop: 10, paddingHorizontal: 5
  },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionBtnText: { fontSize: 13, fontWeight: '600', color: colors.dark },

  // Empty State
  emptyState: { alignItems: 'center', marginTop: 40, gap: 10 },
  emptyText: { color: THEME_GREEN, fontWeight: '600' },

  // Bottom Nav
  bottomNav: {
    flexDirection: 'row', backgroundColor: '#fff',
    paddingVertical: 12, paddingHorizontal: spacing.md,
    borderTopWidth: 1, borderTopColor: '#e0e0e0',
    position: 'absolute', bottom: 0, left: 0, right: 0,
  },
  navItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});