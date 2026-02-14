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
    padding: 15,
    borderRadius: 8,
    marginVertical: 5,
  },
  txt: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
});
