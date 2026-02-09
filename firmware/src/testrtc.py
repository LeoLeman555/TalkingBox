from rtc import TimeRead
from machine import Pin
import time

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

def main():
    """Main firmware entry point."""
    print("[START] Talking Box firmware booting")

    rtc = TimeRead()

    print("[START] All modules are ready")

    button = Button(
        pin=15,
        callback=print(rtc.get_datetime)
    )

    print("[START] Ready")

    while True:
        button.poll()
        time.sleep(0.5)

if __name__ == "__main__":
    main()