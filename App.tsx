import React, { useState } from 'react';
import {
  TextInput,
  Text,
  StyleSheet,
  useColorScheme,
  View,
} from 'react-native';
// import { MockBle } from './src/services/MockBle';
import { BleService, BleDeviceInfo } from './src/services/BleService';
import { PrimaryButton } from './src/components/PrimaryButton';
import { getColors } from './src/theme/colors';
import { useBlePermissions } from './src/hooks/useBlePermissions';
import { ProgressBar } from './src/components/ProgressBar';
import { DeviceInfo } from './src/components/DeviceInfo';
import { computeMeta, chunkFile } from './src/logic/FileChunker';
import { TtsService } from './src/services/TtsService';

// const mock = new MockBle();
const realBle = new BleService();

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(() => resolve(), ms));
}

function generateTtsFilename(): string {
  const d = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');

  return (
    'tts_' +
    d.getFullYear() +
    pad(d.getMonth() + 1) +
    pad(d.getDate()) +
    '_' +
    pad(d.getHours()) +
    pad(d.getMinutes()) +
    pad(d.getSeconds()) +
    '.wav'
  );
}

export default function App() {
  useBlePermissions();

  const scheme = useColorScheme();
  const colors = getColors(scheme);

  const [text, setText] = useState('');
  const [state, setState] = useState('NOT CONNECTED');
  const [progress, setProgress] = useState(0);
  const [deviceInfo, setDeviceInfo] = useState<BleDeviceInfo | null>(null);
  const [selected, setSelected] = useState<{ filename: string } | null>(null);

  const handleGenerateTTS = async () => {
    if (!text.trim()) return;

    try {
      const filename = generateTtsFilename();
      console.log('[TTS][APP][START][filename=' + filename + ']');

      const tts = await TtsService.generate(text, filename);
      console.log('[TTS][APP][GENERATED][path=' + tts.path + ']');
      setSelected({ filename: tts.path });

      const uri = await TtsService.exportToMusic(tts.path, filename);
      console.log('[TTS][APP][EXPORTED][uri=' + uri + ']');
    } catch (e) {
      console.error('[TTS][APP][ERROR]', e);
    }
  };

  const playTts = async (): Promise<void> => {
    if (!selected) {
      console.error('[TTS][APP] No file selected');
      return;
    }
    try {
      console.log('[TTS][APP][PLAY][path=' + selected.filename + ']');
      await TtsService.play(selected.filename);
    } catch (e) {
      console.error('[TTS][APP][PLAY_ERROR]', e);
    }
  };

  // const handleSendMock = async () => {
  //   setProgress(0);
  //   setState('CONNECTING...');
  //   await mock.scanAndConnect();
  //   setProgress(100);
  //   setState('CONNECTED');
  // };

  const handleRealBle = async () => {
    setProgress(0);
    setState('CONNECTING...');
    setDeviceInfo(null);

    try {
      const d = await realBle.scanAndConnect();
      if (!d) {
        setState('DISCONNECTED');
        return;
      }
      setProgress(100);
      setState('CONNECTED 👍');

      try {
        const info = await realBle.readDeviceInfo();
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
    if (!selected) {
      console.error('[BLE FILE] No file selected');
      return;
    }
    let sub: any = null;
    let mounted = true;
    let doneOrFailed = false;

    try {
      console.log('[BLE FILE] Preparing file...');
      setProgress(0);
      setState('PREP FILE');

      const path = selected.filename;
      const meta = await computeMeta(path, realBle.chunkSize);
      console.log('[BLE FILE] File meta:', meta);

      if (!realBle.isConnected()) {
        console.log('[BLE FILE] Not connected, scanning...');
        setState('CONNECTING...');
        await realBle.scanAndConnect();
        console.log('[BLE FILE] Connected');
        setState('CONNECTED');
      }

      let startAck = false;
      let done = false;
      let failed = false;

      sub = await realBle.subscribeStatus(msg => {
        if (!mounted || doneOrFailed) return;
        console.log('[STATUS MSG]', msg);

        switch (msg.event) {
          case 'start_ack':
            console.log('[STATUS] START ACK received');
            startAck = true;
            break;

          case 'chunk_ack': {
            const p = Math.floor((msg.received_count / meta.totalChunks) * 100);
            console.log(`[STATUS] Chunk ack: seq=${msg.seq}, progress=${p}%`);
            setProgress(p);
            break;
          }

          case 'stored':
            console.log('[STATUS] File stored by ESP, SHA:', msg.sha256);
            done = true;
            doneOrFailed = true;
            setProgress(100);
            setState('DONE');
            try {
              sub?.remove();
              sub = null;
            } catch {}
            break;

          case 'timeout':
          case 'hash_mismatch':
          case 'start_error':
          case 'chunk_error':
          case 'assemble_error':
            console.error('[STATUS] ESP error:', msg);
            failed = true;
            doneOrFailed = true;
            setState('ERROR');
            try {
              sub?.remove();
              sub = null;
            } catch {}
            break;

          default:
            console.log('[STATUS] Unknown event:', msg);
        }
      });

      console.log('[BLE FILE] Sending START');
      setState('SEND START');
      await realBle.writeStartBinary(meta.size, meta.sha256, meta.totalChunks);

      // Wait START ACK
      const t0 = Date.now();
      setState('WAIT ACK');
      while (!startAck) {
        if (failed) throw new Error('ESP rejected START');
        if (Date.now() - t0 > 3000) throw new Error('START ACK timeout');
        await delay(30);
      }

      console.log('[BLE FILE] Sending chunks...');
      setState('SEND CHUNKS');
      let i = 0;
      for await (const { seq, payload } of chunkFile(path, realBle.chunkSize)) {
        if (failed) throw new Error('Transfer aborted by ESP');
        console.log(
          `[BLE FILE] Sending chunk seq=${seq}, len=${payload.length}`,
        );
        await realBle.writeChunk(seq, payload);
        if (++i % 8 === 0) await delay(10);
      }

      console.log('[BLE FILE] Sending END...');
      await delay(200);
      setState('SEND END');
      await realBle.sendEnd();

      // Wait final confirmation
      console.log('[BLE FILE] Waiting final confirmation from ESP...');
      setState('WAIT ESP32');
      const t1 = Date.now();
      while (!done) {
        if (failed) throw new Error('ESP failed storing file');
        if (Date.now() - t1 > 10000) throw new Error('ESP store timeout');
        await delay(50);
      }

      console.log('[BLE FILE] Transfer completed successfully');
    } catch (e) {
      console.error('[BLE FILE] ERROR sending mp3:', e);
      if (mounted && !doneOrFailed) setState('ERROR');
    } finally {
      mounted = false;
      try {
        sub?.remove();
        sub = null;
      } catch {}
    }
  };

  return (
    <View style={{ padding: 20, backgroundColor: colors.background }}>
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

      {/* <PrimaryButton
              title="Connexion BLE - Mock"
              onPress={handleSendMock}
              color={colors.mock}
              textColor={colors.buttonText}
            /> */}

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
        title="Connexion BLE"
        onPress={handleRealBle}
        color={colors.accent}
        textColor={colors.buttonText}
      />
      {deviceInfo && <DeviceInfo info={deviceInfo} colors={colors} />}
      <Text
        style={[
          styles.info,
          { color: colors.text, textAlign: 'center', marginTop: 6 },
        ]}
      >
        {state}
      </Text>
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
        <PrimaryButton
          title="Send WAV via BLE"
          onPress={handleSendBleFile}
          color={colors.accent}
          textColor={colors.buttonText}
        />
      </View>
    </View>
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
