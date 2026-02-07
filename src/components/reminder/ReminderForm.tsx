import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Switch,
  Platform,
  StyleSheet,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

import { RecurrenceSection } from '../reminder/RecurrenceSection';

export function ReminderForm({
  colors,
  form,
  recurrenceUI,
  errors,
  handlers,
  pickers,
}: any) {
  return (
    <View>
      <Text style={[styles.label, { color: colors.text }]}>Titre</Text>
      <TextInput
        value={form.title}
        onChangeText={v => {
          handlers.setTitle(v);
          handlers.clearError('title');
        }}
        placeholder="Titre"
        style={[
          styles.input,
          {
            borderColor: errors.title
              ? styles.errorBorder.borderColor
              : colors.inputBorder,
            color: colors.text,
          },
        ]}
      />
      {errors.title && <Text style={styles.errorText}>{errors.title}</Text>}

      <Text style={[styles.label, { color: colors.text }]}>Message</Text>
      <TextInput
        multiline
        value={form.message}
        onChangeText={v => {
          handlers.setMessage(v);
          handlers.clearError('message');
        }}
        placeholder="Message vocal"
        style={[
          styles.input,
          styles.multiline,
          {
            borderColor: errors.message
              ? styles.errorBorder.borderColor
              : colors.inputBorder,
            color: colors.text,
          },
        ]}
      />
      {errors.message && (
        <Text style={styles.errorText}>{errors.message}</Text>
      )}

      <Text style={[styles.label, { color: colors.text }]}>
        Date
      </Text>
      <TouchableOpacity 
        onPress={() => pickers.setShowDatePicker(true)} 
        style={[
          styles.input,
          {
            justifyContent: 'center',
            borderColor: errors.startDate
              ? styles.errorBorder.borderColor
              : colors.inputBorder,
          },
        ]}
      >
        <Text style={{ color: colors.text }}>
          {form.startDate}
        </Text>
      </TouchableOpacity>

      {pickers.showDatePicker && (
        <DateTimePicker
          value={new Date(form.startDate)}
          mode="date"
          display={'default'}
          onChange={pickers.onDateChange}
        />
      )}
      {errors.startDate && (
        <Text style={styles.errorText}>{errors.startDate}</Text>
      )}

      <Text style={[styles.label, { color: colors.text }]}>
              Heure
      </Text>
      <TouchableOpacity 
        onPress={() => pickers.setShowTimePicker(true)}
        style={[
          styles.input,
          {
            justifyContent: 'center',
            borderColor: errors.time
              ? styles.errorBorder.borderColor
              : colors.inputBorder,
          },
        ]}>
        <Text style={{ color: colors.text }}>{form.time}</Text>
      </TouchableOpacity>

      {pickers.showTimePicker && (
        <DateTimePicker
          value={new Date(`2026-01-01T${form.time}:00`)}
          mode="time"
          is24Hour
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={pickers.onTimeChange}
        />
      )}
      {errors.time && (
        <Text style={styles.errorText}>{errors.time}</Text>
      )}

      <View style={styles.row}>
        <Text style={[styles.label, { color: colors.text }]}>
          Répétition
        </Text>
        <Switch
          value={recurrenceUI.enabled}
          onValueChange={v =>
            handlers.setRecurrenceUI((p: any) => ({ ...p, enabled: v }))
          }
        />
      </View>

      {recurrenceUI.enabled && (
        <RecurrenceSection
          colors={colors}
          recurrenceUI={recurrenceUI}
          setRecurrenceUI={handlers.setRecurrenceUI}
          pickers={pickers}
        />
      )}

      {errors.recurrence && (
        <Text style={styles.errorText}>{errors.recurrence}</Text>
        )}
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
    marginBottom: 6,
  },
  multiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  errorText: {
    color: 'red',
    fontSize: 13,
    marginBottom: 10,
  },
  errorBorder: {
    borderColor: 'red',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
});
