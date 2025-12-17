import * as ImagePicker from 'expo-image-picker';
import { getAuth, updateProfile } from 'firebase/auth';
import { doc, getDoc, getFirestore, setDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from '../../assets/icons/icons';
import { colors, spacing } from '../../lib/theme';

// Cloudinary config
const CLOUDINARY_CLOUD_NAME = 'dblq6cttn';
const CLOUDINARY_UPLOAD_PRESET = 'myPreset';

export default function EditProfileScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profileImage, setProfileImage] = useState(null);
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');

  const auth = getAuth();
  const db = getFirestore();
  const user = auth.currentUser;

  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      const uid = user?.uid;
      if (!uid) return;

      const userDocRef = doc(db, 'users', uid);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        setUsername(userData.username || user?.displayName || '');
        // Set bio from Firestore, or default message if empty
        setBio(userData.bio || 'i overestimated how much i can achieve when i reached how old i am now');
        // Load photoURL from Firestore (Cloudinary URL)
        if (userData.photoURL) {
          setProfileImage(userData.photoURL);
        }
      } else {
        // If no Firestore document exists, use default bio
        setBio('i overestimated how much i can achieve when i reached how old i am now');
      }
      
      if (user?.photoURL) {
        setProfileImage(user.photoURL);
      }
    } catch (_error) {
      console.error('Error loading user profile:', _error);
    } finally {
      setLoading(false);
    }
  };

  const uploadToCloudinary = async (imageUri) => {
    try {
      const formData = new FormData();
      formData.append('file', {
        uri: imageUri,
        type: 'image/jpeg',
        name: 'profile.jpg'
      });
      formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

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
        throw new Error('Failed to upload to Cloudinary');
      }

      const data = await response.json();
      return data.secure_url;
    } catch (error) {
      console.error('Upload to Cloudinary failed:', error);
      throw error;
    }
  };

  const handlePickImage = async () => {
    try {
      // Request permission
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (!permissionResult.granted) {
        Alert.alert('Permission Required', 'Please allow access to your photo library');
        return;
      }

      // Pick image
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled) {
        setProfileImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const handleSave = async () => {
    if (!user) {
      Alert.alert(
        'Login to start customizing your profile!',
        '',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Login', onPress: () => navigation.navigate('Login') }
        ]
      );
      return;
    }

    if (!username.trim()) {
      Alert.alert('Error', 'Username is required');
      return;
    }

    try {
      setSaving(true);
      const uid = user?.uid;
      if (!uid) return;

      let photoURL = user?.photoURL;
      
      // Upload new image to Cloudinary if changed
      if (profileImage && profileImage !== user?.photoURL) {
        try {
          photoURL = await uploadToCloudinary(profileImage);
        } catch (_error) {
          Alert.alert('Error', 'Failed to upload profile picture');
          setSaving(false);
          return;
        }
      }

      // Update Firebase Auth profile
      await updateProfile(user, {
        displayName: username.trim(),
        photoURL: photoURL
      });

      // Update Firestore user document
      const userDocRef = doc(db, 'users', uid);
      await setDoc(userDocRef, {
        username: username.trim(),
        bio: bio.trim(),
        photoURL: photoURL
      }, { merge: true });

      Alert.alert('Success', 'Profile updated successfully', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      console.error('Error saving profile:', error);
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#fff" barStyle="dark-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="close" size={28} color={colors.dark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <TouchableOpacity onPress={handleSave} disabled={saving}>
          {saving ? (
            <ActivityIndicator size="small" color={colors.accent} />
          ) : (
            <Icon name="checkmark" size={28} color={colors.accent} />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Profile Picture */}
        <View style={styles.imageSection}>
          <TouchableOpacity onPress={handlePickImage} style={styles.imageContainer}>
            {profileImage ? (
              <Image source={{ uri: profileImage }} style={styles.profileImage} />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Icon name="person" size={60} color={colors.gray} />
              </View>
            )}
            <View style={styles.cameraIconContainer}>
              <Icon name="camera" size={20} color="#fff" />
            </View>
          </TouchableOpacity>
        </View>

        {/* Form Fields */}
        <View style={styles.formSection}>
          <View style={styles.formField}>
            <Text style={styles.fieldLabel}>Username</Text>
            <TextInput
              style={styles.input}
              value={username}
              onChangeText={setUsername}
              placeholder="Enter username"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.formField}>
            <Text style={styles.fieldLabel}>Bio</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={bio}
              onChangeText={setBio}
              placeholder="Tell us about yourself"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.secondary,
  },
  centerContent: {
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
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.dark,
  },
  imageSection: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    backgroundColor: '#fff',
    marginBottom: spacing.sm,
  },
  imageContainer: {
    position: 'relative',
    marginBottom: spacing.md,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  imagePlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraIconContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: colors.accent,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  changePhotoText: {
    fontSize: 16,
    color: colors.accent,
    fontWeight: '600',
  },
  formSection: {
    backgroundColor: '#fff',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
  },
  formField: {
    marginBottom: spacing.lg,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.dark,
    marginBottom: spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 16,
    color: colors.dark,
    backgroundColor: '#fff',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
});
