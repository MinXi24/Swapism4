import { StyleSheet, TextInput, View } from 'react-native';
import Icon from '../assets/icons/icons';
import { colors, fonts, spacing } from '../lib/theme';

export default function Input({ 
  placeholder, 
  value, 
  onChangeText, 
  leftIcon,
  rightIcon,
  style,
  ...props 
}) {
  return (
    <View style={[styles.container, style]}>
      {leftIcon && (
        <Icon 
          name={leftIcon} 
          size={20} 
          color={colors.accent} 
          style={styles.leftIcon}
        />
      )}
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        value={value}
        onChangeText={onChangeText}
        placeholderTextColor={colors.accent}
        {...props}
      />
      {rightIcon && (
        <Icon 
          name={rightIcon} 
          size={20} 
          color={colors.accent} 
          style={styles.rightIcon}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.secondary,
    borderRadius: 25,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    marginVertical: spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontFamily: fonts.header,
    color: colors.dark,
  },
  leftIcon: {
    marginRight: 12,
  },
  rightIcon: {
    marginLeft: 12,
  },
});