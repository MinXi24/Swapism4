import { StyleSheet, Text, View } from 'react-native';
import { colors, fonts } from '../../lib/theme';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Home</Text>
      {/* Add home content or navigation buttons here */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.light, // or colors.background if defined
    padding: 16, // replace with spacing if you define it in theme.js
  },
  heading: {
    fontSize: 24,
    fontFamily: fonts.bold,
    color: colors.dark,
  },
});
