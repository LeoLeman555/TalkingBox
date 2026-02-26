import { GlobalSystemState } from '../domain/systemStatus';
import { EspState } from '../domain/espStatus';
import { BleConnectionState } from '../domain/systemStatus';

export function getColors(scheme: string | null) {
  return {
    background: scheme === 'dark' ? '#000' : '#FFF',
    text: scheme === 'dark' ? '#FFF' : '#000',
    inputBorder: scheme === 'dark' ? '#444' : '#DDD',
    buttonBg: '#135da8ff',
    buttonText: '#FFF',
    mock: '#434547ff',
    accent: '#009688',
    warning: '#ff6607ff',
    error: '#ff0000'
  };
}

export const getStateColor = (
  state: GlobalSystemState,
) => {
  switch (state) {
    case 'ready':
      return '#2ECC71';
    case 'busy':
      return '#F39C12';
    case 'booting':
      return '#3498DB';
    case 'degraded':
      return '#E67E22';
    case 'error':
      return '#E74C3C';
    case 'offline':
    default:
      return '#7F8C8D';
  }
};

export const getBleColor = (
  bleState: BleConnectionState,
): string => {
  switch (bleState) {
    case 'connected':
      return '#2ECC71';

    case 'connecting':
    case 'reconnecting':
      return '#F39C12';

    case 'disconnected':
    default:
      return '#E74C3C';
  }
};

export const getEspColor = (
  espState: EspState | null,
): string => {
  if (!espState) return '#7F8C8D';

  switch (espState) {
    case 'ready':
      return '#2ECC71';

    case 'receiving':
    case 'processing':
    case 'verifying':
      return '#F39C12';

    case 'error':
      return '#E74C3C';

    case 'booting':
    case 'idle':
    default:
      return '#7F8C8D';
  }
};