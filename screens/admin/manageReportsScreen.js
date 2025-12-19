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

// --- FIREBASE IMPORTS ---
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  query,
  serverTimestamp,
  updateDoc,
  where
} from 'firebase/firestore';

// --- IMPORTS ---
import Icon from '../../assets/icons/icons';
import { colors, fonts, spacing } from '../../lib/theme';

// --- THEME COLORS ---
const THEME_GREEN = '#9abeaa';
const THEME_YELLOW = '#ffd75c';
const THEME_CREAM = '#f5f3e4'; 
const FLAG_BG = '#FFF9C4'; 
const ALERT_RED = '#FF6B6B';
const COMMENT_BG = '#f8f8f8'; 

export default function ManageReportsScreen({ navigation, route }) {
  const db = getFirestore();
  const { report: paramReport } = route.params || {};

  // --- STATE ---
  const [viewMode, setViewMode] = useState(paramReport ? 'detail' : 'list');
  const [currentReport, setCurrentReport] = useState(paramReport || null);
  
  // Tabs State: 'users', 'posts', 'comments'
  const [selectedTab, setSelectedTab] = useState('users'); 

  // List State
  const [reportsList, setReportsList] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Detail State
  const [loadingUser, setLoadingUser] = useState(false);
  const [commentsList, setCommentsList] = useState([]); 
  const [postData, setPostData] = useState(null); 

  const [userInfo, setUserInfo] = useState({
      username: 'Loading...',
      bio: '...',
      location: '...',
      rating: 0.0,
      reviewCount: 0,
      posts: 0,
      followers: 0,
      following: 0,
      photoURL: null,
      ownerUid: null,
      isBanned: false 
  });

  // 1. INITIAL LOAD
  useEffect(() => {
    fetchData();
  }, [selectedTab]); 

  // 2. HANDLE INCOMING PARAMS
  useEffect(() => {
    if (paramReport) {
        setCurrentReport(paramReport);
        setViewMode('detail');
        if(paramReport.reportType === 'comment') setSelectedTab('comments');
        else if(paramReport.reportType === 'post') setSelectedTab('posts');
        else setSelectedTab('users');
    }
  }, [paramReport]);

  // 3. LOAD DETAILS
  useEffect(() => {
    if (viewMode === 'detail' && currentReport) {
        fetchUserDetails(currentReport);
        
        if (currentReport.reportType === 'comment') {
            fetchCommentContext(currentReport);
        }
    }
  }, [viewMode, currentReport]);

  // --- DATA FETCHING ---
  const fetchData = async () => {
    setLoadingList(true);
    setReportsList([]); 
    
    if (selectedTab === 'users') {
        await fetchUsersTab();
    } else if (selectedTab === 'posts') {
        await fetchPostsTab();
    } else if (selectedTab === 'comments') {
        await fetchCommentsTab();
    }
  };

  // 1. FETCH USERS
  const fetchUsersTab = async () => {
    try {
        const reportsQuery = query(collection(db, 'reported_users'), where('status', '==', 'pending'));
        const bannedQuery = query(collection(db, 'users'), where('active', '==', false));

        const [reportsSnap, bannedSnap] = await Promise.all([getDocs(reportsQuery), getDocs(bannedQuery)]);

        const reportedUsers = reportsSnap.docs.map(doc => ({ 
            id: doc.id, ...doc.data(), reportType: 'user', isBannedUser: false
        }));

        const bannedUsers = bannedSnap.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id, reportType: 'user', reported_user_id: doc.id,
                reported_user_name: data.username || "Unknown",
                reason: "Account Suspended", created_at: data.bannedAt || null,
                isBannedUser: true
            };
        });

        const allUsers = [...reportedUsers, ...bannedUsers].sort((a, b) => {
            const dateA = a.created_at?.toDate ? a.created_at.toDate() : new Date(0);
            const dateB = b.created_at?.toDate ? b.created_at.toDate() : new Date(0);
            return dateB - dateA;
        });
        setReportsList(allUsers);
    } catch (error) { console.error(error); } finally { setLoadingList(false); setRefreshing(false); }
  };

  // 2. FETCH POSTS
  const fetchPostsTab = async () => {
    try {
        const q = query(collection(db, 'report'), where('status', '==', 'pending'));
        const snapshot = await getDocs(q);
        
        const postsPromises = snapshot.docs.map(async (docSnap) => {
            const data = docSnap.data();
            let finalUsername = data.userName || data.reported_user_name || "Unknown User";
            let ownerId = data.reported_user_id;

            if (finalUsername === "Unknown User") {
                const targetId = data.reported_clothes_id || data.post_id;
                
                if (targetId) {
                    try {
                        let postSnap = await getDoc(doc(db, 'wardrobe-plug-fyp/user/images', targetId));
                        if (!postSnap.exists()) postSnap = await getDoc(doc(db, 'clothes', targetId));
                        
                        if (postSnap.exists()) {
                            ownerId = postSnap.data().ownerUid;
                        }
                    } catch (e) { /* ignore */ }
                }

                if (ownerId) {
                    try {
                        const userSnap = await getDoc(doc(db, 'users', ownerId));
                        if (userSnap.exists()) {
                            finalUsername = userSnap.data().username || "Unknown User";
                        }
                    } catch (e) { /* ignore */ }
                }
            }

            return { 
                id: docSnap.id, 
                ...data, 
                reportType: 'post',
                resolvedUserName: finalUsername 
            };
        });

        const posts = await Promise.all(postsPromises);
        posts.sort((a, b) => (b.created_at?.toDate() || 0) - (a.created_at?.toDate() || 0));
        setReportsList(posts);
    } catch (error) { console.error(error); } finally { setLoadingList(false); setRefreshing(false); }
  };

  // 3. FETCH COMMENTS
  const fetchCommentsTab = async () => {
    try {
        const q = query(collection(db, 'reported_comments'), where('status', '==', 'pending'));
        const snapshot = await getDocs(q);
        const comments = snapshot.docs.map(doc => ({ 
            id: doc.id, ...doc.data(), reportType: 'comment',
            reason: doc.data().reason || "Reported Comment",
            snapshot_description: doc.data().commentText || doc.data().text || "Unavailable"
        }));
        comments.sort((a, b) => (b.created_at?.toDate() || 0) - (a.created_at?.toDate() || 0));
        setReportsList(comments);
    } catch (error) { console.error(error); } finally { setLoadingList(false); setRefreshing(false); }
  };

  const fetchUserDetails = async (reportData) => {
    setLoadingUser(true);
    try {
        let ownerId = reportData.reported_user_id; 
        
        if (reportData.reportType === 'post') {
            const targetId = reportData.reported_clothes_id || reportData.post_id;
            if (targetId) {
                let postSnap = await getDoc(doc(db, 'wardrobe-plug-fyp/user/images', targetId));
                if (!postSnap.exists()) postSnap = await getDoc(doc(db, 'clothes', targetId));
                if (postSnap.exists()) ownerId = postSnap.data().ownerUid;
            }
        } else if (reportData.reportType === 'comment') {
             ownerId = reportData.commentAuthorId || reportData.authorId || reportData.reported_user_id;
        }

        if (ownerId) {
            let userSnap = await getDoc(doc(db, 'users', ownerId));
            if (userSnap.exists()) {
                const userData = userSnap.data();
                setUserInfo({
                    username: userData.username || 'No Name',
                    bio: userData.bio || 'No bio',
                    location: userData.location || 'Singapore',
                    rating: userData.rating || 0.0,
                    reviewCount: userData.reviewCount || 0,
                    posts: Array.isArray(userData.posts) ? userData.posts.length : 0,
                    followers: Array.isArray(userData.followers) ? userData.followers.length : 0,
                    following: Array.isArray(userData.following) ? userData.following.length : 0,
                    photoURL: userData.photoURL || null,
                    ownerUid: ownerId,
                    isBanned: userData.active === false || userData.isBanned === true
                });
            } else {
                 setUserInfo(prev => ({ ...prev, username: 'User Not Found', bio: 'Account might be deleted.' }));
            }
        }
    } catch (error) { console.error(error); } finally { setLoadingUser(false); }
  };

  const fetchCommentContext = async (report) => {
      try {
          let postId = report.postId || report.post_id;
          if (!postId && report.targetId) {
              const commentSnap = await getDoc(doc(db, 'comments', report.targetId));
              if (commentSnap.exists()) postId = commentSnap.data().postId;
          }

          if (postId) {
              let postSnap = await getDoc(doc(db, 'wardrobe-plug-fyp/user/images', postId));
              if (!postSnap.exists()) postSnap = await getDoc(doc(db, 'clothes', postId));
              
              if (postSnap.exists()) {
                  const rawPostData = postSnap.data();
                  let finalPostData = { ...rawPostData };

                  if (rawPostData.ownerUid) {
                      const ownerSnap = await getDoc(doc(db, 'users', rawPostData.ownerUid));
                      if (ownerSnap.exists()) {
                          finalPostData.userPhotoURL = ownerSnap.data().photoURL;
                          finalPostData.userName = ownerSnap.data().username || finalPostData.userName;
                      }
                  }
                  setPostData(finalPostData);
                  
                  const commentsQ = query(collection(db, 'comments'), where('postId', '==', postId));
                  const commentsSnap = await getDocs(commentsQ);
                  
                  const threadPromises = commentsSnap.docs.map(async (c) => {
                      const cData = c.data();
                      let userImg = cData.userPhotoURL || cData.photoURL;
                      const uid = cData.userId || cData.authorId || cData.uid;

                      if (!userImg && uid) {
                          try {
                              const uSnap = await getDoc(doc(db, 'users', uid));
                              if (uSnap.exists()) {
                                  userImg = uSnap.data().photoURL;
                              }
                          } catch (e) { /* ignore */ }
                      }
                      return { id: c.id, ...cData, userPhotoURL: userImg };
                  });

                  const thread = await Promise.all(threadPromises);
                  thread.sort((a, b) => (a.createdAt?.toDate?.() || 0) - (b.createdAt?.toDate?.() || 0));
                  setCommentsList(thread);
              }
          }
      } catch (error) { console.error(error); }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleReviewItem = (item) => {
      setCurrentReport(item);
      setViewMode('detail');
  };

  const handleBack = () => {
      if (viewMode === 'detail' && !paramReport) {
          setViewMode('list');
          setCurrentReport(null);
          setPostData(null);
          setCommentsList([]);
      } else {
          navigation.goBack();
      }
  };

  const handleReportAction = async () => {
    if (!currentReport) return;
    
    const isUserReport = currentReport.reportType === 'user';
    const isCommentReport = currentReport.reportType === 'comment';
    const isBannedItem = currentReport.isBannedUser; 

    const targetId = currentReport.reported_clothes_id || currentReport.post_id || currentReport.commentId || currentReport.targetId || currentReport.id;
    let collectionName = isUserReport ? 'reported_users' : isCommentReport ? 'reported_comments' : 'report';
    let deleteActionText = isUserReport ? (userInfo.isBanned ? "UNBAN USER" : "BAN USER") : isCommentReport ? "DELETE COMMENT" : "DELETE POST";

    Alert.alert(
      "Take Action",
      "Choose an action for this report.",
      [
        { text: "Cancel", style: "cancel" },
        !isBannedItem && { 
            text: "Dismiss", 
            onPress: async () => {
                try {
                    await updateDoc(doc(db, collectionName, currentReport.id), { status: 'resolved', resolution: 'dismissed', resolved_at: serverTimestamp() });
                    finalizeAction("Report dismissed.");
                } catch (e) { Alert.alert("Error", "Could not dismiss."); }
            } 
        },
        { 
            text: deleteActionText, 
            style: "destructive", 
            onPress: async () => {
                try {
                    if (isUserReport) {
                        if (userInfo.ownerUid) {
                            const newStatus = !userInfo.isBanned; 
                            await updateDoc(doc(db, 'users', userInfo.ownerUid), {
                                active: !newStatus, isBanned: newStatus, bannedAt: newStatus ? serverTimestamp() : null
                            });
                            if (!isBannedItem) {
                                await updateDoc(doc(db, collectionName, currentReport.id), {
                                    status: 'resolved', resolution: newStatus ? 'banned' : 'unbanned', resolved_at: serverTimestamp()
                                });
                            }
                            setUserInfo(prev => ({...prev, isBanned: newStatus}));
                            finalizeAction(newStatus ? "User suspended." : "User restored.");
                        }
                    } else if (isCommentReport) {
                        await deleteDoc(doc(db, 'comments', targetId)).catch(()=>{}); 
                        await updateDoc(doc(db, collectionName, currentReport.id), { status: 'resolved', resolution: 'deleted', resolved_at: serverTimestamp() });
                        finalizeAction("Comment deleted.");
                    } else {
                        if (targetId) {
                            await deleteDoc(doc(db, 'wardrobe-plug-fyp/user/images', targetId)).catch(()=>{});
                            await deleteDoc(doc(db, 'clothes', targetId)).catch(()=>{});
                        }
                        await updateDoc(doc(db, collectionName, currentReport.id), { status: 'resolved', resolution: 'deleted', resolved_at: serverTimestamp() });
                        finalizeAction("Post deleted.");
                    }
                } catch (error) { Alert.alert("Error", "Action failed."); }
            } 
        }
      ].filter(Boolean)
    );
  };

  const finalizeAction = (message) => {
      setReportsList(prev => prev.filter(r => r.id !== currentReport.id));
      Alert.alert("Success", message, [{ text: "OK", onPress: () => { if (paramReport) navigation.goBack(); else setViewMode('list'); }}]);
  };

  const handleNavigation = (tab) => {
    switch(tab) {
      case 'home': navigation.navigate('AdminHome'); break;
      case 'profiles': break; 
      case 'comments': navigation.navigate('ManageFeedback'); break;
    }
  };

  const renderListItem = ({ item }) => {
    const isUserTab = selectedTab === 'users';
    const isPostTab = selectedTab === 'posts';
    const isCommentTab = selectedTab === 'comments';

    let headerText = "Report";
    if (isUserTab) headerText = item.isBannedUser ? "SUSPENDED" : "User Report";
    if (isPostTab) headerText = "Post Report";
    if (isCommentTab) headerText = "Comment Report";

    let subjectLabel = "Subject: ";
    let mainText = "Unknown";
    let subInfo = "";

    if (isUserTab) {
        subjectLabel = "User: ";
        mainText = item.reported_user_name || "Unknown User";
        subInfo = item.isBannedUser ? "Account currently suspended." : `Reason: ${item.reason}`;
    } else if (isPostTab) {
        subjectLabel = "Post Owner: ";
        mainText = item.resolvedUserName || item.userName || item.reported_user_name || "Unknown User";
        subInfo = `Reason: ${item.reason}`;
    } else if (isCommentTab) {
        subjectLabel = "Commenter: ";
        mainText = item.targetOwnerName || item.commentAuthorName || item.reported_user_name || "Unknown User";
        subInfo = `Reason: ${item.reason}`; 
    }

    return (
        <View style={[styles.reportCard, item.isBannedUser && { borderColor: ALERT_RED, borderWidth: 1 }]}>
            <View style={styles.cardHeader}>
                <View style={{flexDirection:'row', alignItems:'center', gap: 6}}>
                    <Icon name={isUserTab ? 'person' : (isCommentTab ? 'chatbubble' : 'alert-circle')} size={16} color={ALERT_RED} />
                    <Text style={styles.flaggedLabel}>{headerText}</Text>
                </View>
                <Text style={styles.dateText}>{item.created_at?.toDate ? item.created_at.toDate().toLocaleDateString() : ''}</Text>
            </View>
            <View style={styles.cardContent}>
                {isPostTab && (
                    item.snapshot_image_url ? <Image source={{ uri: item.snapshot_image_url }} style={styles.thumbnail} resizeMode="cover" /> : <View style={[styles.thumbnail, styles.placeholderThumb]}><Icon name="image" size={20} color={colors.gray}/></View>
                )}
                <View style={styles.textDetails}>
                     <Text style={styles.descriptionText} numberOfLines={2}>
                        <Text style={{fontWeight: 'bold'}}>{subjectLabel}</Text>
                        {mainText}
                     </Text>
                     <Text style={[styles.idText, {marginTop: 2}]} numberOfLines={2}>
                        {subInfo}
                     </Text>
                </View>
                <TouchableOpacity style={styles.reviewButton} onPress={() => handleReviewItem(item)}>
                    <Text style={styles.reviewButtonText}>{item.isBannedUser ? "Manage" : "Review"}</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
  };

  const renderUserDetail = () => (
    <View style={styles.adminPostView}>
        <View style={[styles.postHeader, {borderBottomWidth: 0, marginBottom: 5}]}>
            <Text style={{fontSize: 18, fontWeight: 'bold', color: ALERT_RED}}>MANAGE USER</Text>
            <TouchableOpacity style={{ marginLeft: 'auto' }} onPress={handleReportAction}>
                <Icon name="hammer-outline" size={24} color={colors.dark} />
            </TouchableOpacity>
        </View>
        <View style={[styles.userReportCard, userInfo.isBanned && styles.bannedCard]}>
            {userInfo.isBanned ? <View style={styles.bannedBadge}><Text style={styles.bannedText}>SUSPENDED</Text></View> : null}
            <Icon name="person-circle" size={60} color={userInfo.isBanned ? '#ccc' : colors.gray} />
            <Text style={{fontSize: 20, fontWeight:'bold', marginTop:10, color: colors.dark}}>{userInfo.username}</Text>
            <Text style={{color:colors.gray, marginBottom: 20}}>{userInfo.ownerUid}</Text>
            <View style={{width:'100%', padding: 15, backgroundColor:'#FFEBEE', borderRadius:8}}>
                <Text style={{color:ALERT_RED, fontWeight:'bold', marginBottom:5, fontSize: 12}}>STATUS / REASON:</Text>
                <Text style={{fontSize:16, color: colors.dark}}>
                    {userInfo.isBanned ? "This user is suspended." : (currentReport?.reason || "Reported for Inappropriate Behavior")}
                </Text>
            </View>
        </View>
    </View>
  );

  const renderContentDetail = () => {
    if (currentReport?.reportType === 'comment') {
        const isMissing = !postData;
        return (
            <View style={styles.adminPostView}>
                <View style={styles.postHeader}>
                    <Text style={{fontSize: 16, fontWeight: 'bold', color: colors.dark}}>Context: Original Post</Text>
                </View>
                <View style={[styles.reportCard, {marginBottom: 20}]}>
                    {isMissing ? (
                        <View style={[styles.postImage, styles.postImagePlaceholder]}><Text style={{color:colors.gray}}>Post Unavailable</Text></View>
                    ) : (
                        <>
                            <View style={{flexDirection:'row', alignItems:'center', marginBottom: 8}}>
                                {postData.userPhotoURL ? (
                                    <Image source={{ uri: postData.userPhotoURL }} style={{width: 30, height: 30, borderRadius: 15, marginRight: 8}} />
                                ) : (
                                    <View style={{marginRight: 8}}>
                                        <Icon name="person-circle" size={32} color={colors.gray} />
                                    </View>
                                )}
                                <Text style={{fontWeight: 'bold', color: colors.dark}}>{postData.userName}</Text>
                            </View>
                            <Image source={{ uri: postData.url }} style={{width: '100%', height: 200, borderRadius: 8, backgroundColor: '#eee'}} resizeMode="cover" />
                            <Text style={{marginTop: 8, color: colors.dark}}>{postData.description || postData.title}</Text>
                        </>
                    )}
                </View>
                <View style={styles.postHeader}>
                    <Text style={{fontSize: 16, fontWeight: 'bold', color: colors.dark}}>Conversation</Text>
                    <TouchableOpacity style={{ marginLeft: 'auto' }} onPress={handleReportAction}>
                        <Icon name="hammer-outline" size={24} color={ALERT_RED} />
                    </TouchableOpacity>
                </View>
                {commentsList.length === 0 ? (
                    <View style={styles.reportedWrapper}>
                        <View style={styles.reportedHeader}>
                            <Icon name="alert-circle" size={14} color={ALERT_RED} />
                            <Text style={styles.reportReasonLabel}>Reported: {currentReport.reason}</Text>
                        </View>
                        <View style={[styles.commentBubble, {backgroundColor: '#fff'}]}>
                            <Text style={styles.commentUser}>{userInfo.username}</Text>
                            <Text style={styles.commentText}>{currentReport.snapshot_description}</Text>
                        </View>
                    </View>
                ) : (
                    commentsList.map(comment => {
                        const isReported = comment.id === currentReport.targetId || comment.id === currentReport.commentId;
                        const userImg = comment.userPhotoURL || comment.photoURL;
                        
                        const AvatarView = userImg ? (
                            <Image source={{ uri: userImg }} style={{ width: 32, height: 32, borderRadius: 16, marginRight: 10 }} />
                        ) : (
                            <View style={{ marginRight: 10 }}>
                                <Icon name="person-circle" size={32} color={colors.gray} />
                            </View>
                        );

                        if (isReported) {
                            return (
                                <View key={comment.id} style={styles.reportedWrapper}>
                                    <View style={styles.reportedHeader}>
                                        <Icon name="alert-circle" size={14} color={ALERT_RED} />
                                        <Text style={styles.reportReasonLabel}>Reported: {currentReport.reason}</Text>
                                    </View>
                                    <View style={{flexDirection: 'row', alignItems: 'flex-start'}}>
                                        {AvatarView}
                                        <View style={[styles.commentBubble, {backgroundColor: '#fff'}]}>
                                            <Text style={styles.commentUser}>{comment.userName || 'User'}</Text>
                                            <Text style={styles.commentText}>{comment.text || comment.content}</Text>
                                        </View>
                                    </View>
                                </View>
                            );
                        } else {
                            return (
                                <View key={comment.id} style={styles.normalCommentRow}>
                                    {AvatarView}
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
        );
    }

    // Standard Post View
    return (
        <View style={styles.adminPostView}>
            <View style={styles.postHeader}>
                <View style={styles.smallAvatar}>
                    {userInfo.photoURL ? <Image source={{ uri: userInfo.photoURL }} style={{ width: 30, height: 30, borderRadius: 15 }} /> : <Icon name="person" size={16} color="#fff"/> }
                </View>
                <Text style={styles.postUsername}>{userInfo.username}</Text>
                <TouchableOpacity style={{ marginLeft: 'auto' }} onPress={handleReportAction}>
                    <Icon name="hammer-outline" size={24} color={colors.dark} />
                </TouchableOpacity>
            </View>
            {currentReport?.snapshot_image_url ? (
                <Image source={{ uri: currentReport.snapshot_image_url }} style={styles.postImage} resizeMode="cover" />
            ) : (
                <View style={[styles.postImage, styles.postImagePlaceholder]}><Text style={{color:colors.gray}}>Image Unavailable</Text></View>
            )}
            <View style={styles.postFooter}>
                <View style={{marginTop: 10, padding: 8, backgroundColor: '#FFEBEE', borderRadius: 4}}>
                    <Text style={{color: '#D32F2F', fontSize: 12, fontWeight:'bold'}}>REPORT REASON: {currentReport?.reason}</Text>
                </View>
                {currentReport?.snapshot_description && (
                    <Text style={styles.captionText}><Text style={{fontWeight: 'bold'}}>Caption: </Text>{currentReport.snapshot_description}</Text>
                )}
            </View>
        </View>
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
            <Text style={styles.headerLogo}>
                {viewMode === 'detail' ? 'Review Details' : 'Manage Reports'}
            </Text>
        </View>
      </View>

      {/* --- TABS (LIST MODE ONLY) --- */}
      {viewMode === 'list' && (
          <View style={styles.filterTabs}>
              {['users', 'posts', 'comments'].map(tab => (
                  <TouchableOpacity 
                      key={tab}
                      style={[styles.filterTab, selectedTab === tab && styles.activeFilterTab]}
                      onPress={() => setSelectedTab(tab)}
                  >
                      <Text style={[styles.filterTabText, selectedTab === tab && styles.activeFilterText]}>
                          {tab === 'users' ? 'User Reports' : tab === 'posts' ? 'Reported Posts' : 'Reported Comments'}
                      </Text>
                  </TouchableOpacity>
              ))}
          </View>
      )}

      {/* --- BODY CONTENT --- */}
      {viewMode === 'list' ? (
        // ---------------- LIST VIEW ----------------
        loadingList ? (
            <View style={styles.centerContainer}><ActivityIndicator size="large" color={THEME_GREEN} /></View>
        ) : (
            <FlatList
                data={reportsList}
                renderItem={renderListItem}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.scrollContent}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={() => {setRefreshing(true); fetchData();}} />
                }
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Icon name="checkmark-circle" size={40} color={THEME_GREEN} />
                        <Text style={styles.emptyText}>No items found in {selectedTab}.</Text>
                    </View>
                }
            />
        )
      ) : (
        // ---------------- DETAIL VIEW ----------------
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            
            {/* Only show Profile Header if NOT a comment report */}
            {currentReport?.reportType !== 'comment' && (
                <View style={styles.profileSection}>
                {loadingUser ? (
                    <ActivityIndicator color={THEME_GREEN} style={{padding:20}} />
                ) : (
                    <>
                    <View style={styles.profileTopRow}>
                        <View style={styles.profileImageContainer}>
                            <View style={styles.profileImagePlaceholder}>
                            {userInfo.photoURL ? <Image source={{ uri: userInfo.photoURL }} style={{ width: 80, height: 80, borderRadius: 40 }} /> : <Icon name="person" size={40} color="#fff" /> }
                            </View>
                        </View>
                        <View style={styles.statsRow}>
                        <View style={styles.statItem}><Text style={styles.statNumber}>{userInfo.posts}</Text><Text style={styles.statLabel}>posts</Text></View>
                        <View style={styles.statItem}><Text style={styles.statNumber}>{userInfo.followers}</Text><Text style={styles.statLabel}>followers</Text></View>
                        <View style={styles.statItem}><Text style={styles.statNumber}>{userInfo.following}</Text><Text style={styles.statLabel}>following</Text></View>
                        </View>
                    </View>
                    <Text style={styles.userName}>
                        {userInfo.username} 
                        {userInfo.isBanned ? <Text style={{color: ALERT_RED, fontSize: 12}}> (SUSPENDED)</Text> : null}
                    </Text>
                    <Text style={styles.userBio}>{userInfo.bio}</Text>
                    <View style={styles.locationContainer}><Icon name="location-outline" size={16} color={colors.dark} /><Text style={styles.locationText}>{userInfo.location}</Text></View>
                    </>
                )}
                </View>
            )}

            {/* Only show Tabs if NOT a comment report */}
            {currentReport?.reportType !== 'comment' && (
                <View style={styles.tabsContainer}>
                    <View style={[styles.tab, styles.activeTab]}>
                        <Icon name="alert-circle-outline" size={20} color={colors.dark} />
                        <Text style={{fontFamily: fonts.header, fontWeight:'700', marginLeft: 5}}>
                            {(currentReport?.reportType === 'user' || currentReport?.isBannedUser) ? 'Account Details' : 'Content Details'}
                        </Text>
                    </View>
                </View>
            )}

            <View style={styles.postsContainer}>
                {(currentReport?.reportType === 'user' || currentReport?.isBannedUser) ? renderUserDetail() : renderContentDetail()}
            </View>
        </ScrollView>
      )}

      {/* --- BOTTOM NAVBAR --- */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem} onPress={() => handleNavigation('home')}>
          <Icon name="home-outline" size={24} color={colors.gray} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => handleNavigation('profiles')}>
          <Icon name="people" size={24} color={THEME_YELLOW} /> 
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => handleNavigation('comments')}>
          <Icon name="chatbubbles-outline" size={24} color={colors.gray} />
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
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
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
  headerLogo: {
    fontFamily: fonts.header,
    fontSize: 24, 
    fontWeight: '700',
    color: THEME_GREEN, 
  },
  backButton: {
    padding: 4,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: 80,
  },
  filterTabs: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    marginBottom: 10,
    marginTop: 10,
    borderBottomWidth: 1,
    borderColor: '#eee',
  },
  filterTab: {
    marginRight: 20,
    paddingBottom: 10,
  },
  activeFilterTab: {
    borderBottomWidth: 2,
    borderBottomColor: THEME_GREEN,
  },
  filterTabText: {
    fontSize: 14,
    color: colors.gray,
    fontWeight: '600',
  },
  activeFilterText: {
    color: THEME_GREEN,
    fontWeight: 'bold',
  },
  reportCard: {
    backgroundColor: FLAG_BG,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  flaggedLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: ALERT_RED,
    textTransform: 'uppercase',
  },
  dateText: {
    color: colors.gray,
    fontSize: 10,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  thumbnail: {
    width: 60,
    height: 60,
    borderRadius: 6,
    backgroundColor: '#ccc',
  },
  placeholderThumb: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  textDetails: {
    flex: 1,
    marginHorizontal: 12,
    justifyContent: 'center',
  },
  descriptionText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.dark,
  },
  idText: {
    marginTop: 4,
    fontSize: 10,
    color: colors.gray,
  },
  reviewButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#dbdbdb',
    alignSelf: 'center',
  },
  reviewButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.dark,
  },
  profileSection: {
    backgroundColor: '#fff',
    paddingVertical: spacing.md,
  },
  profileTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  profileImageContainer: {
    marginRight: spacing.lg,
  },
  profileImagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#333', 
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  statsRow: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around', 
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.dark,
  },
  statLabel: {
    fontSize: 13,
    color: colors.gray,
    marginTop: 2,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.dark,
    marginBottom: spacing.xs,
    alignSelf: 'flex-start',
  },
  userBio: {
    fontSize: 14,
    color: colors.dark,
    textAlign: 'left',
    alignSelf: 'flex-start',
    marginBottom: spacing.sm,
    lineHeight: 18,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start'
  },
  locationText: {
    fontSize: 14,
    color: colors.dark,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginTop: spacing.sm,
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
    borderBottomColor: colors.dark,
  },
  postsContainer: {
    backgroundColor: '#fff',
    minHeight: 300,
    paddingTop: spacing.md,
  },
  adminPostView: {
    marginBottom: 30,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  smallAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#ccc',
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  postUsername: {
    fontWeight: '600',
    fontSize: 14,
    color: colors.dark,
  },
  postImage: {
    width: '100%',
    height: 400,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
  },
  postImagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  postFooter: {
    marginTop: 10,
  },
  captionText: {
    marginTop: 6,
    fontSize: 14,
    color: colors.dark,
  },
  emptyState: {
    alignItems: 'center',
    marginTop: 40,
    gap: 10,
  },
  emptyText: {
    color: THEME_GREEN,
    fontWeight: '600',
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  commentBubble: {
    backgroundColor: COMMENT_BG,
    padding: 10,
    borderRadius: 12,
    flex: 1,
  },
  commentUser: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.dark,
    marginBottom: 2,
  },
  commentText: {
    fontSize: 14,
    color: colors.dark,
  },
  reportedWrapper: {
    marginBottom: 15,
    backgroundColor: FLAG_BG,
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#ffe082',
  },
  reportedHeader: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    marginBottom: 8,
  },
  reportReasonLabel: {
    fontSize: 11,
    color: ALERT_RED,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  normalCommentRow: {
    flexDirection: 'row',
    marginBottom: 15,
    gap: 10,
  },
  userReportCard: {
    backgroundColor: '#FAFAFA',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#eee',
    padding: 20,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  bannedCard: {
    backgroundColor: '#ffebee',
    borderColor: ALERT_RED,
  },
  bannedBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: ALERT_RED,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  bannedText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
});