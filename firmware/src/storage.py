# storage.py
from machine import SPI, Pin
import os
import sdcard
import uhashlib, ubinascii


class Storage:
    """SD card storage handler."""

    MP3_DIR = "/sd/mp3"

    def __init__(self):
        self._mount_sd()
        self._ensure_directories()
        print("[STORAGE] Storage module initialized")

    def _mount_sd(self):
        """Mount the SD card."""
        try:
            spi = SPI(
                2,
                baudrate=10_000_000,
                polarity=0,
                phase=0,
                sck=Pin(18),
                mosi=Pin(23),
                miso=Pin(19)
            )

            sd = sdcard.SDCard(spi, Pin(13))  # CS = GPIO13
            os.mount(sd, "/sd")
            print("[STORAGE] SD card mounted at /sd")

        except OSError as e:
            print("[STORAGE] SD mount failed:", e)
            raise


    def _ensure_directories(self):
        """Ensure required directories exist."""
        try:
            os.stat(self.MP3_DIR)
        except OSError:
            os.mkdir(self.MP3_DIR)
            print("[STORAGE] Created directory", self.MP3_DIR)

    def save_file(self, filename, data):
        """Save binary file to SD card."""
        path = f"{self.MP3_DIR}/{filename}"
        with open(path, "wb") as f:
            f.write(data)
        print("[STORAGE] File saved:", path)

    def file_exists(self, filename):
        """Check if a file exists on SD."""
        try:
            os.stat(f"{self.MP3_DIR}/{filename}")
            return True
        except OSError:
            return False

    def start_temp_file(self, filename):
        self._tmp_path = f"{self.MP3_DIR}/.tmp_{filename}"
        with open(self._tmp_path, "wb"):
            pass

    def append_chunk(self, data):
        with open(self._tmp_path, "ab") as f:
            f.write(data)

    def finalize_file(self):
        h = uhashlib.sha256()
        with open(self._tmp_path, "rb") as f:
            for b in iter(lambda: f.read(1024), b""):
                h.update(b)
        digest = ubinascii.hexlify(h.digest()).decode()
        final = self._tmp_path.replace(".tmp_", "")
        os.rename(self._tmp_path, final)
        return digest
