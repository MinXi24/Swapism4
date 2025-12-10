import {
    Image,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import Icon from '../../assets/icons/icons';
import { colors, fonts, spacing } from '../../lib/theme';

export default function TryOnScreen({ route, navigation }) {
  const { item } = route.params;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color={colors.dark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Virtual Try-On</Text>
        <TouchableOpacity>
          <Icon name="camera-outline" size={24} color={colors.dark} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView}>
        {/* Virtual Mirror Section */}
        <View style={styles.mirrorContainer}>
          <View style={styles.mirrorFrame}>
            <Image source={{ uri: item.url }} style={styles.mirrorImage} />
            <View style={styles.mirrorOverlay}>
              <Icon name="accessibility" size={80} color="rgba(154, 190, 170, 0.3)" />
              <Text style={styles.mirrorText}>Virtual Try-On Preview</Text>
            </View>
          </View>
        </View>

        {/* Item Info */}
        <View style={styles.itemInfo}>
          <Text style={styles.itemTitle}>{item.title || 'Item'}</Text>
          {item.description && (
            <Text style={styles.itemDescription}>{item.description}</Text>
          )}
        </View>

        {/* Instructions */}
        <View style={styles.instructionsContainer}>
          <Text style={styles.instructionsTitle}>How to use Virtual Try-On:</Text>
          <View style={styles.instructionItem}>
            <Icon name="camera" size={20} color={colors.accent} />
            <Text style={styles.instructionText}>
              Take a photo or use your camera to see how this item looks on you
            </Text>
          </View>
          <View style={styles.instructionItem}>
            <Icon name="resize" size={20} color={colors.accent} />
            <Text style={styles.instructionText}>
              Adjust the size and position to fit perfectly
            </Text>
          </View>
          <View style={styles.instructionItem}>
            <Icon name="save" size={20} color={colors.accent} />
            <Text style={styles.instructionText}>
              Save your favorite combinations to share with friends
            </Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity style={styles.primaryButton}>
            <Icon name="camera" size={20} color="#fff" />
            <Text style={styles.primaryButtonText}>Start Try-On</Text>
          </TouchableOpacity>

          {item.postType === 'forSwap' && (
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => {
                navigation.goBack();
                navigation.navigate('PostDetails', { post: item });
              }}
            >
              <Icon name="swap-horizontal" size={20} color={colors.accent} />
              <Text style={styles.secondaryButtonText}>Request Swap</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => navigation.goBack()}
          >
            <Icon name="heart-outline" size={20} color={colors.accent} />
            <Text style={styles.secondaryButtonText}>Add to Favorites</Text>
          </TouchableOpacity>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: fonts.header,
    color: colors.dark,
  },
  scrollView: {
    flex: 1,
  },
  mirrorContainer: {
    backgroundColor: '#fff',
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  mirrorFrame: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#f8f8f8',
    borderWidth: 3,
    borderColor: colors.accent,
    position: 'relative',
  },
  mirrorImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  mirrorOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  mirrorText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.accent,
    marginTop: spacing.sm,
  },
  itemInfo: {
    backgroundColor: '#fff',
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  itemTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.dark,
    marginBottom: spacing.sm,
  },
  itemDescription: {
    fontSize: 14,
    color: colors.gray,
    lineHeight: 20,
  },
  instructionsContainer: {
    backgroundColor: '#fff',
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.dark,
    marginBottom: spacing.md,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  instructionText: {
    flex: 1,
    fontSize: 14,
    color: colors.dark,
    lineHeight: 20,
  },
  actionsContainer: {
    backgroundColor: '#fff',
    padding: spacing.md,
    paddingBottom: spacing.lg,
    gap: spacing.sm,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.accent,
    paddingVertical: spacing.md,
    borderRadius: 8,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.secondary,
    paddingVertical: spacing.md,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.accent,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.accent,
  },
});
