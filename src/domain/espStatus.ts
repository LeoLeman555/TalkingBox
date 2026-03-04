/** High-level ESP runtime states exposed over BLE. */
export type EspState =
  | 'booting'
  | 'idle'
  | 'receiving'
  | 'processing'
  | 'verifying'
  | 'ready'
  | 'error';

/** ESP subsystems that can emit telemetry or errors. */
export type EspSubsystem =
  | 'system'
  | 'audio'
  | 'storage'
  | 'rtc'
  | 'calendar'
  | 'battery'
  | 'ble';

/** ESP error codes categorized by subsystem. */
export type EspErrorCode =
  // System
  | 'INVALID_STATE'
  | 'OUT_OF_MEMORY'
  | 'TIMEOUT'
  | 'UNKNOWN_ERROR'

  // BLE / protocol
  | 'START_ERROR'
  | 'SEQ_MISMATCH'
  | 'PROTOCOL_ERROR'

  // Storage / microSD
  | 'SD_NOT_FOUND'
  | 'SD_IO_ERROR'
  | 'SD_CORRUPTED'

  // Integrity
  | 'HASH_MISMATCH'
  | 'SIGNATURE_INVALID'

  // Audio
  | 'AUDIO_INIT_ERROR'
  | 'AUDIO_DECODE_ERROR'
  | 'AMPLIFIER_FAULT'

  // RTC / calendar
  | 'RTC_NOT_SET'
  | 'RTC_COMM_ERROR'
  | 'CALENDAR_PARSE_ERROR'

  // Battery / power
  | 'BATTERY_LOW'
  | 'BATTERY_CRITICAL'
  | 'CHARGING_FAULT';

/** ESP state transition message. */
export type EspStateMessage =
  | {
      type: 'state';
      state: Exclude<EspState, 'ready'>;
    }
  | {
      type: 'state';
      state: 'ready';
      sha256: string;
    };

/** Progress information for long-running operations. */
export interface EspProgressMessage {
  type: 'progress';
  subsystem: EspSubsystem;
  current: number;
  total: number;
}

/** Telemetry snapshot emitted periodically or on change. */
export interface EspTelemetryMessage {
  type: 'telemetry';
  battery?: {
    level: number;
    voltage: number;
    charging: boolean;
  };
  rtc?: {
    unixTime: number;
    synced: boolean;
  };
  audio?: {
    playing: boolean;
    volume: number;
  };
  storage?: {
    totalBytes: number;
    freeBytes: number;
  };
}

/** Error message emitted on failure. */
export interface EspErrorMessage {
  type: 'error';
  subsystem: EspSubsystem;
  code: EspErrorCode;
  message?: string;
  fatal: boolean;
}

/** Union of all ESP messages sent over BLE. */
export type EspStatusMessage =
  | EspStateMessage
  | EspProgressMessage
  | EspTelemetryMessage
  | EspErrorMessage;

const espStates: readonly EspState[] = [
  'booting',
  'idle',
  'receiving',
  'processing',
  'verifying',
  'ready',
  'error',
];

const espSubsystems: readonly EspSubsystem[] = [
  'system',
  'audio',
  'storage',
  'rtc',
  'calendar',
  'battery',
  'ble',
];

const espErrorCodes: readonly EspErrorCode[] = [
  'INVALID_STATE',
  'OUT_OF_MEMORY',
  'TIMEOUT',
  'UNKNOWN_ERROR',
  'START_ERROR',
  'SEQ_MISMATCH',
  'PROTOCOL_ERROR',
  'SD_NOT_FOUND',
  'SD_IO_ERROR',
  'SD_CORRUPTED',
  'HASH_MISMATCH',
  'SIGNATURE_INVALID',
  'AUDIO_INIT_ERROR',
  'AUDIO_DECODE_ERROR',
  'AMPLIFIER_FAULT',
  'RTC_NOT_SET',
  'RTC_COMM_ERROR',
  'CALENDAR_PARSE_ERROR',
  'BATTERY_LOW',
  'BATTERY_CRITICAL',
  'CHARGING_FAULT',
];

/** Runtime guard to validate incoming JSON from ESP. */
/** Runtime guard to validate incoming JSON from ESP. */
export function parseEspStatus(raw: unknown): EspStatusMessage | null {
  if (!raw || typeof raw !== 'object') return null;

  const msg = raw as Record<string, unknown>;

  if (typeof msg.type !== 'string') return null;

  if (
    msg.type === 'state' &&
    typeof msg.state === 'string' &&
    espStates.includes(msg.state as EspState)
  ) {
    if (msg.state === 'ready') {
      if (typeof msg.sha256 !== 'string') return null;

      return {
        type: 'state',
        state: 'ready',
        sha256: msg.sha256,
      };
    }

    return {
      type: 'state',
      state: msg.state as Exclude<EspState, 'ready'>,
    };
  }

  if (
    msg.type === 'progress' &&
    typeof msg.subsystem === 'string' &&
    espSubsystems.includes(msg.subsystem as EspSubsystem) &&
    typeof msg.current === 'number' &&
    typeof msg.total === 'number'
  ) {
    return {
      type: 'progress',
      subsystem: msg.subsystem as EspSubsystem,
      current: msg.current,
      total: msg.total,
    };
  }

  if (msg.type === 'telemetry') {
    const hasAnyField =
      typeof msg.battery === 'object' ||
      typeof msg.rtc === 'object' ||
      typeof msg.audio === 'object' ||
      typeof msg.storage === 'object';

    if (!hasAnyField) return null;

    return {
      type: 'telemetry',
      battery: msg.battery as EspTelemetryMessage['battery'],
      rtc: msg.rtc as EspTelemetryMessage['rtc'],
      audio: msg.audio as EspTelemetryMessage['audio'],
      storage: msg.storage as EspTelemetryMessage['storage'],
    };
  }

  if (
    msg.type === 'error' &&
    typeof msg.subsystem === 'string' &&
    espSubsystems.includes(msg.subsystem as EspSubsystem) &&
    typeof msg.code === 'string' &&
    espErrorCodes.includes(msg.code as EspErrorCode) &&
    typeof msg.fatal === 'boolean'
  ) {
    return {
      type: 'error',
      subsystem: msg.subsystem as EspSubsystem,
      code: msg.code as EspErrorCode,
      message: typeof msg.message === 'string' ? msg.message : undefined,
      fatal: msg.fatal,
    };
  }

  return null;
}