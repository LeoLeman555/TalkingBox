import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Frequency } from '../../domain/reminder';

type Props = {
  colors: any;
  value: Frequency;
  onChange: (f: Frequency) => void;
};

export function FrequencySelector({ colors, value, onChange }: Props) {
  return (
    <View style={styles.row}>
      {[Frequency.DAILY, Frequency.WEEKLY, Frequency.MONTHLY].map(freq => (
        <TouchableOpacity
          key={freq}
          onPress={() => onChange(freq)}
          style={[
            styles.segment,
            {
              backgroundColor: value === freq ? colors.accent : 'transparent',
              borderColor: colors.inputBorder,
            },
          ]}
        >
          <Text style={{ color: colors.text }}>
            {freq}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', marginBottom: 10 },
  segment: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderWidth: 1,
  },
});
