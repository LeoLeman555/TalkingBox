import React, { useState } from 'react';
import {
  Text,
  StyleSheet,
  useColorScheme,
  View,
  Alert,
} from 'react-native';

import { PrimaryButton } from '../components/PrimaryButton';
import { ProgressBar } from '../components/ProgressBar';
import { ReminderList } from '../components/reminder/ReminderList';

import { useBlePermissions } from '../hooks/useBlePermissions';
import { BleService } from '../services/ble/bleService';
import { getColors } from '../theme/colors';
import { generateMemoFile } from '../services/memo/memoRepository';
import RNFS from 'react-native-fs';
import { syncWithEsp } from '../services/ble/syncWithEsp';
import { Reminder } from '../domain/reminder';

const ble = new BleService();

type Props = {
  selectedTtsPath: string | null;
  onOpenFiles: () => void;
  onCreateReminder: () => void;
  onEditReminder: (reminder: Reminder) => void;
};

export function MainScreen({
  // selectedTtsPath,
  // onOpenFiles,
  onCreateReminder,
  onEditReminder,
}: Props) {
  useBlePermissions();

  const scheme = useColorScheme();
  const colors = getColors(scheme);

  const [state, setState] = useState('NOT CONNECTED');
  const [progress, setProgress] = useState(0);
  const [sending, setSending] = useState(false);

  const handleSyncWithEsp = async () => {
    if (sending) return;

    try {
      setSending(true);
      setProgress(0);
      setState('SYNC START');

      await syncWithEsp({
        ble,
        setProgress,
        setState,
      });

      Alert.alert('Success', 'Synchronization completed successfully');
    } catch (error) {
      console.error('[SYNC][ERROR]', error);
      setState('SYNC ERROR');
      Alert.alert('Error', String(error));
    } finally {
      setSending(false);
    }
  };

  const handleGenerateMemo = async () => {
    try {
      setState('GENERATING MEMO...');
      setProgress(0);

      const memoPath = await generateMemoFile();

      const content = await RNFS.readFile(memoPath, 'utf8');
      console.log('[MEMO GENERATED]', content);

      setProgress(100);
      setState('MEMO GENERATED');
      
      Alert.alert('Success', `Memo generated at:\n${memoPath}`);
    } catch (error) {
      console.error('[MEMO][ERROR]', error);
      setState('MEMO ERROR');
      Alert.alert('Error', String(error));
    }
  };

  const handleRealBle = async () => {
    setProgress(0);
    setState('CONNECTING...');

    try {
      const d = await ble.scanAndConnect();
      if (!d) {
        setState('DISCONNECTED');
        return;
      }

      setProgress(100);
      setState('CONNECTED 👍');
    } catch (error) {
      console.log('[BLE] Connection error:', error);
      setProgress(0);
      setState('DISCONNECTED');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      
      {/* ===== HEADER SYSTEM ===== */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>
          Talking Box - Prototype
        </Text>

        <Text style={[styles.info, { color: colors.text }]}>
          {state}
        </Text>
      </View>

      {/* ===== REMINDER LIST ===== */}
      <View style={styles.listContainer}>
        <ReminderList
          onSelect={onEditReminder}
        />
      </View>

      {/* ===== FOOTER ===== */}
      <View style={styles.footer}>
        <PrimaryButton
          title="Créer un reminder"
          onPress={onCreateReminder}
          color={colors.accent}
          textColor={colors.buttonText}
        />

        <PrimaryButton
          title="Synchroniser"
          onPress={handleSyncWithEsp}
          color={colors.accent}
          textColor={colors.buttonText}
        />
      </View>

      {/* ===== DEBUG PANEL ===== */}
      <View style={styles.debug}>
        <PrimaryButton
          title="Connexion BLE (manuel)"
          onPress={handleRealBle}
          color={colors.inputBorder}
          textColor={colors.text}
        />

        <PrimaryButton
        title="Générer Mémos (manuel)"
        onPress={handleGenerateMemo}
        color={colors.inputBorder}
        textColor={colors.text}
        />

        <ProgressBar
          progress={progress}
          height={14}
          backgroundColor={colors.inputBorder}
          fillColor={colors.accent}
        />

        <Text style={[styles.info, { color: colors.text }]}>
          {progress} %
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  header: {
    marginBottom: 10,
  },
  title: {
    fontSize: 30,
    fontWeight: '700',
    textAlign: 'center',
  },
  info: {
    marginTop: 6,
    fontSize: 16,
    textAlign: 'center',
  },
  listContainer: {
    flex: 1,
    marginVertical: 10,
  },
  footer: {
    marginTop: 10,
  },
  debug: {
    paddingTop: 12,
  },
});
