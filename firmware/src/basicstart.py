# start.py
import time

from basicaudio import AudioPlayer

audio = AudioPlayer()

while True:
    audio.play_wav("01.wav")
    time.sleep(1)