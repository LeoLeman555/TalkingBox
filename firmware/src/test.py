"""
ESP32 MicroPython Hardware & System Sanity Test
"""

from machine import Pin, reset_cause
import sys
import time

from rtc import TimeRead, RTCNotFoundError


class TestResult:
    """Encapsulates the result of a single test."""

    def __init__(self, name):
        self.name = name
        self.passed = False
        self.error = None

    def set_passed(self):
        self.passed = True

    def set_failed(self, error):
        self.passed = False
        self.error = error

    def __str__(self):
        status = "PASS" if self.passed else "FAIL"
        return f"{self.name}: {status}" + (f" ({self.error})" if self.error else "")


def gpio_test(pin_num=2):
    """Test GPIO by toggling a pin."""
    result = TestResult(f"GPIO{pin_num} Test")
    try:
        led = Pin(pin_num, Pin.OUT)
        led.on()
        time.sleep(0.2)
        led.off()
        result.set_passed()
    except Exception as e:
        result.set_failed(e)
    return result


def system_info_test():
    """Check basic system info and reset cause."""
    result = TestResult("System Info Test")
    try:
        print("Platform:", sys.platform)
        print("MicroPython Version:", sys.version)
        print("Reset cause:", reset_cause())
        result.set_passed()
    except Exception as e:
        result.set_failed(e)
    return result


def rtc_presence_test():
    """Check if DS3231 is detected."""
    result = TestResult("RTC Presence Test")
    try:
        TimeRead()
        result.set_passed()
    except RTCNotFoundError as e:
        result.set_failed(e)
    except Exception as e:
        result.set_failed(e)
    return result


def rtc_read_test():
    """Check if RTC datetime can be read."""
    result = TestResult("RTC Read Test")
    try:
        rtc = TimeRead()
        dt = rtc.get_datetime()
        print("RTC datetime:", dt)
        result.set_passed()
    except Exception as e:
        result.set_failed(e)
    return result


def run_tests():
    """Run all tests and print results."""
    print("=== ESP32 MicroPython Test Start ===\n")

    results = []

    results.append(system_info_test())
    results.append(gpio_test(2))
    results.append(rtc_presence_test())
    results.append(rtc_read_test())

    print("\n=== Test Results ===")
    passed_count = 0

    for r in results:
        print(r)
        if r.passed:
            passed_count += 1

    print(f"\nSummary: {passed_count}/{len(results)} tests passed")


if __name__ == "__main__":
    run_tests()
