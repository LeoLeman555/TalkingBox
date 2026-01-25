# start.py
import time
import _thread
from machine import Pin

from ble import BleService
from basicaudio import AudioPlayer, _playing, _paused 
from storage import Storage


class Button:
    """Physical button handler."""

    def __init__(self, pin, callback, pullup=True):
        self.button = Pin(
            pin,
            Pin.IN,
            Pin.PULL_UP if pullup else None
        )
        self.callback = callback
        self.last_state = 1

    def poll(self):
        state = self.button.value()
        if self.last_state == 1 and state == 0:
            self.callback()
            time.sleep(0.2)  # debounce
        self.last_state = state


class Controller:
    """High-level user interaction controller."""

    def __init__(self, audio):
        self.audio = audio
        self.track = 1

    def on_button_pressed(self, audio):
        global _playing, _paused
        if not _playing:
            print("[CTRL] Button pressed -> play", self.track)
            _thread.start_new_thread(audio.play_wav, (self.track,))
        elif _playing:
            if not _paused:
                audio.pause()
            elif _paused:
                audio.resume()

def main():
    """Main firmware entry point."""
    print("[START] Talking Box firmware booting")

    storage = Storage()
    audio = AudioPlayer()
    ble = BleService(storage)

    print("[START] All modules are ready")

    controller = Controller(audio)
    button = Button(
        pin=15,
        callback=controller.on_button_pressed
    )

    print("[START] Ready")

    while True:
        button.poll()
        if ble.end_requested:
            ble.end_requested = False
            ble.finalize_file()
        time.sleep(0.05)


if __name__ == "__main__":
    main()