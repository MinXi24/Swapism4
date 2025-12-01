// components/Icon.js
import { Ionicons } from '@expo/vector-icons';

export default function Icon({ name, size = 30, color = '#696969', style }) {
  return <Ionicons name={name} size={size} color={color} style={[{ marginRight: 50 }, style]} />;
}
