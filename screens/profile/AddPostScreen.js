import * as ImagePicker from 'expo-image-picker';
import { getAuth } from 'firebase/auth';
import { addDoc, collection, doc, getDoc, getDocs, getFirestore, query, serverTimestamp, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from '../../assets/icons/icons';
import { colors, spacing } from '../../lib/theme';

const CLOUDINARY_CLOUD_NAME = 'dblq6cttn';
const CLOUDINARY_UPLOAD_PRESET = 'myPreset';

export default function AddPostScreen({ navigation }) {
  const [selectedImage, setSelectedImage] = useState(null);
  const [processedImage, setProcessedImage] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [taggedUsers, setTaggedUsers] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [removingBg, setRemovingBg] = useState(false);
  const [postType, setPostType] = useState('forFun');
  const [clothingType, setClothingType] = useState('other');
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  const db = getFirestore();
  const auth = getAuth();

  useEffect(() => {
    requestPermission();
  }, []);

  const requestPermission = async () => {
    const { status: galleryStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
    
    if (galleryStatus !== 'granted' || cameraStatus !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Please allow access to your camera and gallery to upload photos.',
        [{ text: 'OK' }]
      );
    }
  };

  const showImagePickerOptions = () => {
    Alert.alert(
      'Upload Photo',
      'Choose an option',
      [
        {
          text: 'Take Photo',
          onPress: () => takePhoto(),
        },
        {
          text: 'Choose from Gallery',
          onPress: () => pickImage(),
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ],
      { cancelable: true }
    );
  };

  const takePhoto = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
      });

      if (!result.canceled) {
        setSelectedImage(result.assets[0]);
        setProcessedImage(null);
        
        // Auto remove background for swap items
        if (postType === 'forSwap' || postType === 'both') {
          await removeBackground(result.assets[0].uri);
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to take photo');
      console.error(error);
    }
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
      });

      if (!result.canceled) {
        setSelectedImage(result.assets[0]);
        setProcessedImage(null);
        
        // Auto remove background for swap items
        if (postType === 'forSwap' || postType === 'both') {
          await removeBackground(result.assets[0].uri);
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image');
      console.error(error);
    }
  };

  const removeBackground = async (imageUri) => {
    setRemovingBg(true);
    try {
      // Convert image to blob
      const response = await fetch(imageUri);
      const blob = await response.blob();

      // Create form data
      const formData = new FormData();
      formData.append('image_file', blob, 'image.jpg');
      formData.append('size', 'auto');

      // Call remove.bg API
      // Sign up at https://www.remove.bg/api for free API key (50 images/month)
      const removeBgResponse = await fetch('https://api.remove.bg/v1.0/removebg', {
        method: 'POST',
        headers: {
          'X-Api-Key': 'H5bBov2YzYJdfc9ytpRdeTRe', // Replace with your API key
        },
        body: formData,
      });

      if (!removeBgResponse.ok) {
        console.log('remove.bg failed, trying alternative...');
        // Fallback to Pixian.ai (also has free tier)
        await removeBackgroundPixian(imageUri);
        return;
      }

      const resultBlob = await removeBgResponse.blob();
      const reader = new FileReader();
      reader.onloadend = () => {
        setProcessedImage({ uri: reader.result });
      };
      reader.readAsDataURL(resultBlob);

      Alert.alert('Success', 'Background removed successfully!');
    } catch (error) {
      console.error('Background removal error:', error);
      Alert.alert('Info', 'Background removal unavailable, using original image');
    } finally {
      setRemovingBg(false);
    }
  };

  // Alternative: Pixian.ai (free tier: 25 images/month)
  const removeBackgroundPixian = async (imageUri) => {
    try {
      const response = await fetch(imageUri);
      const blob = await response.blob();

      const formData = new FormData();
      formData.append('image', blob, 'image.jpg');

      // Pixian.ai free API
      const pixianResponse = await fetch('https://api.pixian.ai/api/v2/remove-background', {
        method: 'POST',
        body: formData,
      });

      if (pixianResponse.ok) {
        const resultBlob = await pixianResponse.blob();
        const reader = new FileReader();
        reader.onloadend = () => {
          setProcessedImage({ uri: reader.result });
        };
        reader.readAsDataURL(resultBlob);
        Alert.alert('Success', 'Background removed successfully!');
      } else {
        throw new Error('Pixian API failed');
      }
    } catch (error) {
      console.error('Pixian error:', error);
      Alert.alert('Info', 'Background removal unavailable, using original image');
    }
  };

  const uploadToCloudinary = async (imageUri) => {
    try {
      const formData = new FormData();
      formData.append('file', {
        uri: imageUri,
        type: 'image/jpeg',
        name: 'upload.jpg'
      });
      formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

      console.log('Uploading to Cloudinary...');
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
        {
          method: 'POST',
          body: formData,
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Cloudinary error:', errorText);
        throw new Error('Failed to upload to Cloudinary');
      }

      const data = await response.json();
      console.log('Cloudinary upload successful:', data.secure_url);
      return data.secure_url;
    } catch (error) {
      console.error('Upload to Cloudinary failed:', error);
      throw error;
    }
  };

  const handleTagPeople = () => {
    setShowUserSearch(true);
    setSearchQuery('');
    setFilteredUsers([]);
  };

  const searchUsers = async (searchText) => {
    setSearchQuery(searchText);
    
    if (searchText.trim().length < 2) {
      setFilteredUsers([]);
      return;
    }

    setLoading(true);
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('username', '>=', searchText), where('username', '<=', searchText + '\uf8ff'));
      const querySnapshot = await getDocs(q);
      
      const users = [];
      querySnapshot.forEach((doc) => {
        const userData = doc.data();
        const username = userData.username || '';
        const displayName = userData.displayName || '';
        
        // Search by username or display name
        if (
          username.toLowerCase().includes(searchText.toLowerCase()) ||
          displayName.toLowerCase().includes(searchText.toLowerCase())
        ) {
          // Don't show already tagged users or current user
          const alreadyTagged = taggedUsers.some(u => u.uid === doc.id);
          const isCurrentUser = doc.id === auth.currentUser?.uid;
          
          if (!alreadyTagged && !isCurrentUser) {
            users.push({
              uid: doc.id,
              username: username,
              displayName: displayName,
              photoURL: userData.photoURL || null,
            });
          }
        }
      });
      
      setFilteredUsers(users);
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectUser = (user) => {
    setTaggedUsers([...taggedUsers, user]);
    setShowUserSearch(false);
    setSearchQuery('');
    setFilteredUsers([]);
  };

  const removeTag = (index) => {
    const newTags = taggedUsers.filter((_, i) => i !== index);
    setTaggedUsers(newTags);
  };

  const createTagNotifications = async (postId, imageUrl) => {
    if (taggedUsers.length === 0) return;

    const currentUser = auth.currentUser;
    if (!currentUser) return;

    try {
      // Get current user's info
      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      const currentUsername = userDoc.exists() ? userDoc.data().username || 'Someone' : 'Someone';

      // Create notification for each tagged user
      const notificationPromises = taggedUsers.map(async (taggedUser) => {
        await addDoc(collection(db, 'users', taggedUser.uid, 'activities'), {
          type: 'tag',
          message: `${currentUsername} tagged you in a post`,
          fromUserId: currentUser.uid,
          fromUsername: currentUsername,
          postId: postId,
          postImage: imageUrl,
          timestamp: serverTimestamp(),
          read: false,
        });
      });

      await Promise.all(notificationPromises);
    } catch (error) {
      console.error('Error creating tag notifications:', error);
    }
  };

  const toggleBackgroundRemoval = async () => {
    if (!selectedImage) {
      Alert.alert('No Image', 'Please select an image first');
      return;
    }

    if (processedImage) {
      setProcessedImage(null);
    } else {
      await removeBackground(selectedImage.uri);
    }
  };

  const handlePost = async () => {
    if (!selectedImage) {
      Alert.alert('No Image', 'Please select an image to upload');
      return;
    }

    if (!title.trim()) {
      Alert.alert('No Title', 'Please add a title for your post');
      return;
    }

    setUploading(true);

    try {
      console.log('Starting upload process...');
      
      // Use processed image (with bg removed) if available, otherwise use original
      const imageToUpload = processedImage?.uri || selectedImage.uri;
      const imageUrl = await uploadToCloudinary(imageToUpload);
      console.log('Image uploaded, URL:', imageUrl);

      const uid = auth.currentUser.uid;
      
      // Get username from Firestore
      let userName = auth.currentUser.displayName || auth.currentUser.email;
      try {
        const userDocRef = doc(db, 'users', uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          userName = userDoc.data().username || userName;
        }
      } catch (err) {
        console.error('Error fetching username:', err);
      }

      console.log('Saving to Firestore...');
      
      if (postType === 'both') {
        const funPostRef = await addDoc(collection(db, 'wardrobe-plug-fyp/user/images'), {
          ownerUid: uid,
          userName: userName,
          url: imageUrl,
          title: title.trim(),
          description: description.trim(),
          taggedUsers: taggedUsers.map(u => ({ uid: u.uid, username: u.username })),
          postType: 'forFun',
          swapStatus: null,
          clothingType: clothingType,
          backgroundRemoved: false,
          uploadedAt: new Date(),
        });
        
        // Removed unused variable `swapPostRef` to resolve lint error
        await addDoc(collection(db, 'wardrobe-plug-fyp/user/images'), {
          ownerUid: uid,
          userName: userName,
          url: imageUrl,
          title: title.trim(),
          description: description.trim(),
          taggedUsers: taggedUsers.map(u => ({ uid: u.uid, username: u.username })),
          postType: 'forSwap',
          swapStatus: 'available',
          clothingType: clothingType,
          backgroundRemoved: !!processedImage,
          uploadedAt: new Date(),
        });

        // Create notifications for tagged users (use the fun post for notifications)
        await createTagNotifications(funPostRef.id, imageUrl);
      } else {
        const postRef = await addDoc(collection(db, 'wardrobe-plug-fyp/user/images'), {
          ownerUid: uid,
          userName: userName,
          url: imageUrl,
          title: title.trim(),
          description: description.trim(),
          taggedUsers: taggedUsers.map(u => ({ uid: u.uid, username: u.username })),
          postType: postType,
          swapStatus: postType === 'forSwap' ? 'available' : null,
          clothingType: clothingType,
          backgroundRemoved: !!processedImage,
          uploadedAt: new Date(),
        });

        // Create notifications for tagged users
        await createTagNotifications(postRef.id, imageUrl);
      }

      console.log('Post saved successfully!');
      
      Alert.alert('Success', 'Your post has been uploaded!', [
        {
          text: 'OK',
          onPress: () => navigation.goBack()
        }
      ]);
      
      setSelectedImage(null);
      setProcessedImage(null);
      setTitle('');
      setDescription('');
      setTaggedUsers([]);
      setPostType('forFun');
      setClothingType('other');
    } catch (error) {
      console.error('Upload error:', error);
      Alert.alert('Error', `Failed to upload post: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="arrow-back" size={24} color={colors.dark} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create New Post</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.uploadSection}>
          <TouchableOpacity style={styles.imagePicker} onPress={showImagePickerOptions}>
            {(processedImage || selectedImage) ? (
              <Image 
                source={{ uri: processedImage?.uri || selectedImage.uri }} 
                style={styles.selectedImage} 
              />
            ) : (
              <View style={styles.imagePickerPlaceholder}>
                <Icon name="camera" size={48} color={colors.gray} />
                <Text style={styles.imagePickerText}>Tap to take photo or select from gallery</Text>
              </View>
            )}
          </TouchableOpacity>

          {removingBg && (
            <View style={styles.processingBadge}>
              <ActivityIndicator size="small" color={colors.accent} />
              <Text style={styles.processingText}>Removing background...</Text>
            </View>
          )}

          {selectedImage && (postType === 'forSwap' || postType === 'both') && (
            <TouchableOpacity 
              style={styles.bgRemovalButton}
              onPress={toggleBackgroundRemoval}
              disabled={removingBg}
            >
              <Icon 
                name={processedImage ? "images" : "cut-outline"} 
                size={20} 
                color={colors.accent} 
              />
              <Text style={styles.bgRemovalButtonText}>
                {processedImage ? 'Use Original' : 'Remove Background'}
              </Text>
            </TouchableOpacity>
          )}

          <View style={styles.inputContainer}>
            <Icon name="text" size={20} color={colors.gray} />
            <TextInput
              style={styles.input}
              placeholder="Add a title..."
              value={title}
              onChangeText={setTitle}
              maxLength={100}
            />
          </View>

          <View style={styles.inputContainer}>
            <Icon name="document-text-outline" size={20} color={colors.gray} />
            <TextInput
              style={[styles.input, styles.descriptionInput]}
              placeholder="Add a description..."
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              maxLength={500}
            />
          </View>

          <View style={styles.postTypeSection}>
            <Text style={styles.sectionLabel}>Post Type</Text>
            <View style={styles.postTypeButtons}>
              <TouchableOpacity
                style={[
                  styles.postTypeButton,
                  postType === 'forFun' && styles.postTypeButtonActive
                ]}
                onPress={() => {
                  setPostType('forFun');
                  setProcessedImage(null);
                }}
              >
                <Icon 
                  name={postType === 'forFun' ? 'happy' : 'happy-outline'} 
                  size={20} 
                  color={postType === 'forFun' ? '#fff' : colors.dark} 
                />
                <Text style={[
                  styles.postTypeButtonText,
                  postType === 'forFun' && styles.postTypeButtonTextActive
                ]}>
                  For Fun
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.postTypeButton,
                  postType === 'forSwap' && styles.postTypeButtonActive
                ]}
                onPress={async () => {
                  setPostType('forSwap');
                  if (selectedImage && !processedImage) {
                    await removeBackground(selectedImage.uri);
                  }
                }}
              >
                <Icon 
                  name={postType === 'forSwap' ? 'swap-horizontal' : 'swap-horizontal-outline'} 
                  size={20} 
                  color={postType === 'forSwap' ? '#fff' : colors.dark} 
                />
                <Text style={[
                  styles.postTypeButtonText,
                  postType === 'forSwap' && styles.postTypeButtonTextActive
                ]}>
                  For Swap
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.postTypeButton,
                  postType === 'both' && styles.postTypeButtonActive
                ]}
                onPress={async () => {
                  setPostType('both');
                  if (selectedImage && !processedImage) {
                    await removeBackground(selectedImage.uri);
                  }
                }}
              >
                <Icon 
                  name={postType === 'both' ? 'apps' : 'apps-outline'} 
                  size={20} 
                  color={postType === 'both' ? '#fff' : colors.dark} 
                />
                <Text style={[
                  styles.postTypeButtonText,
                  postType === 'both' && styles.postTypeButtonTextActive
                ]}>
                  Both
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Clothing Type Selector */}
          <View style={styles.postTypeSection}>
            <Text style={styles.sectionLabel}>Clothing Type</Text>
            <Text style={styles.sectionHint}>Help users mix & match outfits</Text>
            <View style={styles.postTypeButtons}>
              <TouchableOpacity
                style={[
                  styles.postTypeButton,
                  clothingType === 'top' && styles.postTypeButtonActive
                ]}
                onPress={() => setClothingType('top')}
              >
                <Icon 
                  name={clothingType === 'top' ? 'shirt' : 'shirt-outline'} 
                  size={20} 
                  color={clothingType === 'top' ? '#fff' : colors.dark} 
                />
                <Text style={[
                  styles.postTypeButtonText,
                  clothingType === 'top' && styles.postTypeButtonTextActive
                ]}>
                  Top
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.postTypeButton,
                  clothingType === 'bottom' && styles.postTypeButtonActive
                ]}
                onPress={() => setClothingType('bottom')}
              >
                <Icon 
                  name="fitness-outline"
                  size={20} 
                  color={clothingType === 'bottom' ? '#fff' : colors.dark} 
                />
                <Text style={[
                  styles.postTypeButtonText,
                  clothingType === 'bottom' && styles.postTypeButtonTextActive
                ]}>
                  Bottom
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.postTypeButton,
                  clothingType === 'other' && styles.postTypeButtonActive
                ]}
                onPress={() => setClothingType('other')}
              >
                <Icon 
                  name="pricetag-outline"
                  size={20} 
                  color={clothingType === 'other' ? '#fff' : colors.dark} 
                />
                <Text style={[
                  styles.postTypeButtonText,
                  clothingType === 'other' && styles.postTypeButtonTextActive
                ]}>
                  Other
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity 
            style={styles.tagButton}
            onPress={handleTagPeople}
          >
            <Icon name="person-add-outline" size={20} color={colors.accent} />
            <Text style={styles.tagButtonText}>Tag People</Text>
          </TouchableOpacity>

          {taggedUsers.length > 0 && (
            <View style={styles.tagsContainer}>
              {taggedUsers.map((tag, index) => (
                <View key={index} style={styles.tagChip}>
                  <Text style={styles.tagChipText}>@{tag.username}</Text>
                  <TouchableOpacity onPress={() => removeTag(index)}>
                    <Icon name="close-circle" size={18} color={colors.gray} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          <TouchableOpacity
            style={[styles.postButton, uploading && styles.postButtonDisabled]}
            onPress={handlePost}
            disabled={uploading}
          >
            {uploading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Icon name="cloud-upload-outline" size={20} color="#fff" />
                <Text style={styles.postButtonText}>Post</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* User Search Modal */}
      <Modal
        visible={showUserSearch}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowUserSearch(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Tag People</Text>
              <TouchableOpacity onPress={() => setShowUserSearch(false)}>
                <Icon name="close" size={24} color={colors.dark} />
              </TouchableOpacity>
            </View>

            <View style={styles.searchContainer}>
              <Icon name="search" size={20} color={colors.gray} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search users..."
                value={searchQuery}
                onChangeText={searchUsers}
                autoFocus
              />
            </View>

            {loading && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator color={colors.accent} />
              </View>
            )}

            <FlatList
              data={filteredUsers}
              keyExtractor={(item) => item.uid}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.userItem}
                  onPress={() => selectUser(item)}
                >
                  <View style={styles.userAvatar}>
                    {item.photoURL ? (
                      <Image source={{ uri: item.photoURL }} style={styles.avatarImage} />
                    ) : (
                      <Icon name="person" size={24} color={colors.gray} />
                    )}
                  </View>
                  <View style={styles.userInfo}>
                    <Text style={styles.userName}>@{item.username}</Text>
                    {item.displayName && (
                      <Text style={styles.userDisplayName}>{item.displayName}</Text>
                    )}
                  </View>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                !loading && searchQuery.length >= 2 && (
                  <Text style={styles.emptyText}>No users found</Text>
                )
              }
              style={styles.userList}
            />
          </View>
        </View>
      </Modal>
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
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.dark,
  },
  uploadSection: {
    backgroundColor: '#fff',
    padding: spacing.md,
    minHeight: '100%',
  },
  imagePicker: {
    width: '100%',
    height: 300,
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  imagePickerPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePickerText: {
    marginTop: spacing.sm,
    fontSize: 14,
    color: colors.gray,
  },
  selectedImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  processingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: '#E8F5E9',
    padding: spacing.sm,
    borderRadius: 8,
    marginBottom: spacing.sm,
  },
  processingText: {
    fontSize: 14,
    color: colors.accent,
  },
  bgRemovalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: '#E8F5E9',
    padding: spacing.md,
    borderRadius: 8,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  bgRemovalButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.accent,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  input: {
    flex: 1,
    marginLeft: spacing.sm,
    fontSize: 14,
    color: colors.dark,
  },
  descriptionInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  postTypeSection: {
    marginBottom: spacing.md,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.dark,
    marginBottom: spacing.sm,
  },
  sectionHint: {
    fontSize: 12,
    color: colors.gray,
    marginBottom: spacing.sm,
  },
  postTypeButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  postTypeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    padding: spacing.md,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  postTypeButtonActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  postTypeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.dark,
  },
  postTypeButtonTextActive: {
    color: '#fff',
  },
  tagButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  tagButtonText: {
    fontSize: 14,
    color: colors.accent,
    fontWeight: '600',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: 16,
  },
  tagChipText: {
    fontSize: 14,
    color: colors.dark,
  },
  postButton: {
    flexDirection: 'row',
    backgroundColor: colors.accent,
    borderRadius: 8,
    padding: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  postButtonDisabled: {
    opacity: 0.6,
  },
  postButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: spacing.lg,
    paddingBottom: spacing.xl * 2,
    maxHeight: '70%',
    width: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.dark,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    margin: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    fontSize: 16,
    color: colors.dark,
  },
  loadingContainer: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  userList: {
    flex: 1,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  userAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  avatarImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.dark,
  },
  userDisplayName: {
    fontSize: 14,
    color: colors.gray,
    marginTop: 2,
  },
  emptyText: {
    textAlign: 'center',
    padding: spacing.xl,
    color: colors.gray,
    fontSize: 14,
  },
});