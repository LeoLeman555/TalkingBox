"""
ESP32 MicroPython Hardware & System Sanity Test
"""

from machine import Pin, reset_cause
import sys
import time

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


def run_tests():
    """Run all tests and print results."""
    print("=== ESP32 MicroPython Test Start ===\n")
    results = []

    # Add tests here
    results.append(system_info_test())
    results.append(gpio_test(2))  # Default onboard LED
    # results.append(gpio_test(15))  # Example: add more GPIO tests if needed

    print("\n=== Test Results ===")
    passed_count = 0
    for r in results:
        print(r)
        if r.passed:
            passed_count += 1

    print(f"\nSummary: {passed_count}/{len(results)} tests passed")


if __name__ == "__main__":
    run_tests()
