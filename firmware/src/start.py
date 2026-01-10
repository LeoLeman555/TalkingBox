# start.py
from ble import BleService
from audio import AudioPlayer
from storage import Storage

def main():
    print("[START] Talking Box firmware booting")

    storage = Storage()
    audio = AudioPlayer()
    ble = BleService(storage)

    print("[START] All modules are ready")

if __name__ == "__main__":
    main()
