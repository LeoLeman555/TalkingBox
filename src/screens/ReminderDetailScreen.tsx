import React from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  useColorScheme,
} from 'react-native';

import { Reminder } from '../domain/reminder';
import { PrimaryButton } from '../components/PrimaryButton';
import { getColors } from '../theme/colors';

type Props = {
  reminder: Reminder;
  onBack: () => void;
};

type FieldItem = {
  key: string;
  label: string;
  value: string | number | undefined | null;
};

export function ReminderDetailScreen({ reminder, onBack }: Props) {
  const scheme = useColorScheme();
  const colors = getColors(scheme);

  const fields: FieldItem[] = [
    { key: 'id', label: 'ID', value: reminder.reminderId },
    { key: 'title', label: 'Titre', value: reminder.title },
    { key: 'message', label: 'Message', value: reminder.message },
    { key: 'date', label: 'Date', value: reminder.startDate },
    { key: 'time', label: 'Heure', value: reminder.time },
    { key: 'category', label: 'Catégorie', value: reminder.category },
    { key: 'status', label: 'Status', value: reminder.status },
    { key: 'sync', label: 'SyncStatus', value: reminder.syncStatus },
    { key: 'revision', label: 'Revision', value: reminder.revision },
    { key: 'createdAt', label: 'CreatedAt', value: reminder.createdAt },
    { key: 'updatedAt', label: 'UpdatedAt', value: reminder.updatedAt },
  ];

  const renderItem = ({ item }: { item: FieldItem }) => {
    const value =
      item.value === undefined || item.value === null || item.value === ''
        ? '-'
        : String(item.value);

    return (
      <View style={[styles.field, { borderColor: colors.inputBorder }]}>
        <Text style={[styles.label, { color: colors.text }]}>{item.label}</Text>
        <Text style={[styles.value, { color: colors.text }]}>{value}</Text>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.header, { color: colors.text }]}>
        Détail du reminder
      </Text>

      <FlatList
        data={fields}
        keyExtractor={item => item.key}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
      />

      <View style={styles.footer}>
        {/* <PrimaryButton
          title="Modifier"
          onPress={() => {}}
          color={colors.accent}
          textColor={colors.buttonText}
        /> */}

        <PrimaryButton
          title="Retour"
          onPress={onBack}
          color={colors.inputBorder}
          textColor={colors.text}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },

  header: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },

  listContent: {
    paddingBottom: 10,
  },

  field: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
  },

  label: {
    fontSize: 13,
    fontWeight: '600',
    opacity: 0.7,
    marginBottom: 4,
  },

  value: {
    fontSize: 16,
    fontWeight: '500',
  },

  footer: {
    marginTop: 10,
  },
});
