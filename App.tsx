import React, { useState, useEffect } from 'react';
import {
  TextInput,
  Text,
  StyleSheet,
  useColorScheme,
  View,
  Platform,
  Pressable,
  FlatList,
} from 'react-native';
import Sound from 'react-native-sound';

// import { MockBle } from './src/services/MockBle';
import { BleService, BleDeviceInfo } from './src/services/BleService';
import { PrimaryButton } from './src/components/PrimaryButton';
import { getColors } from './src/theme/colors';
import { useBlePermissions } from './src/hooks/useBlePermissions';
import { ProgressBar } from './src/components/ProgressBar';
import { DeviceInfo } from './src/components/DeviceInfo';
import { AUDIO_FILES, prepareAudioPath, AudioFile } from './src/AudioFiles';
import { computeMeta, chunkFile } from './src/logic/FileChunker';

Sound.setCategory('Playback');

// const mock = new MockBle();
const realBle = new BleService();

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(() => resolve(), ms));
}

export default function App() {
  useBlePermissions();

  const scheme = useColorScheme();
  const colors = getColors(scheme);

  const [text, setText] = useState('');
  const [state, setState] = useState('NOT CONNECTED');
  const [progress, setProgress] = useState(0);

  const [deviceInfo, setDeviceInfo] = useState<BleDeviceInfo | null>(null);

  const [selected, setSelected] = useState<AudioFile | null>(null);
  const [playing, setPlaying] = useState<boolean>(false);
  const [player, setPlayer] = useState<Sound | null>(null);

  useEffect(() => {
    return () => {
      player?.stop();
      player?.release();
    };
  }, [player]);

  const onSelectFile = (file: AudioFile) => {
    setSelected(file);
  };

  const playSelected = async () => {
    if (!selected) return;

    try {
      const path = await prepareAudioPath(selected.filename);

      // stop and release old player if exists
      if (player) {
        player.stop(() => player.release());
        setPlayer(null);
        setPlaying(false);
      }

      const snd = new Sound(
        path,
        Platform.OS === 'android' ? '' : Sound.MAIN_BUNDLE,
        err => {
          if (err) {
            console.log('Load error:', err);
            return;
          }
          snd.play(success => {
            if (!success) {
              console.log('Playback failed');
            }
            snd.release();
            setPlaying(false);
            setPlayer(null);
          });
          setPlaying(true);
        },
      );

      setPlayer(snd);
    } catch (e) {
      console.log('Error playing file:', e);
    }
  };

  const renderItem = ({ item }: { item: AudioFile }) => {
    const isActive = selected?.id === item.id;
    return (
      <Pressable
        onPress={() => onSelectFile(item)}
        style={[styles.item, isActive ? styles.itemActive : null]}
      >
        <Text
          style={[styles.itemText, isActive ? styles.itemTextActive : null]}
        >
          {item.label}
        </Text>
      </Pressable>
    );
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
    if (!selected) return console.log('[BLE FILE] No file selected');

    let sub: any = null;
    let mounted = true;
    let doneOrFailed = false;

    try {
      console.log('[BLE FILE] Preparing file...');
      setProgress(0);
      setState('PREP FILE');

      const path = await prepareAudioPath(selected.filename);
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
    <FlatList
      data={AUDIO_FILES}
      keyExtractor={i => i.id}
      renderItem={renderItem}
      // header contient tout ce qui était avant la liste
      ListHeaderComponent={
        <>
          <View style={{ padding: 20, backgroundColor: colors.background }}>
            <Text style={[styles.title, { color: colors.text }]}>
              Talking Box — Prototype
            </Text>

            {deviceInfo && <DeviceInfo info={deviceInfo} colors={colors} />}
            <View style={styles.section}>
              <Text style={[styles.label, { color: colors.text }]}>
                Message
              </Text>

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
              title="Connexion BLE"
              onPress={handleRealBle}
              color={colors.accent}
              textColor={colors.buttonText}
            />
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
            </View>

            <View style={{ marginTop: 12 }}>
              <Text style={[styles.title, { color: colors.text }]}>
                Select an audio file
              </Text>
              {/* la FlatList affichera les items juste après le header */}
            </View>
          </View>
        </>
      }
      // footer contient ce qui était après la liste
      ListFooterComponent={
        <>
          <View style={{ padding: 20, backgroundColor: colors.background }}>
            <PrimaryButton
              title={playing ? 'Stop' : 'Play MP3'}
              onPress={playSelected}
              color={colors.accent}
              textColor={colors.buttonText}
            />
            <PrimaryButton
              title="Send MP3 via BLE"
              onPress={handleSendBleFile}
              color={colors.accent}
              textColor={colors.buttonText}
            />
          </View>
        </>
      }
      // styles
      contentContainerStyle={styles.content}
      style={{ backgroundColor: colors.background }}
      // optionnel : limite la hauteur de la liste si tu veux
      // ListHeaderComponentStyle / ListFooterComponentStyle si besoin de marges
    />
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
  list: {
    maxHeight: 240,
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 6,
  },
  listContent: { paddingVertical: 6 },
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
  item: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
    backgroundColor: '#FFF',
  },
  itemActive: { backgroundColor: '#0A84FF' },
  itemText: { fontSize: 16, color: '#111' },
  itemTextActive: { color: '#FFF' },
  controls: { marginTop: 16 },
});
