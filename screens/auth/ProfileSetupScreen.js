import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
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
import Button from '../../components/Button';
import { colors, fonts, spacing } from '../../lib/theme';

import { getAuth, updateProfile } from 'firebase/auth';
import { doc, getFirestore, updateDoc } from 'firebase/firestore';

const CLOUDINARY_CLOUD_NAME = 'dblq6cttn';
const CLOUDINARY_UPLOAD_PRESET = 'myPreset';

export default function ProfileSetupScreen({ navigation }) {
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [profileImage, setProfileImage] = useState(null);
  const [uploading, setUploading] = useState(false);

  const auth = getAuth();
  const db = getFirestore();
  const user = auth.currentUser;

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow access to your photos to upload a profile picture.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled) {
        setProfileImage(result.assets[0]);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const uploadImageToCloudinary = async (imageUri) => {
    try {
      const formData = new FormData();
      formData.append('file', {
        uri: imageUri,
        type: 'image/jpeg',
        name: 'profile.jpg',
      });
      formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
        {
          method: 'POST',
          body: formData,
        }
      );

      const data = await response.json();
      return data.secure_url;
    } catch (error) {
      console.error('Error uploading to Cloudinary:', error);
      throw error;
    }
  };

  const handleComplete = async () => {
    if (!username.trim()) {
      Alert.alert('Username Required', 'Please enter a username to continue.');
      return;
    }

    setUploading(true);

    try {
      let photoURL = null;

      // Upload profile image if selected
      if (profileImage) {
        photoURL = await uploadImageToCloudinary(profileImage.uri);
      }

      // Update Firestore user document
      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, {
        username: username.trim(),
        bio: bio.trim(),
        ...(photoURL && { photoURL }),
      });

      // Update Firebase Auth profile
      await updateProfile(user, {
        displayName: username.trim(),
        ...(photoURL && { photoURL }),
      });

      Alert.alert('Success', 'Profile setup complete!');
      navigation.replace('Home');
    } catch (error) {
      console.error('Error setting up profile:', error);
      Alert.alert('Error', 'Failed to setup profile. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleSkip = () => {
    navigation.replace('Home');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#fff" barStyle="dark-content" />
      
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Set Up Your Profile</Text>
          <Text style={styles.subtitle}>Let others know who you are</Text>
        </View>

        {/* Profile Picture */}
        <View style={styles.profileSection}>
          <TouchableOpacity style={styles.imageContainer} onPress={pickImage}>
            {profileImage ? (
              <Image source={{ uri: profileImage.uri }} style={styles.profileImage} />
            ) : (
              <View style={styles.placeholderImage}>
                <Icon name="camera" size={40} color={colors.gray} />
              </View>
            )}
            <View style={styles.editIcon}>
              <Icon name="pencil" size={16} color="#fff" />
            </View>
          </TouchableOpacity>
          <Text style={styles.imageLabel}>Add Profile Photo</Text>
          <Text style={styles.imageSubtext}>(Optional)</Text>
        </View>

        {/* Username Input */}
        <View style={styles.inputSection}>
          <Text style={styles.label}>
            Username <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your username"
            value={username}
            onChangeText={setUsername}
            maxLength={30}
            autoCapitalize="none"
          />
        </View>

        {/* Bio Input */}
        <View style={styles.inputSection}>
          <Text style={styles.label}>Bio</Text>
          <TextInput
            style={[styles.input, styles.bioInput]}
            placeholder="Tell us about yourself..."
            value={bio}
            onChangeText={setBio}
            multiline
            maxLength={150}
            textAlignVertical="top"
          />
          <Text style={styles.charCount}>{bio.length}/150</Text>
        </View>

        {/* Info Box */}
        <View style={styles.infoBox}>
          <Icon name="information-circle-outline" size={20} color={colors.accent} />
          <Text style={styles.infoText}>
            You can always update your profile later in Settings
          </Text>
        </View>

        {/* Buttons */}
        <View style={styles.buttonsContainer}>
          <Button
            title={uploading ? 'Setting up...' : 'Complete Setup'}
            onPress={handleComplete}
            disabled={uploading}
            style={styles.completeButton}
          />
          
          {uploading && (
            <ActivityIndicator size="small" color={colors.accent} style={styles.loader} />
          )}

          <TouchableOpacity onPress={handleSkip} disabled={uploading}>
            <Text style={styles.skipText}>Skip for now</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    padding: spacing.lg,
    paddingTop: spacing.xl,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    fontFamily: fonts.header,
    color: colors.dark,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: fonts.body,
    color: colors.gray,
    textAlign: 'center',
  },
  profileSection: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  imageContainer: {
    position: 'relative',
    marginBottom: spacing.sm,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.secondary,
  },
  placeholderImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  imageLabel: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: fonts.semiBold,
    color: colors.dark,
    marginTop: spacing.xs,
  },
  imageSubtext: {
    fontSize: 14,
    fontFamily: fonts.body,
    color: colors.gray,
  },
  inputSection: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: fonts.semiBold,
    color: colors.dark,
    marginBottom: spacing.xs,
  },
  required: {
    color: '#FF3B30',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 16,
    fontFamily: fonts.body,
    color: colors.dark,
    backgroundColor: '#F9F9F9',
  },
  bioInput: {
    minHeight: 100,
    paddingTop: spacing.sm,
  },
  charCount: {
    fontSize: 12,
    fontFamily: fonts.body,
    color: colors.gray,
    textAlign: 'right',
    marginTop: spacing.xs,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F3E4',
    padding: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.xl,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    fontFamily: fonts.body,
    color: colors.dark,
    marginLeft: spacing.sm,
    lineHeight: 20,
  },
  buttonsContainer: {
    alignItems: 'center',
  },
  completeButton: {
    width: '100%',
    marginBottom: spacing.md,
  },
  loader: {
    marginBottom: spacing.md,
  },
  skipText: {
    fontSize: 16,
    fontFamily: fonts.body,
    color: colors.gray,
    textDecorationLine: 'underline',
  },
});
