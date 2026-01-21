from machine import I2S, Pin

class AudioPlayer:

    def __init__(self):
        # Playback state
        
        self.audio = I2S(
            0,
            sck=Pin(26),     # BCLK
            ws=Pin(25),      # LRC
            sd=Pin(22),      # DIN
            mode=I2S.TX,
            bits=16,
            format=I2S.MONO,
            rate=16000,
            ibuf=8000
        )

    def play_wav(self, filename = str):

        with open(filename, "rb") as f:
            f.read(44)  # Skip WAV header

            while True:

                data = f.read(1024)
                if not data:
                    break

                self.audio.write(data)