"""
Standalone scheduler test.
"""

import time
from rtc import TimeRead
from storage import Storage
from audio import AudioPlayer
from scheduler import MemoScheduler


rtc = TimeRead()
storage = Storage()
audio = AudioPlayer()

scheduler = MemoScheduler(rtc, storage, audio)

print("[TEST] Scheduler started")

while True:
    scheduler.tick()
    time.sleep(1)
