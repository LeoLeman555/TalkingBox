import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';

export function PrimaryButton({ title, onPress, color, textColor }) {
  return (
    <TouchableOpacity
      style={[styles.btn, { backgroundColor: color }]}
      onPress={onPress}
    >
      <Text style={[styles.txt, { color: textColor }]}>{title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    padding: 14,
    borderRadius: 8,
    marginVertical: 10,
  },
  txt: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
});
