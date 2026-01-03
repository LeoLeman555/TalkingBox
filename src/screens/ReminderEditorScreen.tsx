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

type Props = {
  onBack: () => void;
};

export function ReminderEditorScreen({ onBack }: Props) {
  const scheme = useColorScheme();
  const colors = getColors(scheme);

  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [date, setDate] = useState('2026-01-01');
  const [time, setTime] = useState('08:30');

  const handleSave = async () => {
    try {
      const result = await createReminderService({
        category: 'ACTIVITY',
        title,
        message,
        startDate: date,
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
        onChangeText={setTitle}
        placeholder="Titre"
        style={[
          styles.input,
          { borderColor: colors.inputBorder, color: colors.text },
        ]}
      />

      <Text style={[styles.label, { color: colors.text }]}>Message</Text>
      <TextInput
        value={message}
        onChangeText={setMessage}
        placeholder="Message vocal"
        multiline
        style={[
          styles.input,
          styles.multiline,
          { borderColor: colors.inputBorder, color: colors.text },
        ]}
      />

      <Text style={[styles.label, { color: colors.text }]}>Date</Text>
      <TextInput
        value={date}
        onChangeText={setDate}
        placeholder="YYYY-MM-DD"
        style={[
          styles.input,
          { borderColor: colors.inputBorder, color: colors.text },
        ]}
      />

      <Text style={[styles.label, { color: colors.text }]}>Heure</Text>
      <TextInput
        value={time}
        onChangeText={setTime}
        placeholder="HH:MM"
        style={[
          styles.input,
          { borderColor: colors.inputBorder, color: colors.text },
        ]}
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
    marginBottom: 14,
  },
  multiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
});
