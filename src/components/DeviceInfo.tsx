import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BleDeviceInfo } from '../services/BleService';

interface Props {
  info: BleDeviceInfo;
  colors: any;
}

export function DeviceInfo({ info, colors }: Props) {
  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: colors.text }]}>
        Device Information
      </Text>

      <Text style={[styles.item, { color: colors.text }]}>
        Name: {info.name ?? 'UNKNOWN'}
      </Text>

      <Text style={[styles.item, { color: colors.text }]}>ID: {info.id}</Text>

      <Text style={[styles.item, { color: colors.text }]}>MTU: {info.mtu}</Text>

      <Text style={[styles.item, { color: colors.text }]}>
        RSSI: {info.rssi ?? 'N/A'}
      </Text>

      <Text style={[styles.item, { color: colors.text }]}>
        Firmware: {info.firmwareVersion ?? 'N/A'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 5,
    padding: 14,
    borderWidth: 1,
    borderRadius: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 12,
  },
  item: {
    fontSize: 16,
    marginBottom: 4,
  },
  section: {
    marginTop: 12,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 6,
  },
  serviceBlock: {
    marginBottom: 6,
    marginLeft: 8,
  },
  service: {
    fontSize: 16,
    fontWeight: '500',
  },
  char: {
    fontSize: 14,
    marginLeft: 14,
  },
  debug: {
    fontSize: 14,
  },
});
