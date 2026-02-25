import React, { useState, useEffect, useCallback } from 'react';
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
import { EspStatusMessage } from '../domain/espStatus';

import {
  SystemSnapshot,
  createInitialSystemSnapshot,
  computeGlobalSystemState,
} from '../domain/systemStatus';

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

  const [snapshot, setSnapshot] = useState<SystemSnapshot>(
    createInitialSystemSnapshot(),
  );
  const [progress, setProgress] = useState(0);

  const globalState = computeGlobalSystemState(snapshot);

  const systemLabel: Record<typeof globalState, string> = {
    offline: 'Offline',
    booting: 'Démarrage...',
    busy: 'En cours...',
    ready: 'Prêt',
    degraded: 'Problème détecté',
    error: 'Erreur',
  };

  /**
   * Apply ESP runtime messages to the system snapshot.
   */
  const applyEspMessage = useCallback((msg: EspStatusMessage) => {
    setSnapshot(prev => {
      switch (msg.type) {
        case 'state':
          return {
            ...prev,
            espState: msg.state,
            lastEspError:
              msg.state === 'error' ? prev.lastEspError : null,
            updatedAt: Date.now(),
          };

        case 'error':
          return {
            ...prev,
            lastEspError: msg,
            updatedAt: Date.now(),
          };

        case 'telemetry':
          return {
            ...prev,
            telemetry: msg,
            updatedAt: Date.now(),
          };

        case 'progress':
          return prev;

        default:
          return prev;
      }
    });
  }, []);

  /**
   * Automatic BLE connection.
   */
  const connectBle = useCallback(async () => {
    if (ble.isConnected) {
      setSnapshot(s => ({
        ...s,
        ble: 'connected',
        espState: 'ready',
        lastEspError: null,
        bleError: null,
        updatedAt: Date.now(),
      }));
      console.log("BLE test");
      return;
    }

    if (ble.getBleState !== 'PoweredOn') {
      Alert.alert('Info', 'Please activate Bluetooth');
      return
    }

    if (snapshot.ble === 'connecting') {
      return;
    }

    setSnapshot(s => ({
      ...s,
      ble: 'connecting',
      bleError: null,
      updatedAt: Date.now(),
    }));

    try {
      const device = await ble.scanAndConnect();

      if (!device) {
        setSnapshot(s => ({
          ...s,
          ble: 'disconnected',
          updatedAt: Date.now(),
        }));
        return;
      }

      setSnapshot(s => ({
        ...s,
        ble: 'connected',
        espState: 'ready',
        lastEspError: null,
        bleError: null,
        updatedAt: Date.now(),
      }));
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : String(err);

      setSnapshot(s => ({
        ...s,
        ble: 'disconnected',
        bleError: {
          code: 'DISCONNECTED',
          fatal: false,
          message,
        },
        updatedAt: Date.now(),
      }));
    }
  }, [snapshot.ble]);

  /**
   * Auto-connect BLE on mount and after disconnection
   * (unless an error is already present).
   */
  useEffect(() => {
    ble.onBleReady = () => connectBle();
    if (snapshot.ble === 'disconnected' && !snapshot.bleError) connectBle();
    return () => { ble.onBleReady = undefined; };
  }, [snapshot.ble, snapshot.bleError, connectBle]);

  const handleSyncWithEsp = async () => {
    try {
      setProgress(0);

      await syncWithEsp({
        ble,
        setProgress,
        onEspMessage: applyEspMessage,
      });

      Alert.alert('Success', 'Synchronization completed successfully');
    } catch (error) {
      Alert.alert('Error', String(error));
    }
  };

  const handleGenerateMemo = async () => {
    try {
      setProgress(0);

      const memoPath = await generateMemoFile();
      const content = await RNFS.readFile(memoPath, 'utf8');

      console.log('[MEMO GENERATED]', content);

      setProgress(100);
      Alert.alert('Success', `Memo generated at:\n${memoPath}`);
    } catch (error) {
      Alert.alert('Error', String(error));
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* ===== HEADER ===== */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>
          Talking Box - Prototype
        </Text>

        <Text style={[styles.info, { color: colors.text }]}>
          {systemLabel[globalState]}
        </Text>
      </View>

      {/* ===== REMINDER LIST ===== */}
      <View style={styles.listContainer}>
        <ReminderList onSelect={onEditReminder} />
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

      {/* ===== DEBUG ===== */}
      <View style={styles.debug}>
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