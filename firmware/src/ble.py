# ble.py
import bluetooth
import ujson as json
import ubinascii
from micropython import const


class BleService:
    """BLE service handling file reception."""

    SERVICE_UUID = bluetooth.UUID("12345678-1234-5678-1234-56789abcdef0")
    CHAR_START_UUID = bluetooth.UUID("12345678-1234-5678-1234-56789abcdef1")
    CHAR_CHUNK_UUID = bluetooth.UUID("12345678-1234-5678-1234-56789abcdef2")
    CHAR_STATUS_UUID = bluetooth.UUID("12345678-1234-5678-1234-56789abcdef3")

    FLAG_WRITE = const(0x08)
    FLAG_WRITE_NR = const(0x04)
    FLAG_NOTIFY = const(0x10)
    FLAG_READ = const(0x02)

    _IRQ_CENTRAL_CONNECT = 1
    _IRQ_CENTRAL_DISCONNECT = 2
    _IRQ_GATTS_WRITE = 3

    BLE_NAME = "MEMO - TALKING BOX"
    MAX_FILE_SIZE = 8_000_000

    def __init__(self, storage):
        self.storage = storage
        self.ble = bluetooth.BLE()
        self.conn_handle = None

        self._handle_start = None
        self._handle_chunk = None
        self._handle_status = None

        self.metadata = None
        self.expected_seq = 0
        self.bytes_written = 0
        self.end_requested = False

        self._chunk_queue = []
        self._has_pending_chunk = False

        self._setup()
        self._emit_state("booting")
        self._emit_state("idle")

    # ---------- Setup ----------

    def _setup(self):
        self.ble.active(True)

        self.ble.config(mtu=247)

        self.ble.irq(self._irq)

        service = (
            self.SERVICE_UUID,
            (
                (self.CHAR_START_UUID, self.FLAG_WRITE),
                (self.CHAR_CHUNK_UUID, self.FLAG_WRITE | self.FLAG_WRITE_NR),
                (self.CHAR_STATUS_UUID, self.FLAG_NOTIFY | self.FLAG_READ),
            ),
        )

        ((self._handle_start, self._handle_chunk, self._handle_status),) = \
            self.ble.gatts_register_services((service,))

        # START frame can exceed default 20 bytes
        self.ble.gatts_set_buffer(self._handle_start, 64, True)

        # Chunk buffer for file data
        self.ble.gatts_set_buffer(self._handle_chunk, 512, True)

        self.ble.gap_advertise(100_000, self._adv_payload())
        print("[BLE] Advertising as", self.BLE_NAME)

    def _adv_payload(self):
        payload = bytearray(b"\x02\x01\x06")
        name = self.BLE_NAME.encode()
        payload += bytes([len(name) + 1, 0x09]) + name
        return payload

    # ---------- IRQ ----------

    def _irq(self, event, data):
        if event == self._IRQ_CENTRAL_CONNECT:
            self.conn_handle = data[0]
            print("[BLE] Central connected")

        elif event == self._IRQ_CENTRAL_DISCONNECT:
            self.conn_handle = None
            print("[BLE] Central disconnected")
            self.ble.gap_advertise(100_000, self._adv_payload())

        elif event == self._IRQ_GATTS_WRITE:
            conn, attr = data
            if attr == self._handle_start:
                self._on_start_write()
            elif attr == self._handle_chunk:
                self._on_chunk_write()

    # ---------- Handlers ----------

    def _on_start_write(self):
        raw = self.ble.gatts_read(self._handle_start)

        print("[BLE] START raw len:", len(raw), raw)

        # END frame
        if raw == b"\x02":
            self.end_requested = True
            return

        if len(raw) < 18 or raw[0] != 0x01:
            self._emit_error(
                subsystem="ble",
                code="START_ERROR",
                message="invalid_frame",
                fatal=True
            )
            self._emit_state("error")
            return

        total_chunks = (raw[1] << 8) | raw[2]

        total_size = (
            (raw[3] << 24)
            | (raw[4] << 16)
            | (raw[5] << 8)
            | raw[6]
        )

        chunk_size = (raw[7] << 8) | raw[8]

        filename_length = raw[9]

        expected_len = 10 + filename_length + 8

        if len(raw) != expected_len:
            self._emit_error(
                subsystem="ble",
                code="PROTOCOL_ERROR",
                message="bad_length",
                fatal=True
            )
            self._emit_state("error")
            return

        filename_bytes = raw[10:10 + filename_length]
        filename = filename_bytes.decode()

        sha_start = 10 + filename_length
        sha_short = ubinascii.hexlify(
            raw[sha_start:sha_start + 8]
        ).decode()

        if total_size <= 0 or total_size > self.MAX_FILE_SIZE:
            self._emit_error(
                subsystem="storage",
                code="INVALID_STATE",
                message="invalid_size",
                fatal=True
            )
            self._emit_state("error")
            return

        self.metadata = {
            "filename": filename,
            "total_chunks": total_chunks,
            "total_size": total_size,
            "chunk_size": chunk_size,
            "sha256_short": sha_short,
        }

        self.storage.start_temp_file(filename)

        self.expected_seq = 0
        self.bytes_written = 0
        self.end_requested = False

        print("[BLE] START OK:", filename)

        self._emit_state("receiving")

    def _on_chunk_write(self):
        raw = self.ble.gatts_read(self._handle_chunk)
        seq = int.from_bytes(raw[0:4], "big")
        payload = raw[4:]

        print("Chunk len:", len(raw))

        if seq != self.expected_seq:
            print("[BLE] seq error", seq, self.expected_seq)
            self._emit_error(
                subsystem="ble",
                code="SEQ_MISMATCH",
                fatal=True
            )
            self._emit_state("error")
            return

        # Queue chunk instead of writing in IRQ
        self._chunk_queue.append(payload)
        self._has_pending_chunk = True

        self.bytes_written += len(payload)
        self.expected_seq += 1

        self._emit_progress(
            subsystem="storage",
            current=self.expected_seq,
            total=self.metadata["total_chunks"],
        )

    def finalize_file(self):
        if not self.metadata:
            self._emit_error(
                subsystem="storage",
                code="INVALID_STATE",
                fatal=True
            )
            self._emit_state("error")
            return
        
        self._emit_state("verifying")

        calc = self.storage.finalize_temp_file(
            self.metadata["filename"]
        )

        if not calc.startswith(self.metadata["sha256_short"]):
            self._emit_error(
                subsystem="storage",
                code="HASH_MISMATCH",
                fatal=True
            )
            self._emit_state("error")
            return

        self._emit_state("ready", sha256=calc)

        self.metadata = None
        self.bytes_written = 0

    def has_pending_chunk(self):
        return self._has_pending_chunk

    def pop_chunk(self):
        if not self._chunk_queue:
            self._has_pending_chunk = False
            return None

        chunk = self._chunk_queue.pop(0)

        if not self._chunk_queue:
            self._has_pending_chunk = False

        return chunk


    # ---------- Utils ----------

    def _notify(self, obj):
        if self.conn_handle is not None:
            self.ble.gatts_notify(
                self.conn_handle,
                self._handle_status,
                json.dumps(obj),
            )

    def _emit_state(self, state, sha256=None):
        payload = {
            "type": "state",
            "state": state,
        }
        if state == "ready" and sha256:
            payload["sha256"] = sha256
        self._notify(payload)


    def _emit_error(self, subsystem, code, message=None, fatal=True):
        payload = {
            "type": "error",
            "subsystem": subsystem,
            "code": code,
            "fatal": fatal,
        }
        if message:
            payload["message"] = message
        self._notify(payload)


    def _emit_progress(self, subsystem, current, total):
        self._notify({
            "type": "progress",
            "subsystem": subsystem,
            "current": current,
            "total": total,
        })


    def _emit_telemetry(self, battery=None, rtc=None, audio=None, storage=None):
        payload = {"type": "telemetry"}
        if battery:
            payload["battery"] = battery
        if rtc:
            payload["rtc"] = rtc
        if audio:
            payload["audio"] = audio
        if storage:
            payload["storage"] = storage
        self._notify(payload)
