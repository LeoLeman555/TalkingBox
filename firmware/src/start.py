# start.py
import time
from machine import Pin

from audio import AudioPlayer

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

    def on_button_pressed(self):
        print("[CTRL] Button pressed -> play", self.track)
        self.audio.play(self.track)


def main():
    """Main firmware entry point."""
    print("[START] Talking Box firmware booting")

    audio = AudioPlayer()

    audio._init_

    print("[START] All modules are ready")

    controller = Controller(audio)
    button = Button(
        pin=15,
        callback=controller.on_button_pressed
    )

    print("[START] Ready")

    while True:
        button.poll()
        time.sleep(0.01)


if __name__ == "__main__":
    main()
