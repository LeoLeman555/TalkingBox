import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

type Props = {
  colors: any;
  value: number[];
  onChange: (days: number[]) => void;
};

export function MonthdaySelector({ colors, value, onChange }: Props) {
  return (
    <>
      <Text style={[styles.label, { color: colors.text }]}>
        Jours du mois
      </Text>
      <View style={styles.grid}>
        {Array.from({ length: 31 }, (_, i) => i + 1).map(day => {
          const active = value.includes(day);
          return (
            <TouchableOpacity
              key={day}
              onPress={() =>
                onChange(active ? value.filter(d => d !== day) : [...value, day])
              }
              style={[
                styles.day,
                {
                  backgroundColor: active ? colors.accent : 'transparent',
                  borderColor: colors.inputBorder,
                },
              ]}
            >
              <Text style={{ color: colors.text }}>{day}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  label: {
    fontWeight: '600', 
    marginBottom: 6 
  },
  grid: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    marginBottom: 10 
  },
  day: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
    marginBottom: 6,
  },
});
