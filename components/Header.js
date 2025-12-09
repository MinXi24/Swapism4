import { StyleSheet, Text, View } from 'react-native';
import { colors, fonts } from '../lib/theme';

export default function Header({ title }) {
  return (
    <View style={styles.header}>
      <Text style={styles.title}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: colors.secondary,
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 22,
    fontFamily: fonts.bold,
    color: colors.dark,
  },
});