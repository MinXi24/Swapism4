import { StyleSheet, TextInput } from 'react-native';
import { colors, fonts } from '../lib/theme';

export default function Input({ placeholder, value, onChangeText, style }) {
  return (
    <TextInput
      placeholder={placeholder}
      value={value}
      onChangeText={onChangeText}
      style={[styles.input, style]}
      placeholderTextColor={colors.gray}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: 8,
    padding: 12,
    fontFamily: fonts.regular,
    fontSize: 16,
    color: colors.dark,
  },
});
