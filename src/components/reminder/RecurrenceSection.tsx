import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

import { Frequency } from '../../domain/reminder';
import { FrequencySelector } from '../reminder/FrequencySelector';
import { WeekdaySelector } from '../reminder/WeekdaySelector';
import { MonthdaySelector } from '../reminder/MonthdaySelector';
import { RecurrenceEndSelector } from '../reminder/RecurrenceEndSelector';
import { formatDate } from '../../utils/dateFormat';

type Props = {
  colors: any;
  recurrenceUI: any;
  setRecurrenceUI: (fn: (prev: any) => any) => void;
  pickers: any;
};

export function RecurrenceSection({
  colors,
  recurrenceUI,
  setRecurrenceUI,
  pickers,
}: Props) {
  return (
    <View
      style={[
        styles.box,
        { borderColor: colors.inputBorder },
      ]}
    >
      <Text style={[styles.label, { color: colors.text }]}>Fréquence</Text>
      <FrequencySelector
        colors={colors}
        value={recurrenceUI.frequency}
        onChange={frequency =>
          setRecurrenceUI(prev => ({ ...prev, frequency }))
        }
      />

      <Text style={[styles.label, { color: colors.text }]}>
        Intervalle
      </Text>
      <TextInput
        keyboardType="numeric"
        value={recurrenceUI.interval}
        onChangeText={v =>
          setRecurrenceUI(prev => ({ ...prev, interval: v }))
        }
        style={[styles.input, { borderColor: colors.inputBorder, color: colors.text }]}
        placeholder="1"
      />

      {recurrenceUI.frequency === Frequency.WEEKLY && (
        <WeekdaySelector
          colors={colors}
          value={recurrenceUI.byWeekday}
          onChange={byWeekday =>
            setRecurrenceUI(prev => ({ ...prev, byWeekday }))
          }
        />
      )}

      {recurrenceUI.frequency === Frequency.MONTHLY && (
        <MonthdaySelector
          colors={colors}
          value={recurrenceUI.byMonthDay}
          onChange={byMonthDay =>
            setRecurrenceUI(prev => ({ ...prev, byMonthDay }))
          }
        />
      )}

      <RecurrenceEndSelector
        colors={colors}
        recurrenceUI={recurrenceUI}
        setRecurrenceUI={setRecurrenceUI}
      />

      {recurrenceUI.endMode === 'UNTIL' && (
        <>
          <Text style={[styles.label, { color: colors.text }]}>Date de fin</Text>
          <TouchableOpacity
            onPress={() => pickers.setShowUntilPicker(true)}
            style={[styles.input, { borderColor: colors.inputBorder }]}
          >
            <Text style={{ color: colors.text }}>
              {recurrenceUI.until ?? 'Choisir une date'}
            </Text>
          </TouchableOpacity>

          {pickers.showUntilPicker && (
            <DateTimePicker
              value={recurrenceUI.until ? new Date(recurrenceUI.until) : new Date()}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(_, d) => {
                pickers.setShowUntilPicker(false);
                if (d) {
                  setRecurrenceUI(prev => ({
                    ...prev,
                    until: formatDate(d),
                  }));
                }
              }}
            />
          )}
        </>
      )}

      {recurrenceUI.endMode === 'COUNT' && (
        <>
          <Text style={[styles.label, { color: colors.text }]}>
            Nombre d’occurrences
          </Text>
          <TextInput
            keyboardType="numeric"
            value={recurrenceUI.count ?? ''}
            onChangeText={v =>
              setRecurrenceUI(prev => ({ ...prev, count: v }))
            }
            style={[styles.input, { borderColor: colors.inputBorder, color: colors.text }]}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginTop: 10,
  },
  label: {
    fontWeight: '600',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
  },
});
