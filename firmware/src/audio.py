# audio.py
from machine import I2S, Pin
import ustruct
import time

class AudioPlayer:

    def __init__(self):
        # Playback state
        global _volume

        _volume = 1.0   # 0.0 to 1.0

        self.audio = I2S(
            0,
            sck=Pin(26),     # BCLK
            ws=Pin(25),      # LRC
            sd=Pin(27),      # DIN
            mode=I2S.TX,
            bits=16,
            format=I2S.MONO,
            rate=16000,
            ibuf=8000
        )

    def apply_volume(self, buf, volume):
        samples = len(buf) // 2
        out = bytearray(len(buf))

        for i in range(samples):
            s = ustruct.unpack_from("<h", buf, i * 2)[0]
            s = int(s * volume)

            # Clamp
            if s > 32767:
                s = 32767
            elif s < -32768:
                s = -32768

            ustruct.pack_into("<h", out, i * 2, s)

        return out

    def pause(self):
        global _paused
        _paused = True

    def resume(self):
        global _paused
        _paused = False

    def stop(self):
        global _stop
        _stop = True

    def set_volume(self, volume):
        global _volume
        if volume < 0:
            volume = 0
        elif volume > 1:
            volume = 1
        _volume = volume

    def play_wav(self, filename = str):
        global _paused, _stop

        _paused = False
        _stop = False

        with open(filename, "rb") as f:
            f.seek(44)  # Skip WAV header

            while True:

                if _paused:
                    time.sleep_ms(20)
                    continue

                if _stop:
                    break

                data = f.read(1024)
                if not data:
                    break

                data = self.apply_volume(data, _volume)
                self.audio.write(data)