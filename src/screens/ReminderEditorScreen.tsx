import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  useColorScheme,
  FlatList,
  Switch, 
  TouchableOpacity,
  Platform
} from 'react-native';
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';

import { PrimaryButton } from '../components/PrimaryButton';
import { getColors } from '../theme/colors';
import { createReminderService } from '../services/reminderService';
import {
  validateReminder,
  ReminderValidationError,
} from '../domain/reminderValidator';
import { Reminder, ReminderStatus, RecurrenceRule, SyncStatus , Frequency} from '../domain/reminder';
import { formatDate, formatTime } from '../utils/helpers';

type Props = {
  onBack: () => void;
};

type FieldErrors = {
  title?: string;
  message?: string;
  startDate?: string;
  time?: string;
  recurrence?: string;
};

type RecurrenceUI = {
  enabled: boolean;
  frequency: Frequency;
  interval: string;
  byWeekday: number[];
  byMonthDay: number[];
};


function mapValidationErrors(errors: ReminderValidationError[]): FieldErrors {
  const result: FieldErrors = {};

  for (const error of errors) {
    if (
      error.field === 'title' ||
      error.field === 'message' ||
      error.field === 'startDate' ||
      error.field === 'time'
    ) {
      result[error.field] = error.message;
    } else if (error.field.startsWith('recurrence')) {
      result.recurrence = error.message;
    }
  }

  return result;
}

export function ReminderEditorScreen({ onBack }: Props) {
  const scheme = useColorScheme();
  const colors = getColors(scheme);

  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [startDate, setStartDate] = useState('2026-01-01');
  const [time, setTime] = useState('08:30');

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);


  const [errors, setErrors] = useState<FieldErrors>({});

  const [recurrenceUI, setRecurrenceUI] = useState<RecurrenceUI>({
  enabled: false,
  frequency: Frequency.DAILY,
  interval: '1',
  byWeekday: [],
  byMonthDay: [],
  });

  function onDateChange(
    _: DateTimePickerEvent,
    selected?: Date,
  ) {
    setShowDatePicker(false);

    if (selected) {
      setStartDate(formatDate(selected));
      if (errors.startDate) {
        setErrors(prev => ({ ...prev, startDate: undefined }));
      }
    }
  }

  function onTimeChange(
    _: DateTimePickerEvent,
    selected?: Date,
  ) {
    setShowTimePicker(false);

    if (selected) {
      setTime(formatTime(selected));
      if (errors.time) {
        setErrors(prev => ({ ...prev, time: undefined }));
      }
    }
  }


  function buildRecurrence(): RecurrenceRule | undefined {
    if (!recurrenceUI.enabled) {
      return undefined;
    }

    const interval = Number(recurrenceUI.interval);

    const base: RecurrenceRule = {
      frequency: recurrenceUI.frequency,
      interval,
      count: null,
      until: null,
      byWeekday: [],
      byMonthDay: [],
    };

    switch (recurrenceUI.frequency) {
      case Frequency.WEEKLY:
        return {
          ...base,
          byWeekday: recurrenceUI.byWeekday,
        };

      case Frequency.MONTHLY:
        return {
          ...base,
          byMonthDay: recurrenceUI.byMonthDay,
        };

      default:
        return base;
    }
  }


  const handleSave = async () => {
    const recurrence = buildRecurrence();

    const draftReminder: Reminder = {
      reminderId: 'DRAFT',
      category: 'ACTIVITY',
      title,
      message,

      startDate,
      time,

      recurrence,

      status: ReminderStatus.DRAFT,
      syncStatus: SyncStatus.NOT_SENT,

      revision: 0,
      createdAt: '',
      updatedAt: '',
    };


    const validationErrors = validateReminder(draftReminder);
    const mappedErrors = mapValidationErrors(validationErrors);

    setErrors(mappedErrors);

    if (validationErrors.length > 0) {
      return;
    }

    try {
      await createReminderService({
        category: 'ACTIVITY',
        title,
        message,
        startDate,
        time,
        recurrence
      });

      onBack();
    } catch (e) {
      console.error('[REMINDER][ERROR]', e);
    }
  };

  const renderForm = () => (
    <View>
      <Text style={[styles.label, { color: colors.text }]}>Titre</Text>
      <TextInput
        value={title}
        onChangeText={value => {
          setTitle(value);
          if (errors.title) {
            setErrors(prev => ({ ...prev, title: undefined }));
          }
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
        value={message}
        onChangeText={value => {
          setMessage(value);
          if (errors.message) {
            setErrors(prev => ({ ...prev, message: undefined }));
          }
        }}
        placeholder="Message vocal"
        multiline
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
        onPress={() => setShowDatePicker(true)}
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
          {startDate}
        </Text>
      </TouchableOpacity>

      {showDatePicker && (
        <DateTimePicker
          value={new Date(startDate)}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onDateChange}
        />
      )}

      {errors.startDate && (
        <Text style={styles.errorText}>{errors.startDate}</Text>
      )}

      <Text style={[styles.label, { color: colors.text }]}>
        Heure
      </Text>

      <TouchableOpacity
        onPress={() => setShowTimePicker(true)}
        style={[
          styles.input,
          {
            justifyContent: 'center',
            borderColor: errors.time
              ? styles.errorBorder.borderColor
              : colors.inputBorder,
          },
        ]}
      >
        <Text style={{ color: colors.text }}>
          {time}
        </Text>
      </TouchableOpacity>

      {showTimePicker && (
        <DateTimePicker
          value={new Date(`1970-01-01T${time}:00`)}
          mode="time"
          is24Hour
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onTimeChange}
        />
      )}

      {errors.time && (
        <Text style={styles.errorText}>{errors.time}</Text>
      )}

      <View style={styles.rowBetween}>
        <Text style={[styles.label, { color: colors.text }]}>
          Répétition
        </Text>
        <Switch
          value={recurrenceUI.enabled}
          onValueChange={enabled =>
            setRecurrenceUI(prev => ({ ...prev, enabled }))
          }
        />
      </View>
      


        {recurrenceUI.enabled && (
          <>
            <View
              style={[
                // styles.section,
                styles.recurrenceBox,
                {
                  borderColor: errors.recurrence
                    ? styles.errorBorder.borderColor
                    : colors.inputBorder,
                },
              ]}
            >
            {/* Frequency selector */}
            <Text style={[styles.label, { color: colors.text }]}>Fréquence</Text>
            <View style={styles.segmented}>
              {[Frequency.DAILY, Frequency.WEEKLY, Frequency.MONTHLY].map(freq => (
                <TouchableOpacity
                  key={freq}
                  onPress={() =>
                    setRecurrenceUI(prev => ({ ...prev, frequency: freq }))
                  }
                  style={[
                    styles.segment,
                    {
                      backgroundColor:
                        recurrenceUI.frequency === freq
                          ? colors.accent
                          : 'transparent',
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

            {/* Interval */}
            <Text style={[styles.label, { color: colors.text }]}>
              Intervalle
            </Text>
            <TextInput
              value={recurrenceUI.interval}
              keyboardType="numeric"
              onChangeText={value =>
                setRecurrenceUI(prev => ({ ...prev, interval: value }))
              }
              style={[
                styles.input,
                { borderColor: colors.inputBorder, color: colors.text },
              ]}
              placeholder="1"
            />

            {/* Weekly */}
            {recurrenceUI.frequency === Frequency.WEEKLY && (
              <>
                <Text style={[styles.label, { color: colors.text }]}>
                  Jours de la semaine
                </Text>
                <View style={styles.chips}>
                  {[1, 2, 3, 4, 5, 6, 7].map(d => {
                    const active = recurrenceUI.byWeekday.includes(d);
                    return (
                      <TouchableOpacity
                        key={d}
                        onPress={() =>
                          setRecurrenceUI(prev => ({
                            ...prev,
                            byWeekday: active
                              ? prev.byWeekday.filter(x => x !== d)
                              : [...prev.byWeekday, d],
                          }))
                        }
                        style={[
                          styles.chip,
                          {
                            backgroundColor: active
                              ? colors.accent
                              : 'transparent',
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
            )}

            {/* Monthly */}
            {recurrenceUI.frequency === Frequency.MONTHLY && (
                <>
                  <Text style={[styles.label, { color: colors.text }]}>
                    Jours du mois
                  </Text>

                  <View style={styles.monthGrid}>
                    {Array.from({ length: 31 }, (_, i) => i + 1).map(day => {
                      const active = recurrenceUI.byMonthDay.includes(day);

                      return (
                        <TouchableOpacity
                          key={day}
                          onPress={() =>
                            setRecurrenceUI(prev => ({
                              ...prev,
                              byMonthDay: active
                                ? prev.byMonthDay.filter(d => d !== day)
                                : [...prev.byMonthDay, day],
                            }))
                          }
                          style={[
                            styles.dayChip,
                            {
                              backgroundColor: active
                                ? colors.accent
                                : 'transparent',
                              borderColor: colors.inputBorder,
                            },
                          ]}
                        >
                          <Text style={{ color: colors.text }}>
                            {day}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </>
              )}

            </View>
          </>
        )}

      {errors.recurrence && (
        <Text style={styles.errorText}>{errors.recurrence}</Text>
      )}

    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>
        Nouveau reminder
      </Text>

      <FlatList
        data={[{ key: 'form' }]}
        keyExtractor={item => item.key}
        renderItem={renderForm}
        contentContainerStyle={{ paddingBottom: 30 }}
      />

      <PrimaryButton
        title="Enregistrer"
        onPress={handleSave}
        color={colors.accent}
        textColor={colors.buttonText}
      />

      <PrimaryButton
        title="Retour"
        onPress={onBack}
        color={colors.inputBorder}
        textColor={colors.text}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
  },
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
  section: {
  marginTop: 20,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  segmented: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  segment: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderWidth: 1,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 10,
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
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  dayChip: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
    marginBottom: 6,
  },
  recurrenceBox: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
  },

});
