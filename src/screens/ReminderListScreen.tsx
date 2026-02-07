import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, useColorScheme, TouchableOpacity } from 'react-native';

import { getColors } from '../theme/colors';
import { getAllReminders } from '../storage/reminderRepository';
import { Reminder } from '../domain/reminder';
import { PrimaryButton } from '../components/PrimaryButton';

type Props = {
  onCreate: () => void;
  onBack: () => void;
  onSelect: (reminder: Reminder) => void;
};

export function ReminderListScreen({ onCreate, onBack, onSelect }: Props) {
  const scheme = useColorScheme();
  const colors = getColors(scheme);

  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReminders();
  }, []);

  const loadReminders = async () => {
    try {
      const items = await getAllReminders();
      setReminders(items);
    } catch (e) {
      console.error('[REMINDER][LIST][ERROR]', e);
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item }: { item: Reminder }) => (
    <TouchableOpacity
      onPress={() => onSelect(item)}
      style={[styles.card, { borderColor: colors.inputBorder }]}
    >
      <Text style={[styles.title, { color: colors.text }]}>{item.title}</Text>

      <Text style={[styles.meta, { color: colors.text }]}>
        {item.startDate} — {item.time}
      </Text>

      <Text style={[styles.message, { color: colors.text }]} numberOfLines={2}>
        {item.message}
      </Text>

      <Text style={[styles.status, { color: colors.text }]}>
        {item.status} | {item.syncStatus}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.header, { color: colors.text }]}>Reminders</Text>

      {loading ? (
        <Text style={{ color: colors.text }}>Chargement...</Text>
      ) : reminders.length === 0 ? (
        <Text style={{ color: colors.text }}>Aucun reminder défini</Text>
      ) : (
        <FlatList
          data={reminders}
          keyExtractor={r => r.reminderId}
          renderItem={renderItem}
        />
      )}

      <PrimaryButton
        title="Nouveau reminder"
        onPress={onCreate}
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
  header: {
    fontSize: 26,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
  },
  card: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
  },
  meta: {
    fontSize: 14,
    marginTop: 4,
  },
  message: {
    fontSize: 15,
    marginTop: 6,
  },
  status: {
    fontSize: 12,
    marginTop: 8,
    opacity: 0.7,
  },
});
