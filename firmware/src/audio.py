# audio.py
from machine import UART, Pin
import time


class AudioPlayer:
    """DFPlayer Mini driver for ESP32 (MicroPython)"""

    # DFPlayer commands
    CMD_NEXT = 0x01
    CMD_PREVIOUS = 0x02
    CMD_PLAY_INDEX = 0x03
    CMD_SET_VOLUME = 0x06
    CMD_PAUSE = 0x0E
    CMD_RESUME = 0x0D
    CMD_STOP = 0x16

    def _init_(
        self,
        uart_id=2,
        tx_pin=17,
        rx_pin=16,
        baudrate=9600,
        volume=20
    ):
        print("[AUDIO] Initializing DFPlayer")

        self.uart = UART(
            uart_id,
            baudrate=baudrate,
            tx=Pin(tx_pin),
            rx=Pin(rx_pin)
        )

        self.current_track = None
        self.volume = volume

        # DFPlayer needs time to boot
        time.sleep(2)

        self.set_volume(volume)

        print("[AUDIO] DFPlayer ready")

    # ------------------------------------------------------------------
    # Low-level protocol
    # ------------------------------------------------------------------

    def _send_command(self, cmd, param):
        high = (param >> 8) & 0xFF
        low = param & 0xFF

        frame = bytearray([
            0x7E,  # start
            0xFF,  # version
            0x06,  # length
            cmd,
            0x00,  # no feedback
            high,
            low,
        ])

        checksum = 0 - sum(frame[1:])
        checksum &= 0xFFFF

        frame.append((checksum >> 8) & 0xFF)
        frame.append(checksum & 0xFF)
        frame.append(0xEF)  # end

        self.uart.write(frame)
        time.sleep(0.1)  # DFPlayer processing time

    # ------------------------------------------------------------------
    # Public API (simple & explicit)
    # ------------------------------------------------------------------

    def play(self, track):
        """Play track by index (001.mp3, 002.mp3, ...)"""
        if not isinstance(track, int) or track <= 0:
            print("[AUDIO] Invalid track:", track)
            return
        self.current_track = track
        print("[AUDIO] Play track", track)
        self._send_command(self.CMD_PLAY_INDEX, track)

    def stop(self):
        print("[AUDIO] Stop")
        self._send_command(self.CMD_STOP)

    def pause(self):
        print("[AUDIO] Pause")
        self._send_command(self.CMD_PAUSE)

    def resume(self):
        print("[AUDIO] Resume")
        self._send_command(self.CMD_RESUME)

    def next(self):
        print("[AUDIO] Next track")
        self._send_command(self.CMD_NEXT)

    def previous(self):
        print("[AUDIO] Previous track")
        self._send_command(self.CMD_PREVIOUS)

    def set_volume(self, volume):
        """Set volume (0–30)"""
        volume = max(0, min(30, volume))
        self.volume = volume
        print("[AUDIO] Volume =", volume)
        self._send_command(self.CMD_SET_VOLUME, volume)