import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../lib/theme';

export default function Icon({ name, size = 24, color = colors.dark, style, ...props }) {
  return (
    <Ionicons 
      name={name} 
      size={size} 
      color={color} 
      style={style}
      {...props}
    />
  );
}