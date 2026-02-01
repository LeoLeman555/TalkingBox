from machine import I2C

class TimeRead:
    """DS3231 RTC module controller"""

    def __init__(self, scl_pin=22, sda_pin=21):
        self.rtc = I2C(0, scl=scl_pin, sda=sda_pin)
        self._DS3231_I2C_ADDR = 0x68
    
    def decode(self, b):
        """reads BCD-encoded time from the DS3231 registers and returns a tuple"""
        return (b//16)*10 + (b%16)

    def encode(self, d):
        """encodes tuple to BCD time"""
        return (d//10)*16 + (d%10)

    def get_datetime(self):
        """returns date & time """
        # Read 7 bytes: sec, min, hour, day, date, month, year
        data = self.rtc.readfrom_mem(self._DS3231_I2C_ADDR, 0x00, 7)
        sec  = self.decode(data[0] & 0x7F)
        minute = self.decode(data[1])
        hour = self.decode(data[2] & 0x3F)
        day_of_week = self.decode(data[3])
        day = self.decode(data[4])
        month = self.decode(data[5] & 0x1F)
        year = self.decode(data[6]) + 2000
        print(year, month, day, day_of_week, hour, minute)
        return year, month, day, day_of_week, hour, minute