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
import { BleService, BleDeviceInfo } from './src/services/BleService';
import { PrimaryButton } from './src/components/PrimaryButton';
import { getColors } from './src/theme/colors';
import { useBlePermissions } from './src/hooks/useBlePermissions';
import { ProgressBar } from './src/components/ProgressBar';
import { DeviceInfo } from './src/components/DeviceInfo';

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
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
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
