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
import { DeviceInfo } from '../components/DeviceInfo';
import { useBlePermissions } from '../hooks/useBlePermissions';
import { BleService, BleDeviceInfo } from '../services/BleService';
import { sendFileViaBle } from '../services/ble/sendFileViaBle';
import { getColors } from '../theme/colors';
import { generateMemoFile } from '../services/memo/memoRepository';
import RNFS from 'react-native-fs';

const ble = new BleService();

type Props = {
  selectedTtsPath: string | null;
  onSelectTts: (path: string | null) => void;
  onOpenFiles: () => void;
  onCreateReminder: () => void;
  onViewReminders: () => void;
};

export function MainScreen({
  selectedTtsPath,
  onOpenFiles,
  onCreateReminder,
  onViewReminders,
}: Props) {
  useBlePermissions();

  const scheme = useColorScheme();
  const colors = getColors(scheme);

  const [state, setState] = useState('NOT CONNECTED');
  const [progress, setProgress] = useState(0);
  const [deviceInfo, setDeviceInfo] = useState<BleDeviceInfo | null>(null);
  const [sending, setSending] = useState(false);

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
    setDeviceInfo(null);

    try {
      const d = await ble.scanAndConnect();
      if (!d) {
        setState('DISCONNECTED');
        return;
      }

      setProgress(100);
      setState('CONNECTED 👍');

      try {
        const info = await ble.readDeviceInfo();
        setDeviceInfo(info);
      } catch (infoError) {
        console.log('[BLE] readDeviceInfo error:', infoError);
        setProgress(50);
        setDeviceInfo(null);
      }
    } catch (error) {
      console.log('[BLE] Connection error:', error);
      setProgress(0);
      setState('DISCONNECTED');
      setDeviceInfo(null);
    }
  };

    const handleSendBleFile = async () => {
    if (sending) return;
    
    if (!selectedTtsPath) {
      Alert.alert('No file', 'No TTS file selected.');
      return;
    }

    try {
      setSending(true);
      await sendFileViaBle({
        ble: ble,
        filePath: selectedTtsPath,
        setProgress,
        setState,
      });
    } catch (e) {
      console.error('[BLE FILE][ERROR]', e);
      setState('ERROR');
    } finally {
    setSending(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>
        Talking Box — Prototype
      </Text>

      <PrimaryButton
        title="Créer un reminder"
        onPress={onCreateReminder}
        color={colors.accent}
        textColor={colors.buttonText}
      />

      <PrimaryButton
        title="Voir les reminders"
        onPress={onViewReminders}
        color={colors.accent}
        textColor={colors.buttonText}
      />

      <PrimaryButton
        title="Générer memo.json (test)"
        onPress={handleGenerateMemo}
        color={colors.accent}
        textColor={colors.buttonText}
      />

      <PrimaryButton
        title="Fichiers audio (TTS)"
        onPress={onOpenFiles}
        color={colors.accent}
        textColor={colors.buttonText}
      />

      <PrimaryButton
        title="Connexion BLE"
        onPress={handleRealBle}
        color={colors.accent}
        textColor={colors.buttonText}
      />

      {deviceInfo && <DeviceInfo info={deviceInfo} colors={colors} />}

      <Text style={[styles.info, { color: colors.text }]}>{state}</Text>

      <ProgressBar
        progress={progress}
        height={14}
        backgroundColor={colors.inputBorder}
        fillColor={colors.accent}
      />

      <Text style={[styles.info, { color: colors.text }]}>
        {progress} %
      </Text>

      <PrimaryButton
        title="Envoyer audio sélectionné via BLE"
        onPress={handleSendBleFile}
        color={colors.accent}
        textColor={colors.buttonText}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 20,
    textAlign: 'center',
  },
  info: {
    marginTop: 6,
    paddingBottom: 10,
    fontSize: 18,
    fontWeight: '500',
    textAlign: 'center',
  },
});
