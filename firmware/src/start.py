# start.py
import time
import _thread
from machine import Pin

from ble import BleService
from audio import AudioPlayer
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

    def __init__(self, audio: AudioPlayer, storage: Storage):
        self.audio = audio
        self.storage = storage
        self.track = "{}/audio/received.wav".format(storage.root)

    def on_button_pressed(self):
        if not self.audio or not self.audio.available:
            print("[CTRL] Audio unavailable")
            return

        if not self.audio.is_playing():
            print("[CTRL] Play", self.track)
            _thread.start_new_thread(
                self.audio.play_wav,
                (self.track,)
            )
            return

        if self.audio.is_paused():
            self.audio.resume()
        else:
            self.audio.pause()



def main():
    """Main firmware entry point."""
    print("[START] Talking Box firmware booting")

    storage = Storage()

    try:
        audio = AudioPlayer()
    except Exception as e:
        print("[START] Audio disabled:", e)
        audio = None

    ble = BleService(storage)

    controller = Controller(audio, storage)
    button = Button(pin=15, callback=controller.on_button_pressed)

    print("[START] Ready")

    while True:
        button.poll()

        if ble.end_requested:
            ble.end_requested = False
            try:
                ble.finalize_file()
            except Exception as e:
                print("[START] Finalize failed:", e)

        time.sleep(0.05)

if __name__ == "__main__":
    main()