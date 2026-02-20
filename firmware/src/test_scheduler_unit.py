from scheduler import MemoScheduler

# -----------------------------
# Fake RTC
# -----------------------------
class FakeRTC:
    """Mock RTC returning controlled datetime."""

    def __init__(self):
        self.current = None

    def set(self, dt):
        self.current = dt

    def get_datetime(self):
        return self.current


# -----------------------------
# Fake Storage
# -----------------------------
class FakeStorage:
    """Mock storage injecting memo.json in memory."""

    def __init__(self, memo_data):
        self.memo_data = memo_data

    def safe_read_json(self, filename, default=None):
        return self.memo_data

    def get_audio_path(self, filename):
        return "/fake/audio/{}".format(filename)


# -----------------------------
# Fake Audio
# -----------------------------
class FakeAudio:
    """Mock audio collecting triggers."""

    def __init__(self):
        self.available = True
        self.playing = False
        self.triggered = []

    def is_playing(self):
        return self.playing

    def play_wav(self, path):
        self.triggered.append(path)


# -----------------------------
# Test Matrix
# -----------------------------
def run_test(name, rtc, scheduler, expected):
    scheduler.tick()
    triggered = scheduler.audio.triggered

    if set(triggered) == set(expected):
        print("PASS:", name)
    else:
        print("FAIL:", name)
        print("  Expected:", expected)
        print("  Got     :", triggered)

    scheduler.audio.triggered.clear()


def main():

    memo_data = {
        "version": 1,
        "items": [
            # One-shot
            {
                "memoId": "oneshot",
                "startDate": "2026-02-20",
                "time": "10:00",
                "recurrence": None,
                "audioFile": "oneshot.wav",
            },
            # Daily
            {
                "memoId": "daily",
                "startDate": "2026-02-01",
                "time": "10:01",
                "recurrence": {"frequency": "DAILY"},
                "audioFile": "daily.wav",
            },
            # Weekly (Monday = 1)
            {
                "memoId": "weekly",
                "startDate": "2026-02-01",
                "time": "10:02",
                "recurrence": {
                    "frequency": "WEEKLY",
                    "byWeekday": [1],
                },
                "audioFile": "weekly.wav",
            },
            # Monthly (20th)
            {
                "memoId": "monthly",
                "startDate": "2026-02-01",
                "time": "10:03",
                "recurrence": {
                    "frequency": "MONTHLY",
                    "byMonthDay": [20],
                },
                "audioFile": "monthly.wav",
            }
        ],
    }

    rtc = FakeRTC()
    storage = FakeStorage(memo_data)
    audio = FakeAudio()
    scheduler = MemoScheduler(rtc, storage, audio)

    # Override _trigger to avoid threading during unit tests
    def _test_trigger(audio_file):
        path = storage.get_audio_path(audio_file)
        audio.play_wav(path)

    scheduler._trigger = _test_trigger


    # ------------------------------------
    # BEFORE START DATE
    # ------------------------------------
    rtc.set((2026, 2, 19, 3, 10, 0, 0))
    run_test("before_start_date", rtc, scheduler, [])

    # ------------------------------------
    # ONE-SHOT MATCH
    # ------------------------------------
    rtc.set((2026, 2, 20, 4, 10, 0, 0))
    run_test("oneshot_match", rtc, scheduler,
             ["/fake/audio/oneshot.wav"])

    # ------------------------------------
    # DAILY MATCH
    # ------------------------------------
    rtc.set((2026, 2, 18, 3, 10, 1, 0))
    run_test("daily_match", rtc, scheduler,
             ["/fake/audio/daily.wav"])

    # ------------------------------------
    # WEEKLY MATCH (Monday)
    # DS3231 weekday=2 → converts to Monday
    # ------------------------------------
    rtc.set((2026, 2, 23, 2, 10, 2, 0))
    run_test("weekly_match", rtc, scheduler,
             ["/fake/audio/weekly.wav"])

    # ------------------------------------
    # WEEKLY NON MATCH (Tuesday)
    # ------------------------------------
    rtc.set((2026, 2, 24, 4, 10, 2, 0))
    run_test("weekly_non_match", rtc, scheduler, [])

    # ------------------------------------
    # MONTHLY MATCH (20th)
    # ------------------------------------
    rtc.set((2026, 2, 20, 4, 10, 3, 0))
    run_test("monthly_match", rtc, scheduler,
             ["/fake/audio/monthly.wav"])

    # ------------------------------------
    # MONTHLY NON MATCH
    # ------------------------------------
    rtc.set((2026, 2, 21, 5, 10, 3, 0))
    run_test("monthly_non_match", rtc, scheduler, [])

    # ------------------------------------
    # DOUBLE TICK SAME MINUTE (anti double trigger)
    # ------------------------------------
    rtc.set((2026, 2, 18, 3, 10, 1, 0))
    scheduler.tick()
    scheduler.tick()
    if len(audio.triggered) == 1:
        print("PASS: no_double_trigger_same_minute")
    else:
        print("FAIL: no_double_trigger_same_minute")

    audio.triggered.clear()

    # ------------------------------------
    # AUDIO UNAVAILABLE
    # ------------------------------------
    audio.available = False
    rtc.set((2026, 2, 18, 3, 10, 1, 0))
    run_test("audio_unavailable", rtc, scheduler, [])
    audio.available = True

    # ------------------------------------
    # AUDIO ALREADY PLAYING
    # ------------------------------------
    audio.playing = True
    rtc.set((2026, 2, 18, 3, 10, 1, 0))
    run_test("audio_already_playing", rtc, scheduler, [])
    audio.playing = False

    # ------------------------------------
    # DAILY INTERVAL = 2
    # ------------------------------------
    memo_data["items"].append({
        "memoId": "daily_interval_2",
        "startDate": "2026-02-01",
        "time": "10:10",
        "recurrence": {
            "frequency": "DAILY",
            "interval": 2,
        },
        "audioFile": "daily_i2.wav",
    })

    scheduler.reload()

    # Day 0 → match
    rtc.set((2026, 2, 1, 7, 10, 10, 0))
    run_test("daily_interval_2_day0", rtc, scheduler,
             ["/fake/audio/daily_i2.wav"])

    # Day 1 → no match
    rtc.set((2026, 2, 2, 1, 10, 10, 0))
    run_test("daily_interval_2_day1", rtc, scheduler, [])

    # Day 2 → match
    rtc.set((2026, 2, 3, 2, 10, 10, 0))
    run_test("daily_interval_2_day2", rtc, scheduler,
             ["/fake/audio/daily_i2.wav"])
    
    # Day 29 → no match
    rtc.set((2026, 3, 2, 2, 10, 10, 0))
    run_test("daily_interval_2_day29", rtc, scheduler, [])

    # Day 30 → match
    rtc.set((2026, 3, 3, 2, 10, 10, 0))
    run_test("daily_interval_2_day30", rtc, scheduler, 
             ["/fake/audio/daily_i2.wav"])
    
    # ------------------------------------
    # WEEKLY INTERVAL = 2 (Monday)
    # ------------------------------------
    memo_data["items"].append({
        "memoId": "weekly_interval_2",
        "startDate": "2026-02-02",  # Monday
        "time": "10:11",
        "recurrence": {
            "frequency": "WEEKLY",
            "interval": 2,
            "byWeekday": [1],
        },
        "audioFile": "weekly_i2.wav",
    })

    scheduler.reload()

    # Week 0 → match
    rtc.set((2026, 2, 2, 2, 10, 11, 0))
    run_test("weekly_interval_2_week0", rtc, scheduler,
             ["/fake/audio/weekly_i2.wav"])

    # Week 1 → no match
    rtc.set((2026, 2, 9, 2, 10, 11, 0))
    run_test("weekly_interval_2_week1", rtc, scheduler, [])

    # Week 2 → match
    rtc.set((2026, 2, 16, 2, 10, 11, 0))
    run_test("weekly_interval_2_week2", rtc, scheduler,
             ["/fake/audio/weekly_i2.wav"])
    
    # Week 6 → match
    rtc.set((2026, 3, 16, 2, 10, 11, 0))
    run_test("weekly_interval_2_week6", rtc, scheduler,
             ["/fake/audio/weekly_i2.wav"])

    # Week 7 → no match
    rtc.set((2026, 3, 23, 2, 10, 11, 0))
    run_test("weekly_interval_2_week7", rtc, scheduler, [])
    
    # ------------------------------------
    # DAILY UNTIL (inclusive)
    # ------------------------------------
    memo_data["items"].append({
        "memoId": "daily_until",
        "startDate": "2026-02-01",
        "time": "10:13",
        "recurrence": {
            "frequency": "DAILY",
            "until": "2026-02-03",
        },
        "audioFile": "daily_until.wav",
    })

    scheduler.reload()

    # Before until
    rtc.set((2026, 2, 2, 1, 10, 13, 0))
    run_test("daily_until_before", rtc, scheduler,
             ["/fake/audio/daily_until.wav"])

    # On until (inclusive)
    rtc.set((2026, 2, 3, 2, 10, 13, 0))
    run_test("daily_until_on", rtc, scheduler,
             ["/fake/audio/daily_until.wav"])

    # After until → blocked
    rtc.set((2026, 2, 4, 3, 10, 13, 0))
    run_test("daily_until_after", rtc, scheduler, [])

    # ------------------------------------
    # DAILY interval + count + until
    # ------------------------------------
    memo_data["items"].append({
        "memoId": "daily_combo",
        "startDate": "2026-02-01",
        "time": "10:14",
        "recurrence": {
            "frequency": "DAILY",
            "interval": 2,
            "count": 2,
        },
        "audioFile": "daily_combo.wav",
    })

    scheduler.reload()

    # Day 0 → trigger 1
    rtc.set((2026, 2, 1, 7, 10, 14, 0))
    run_test("daily_combo_1", rtc, scheduler,
             ["/fake/audio/daily_combo.wav"])
    
    # Day 1 → no match
    rtc.set((2026, 2, 2, 1, 10, 14, 0))
    run_test("daily_combo_2", rtc, scheduler, [])

    # Day 2 → trigger 2
    rtc.set((2026, 2, 3, 2, 10, 14, 0))
    run_test("daily_combo_3", rtc, scheduler,
             ["/fake/audio/daily_combo.wav"])

    # Day 4 → blocked by count
    rtc.set((2026, 2, 5, 4, 10, 14, 0))
    run_test("daily_combo_count_block", rtc, scheduler, [])

if __name__ == "__main__":
    main()
