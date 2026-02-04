# storage.py
from machine import SPI, Pin
import os
import sdcard
import uhashlib, ubinascii


class Storage:
    """Persistent storage handler with SD fallback to flash."""

    SD_ROOT = "/sd"
    FLASH_ROOT = "/flash"
    AUDIO_SUBDIR = "audio"

    def __init__(self):
        self.use_sd = False
        self.root = self.FLASH_ROOT

        self._ensure_flash_root()
        self._try_mount_sd()
        self._ensure_directories()

        print("[STORAGE] Initialized (backend:", "SD" if self.use_sd else "FLASH", ")")

    def _ensure_flash_root(self):
        """Ensure flash root exists."""
        try:
            os.stat(self.FLASH_ROOT)
        except OSError:
            os.mkdir(self.FLASH_ROOT)
            print("[STORAGE] Created flash root", self.FLASH_ROOT)

    def _try_mount_sd(self):
        """Attempt to mount SD card, fallback to flash on failure."""
        try:
            spi = SPI(
                2,
                baudrate=10_000_000,
                polarity=0,
                phase=0,
                sck=Pin(18),
                mosi=Pin(23),
                miso=Pin(19),
            )

            sd = sdcard.SDCard(spi, Pin(13))  # CS = GPIO13
            os.mount(sd, self.SD_ROOT)

            self.use_sd = True
            self.root = self.SD_ROOT
            print("[STORAGE] SD card mounted")

        except Exception as e:
            print("[STORAGE] SD unavailable, using flash:", e)

    def _ensure_directories(self):
        """Ensure audio directory exists on selected backend."""
        path = self._audio_dir()
        try:
            os.stat(path)
        except OSError:
            os.mkdir(path)
            print("[STORAGE] Created directory", path)

    def _audio_dir(self):
        return "{}/{}".format(self.root, self.AUDIO_SUBDIR)

    def save_file(self, filename, data):
        """Save binary file."""
        path = "{}/{}".format(self._audio_dir(), filename)
        with open(path, "wb") as f:
            f.write(data)
        print("[STORAGE] File saved:", path)

    def file_exists(self, filename):
        """Check if file exists."""
        try:
            os.stat("{}/{}".format(self._audio_dir(), filename))
            return True
        except OSError:
            return False

    def start_temp_file(self, filename):
        """Create temp file for chunked transfer."""
        self._tmp_path = "{}/.tmp_{}".format(self._audio_dir(), filename)
        with open(self._tmp_path, "wb"):
            pass

    def append_chunk(self, data):
        """Append binary chunk."""
        with open(self._tmp_path, "ab") as f:
            f.write(data)

    def finalize_file(self):
        """Finalize temp file, compute SHA256, and rename."""
        h = uhashlib.sha256()

        with open(self._tmp_path, "rb") as f:
            while True:
                chunk = f.read(1024)
                if not chunk:
                    break
                h.update(chunk)

        digest = ubinascii.hexlify(h.digest()).decode()
        final_path = self._tmp_path.replace(".tmp_", "")
        os.rename(self._tmp_path, final_path)

        print("[STORAGE] Finalized file:", final_path)
        return digest

    def get_backend(self):
        """Return active backend name."""
        return "sd" if self.use_sd else "flash"
