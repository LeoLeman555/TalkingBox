"""
DS3231 RTC driver for ESP32 (MicroPython)
"""

from machine import I2C, Pin


class RTCNotFoundError(Exception):
    """Raised when DS3231 is not detected on the I2C bus."""
    pass


class TimeRead:
    """DS3231 RTC module controller."""

    _DS3231_I2C_ADDR = 0x68

    def __init__(self, scl_pin=22, sda_pin=21, bus_id=0):
        self.i2c = I2C(
            bus_id,
            scl=Pin(scl_pin),
            sda=Pin(sda_pin)
        )

        if self._DS3231_I2C_ADDR not in self.i2c.scan():
            raise RTCNotFoundError("DS3231 not found on I2C bus")

    def _decode_bcd(self, value):
        """Decode BCD value to integer."""
        return (value // 16) * 10 + (value % 16)

    def _encode_bcd(self, value):
        """Encode integer to BCD format."""
        return (value // 10) * 16 + (value % 10)

    def get_datetime(self):
        """Return current RTC datetime as tuple."""
        data = self.i2c.readfrom_mem(self._DS3231_I2C_ADDR, 0x00, 7)

        second = self._decode_bcd(data[0] & 0x7F)
        minute = self._decode_bcd(data[1])
        hour = self._decode_bcd(data[2] & 0x3F)
        day = self._decode_bcd(data[3])
        date = self._decode_bcd(data[4])
        month = self._decode_bcd(data[5] & 0x1F)

        century = (data[5] & 0x80) >> 7
        year = self._decode_bcd(data[6])
        year += 2000 + (100 if century else 0)

        return year, month, date, day, hour, minute, second

    def set_datetime(self, year, month, date, day, hour, minute, second):
        """Set RTC datetime."""
        if year < 2000 or year >= 2200:
            raise ValueError("Year must be between 2000 and 2199")

        century = 0x80 if year >= 2100 else 0x00
        year_offset = year - (2100 if century else 2000)

        data = bytearray(7)
        data[0] = self._encode_bcd(second)
        data[1] = self._encode_bcd(minute)
        data[2] = self._encode_bcd(hour)
        data[3] = self._encode_bcd(day)
        data[4] = self._encode_bcd(date)
        data[5] = self._encode_bcd(month) | century
        data[6] = self._encode_bcd(year_offset)

        self.i2c.writeto_mem(self._DS3231_I2C_ADDR, 0x00, data)
