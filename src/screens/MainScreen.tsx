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
import { TtsService, TtsAudioResult } from '../services/TtsService';
import { sendFileViaBle } from '../services/ble/sendFileViaBle';
import { getColors } from '../theme/colors';
import { generateTtsFilename } from '../utils/TtsFileSystem';

const ble = new BleService();

type Props = {
  selectedTtsPath: string | null;
  onSelectTts: (path: string | null) => void;
  onOpenFiles: () => void;
};

type AudioExtension = '.wav' | '.mp3';

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

  const handleGenerateTTS = async (extension : AudioExtension = '.wav') => {
    if (!text.trim()) {
      Alert.alert('Message vide', 'Veuillez saisir un message vocal.');
      return;
    }

    try {
      const filename = generateTtsFilename(extension); // MP3 or WAV
      console.log('[TTS][APP][START][filename=' + filename + ']');

      const tts: TtsAudioResult = await TtsService.generate(text, filename);

      // if (tts.format !== 'wav') {
      //   Alert.alert(
      //     'Audio incompatible',
      //     'Generated audio is not WAV and cannot be sent to the device.',
      //   );
      //   return;
      // }

      console.log('[TTS][APP][GENERATED][path=' + tts.path + ']');
      onSelectTts(tts.path);

      const uri = await TtsService.exportToMusic(tts.path, filename);
      console.log('[TTS][APP][EXPORTED][uri=' + uri + ']');

      Alert.alert(
        "Message vocal généré",
        "Fichier audio généré avec succès, vous pouvez le lire dans l'application",
      );
    } catch (e) {
      console.error('[TTS][APP][ERROR]', e);
      Alert.alert('TTS Error', 'Failed to generate audio.');
    }
  };

  const playTts = async (): Promise<void> => {
    if (!selectedTtsPath) {
      Alert.alert('Aucun message', 'Veuillez générer un message.');
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
      Alert.alert('No file', 'No TTS file selected.');
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
      console.error('[BLE FILE][ERROR]', e);
      setState('ERROR');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>
        Talking Box App — Prototype
      </Text>

      <Text style={[styles.label, { color: colors.text }]}>Message vocal</Text>

      <TextInput
        value={text}
        onChangeText={setText}
        placeholder="Exemple : “Bonjour à tous !”"
        style={[
          styles.input,
          { borderColor: colors.inputBorder, color: colors.text },
        ]}
      />

      <PrimaryButton
        title="Générer le message vocal (WAV)"
        onPress={() => handleGenerateTTS('.wav')}
        color={colors.primary}
        textColor={colors.primaryText}
      />

      <PrimaryButton
        title="Générer le message vocal (MP3)"
        onPress={() => handleGenerateTTS('.mp3')}
        color={colors.disabled}
        textColor={colors.primaryText}
      />

      <PrimaryButton
        title="Lire le message vocal sélectionné"
        onPress={playTts}
        color={colors.primary}
        textColor={colors.primaryText}
      />

      
      <PrimaryButton
        title="Sélectionner un message vocal"
        onPress={onOpenFiles}
        color={colors.primary}
        textColor={colors.primaryText}
      />

      <Text style={[styles.label, { color: colors.text }]}>Communication Bluetooth</Text>

      {deviceInfo && <DeviceInfo info={deviceInfo} colors={colors} />}

      <Text style={[styles.info, { color: colors.text }]}>{state}</Text>


      <ProgressBar
        progress={progress}
        height={14}
        backgroundColor={colors.inputBorder}
        fillColor={colors.primary}
      />

      <Text style={[styles.info, { color: colors.text }]}>
        {progress} %
      </Text>

      <PrimaryButton
        title="Connecter la Talking Box"
        onPress={handleRealBle}
        color={colors.primary}
        textColor={colors.primaryText}
      />


      <PrimaryButton
        title="Envoyer le message vocal"
        onPress={handleSendBleFile}
        color={colors.primary}
        textColor={colors.primaryText}
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
    fontSize: 18,
    marginBottom: 12,
  },
  label: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  info: {
    marginTop: 6,
    paddingBottom: 10,
    fontSize: 20,
    fontWeight: '500',
    textAlign: 'center',
  },
});
