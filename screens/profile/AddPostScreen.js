import * as ImagePicker from 'expo-image-picker';
import { getAuth } from 'firebase/auth';
import { addDoc, collection, getFirestore } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from '../../assets/icons/icons';
import { colors, spacing } from '../../lib/theme';

// IMPORTANT: Replace these with your actual values
const CLOUDINARY_CLOUD_NAME = 'dblq6cttn';
const CLOUDINARY_UPLOAD_PRESET = 'myPreset';

export default function AddPostScreen({ navigation }) {
  const [selectedImage, setSelectedImage] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [taggedUsers, setTaggedUsers] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [postType, setPostType] = useState('forFun'); // 'forFun' or 'forSwap'

  const db = getFirestore();
  const auth = getAuth();

  useEffect(() => {
    requestPermission();
  }, []);

  const requestPermission = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Please allow access to your gallery to upload photos.',
        [{ text: 'OK' }]
      );
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
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image');
      console.error(error);
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
    Alert.alert('Tag People', 'Tap to tag friends in your post', [
      {
        text: 'Cancel',
        style: 'cancel'
      },
      {
        text: 'Add Tag',
        onPress: () => {
          setTaggedUsers([...taggedUsers, `Friend ${taggedUsers.length + 1}`]);
        }
      }
    ]);
  };

  const removeTag = (index) => {
    const newTags = taggedUsers.filter((_, i) => i !== index);
    setTaggedUsers(newTags);
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
      const imageUrl = await uploadToCloudinary(selectedImage.uri);
      console.log('Image uploaded, URL:', imageUrl);

      const uid = auth.currentUser.uid;
      const userName = auth.currentUser.displayName || auth.currentUser.email;

      console.log('Saving to Firestore...');
      await addDoc(collection(db, 'wardrobe-plug-fyp/user/images'), {
        ownerUid: uid,
        userName: userName,
        url: imageUrl,
        title: title.trim(),
        description: description.trim(),
        taggedUsers: taggedUsers,
        postType: postType, // 'forFun' or 'forSwap'
        swapStatus: postType === 'forSwap' ? 'available' : null, // Default to 'available' for swap posts
        uploadedAt: new Date(),
      });

      console.log('Post saved successfully!');
      
      Alert.alert('Success', 'Your post has been uploaded!', [
        {
          text: 'OK',
          onPress: () => navigation.goBack()
        }
      ]);
      
      setSelectedImage(null);
      setTitle('');
      setDescription('');
      setTaggedUsers([]);
      setPostType('forFun');
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
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="arrow-back" size={24} color={colors.dark} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create New Post</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Upload Section */}
        <View style={styles.uploadSection}>
          {/* Image Picker */}
          <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
            {selectedImage ? (
              <Image source={{ uri: selectedImage.uri }} style={styles.selectedImage} />
            ) : (
              <View style={styles.imagePickerPlaceholder}>
                <Icon name="camera" size={48} color={colors.gray} />
                <Text style={styles.imagePickerText}>Tap to select photo</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Title Input */}
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

          {/* Description Input */}
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

          {/* Post Type Selection */}
          <View style={styles.postTypeSection}>
            <Text style={styles.sectionLabel}>Post Type</Text>
            <View style={styles.postTypeButtons}>
              <TouchableOpacity
                style={[
                  styles.postTypeButton,
                  postType === 'forFun' && styles.postTypeButtonActive
                ]}
                onPress={() => setPostType('forFun')}
              >
                <Icon 
                  name={postType === 'forFun' ? 'happy' : 'happy-outline'} 
                  size={24} 
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
                onPress={() => setPostType('forSwap')}
              >
                <Icon 
                  name={postType === 'forSwap' ? 'swap-horizontal' : 'swap-horizontal-outline'} 
                  size={24} 
                  color={postType === 'forSwap' ? '#fff' : colors.dark} 
                />
                <Text style={[
                  styles.postTypeButtonText,
                  postType === 'forSwap' && styles.postTypeButtonTextActive
                ]}>
                  For Swap
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Tag People Button */}
          <TouchableOpacity 
            style={styles.tagButton}
            onPress={handleTagPeople}
          >
            <Icon name="person-add-outline" size={20} color={colors.accent} />
            <Text style={styles.tagButtonText}>Tag People</Text>
          </TouchableOpacity>

          {/* Tagged Users */}
          {taggedUsers.length > 0 && (
            <View style={styles.tagsContainer}>
              {taggedUsers.map((tag, index) => (
                <View key={index} style={styles.tagChip}>
                  <Text style={styles.tagChipText}>{tag}</Text>
                  <TouchableOpacity onPress={() => removeTag(index)}>
                    <Icon name="close-circle" size={18} color={colors.gray} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {/* Post Button */}
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
  swapStatusSection: {
    marginBottom: spacing.md,
  },
  swapStatusButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  swapStatusButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    padding: spacing.sm,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  swapStatusButtonActive: {
    backgroundColor: colors.highlight,
    borderColor: colors.highlight,
  },
  swapStatusButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.dark,
  },
  swapStatusButtonTextActive: {
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
});
