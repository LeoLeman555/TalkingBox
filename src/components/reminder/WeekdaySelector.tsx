import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

type Props = {
  colors: any;
  value: number[];
  onChange: (days: number[]) => void;
};

export function WeekdaySelector({ colors, value, onChange }: Props) {
  return (
    <>
      <Text style={[styles.label, { color: colors.text }]}>
        Jours de la semaine
      </Text>
      <View style={styles.row}>
        {[1, 2, 3, 4, 5, 6, 7].map(d => {
          const active = value.includes(d);
          return (
            <TouchableOpacity
              key={d}
              onPress={() =>
                onChange(active ? value.filter(x => x !== d) : [...value, d])
              }
              style={[
                styles.chip,
                {
                  backgroundColor: active ? colors.accent : 'transparent',
                  borderColor: colors.inputBorder,
                },
              ]}
            >
              <Text style={{ color: colors.text }}>{d}</Text>
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
  row: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', marginBottom: 10 
  },
  chip: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    marginBottom: 8,
  },
});
