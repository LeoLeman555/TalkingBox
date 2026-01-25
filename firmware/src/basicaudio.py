from machine import I2S, Pin
import time

class AudioPlayer:

    def __init__(self):
        # Playback state
        global _playing

        _playing = False

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

    def pause(self):
        global _paused
        _paused = True

    def resume(self):
        global _paused
        _paused = False

    def stop(self):
        global _stop, _playing
        _stop = True
        _playing = False

    def play_wav(self, filename: str):
        global _stop, _paused, _volume

        _stop = False
        _paused = False

        with open(filename, "rb") as f:
            f.seek(44)  # Skip WAV header
            global _playing

            _playing = True

            while True:

                if _paused:
                    time.sleep_ms(20)
                    continue

                if _stop:
                    break

                data = f.read(1024)
                if not data:
                    _playing = False
                    break

                self.audio.write(data)