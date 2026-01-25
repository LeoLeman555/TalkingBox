# start.py
import time
import _thread

from basicaudio import AudioPlayer

audio = AudioPlayer()

vol = 1.0

for i in range(2):
    for i in range(5):
        _thread.start_new_thread(audio.play_wav, ("01.wav",))
        time.sleep(1)
    time.sleep(1)