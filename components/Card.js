import { StyleSheet, Text, View } from 'react-native';
import { colors, fonts } from '../lib/theme';

export default function Card({ title, children, style }) {
  return (
    <View style={[styles.card, style]}>
      {title && <Text style={styles.title}>{title}</Text>}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.light,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 18,
    marginBottom: 8,
    color: colors.dark,
  },
});
