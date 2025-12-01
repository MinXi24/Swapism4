// screens/HomeScreen.js
import { StyleSheet, Text, View } from 'react-native';
import theme from '../../lib/theme'; // Use centralized styles

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Home Feature</Text>
      {/* Paste Figma-generated code HERE */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: theme.spacing.md
  },
  heading: {
    fontSize: 24,
    fontFamily: theme.fonts.heading,
    color: theme.colors.text
  }
});