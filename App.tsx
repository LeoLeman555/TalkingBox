import React, { useState } from 'react';
import {
  TextInput,
  Text,
  StyleSheet,
  ScrollView,
  useColorScheme,
  View,
} from 'react-native';

import { MockBle } from './src/services/MockBle';
import { BleService } from './src/services/BleService';
import { PrimaryButton } from './src/components/PrimaryButton';
import { getColors } from './src/theme/colors';
import { useBlePermissions } from './src/hooks/useBlePermissions';
import { ProgressBar } from './src/components/ProgressBar';

import { computeMeta, chunkFile } from './src/logic/FileChunker';

const mock = new MockBle();
const realBle = new BleService();

export default function App() {
  useBlePermissions();

  const scheme = useColorScheme();
  const colors = getColors(scheme);

  const [text, setText] = useState('');
  const [state, setState] = useState('disconnected');
  const [progress, setProgress] = useState(0);

  const handleGenerate = async () => {
    setState('generating');
    await new Promise(r => setTimeout(r, 500));
    setState('ready');
  };

  const handleSendMock = async () => {
    setState('connecting');
    await mock.scanAndConnect();
    setState('connected');

    setState('transferring');
    const total = 20;
    for (let i = 0; i < total; i++) {
      setProgress(Math.round((i / total) * 100));
      await mock.sendChunk(new Uint8Array([0]));
    }
    setProgress(100);

    await mock.endTransfer();
    setState('playing');
    await mock.play();
    setState('done');
  };

  const handleRealBleTest = async () => {
    setState('connecting');

    try {
      const ok = await realBle.scanAndConnect();
      setState(ok ? 'connected' : 'disconnected');
    } catch (error) {
      console.log('[BLE] Connection error:', error);
      setState('disconnected');
    }
  };

  const handleSendRealMp3 = async () => {
    try {
      setState('connecting...');
      await realBle.scanAndConnect();

      setState('connected — preparing file');
      const path = '/sdcard/Download/test.mp3';

      const meta = await computeMeta(path, realBle.chunkSize);

      await realBle.writeStart({
        filename: meta.filename,
        total_chunks: meta.totalChunks,
        total_size: meta.size,
        sha256: meta.sha256,
      });

      setState('sending chunks');
      let i = 0;

      for await (const c of chunkFile(path, realBle.chunkSize)) {
        await realBle.writeChunk(c.seq, c.payload);
        i++;
        setProgress(Math.round((i / meta.totalChunks) * 100));
      }

      setState('end');
      await realBle.writeStart({ cmd: 'END' });

      setState('done');
    } catch (e) {
      console.log('Real MP3 send error:', e);
      setState('error');
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      <Text style={[styles.title, { color: colors.text }]}>
        Talking Box — Prototype
      </Text>

      <View style={styles.section}>
        <Text style={[styles.label, { color: colors.text }]}>Message</Text>

        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Saisir un message"
          placeholderTextColor={scheme === 'dark' ? '#AAA' : '#666'}
          style={[
            styles.input,
            {
              borderColor: colors.inputBorder,
              color: colors.text,
            },
          ]}
        />
      </View>

      <PrimaryButton
        title="Générer MP3 (mock)"
        onPress={handleGenerate}
        color={colors.mock}
        textColor={colors.buttonText}
      />

      <PrimaryButton
        title="Envoyer via BLE (mock)"
        onPress={handleSendMock}
        color={colors.mock}
        textColor={colors.buttonText}
      />

      <PrimaryButton
        title="Connexion BLE"
        onPress={handleRealBleTest}
        color={colors.accent}
        textColor={colors.buttonText}
      />

      <PrimaryButton
        title="Envoyer MP3"
        onPress={handleSendRealMp3}
        color={colors.accent}
        textColor={colors.buttonText}
      />

      <View style={{ marginTop: 20 }}>
        <ProgressBar
          progress={progress}
          height={14}
          backgroundColor={colors.inputBorder}
          fillColor={colors.accent}
        />
        <Text
          style={[
            styles.info,
            { color: colors.text, textAlign: 'center', marginTop: 6 },
          ]}
        >
          {progress} %
        </Text>
      </View>

      <Text style={[styles.info, { color: colors.text }]}>État : {state}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20 },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 20,
  },
  section: { marginBottom: 20 },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    padding: 14,
    borderRadius: 8,
    fontSize: 16,
  },
  info: {
    marginTop: 14,
    fontSize: 18,
    fontWeight: '500',
  },
});
