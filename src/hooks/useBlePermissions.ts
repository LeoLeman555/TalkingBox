import { useEffect } from 'react';
import { PermissionsAndroid, Platform } from 'react-native';

export function useBlePermissions() {
  useEffect(() => {
    if (Platform.OS === 'android') {
      PermissionsAndroid.requestMultiple([
        'android.permission.BLUETOOTH_SCAN',
        'android.permission.BLUETOOTH_CONNECT',
        'android.permission.ACCESS_FINE_LOCATION',
      ]);
    }
  }, []);
}
