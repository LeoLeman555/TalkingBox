import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

type Props = {
  colors: any;
  recurrenceUI: any;
  setRecurrenceUI: (fn: (prev: any) => any) => void;
};

export function RecurrenceEndSelector({
  colors,
  recurrenceUI,
  setRecurrenceUI,
}: Props) {
  const options = [
    { key: 'NEVER', label: 'Jamais' },
    { key: 'UNTIL', label: 'Jusqu’à une date' },
    { key: 'COUNT', label: 'Après X fois' },
  ];

  return (
    <>
      <Text style={[styles.label, { color: colors.text }]}>
        Arrêt de la répétition
      </Text>
      <View style={styles.row}>
        {options.map(opt => (
          <TouchableOpacity
            key={opt.key}
            onPress={() =>
              setRecurrenceUI(prev => ({
                ...prev,
                endMode: opt.key,
                until: undefined,
                count: undefined,
              }))
            }
            style={[
              styles.segment,
              {
                backgroundColor:
                  recurrenceUI.endMode === opt.key
                    ? colors.accent
                    : 'transparent',
                borderColor: colors.inputBorder,
              },
            ]}
          >
            <Text style={{ color: colors.text }}>{opt.label}</Text>
          </TouchableOpacity>
        ))}
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
    marginBottom: 10 
  },
  segment: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderWidth: 1,
  },
});
