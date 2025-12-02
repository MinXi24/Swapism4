import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { colors, fonts, spacing } from '../lib/theme';

export default function Button({ 
  title, 
  onPress, 
  variant = 'primary', 
  size = 'medium',
  style,
  textStyle,
  ...props 
}) {
  return (
    <TouchableOpacity
      style={[
        styles.button,
        styles[variant],
        styles[size],
        style
      ]}
      onPress={onPress}
      {...props}
    >
      <Text style={[
        styles.text,
        styles[`${variant}Text`],
        textStyle
      ]}>
        {title}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: {
    backgroundColor: colors.accent,
  },
  secondary: {
    backgroundColor: colors.primary,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  medium: {
    paddingVertical: 12,
    paddingHorizontal: spacing.lg,
  },
  small: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  text: {
    fontFamily: fonts.header,
    fontSize: 16,
    fontWeight: '500',
  },
  primaryText: {
    color: colors.dark,
  },
  secondaryText: {
    color: colors.dark,
  },
});