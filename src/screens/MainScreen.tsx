import React, { useState } from 'react';
import {
  TextInput,
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
import { TtsService } from '../services/TtsService';
import { sendFileViaBle } from '../services/ble/sendFileViaBle';
import { getColors } from '../theme/colors';
import { generateTtsFilename } from '../utils/TtsFileSystem';

const ble = new BleService();

type Props = {
  selectedTtsPath: string | null;
  onSelectTts: (path: string | null) => void;
  onOpenFiles: () => void;
};

export function MainScreen({
  selectedTtsPath,
  onSelectTts,
  onOpenFiles,
}: Props) {
  useBlePermissions();

  const scheme = useColorScheme();
  const colors = getColors(scheme);

  const [text, setText] = useState('');
  const [state, setState] = useState('NOT CONNECTED');
  const [progress, setProgress] = useState(0);
  const [deviceInfo, setDeviceInfo] = useState<BleDeviceInfo | null>(null);

  const handleGenerateTTS = async () => {
    if (!text.trim()) {
      console.warn('[TTS][APP][ABORT] Empty text input');
      Alert.alert(
        'Invalid message',
        'Please enter a message before generating audio.'
      );
      return;
    }

    try {
      const filename = generateTtsFilename();
      console.log('[TTS][APP][START][filename=' + filename + ']');

      const tts = await TtsService.generate(text, filename);
      console.log('[TTS][APP][GENERATED][path=' + tts.path + ']');

      onSelectTts(tts.path);

      const uri = await TtsService.exportToMusic(tts.path, filename);
      console.log('[TTS][APP][EXPORTED][uri=' + uri + ']');

      Alert.alert(
        'TTS Generated',
        'Your audio file has been created successfully.'
      );
    } catch (e) {
      console.error('[TTS][APP][ERROR]', e);
    }
  };

  const playTts = async (): Promise<void> => {
    if (!selectedTtsPath) {
      console.warn('[TTS][APP][PLAY_ABORT] No TTS file selected');
      Alert.alert(
        'No audio selected',
        'Please generate or select a TTS file before playing.'
      );
      return;
    }

    try {
      console.log('[TTS][APP][PLAY][path=' + selectedTtsPath + ']');
      await TtsService.play(selectedTtsPath);
    } catch (e) {
      console.error('[TTS][APP][PLAY_ERROR]', e);
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
    if (!selectedTtsPath) {
      console.error('[BLE FILE] No file selected');
      return;
    }

    try {
      await sendFileViaBle({
        ble: ble,
        filePath: selectedTtsPath,
        setProgress,
        setState,
      });
    } catch (e) {
      console.error('[BLE FILE] ERROR sending mp3:', e);
      setState('ERROR');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>
        Talking Box — Prototype
      </Text>

      <Text style={[styles.label, { color: colors.text }]}>Message</Text>

      <TextInput
        value={text}
        onChangeText={setText}
        placeholder="Saisir un message"
        style={[
          styles.input,
          { borderColor: colors.inputBorder, color: colors.text },
        ]}
      />

      <PrimaryButton
        title="Générer TTS"
        onPress={handleGenerateTTS}
        color={colors.accent}
        textColor={colors.buttonText}
      />

      <PrimaryButton
        title="Lire TTS"
        onPress={playTts}
        color={colors.accent}
        textColor={colors.buttonText}
      />

      <PrimaryButton
        title="Fichiers TTS"
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
      <Text style={[styles.info, { color: colors.text }]}>{progress} %</Text>

      <PrimaryButton
        title="Send MP3 via BLE"
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
  input: {
    borderWidth: 1,
    padding: 14,
    borderRadius: 8,
    fontSize: 16,
    marginBottom: 12,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  info: {
    marginTop: 6,
    paddingBottom: 10,
    fontSize: 18,
    fontWeight: '500',
    textAlign: 'center',
  },
});
