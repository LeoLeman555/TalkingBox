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

        if raw == b"\x02":
            self.end_requested = True
            return

        if len(raw) != 17 or raw[0] != 0x01:
            self._notify({"event": "start_error", "msg": "invalid frame"})
            return

        total_chunks = (raw[1] << 8) | raw[2]
        total_size = (
            (raw[3] << 24)
            | (raw[4] << 16)
            | (raw[5] << 8)
            | raw[6]
        )

        chunk_size = (raw[7] << 8) | raw[8]

        if total_size <= 0 or total_size > self.MAX_FILE_SIZE:
            self._notify({"event": "start_error", "msg": "invalid size"})
            return

        self.metadata = {
            "filename": "received.wav",
            "total_chunks": total_chunks,
            "total_size": total_size,
            "chunk_size": chunk_size,
            "sha256_short": ubinascii.hexlify(raw[9:17]).decode(),
        }

        self.storage.start_temp_file(self.metadata["filename"])

        self.expected_seq = 0
        self.bytes_written = 0
        self.end_requested = False

        print("[BLE] START ok", total_chunks, "chunks, chunk_size =", chunk_size)

        self._notify({"event": "start_ack"})

    def _on_chunk_write(self):
        raw = self.ble.gatts_read(self._handle_chunk)
        seq = int.from_bytes(raw[0:4], "big")
        payload = raw[4:]

        if seq != self.expected_seq:
            print("[BLE] seq error", seq, self.expected_seq)
            self._notify({"event": "chunk_error", "msg": "seq mismatch"})
            return

        # Queue chunk instead of writing in IRQ
        self._chunk_queue.append(payload)
        self._has_pending_chunk = True

        self.bytes_written += len(payload)
        self.expected_seq += 1


        if seq % 2 == 0:
            self._notify({'event': 'ack', 'seq': seq})

    def finalize_file(self):
        calc = self.storage.finalize_file()

        if not calc.startswith(self.metadata["sha256_short"]):
            self._notify({"event": "hash_mismatch"})
            return

        self._notify({"event": "stored", "sha256": calc})
        self.metadata = None
        self.bytes_written = 0
        print("[BLE] File finalised")

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
