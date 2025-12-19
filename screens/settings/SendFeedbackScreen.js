import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    SafeAreaView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View
} from 'react-native';

// --- FIREBASE IMPORTS ---
import { getAuth } from 'firebase/auth';
import { addDoc, collection, getFirestore, serverTimestamp } from 'firebase/firestore';

// --- IMPORTS ---
import Icon from '../../assets/icons/icons';
import { colors, fonts, spacing } from '../../lib/theme';

// --- CONSTANTS ---
const CATEGORIES = ['General', 'Bug Report', 'Feature Request', 'Other'];

export default function SendFeedbackScreen({ navigation }) {
  const auth = getAuth();
  const db = getFirestore();
  const currentUser = auth.currentUser;

  // --- STATE ---
  const [category, setCategory] = useState('General');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  // --- ACTIONS ---
  const handleSubmit = async () => {
    if (!message.trim()) {
      Alert.alert('Missing Information', 'Please enter your feedback message.');
      return;
    }

    setLoading(true);

    try {
      await addDoc(collection(db, 'user_feedback'), {
        userId: currentUser?.uid || 'anonymous',
        username: currentUser?.displayName || 'User',
        userEmail: currentUser?.email || 'No Email',
        category: category,
        message: message.trim(),
        status: 'pending',
        createdAt: serverTimestamp(),
      });

      Alert.alert(
        'Feedback Sent',
        'Thank you! We appreciate your input.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      console.error('Error sending feedback:', error);
      Alert.alert('Error', 'Could not send feedback. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#fff" barStyle="dark-content" />

      {/* --- HEADER --- */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color={colors.dark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Give Feedback</Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"} 
        style={styles.keyboardView}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.content}>
            
            {/* Category Selection */}
            <Text style={styles.sectionLabel}>What is this about?</Text>
            <View style={styles.categoryContainer}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity 
                  key={cat} 
                  style={[
                    styles.categoryChip, 
                    category === cat && styles.categoryChipActive
                  ]}
                  onPress={() => setCategory(cat)}
                >
                  <Text style={[
                    styles.categoryText, 
                    category === cat && styles.categoryTextActive
                  ]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Message Input */}
            <Text style={styles.sectionLabel}>Your Message</Text>
            <TextInput 
              style={styles.textInput}
              placeholder="Tell us what you think, report a bug, or suggest a feature..."
              placeholderTextColor={colors.gray}
              multiline
              textAlignVertical="top"
              value={message}
              onChangeText={setMessage}
              maxLength={1000}
            />
            <Text style={styles.charCount}>{message.length}/1000</Text>

            {/* Submit Button */}
            <TouchableOpacity 
              style={styles.submitButton} 
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>Submit Feedback</Text>
              )}
            </TouchableOpacity>

          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#dbdbdb',
    backgroundColor: '#fff',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: fonts.semiBold || fonts.header,
    fontWeight: '600',
    color: colors.dark,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: spacing.md,
  },
  sectionLabel: {
    fontSize: 14,
    fontFamily: fonts.semiBold,
    fontWeight: '600',
    color: colors.dark,
    marginBottom: 12,
    marginTop: 8,
  },
  categoryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 24,
  },
  categoryChip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  categoryChipActive: {
    backgroundColor: colors.secondary, // Using your cream theme color
    borderColor: colors.accent,
  },
  categoryText: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.gray,
  },
  categoryTextActive: {
    color: colors.dark,
    fontWeight: '600',
  },
  textInput: {
    flex: 1,
    backgroundColor: '#FAFAFA',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    fontFamily: fonts.regular,
    color: colors.dark,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    minHeight: 200,
  },
  charCount: {
    alignSelf: 'flex-end',
    marginTop: 8,
    fontSize: 12,
    color: colors.gray,
    marginBottom: 20,
    fontFamily: fonts.regular,
  },
  submitButton: {
    backgroundColor: colors.accent, 
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 2,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: fonts.semiBold,
    fontWeight: 'bold',
  },
});