# storage.py
from machine import SPI, Pin
import os
import sdcard


class Storage:
    """SD card storage handler."""

    MP3_DIR = "/sd/mp3"

    def __init__(self):
        self._mount_sd()
        self._ensure_directories()
        print("[STORAGE] Storage module initialized")

    def _mount_sd(self):
        """Mount the SD card."""
        spi = SPI(
            2,
            baudrate=10_000_000,
            polarity=0,
            phase=0,
            sck=Pin(18),
            mosi=Pin(23),
            miso=Pin(19)
        )

        sd = sdcard.SDCard(spi, Pin(5))  # CS on GPIO5
        os.mount(sd, "/sd")
        print("[STORAGE] SD card mounted at /sd")

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
