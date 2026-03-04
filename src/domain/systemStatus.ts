import {
  EspState,
  EspErrorMessage,
  EspTelemetryMessage,
} from './espStatus';

/** BLE transport layer connection state. */
export type BleConnectionState =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'reconnecting';

/** BLE error model aligned with ESP error philosophy. */
export interface BleError {
  code: 'DISCONNECTED' | 'TIMEOUT' | 'GATT_ERROR';
  message?: string;
  fatal: boolean;
}

/** High-level aggregated system state for UI consumption. */
export type GlobalSystemState =
  | 'offline'
  | 'booting'
  | 'busy'
  | 'ready'
  | 'degraded'
  | 'error';

/** Snapshot of the complete system state at a given time. */
export interface SystemSnapshot {
  ble: BleConnectionState;

  espState: EspState | null;
  lastEspError: EspErrorMessage | null;
  telemetry: EspTelemetryMessage | null;

  bleError: BleError | null;

  updatedAt: number;
}

/** Create a safe initial snapshot. */
export function createInitialSystemSnapshot(): SystemSnapshot {
  return {
    ble: 'disconnected',
    espState: null,
    lastEspError: null,
    telemetry: null,
    bleError: null,
    updatedAt: Date.now(),
  };
}

/** Compute the global system state for UI rendering. */
export function computeGlobalSystemState(
  snapshot: SystemSnapshot,
): GlobalSystemState {
  // Fatal ESP error has absolute priority
  if (snapshot.lastEspError?.fatal) {
    return 'error';
  }

  // Fatal BLE error
  if (snapshot.bleError?.fatal) {
    return 'error';
  }

  // BLE offline
  if (snapshot.ble !== 'connected') {
    return 'offline';
  }

  // ESP non-fatal error
  if (snapshot.espState === 'error') {
    return 'degraded';
  }

  // ESP boot / idle
  if (
    snapshot.espState === 'booting' ||
    snapshot.espState === 'idle'
  ) {
    return 'booting';
  }

  // ESP busy states
  if (
    snapshot.espState === 'receiving' ||
    snapshot.espState === 'processing' ||
    snapshot.espState === 'verifying'
  ) {
    return 'busy';
  }

  // Fully operational
  if (snapshot.espState === 'ready') {
    return 'ready';
  }

  // Defensive fallback
  return 'offline';
}