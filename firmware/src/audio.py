from machine import I2S, Pin
import time
import _thread

class AudioPlayer:
    """Simple WAV audio player using I2S for ESP32."""

    def __init__(self, sck_pin=26, ws_pin=25, sd_pin=27, rate=20000, ibuf=8000):
        self._playing = False
        self._paused = False
        self._lock = _thread.allocate_lock()

        self.audio = I2S(
            0,
            sck=Pin(sck_pin),     # BCLK
            ws=Pin(ws_pin),        # LRC
            sd=Pin(sd_pin),        # DIN
            mode=I2S.TX,
            bits=16,
            format=I2S.MONO,
            rate=rate,
            ibuf=ibuf
        )

    def play_wav(self, filename: str):
        """Play a WAV file from SD card."""
        with self._lock:
            self._playing = True
            self._paused = False

        try:
            with open(filename, "rb") as f:
                f.seek(44)  # Skip WAV header
                while True:
                    with self._lock:
                        if not self._playing:
                            break
                        paused = self._paused

                    if paused:
                        time.sleep_ms(20)
                        continue

                    data = f.read(1024)
                    if not data:
                        with self._lock:
                            self._playing = False
                        break

                    self.audio.write(data)
        except Exception as e:
            with self._lock:
                self._playing = False
            print("[AudioPlayer] Error:", e)

    def pause(self):
        """Pause playback."""
        with self._lock:
            self._paused = True

    def resume(self):
        """Resume playback."""
        with self._lock:
            self._paused = False

    def stop(self):
        """Stop playback."""
        with self._lock:
            self._playing = False

    def is_playing(self):
        """Check if currently playing."""
        with self._lock:
            return self._playing

    def is_paused(self):
        """Check if currently paused."""
        with self._lock:
            return self._paused
