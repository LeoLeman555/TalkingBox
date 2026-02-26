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
import { getColors, getStateColor, getEspColor, getBleColor } from '../utils/colors';
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

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* ===== HEADER ===== */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>
          Talking Box - Prototype
        </Text>

        {/* Global state badge */}
        <View
          style={[
            styles.stateBadge,
            { backgroundColor: getStateColor(globalState) },
          ]}
        >
          <Text style={styles.stateBadgeText}>
            {systemLabel[globalState]}
          </Text>
        </View>

        {/* Technical line */}
        <View style={styles.techContainer}>
          <View style={styles.techItem}>
            <View
              style={[
                styles.statusDot,
                { backgroundColor: getBleColor(snapshot.ble) },
              ]}
            />
            <Text style={[styles.techLabel, { color: colors.text }]}>
              BLUETOOTH
            </Text>
            <Text style={[styles.techValue, { color: colors.text }]}>
              {snapshot.ble.toUpperCase()}
            </Text>
          </View>
          
          <View style={styles.techItem}>
            <View
              style={[
                styles.statusDot,
                { backgroundColor: getEspColor(snapshot.espState) },
              ]}
            />
            <Text style={[styles.techLabel, { color: colors.text }]}>
              MEMO
            </Text>
            <Text style={[styles.techValue, { color: colors.text }]}>
              {(snapshot.espState ?? 'idle').toUpperCase()}
            </Text>
          </View>

          {/* Error indicator */}
          {(snapshot.lastEspError || snapshot.bleError) && (
            <View style={styles.errorBadge}>
              <Text style={styles.errorBadgeText}>
                ERROR
              </Text>
            </View>
          )}

        </View>

        {/* Activity indicator */}
        {globalState === 'busy' && (
          <View style={styles.headerProgress}>
            <ProgressBar
              progress={progress}
              height={6}
              backgroundColor={colors.inputBorder}
              fillColor={colors.accent}
            />
          </View>
        )}

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
  stateBadge: {
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 8,
  },
  stateBadgeText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  techLine: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 8,
  },
  techText: {
    fontSize: 13,
  },
  errorText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#E74C3C',
  },
  headerProgress: {
    marginTop: 8,
  },
  techContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    gap: 12,
},

techItem: {
  flexDirection: 'row',
  alignItems: 'center',
  paddingHorizontal: 12,
  paddingVertical: 6,
  borderRadius: 16,
  backgroundColor: 'rgba(0,0,0,0.05)',
},

statusDot: {
  width: 8,
  height: 8,
  borderRadius: 4,
  marginRight: 6,
},

techLabel: {
  fontSize: 12,
  fontWeight: '600',
  marginRight: 4,
},

techValue: {
  fontSize: 12,
  fontWeight: '500',
},

errorBadge: {
  paddingHorizontal: 10,
  paddingVertical: 5,
  borderRadius: 14,
  backgroundColor: '#E74C3C',
},

errorBadgeText: {
  color: '#FFFFFF',
  fontSize: 11,
  fontWeight: '700',
},
});