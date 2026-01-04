import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  useColorScheme,
} from 'react-native';

import { PrimaryButton } from '../components/PrimaryButton';
import { getColors } from '../theme/colors';
import { createReminderService } from '../services/reminderService';
import {
  validateReminder,
  ReminderValidationError,
} from '../domain/reminderValidator';
import { Reminder, ReminderStatus, SyncStatus } from '../domain/reminder';

type Props = {
  onBack: () => void;
};

type FieldErrors = {
  title?: string;
  message?: string;
  startDate?: string;
  time?: string;
};

function mapValidationErrors(errors: ReminderValidationError[]): FieldErrors {
  const result: FieldErrors = {};

  for (const error of errors) {
    switch (error.field) {
      case 'title':
        result.title = error.message;
        break;
      case 'message':
        result.message = error.message;
        break;
      case 'startDate':
        result.startDate = error.message;
        break;
      case 'time':
        result.time = error.message;
        break;
      default:
        break;
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

  const [errors, setErrors] = useState<FieldErrors>({});

  const handleSave = async () => {
    const draftReminder: Reminder = {
      reminderId: 'DRAFT',
      category: 'ACTIVITY',
      title,
      message,
      note: '',

      startDate,
      time,

      recurrence: undefined,

      audioHash: '',
      audioId: '',

      status: ReminderStatus.DRAFT,
      syncStatus: SyncStatus.NOT_SENT,

      createdAt: '',
      updatedAt: '',
      revision: 0,
    };

    const validationErrors = validateReminder(draftReminder);
    const mappedErrors = mapValidationErrors(validationErrors);

    setErrors(mappedErrors);

    if (validationErrors.length > 0) {
      return;
    }

    try {
      const result = await createReminderService({
        category: 'ACTIVITY',
        title,
        message,
        startDate,
        time,
      });

      console.log('[REMINDER][CREATED]', result);
      onBack();
    } catch (e) {
      console.error('[REMINDER][ERROR]', e);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>
        Nouveau reminder
      </Text>

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
      {errors.message && <Text style={styles.errorText}>{errors.message}</Text>}

      <Text style={[styles.label, { color: colors.text }]}>
        Date (YYYY-MM-DD)
      </Text>
      <TextInput
        value={startDate}
        onChangeText={value => {
          setStartDate(value);
          if (errors.startDate) {
            setErrors(prev => ({ ...prev, startDate: undefined }));
          }
        }}
        placeholder="YYYY-MM-DD"
        style={[
          styles.input,
          {
            borderColor: errors.startDate
              ? styles.errorBorder.borderColor
              : colors.inputBorder,
            color: colors.text,
          },
        ]}
      />
      {errors.startDate && (
        <Text style={styles.errorText}>{errors.startDate}</Text>
      )}

      <Text style={[styles.label, { color: colors.text }]}>Heure (HH:MM)</Text>
      <TextInput
        value={time}
        onChangeText={value => {
          setTime(value);
          if (errors.time) {
            setErrors(prev => ({ ...prev, time: undefined }));
          }
        }}
        placeholder="HH:MM"
        style={[
          styles.input,
          {
            borderColor: errors.time
              ? styles.errorBorder.borderColor
              : colors.inputBorder,
            color: colors.text,
          },
        ]}
      />
      {errors.time && <Text style={styles.errorText}>{errors.time}</Text>}

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
    marginBottom: 20,
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
});
