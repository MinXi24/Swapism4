import * as ImagePicker from 'expo-image-picker';
import { getAuth } from 'firebase/auth';
import { addDoc, collection, doc, getDoc, getFirestore } from 'firebase/firestore';
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

const CLOUDINARY_CLOUD_NAME = 'dblq6cttn';
const CLOUDINARY_UPLOAD_PRESET = 'myPreset';

export default function AddPostScreen({ navigation, route }) {
  const [selectedImages, setSelectedImages] = useState([]);
  const [selectedImage, setSelectedImage] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [uploading, setUploading] = useState(false);
  const [postType, setPostType] = useState('forFun');
  const [clothingType, setClothingType] = useState('other');
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedCondition, setSelectedCondition] = useState('');
  const [additionalDetails, setAdditionalDetails] = useState('');
  const [showConditionDropdown, setShowConditionDropdown] = useState(false);

  const db = getFirestore();
  const auth = getAuth();

  const sizes = ['XS', 'S', 'M', 'L', 'XL'];
  const conditions = ['Brand new', 'Wore it once', 'Wore it 2-5 times', 'Wore it more than 5 times', 'Well-worn'];

  const isSwapPost = postType === 'forSwap' || postType === 'both';

  useEffect(() => {
    requestPermission();
    
    // Check if we have a captured image from TryOn screen
    if (route?.params?.capturedImage) {
      setSelectedImage({ uri: route.params.capturedImage });
    }
  }, [route?.params?.capturedImage]);

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
        // Add to existing images array, up to 2 images
        if (selectedImages.length < 2) {
          const newImages = [...selectedImages, result.assets[0]];
          setSelectedImages(newImages);
          setSelectedImage(result.assets[0]); // Keep for backward compatibility
        } else {
          Alert.alert('Limit Reached', 'You can only add up to 2 images per post');
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
        allowsEditing: selectedImages.length > 0 ? false : true,
        allowsMultipleSelection: true,
        selectionLimit: 2,
        aspect: [4, 3],
        quality: 1,
      });

      if (!result.canceled) {
        if (result.assets.length > 0) {
          // Support up to 2 images
          const images = result.assets.slice(0, 2);
          setSelectedImages(images);
          setSelectedImage(images[0]); // Keep for backward compatibility
        }
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

  const handlePost = async () => {
    if (!auth.currentUser) {
      Alert.alert(
        'Login Required',
        'You must be logged in to create posts!',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Login', onPress: () => navigation.navigate('Login') }
        ]
      );
      return;
    }

    if (!selectedImage && selectedImages.length === 0) {
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
      
      // Upload all selected images
      const imageUrls = [];
      const imagesToUpload = selectedImages.length > 0 ? selectedImages : [selectedImage];
      
      for (let i = 0; i < imagesToUpload.length; i++) {
        const img = imagesToUpload[i];
        const imageUrl = await uploadToCloudinary(img.uri);
        imageUrls.push(imageUrl);
        console.log(`Image ${i + 1} uploaded, URL:`, imageUrl);
      }
      
      const imageUrl = imageUrls[0]; // Primary image for backward compatibility
      console.log('All images uploaded');

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
        await addDoc(collection(db, 'wardrobe-plug-fyp/user/images'), {
          ownerUid: uid,
          userName: userName,
          url: imageUrl,
          imageUrls: imageUrls,
          title: title.trim(),
          description: description.trim(),
          postType: 'forFun',
          swapStatus: null,
          clothingType: clothingType,
          backgroundRemoved: false,
          uploadedAt: new Date(),
        });
        
        await addDoc(collection(db, 'wardrobe-plug-fyp/user/images'), {
          ownerUid: uid,
          userName: userName,
          url: imageUrl,
          imageUrls: imageUrls,
          title: title.trim(),
          description: description.trim(),
          postType: 'forSwap',
          swapStatus: 'available',
          clothingType: clothingType,
          size: selectedSize || 'N/A',
          condition: selectedCondition || 'N/A',
          additionalDetails: additionalDetails.trim() || 'N/A',
          uploadedAt: new Date(),
        });
      } else {
        const postData = {
          ownerUid: uid,
          userName: userName,
          url: imageUrl,
          imageUrls: imageUrls, // Store all image URLs
          title: title.trim(),
          description: description.trim(),
          postType: postType,
          swapStatus: postType === 'forSwap' ? 'available' : null,
          clothingType: clothingType,
          uploadedAt: new Date(),
        };

        // Add swap details only for forSwap posts
        if (postType === 'forSwap') {
          postData.size = selectedSize || 'N/A';
          postData.condition = selectedCondition || 'N/A';
          postData.additionalDetails = additionalDetails.trim() || 'N/A';
        }

        await addDoc(collection(db, 'wardrobe-plug-fyp/user/images'), postData);
      }

      console.log('Post saved successfully!');
      
      Alert.alert('Success', 'Your post has been uploaded!', [
        {
          text: 'OK',
          onPress: () => navigation.goBack()
        }
      ]);
      
      setSelectedImages([]);
      setSelectedImage(null);
      setTitle('');
      setDescription('');
      setPostType('forFun');
      setClothingType('other');
      setSelectedSize('');
      setSelectedCondition('');
      setAdditionalDetails('');
    } catch (error) {
      console.error('Upload error:', error);
      Alert.alert('Error', `Failed to upload post: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="arrow-back" size={24} color={colors.dark} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create New Post</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.uploadSection}>
          {selectedImages.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imagesScroll}>
              {selectedImages.map((img, index) => (
                <View key={index} style={styles.imageContainer}>
                  <Image 
                    source={{ uri: img.uri }} 
                    style={styles.multipleImage} 
                  />
                  <TouchableOpacity
                    style={styles.removeImageButton}
                    onPress={() => {
                      const newImages = selectedImages.filter((_, i) => i !== index);
                      setSelectedImages(newImages);
                      if (newImages.length > 0) {
                        setSelectedImage(newImages[0]);
                      } else {
                        setSelectedImage(null);
                      }
                    }}
                  >
                    <Icon name="close-circle" size={24} color="#fff" />
                  </TouchableOpacity>
                  {index === 0 && (
                    <View style={styles.primaryBadge}>
                      <Text style={styles.primaryBadgeText}>Main</Text>
                    </View>
                  )}
                </View>
              ))}

            </ScrollView>
          ) : (
            <TouchableOpacity style={styles.imagePicker} onPress={showImagePickerOptions}>
              <View style={styles.imagePickerPlaceholder}>
                <Icon name="camera" size={48} color={colors.gray} />
                <Text style={styles.imagePickerText}>Tap to add a photo</Text>
              </View>
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
                onPress={() => {
                  setPostType('forSwap');
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
                onPress={() => {
                  setPostType('both');
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

          {/* Size and Condition Section - Only for Swap Posts */}
          {isSwapPost && (
            <>
              {/* Size Selection */}
              <View style={styles.postTypeSection}>
                <Text style={styles.sectionLabel}>Size</Text>
                <Text style={styles.sectionHint}>Select the clothing size</Text>
                <View style={styles.sizeButtonsRow}>
                  {sizes.map((size) => (
                    <TouchableOpacity
                      key={size}
                      style={[
                        styles.sizeButton,
                        selectedSize === size && styles.sizeButtonActive
                      ]}
                      onPress={() => setSelectedSize(size)}
                    >
                      <Text style={[
                        styles.sizeButtonText,
                        selectedSize === size && styles.sizeButtonTextActive
                      ]}>
                        {size}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Condition Selection */}
              <View style={styles.postTypeSection}>
                <Text style={styles.sectionLabel}>Condition</Text>
                <Text style={styles.sectionHint}>How often have you worn this?</Text>
                <TouchableOpacity
                  style={styles.dropdownButton}
                  onPress={() => setShowConditionDropdown(!showConditionDropdown)}
                >
                  <Text style={styles.dropdownButtonText}>
                    {selectedCondition || 'Select condition'}
                  </Text>
                  <Icon 
                    name={showConditionDropdown ? 'chevron-up' : 'chevron-down'} 
                    size={20} 
                    color={colors.dark} 
                  />
                </TouchableOpacity>
                {showConditionDropdown && (
                  <View style={styles.dropdownList}>
                    {conditions.map((condition) => (
                      <TouchableOpacity
                        key={condition}
                        style={styles.dropdownItem}
                        onPress={() => {
                          setSelectedCondition(condition);
                          setShowConditionDropdown(false);
                        }}
                      >
                        <Text style={styles.dropdownItemText}>{condition}</Text>
                        {selectedCondition === condition && (
                          <Icon name="checkmark" size={20} color={colors.accent} />
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              {/* Additional Details */}
              <View style={styles.postTypeSection}>
                <Text style={styles.sectionLabel}>Additional Details (Optional)</Text>
                <Text style={styles.sectionHint}>Any extra information about the item</Text>
                <TextInput
                  style={styles.detailsInput}
                  placeholder="E.g., Brand, fabric, defects, etc."
                  value={additionalDetails}
                  onChangeText={setAdditionalDetails}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>
            </>
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
    paddingVertical: spacing.md,
    paddingHorizontal: 0,
    minHeight: '100%',
  },
  imagePicker: {
    width: '100%',
    height: 300,
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: spacing.md,
    marginHorizontal: spacing.md,
    alignSelf: 'center',
    maxWidth: '95%',
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
  imagesScroll: {
    marginBottom: spacing.md,
  },
  imageContainer: {
    position: 'relative',
    marginRight: spacing.sm,
  },
  multipleImage: {
    width: 200,
    height: 200,
    borderRadius: 8,
    resizeMode: 'cover',
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 12,
  },
  primaryBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: colors.accent,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  primaryBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  addMoreButton: {
    width: 200,
    height: 200,
    borderRadius: 8,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f8f4',
  },
  addMoreText: {
    marginTop: spacing.xs,
    fontSize: 12,
    color: colors.accent,
    fontWeight: '600',
  },
  processingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: '#E8F5E9',
    padding: spacing.sm,
    borderRadius: 8,
    marginBottom: spacing.sm,
    marginHorizontal: spacing.md,
  },
  processingText: {
    fontSize: 14,
    color: colors.accent,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    marginHorizontal: spacing.md,
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
    marginHorizontal: spacing.md,
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
  postButton: {
    flexDirection: 'row',
    backgroundColor: colors.accent,
    borderRadius: 0,
    padding: spacing.md,
    paddingVertical: spacing.lg,
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
  sizeButtonsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  sizeButton: {
    flex: 1,
    backgroundColor: colors.secondary,
    borderRadius: 8,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  sizeButtonActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  sizeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.dark,
  },
  sizeButtonTextActive: {
    color: '#fff',
  },
  dropdownButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.secondary,
    borderRadius: 8,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  dropdownButtonText: {
    fontSize: 16,
    color: colors.dark,
  },
  dropdownList: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginTop: spacing.sm,
    maxHeight: 200,
  },
  dropdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  dropdownItemText: {
    fontSize: 16,
    color: colors.dark,
  },
  detailsInput: {
    backgroundColor: colors.secondary,
    borderRadius: 8,
    padding: spacing.md,
    fontSize: 16,
    color: colors.dark,
    minHeight: 80,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
});