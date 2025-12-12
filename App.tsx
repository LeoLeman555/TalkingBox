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

import { MockBle } from './src/services/MockBle';
import { BleService, BleDeviceInfo } from './src/services/BleService';
import { PrimaryButton } from './src/components/PrimaryButton';
import { getColors } from './src/theme/colors';
import { useBlePermissions } from './src/hooks/useBlePermissions';
import { ProgressBar } from './src/components/ProgressBar';
import { DeviceInfo } from './src/components/DeviceInfo';
import { AUDIO_FILES, prepareAudioPath, AudioFile } from './src/AudioFiles';

Sound.setCategory('Playback');

const mock = new MockBle();
const realBle = new BleService();

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

  const handleSendMock = async () => {
    setProgress(0);
    setState('CONNECTING...');
    await mock.scanAndConnect();
    setProgress(100);
    setState('CONNECTED');
  };

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

            <View style={styles.section}>
              <Text
                style={[
                  styles.info,
                  { color: colors.text, textAlign: 'center', marginTop: 6 },
                ]}
              >
                {state}
              </Text>

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

            <PrimaryButton
              title="Connexion BLE - Mock"
              onPress={handleSendMock}
              color={colors.mock}
              textColor={colors.buttonText}
            />

            <PrimaryButton
              title="Connexion BLE"
              onPress={handleRealBle}
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

            {deviceInfo && <DeviceInfo info={deviceInfo} colors={colors} />}

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
