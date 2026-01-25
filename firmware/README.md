# ESP32 Firmware — Talking Box

MicroPython firmware running on an ESP32 device.

This firmware is responsible for:

- Receiving audio files over Bluetooth Low Energy (BLE)
- Storing MP3 files in flash memory
- Managing alarms and playback logic
- Playing audio through a DFPlayer module (UART)

It is designed to work in conjunction with the Android application of the Talking Box project.

## Responsibilities

- BLE command handling (START, DATA, END, PLAY)
- Chunked file reception and reconstruction
- Persistent storage of audio files and metadata
- Audio playback via DFPlayer
- Minimal boot-time logic and predictable runtime behavior

## Project Structure

```text
firmware/
├── src/
│ ├── start.py       # Main application entry point
│ ├── ble.py         # BLE protocol and communication
│ ├── audio.py       # DFPlayer UART control
│ └── storage.py     # File storage and JSON metadata
└── README.md
```

### File roles

- **start.py**  
  Logical entry point of the firmware.  
  Initializes modules and starts the main loop.

- **ble.py**  
  Implements the BLE protocol used by the Android application:

  - START transfer
  - Chunk reception
  - END validation
  - PLAY command

- **audio.py**  
  Low-level control of the DFPlayer via UART:

  - Initialization
  - Play file by name
  - Basic error handling

- **storage.py**  
  Handles:
  - File writing and reading
  - Persistent JSON metadata
  - Basic integrity checks

## Requirements

- ESP32 flashed with MicroPython **v1.27.0**
- DFPlayer Mini connected via UART
- `mpremote` installed on the host machine

## Deployment to ESP32

### Manual deployment (reference)

Files must be copied explicitly to the ESP32 filesystem.

```bash
mpremote cp firmware/src/start.py :start.py
mpremote cp firmware/src/ble.py :ble.py
mpremote cp firmware/src/audio.py :audio.py
mpremote cp firmware/src/storage.py :storage.py
mpremote cp firmware/src/sdcard.py :sdcard.py
```

After deployment, reset the board:

```bash
mpremote reset
```

### Windows (recommended)

Firmware deployment is handled via a dedicated PowerShell script. From the project root:

```powershell
.\deploy.ps1
```

The deployment script performs the following actions:

- Verifies tool availability (mpremote)
- Copies only the required firmware files to the ESP32 filesystem
- Resets the board after deployment

## Hardware & System Test

A basic sanity check script is provided to verify ESP32 MicroPython functionality, GPIO control, and system info. This ensures the board is operational before running the main firmware.

Run the test:

```bash
mpremote connect COMx run firmware/src/test_start.py
```

Refer to the main project README for global architecture and integration details.
