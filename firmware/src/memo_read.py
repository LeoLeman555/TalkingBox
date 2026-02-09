from rtc import TimeRead
from audio import AudioPlayer

import json

class MemoRead: 
    
    rtc=TimeRead
    audio=AudioPlayer

    def alarmtrigger(self, rtc, audio):
        with open("memo.json") as json_data:
            memos = json.load(json_data)

            for item in range(len(memos)):

                frequency = memos[frequency]
                interval = memos[item][trigger][recurrence][interval]
                startDate = memos[item][trigger][startDate]
                time = memos[item][trigger][time]
                file = memos[item][audioFile]

                if memos[item][trigger][recurrence] == "null": 
                    if rtc.get_datetime == startDate + time:
                        audio.play_wav("/sd/audio/{file}.wav")
                else:
                    if frequency == "HOURLY":
                        if rtc.get_datetime == startDate + time:
                            audio.play_wav("/sd/audio/{file}.wav")

                            counter = 0
                            lastDate = rtc.get_datetime()[5]

                            while True:
                                if rtc.get_datetime()[5] != lastDate:
                                    counter += 1
                                    lastDate = rtc.get_datetime()[5]

                                if lastDate % interval == 0 and rtc.get_datetime[6] == timeminutes:
                                    audio.play_wav("/sd/audio/{file}.wav")

                                time.sleep(30)

                    elif frequency == "DAILY":
                        if rtc.get_datetime == startDate + time:
                            audio.play_wav("/sd/audio/{file}.wav")

                            counter = 0
                            lastDate = rtc.get_datetime()[3]

                            while True:
                                if rtc.get_datetime()[3] != lastDate:
                                    counter += 1
                                    lastDate = rtc.get_datetime()[3]

                                if lastDate % interval == 0 and rtc.get_datetime[5, 6] == time:
                                    audio.play_wav("/sd/audio/{file}.wav")

                                time.sleep(30)

                    elif frequency == "WEEKLY":
                        if rtc.get_datetime == startDate + time:
                            audio.play_wav("/sd/audio/{file}.wav")

                            counter = 0
                            lastDate = rtc.get_datetime()[4]

                            while True:
                                if rtc.get_datetime()[4] != lastDate and rtc.get_datetime()[4] == 1:
                                    counter += 1
                                    lastDate = rtc.get_datetime()[4]

                                if lastDate % interval == 0 and rtc.get_datetime()[4, 5, 6] == dayOfTheWeek + time:
                                    audio.play_wav("/sd/audio/{file}.wav")

                                time.sleep(30)

                    elif frequency == "MONTHLY":
                        if rtc.get_datetime == startDate + time:
                            audio.play_wav("/sd/audio/{file}.wav")

                            counter = 0
                            lastDate = rtc.get_datetime()[2]

                            while True:
                                if rtc.get_datetime()[2] != lastDate:
                                    counter += 1
                                    lastDate = rtc.get_datetime()[2]

                                if lastDate % interval == 0 and rtc.get_datetime()[3, 5, 6] == dayOfTheMonth + time:
                                    audio.play_wav("/sd/audio/{file}.wav")

                                time.sleep(30)
                    
                    elif frequency == "YEARLY":
                        if rtc.get_datetime == startDate + time:
                            audio.play_wav("/sd/audio/{file}.wav")

                            counter = 0
                            lastDate = rtc.get_datetime()[1]

                            while True:
                                if rtc.get_datetime()[1] != lastDate:
                                    counter += 1
                                    lastDate = rtc.get_datetime()[1]

                                if lastDate % interval == 0 and rtc.get_datetime()[2, 3, 5, 6] == month + dayOfTheMonth + time:
                                    audio.play_wav("/sd/audio/{file}.wav")

                                time.sleep(30)
