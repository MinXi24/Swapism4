import { useState } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from '../assets/icons/icons';
import { useGuest } from '../context/GuestContext';
import { colors, fonts, spacing } from '../lib/theme';

export function useGuestCheck() {
  const { isGuest } = useGuest();
  const [showModal, setShowModal] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState(null);

  const checkGuestAccess = (navigation, actionName = 'access this feature') => {
    if (isGuest) {
      setPendingNavigation(navigation);
      setShowModal(true);
      return false;
    }
    return true;
  };

  const handleLogin = () => {
    setShowModal(false);
    if (pendingNavigation) {
      pendingNavigation.navigate('Login');
    }
  };

  const handleSignUp = () => {
    setShowModal(false);
    if (pendingNavigation) {
      pendingNavigation.navigate('Signup');
    }
  };

  const handleCancel = () => {
    setShowModal(false);
    setPendingNavigation(null);
  };

  const GuestAccessModal = () => (
    <Modal
      visible={showModal}
      transparent={true}
      animationType="fade"
      onRequestClose={handleCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          {/* Close Button */}
          <TouchableOpacity style={styles.closeButton} onPress={handleCancel}>
            <Icon name="close" size={24} color={colors.dark} />
          </TouchableOpacity>

          {/* Icon */}
          <View style={styles.iconContainer}>
            <Icon name="lock-closed-outline" size={48} color={colors.accent} />
          </View>

          {/* Title */}
          <Text style={styles.title}>Login Required</Text>

          {/* Message */}
          <Text style={styles.message}>
            You must be logged in to access this feature.
          </Text>

          {/* Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
              <Text style={styles.loginButtonText}>Login</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.signupButton} onPress={handleSignUp}>
              <Text style={styles.signupButtonText}>Sign Up</Text>
            </TouchableOpacity>
          </View>

          {/* Cancel Link */}
          <TouchableOpacity onPress={handleCancel} style={styles.cancelLink}>
            <Text style={styles.cancelText}>Maybe Later</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  return { isGuest, checkGuestAccess, GuestAccessModal };
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    padding: spacing.sm,
  },
  iconContainer: {
    marginBottom: spacing.lg,
    marginTop: spacing.sm,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.dark,
    marginBottom: spacing.sm,
    fontFamily: fonts.header,
  },
  message: {
    fontSize: 14,
    color: colors.gray,
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 20,
  },
  buttonContainer: {
    width: '100%',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  loginButton: {
    backgroundColor: colors.accent,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 8,
    alignItems: 'center',
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: fonts.header,
  },
  signupButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 8,
    alignItems: 'center',
  },
  signupButtonText: {
    color: colors.dark,
    fontSize: 16,
    fontWeight: '600',
    fontFamily: fonts.header,
  },
  cancelLink: {
    paddingVertical: spacing.sm,
  },
  cancelText: {
    color: colors.gray,
    fontSize: 14,
    fontFamily: fonts.body,
  },
});
