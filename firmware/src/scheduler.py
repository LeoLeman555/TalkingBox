import _thread

class MemoScheduler:
    """Evaluate memos and trigger according to recurrence rules."""

    MEMO_FILE = "memo.json"

    def __init__(self, rtc, storage, audio):
        self.rtc = rtc
        self.storage = storage
        self.audio = audio

        self.memos = []
        self.last_checked_key = None  # (year, month, day, hour, minute)

        self._load_memos()

    def _load_memos(self):
        """Load memo.json."""
        data = self.storage.safe_read_json(self.MEMO_FILE, default=None)

        if not data or "items" not in data:
            self.memos = []
            return

        self.memos = data["items"]

    def reload(self):
        """Reload memo file."""
        self._load_memos()

    def tick(self):
        """Evaluate memos once per minute."""
        now = self.rtc.get_datetime()
        year, month, day, weekday, hour, minute, second = now

        current_key = (year, month, day, hour, minute)

        if current_key == self.last_checked_key:
            return

        self.last_checked_key = current_key

        for memo in self.memos:
            self._evaluate_memo(memo, now)

    def _evaluate_memo(self, memo, now):
        """Evaluate a single memo."""
        memo_id = memo.get("memoId")
        start_date = memo.get("startDate")
        memo_time = memo.get("time")
        audio_file = memo.get("audioFile")
        recurrence = memo.get("recurrence")

        if not memo_id or not start_date or not memo_time or not audio_file:
            return

        year, month, day, weekday, hour, minute, _ = now

        try:
            start_y, start_m, start_d = map(int, start_date.split("-"))
            memo_hour, memo_minute = map(int, memo_time.split(":"))
        except Exception:
            return

        # Must be after start date
        if (year, month, day) < (start_y, start_m, start_d):
            return

        # Convert DS3231 weekday to app weekday (1=Mon .. 7=Sun)
        app_weekday = ((weekday + 5) % 7) + 1

        # --------------------------------------------------
        # One-shot
        # --------------------------------------------------
        if not recurrence or recurrence.get("frequency") is None:
            if (
                (year, month, day) == (start_y, start_m, start_d)
                and hour == memo_hour
                and minute == memo_minute
            ):
                self._trigger(audio_file)
            return


        frequency = recurrence.get("frequency")

        # --------------------------------------------------
        # HOURLY → every hour at memo_minute
        # --------------------------------------------------
        if frequency == "HOURLY":
            if minute == memo_minute:
                self._trigger(audio_file)
            return

        # From here: hour and minute must match
        if hour != memo_hour or minute != memo_minute:
            return

        # --------------------------------------------------
        # DAILY → every day at fixed hour/minute
        # --------------------------------------------------
        if frequency == "DAILY":
            self._trigger(audio_file)
            return

        # --------------------------------------------------
        # WEEKLY → only if app weekday matches list
        # --------------------------------------------------
        if frequency == "WEEKLY":
            by_weekday = recurrence.get("byWeekday", [])
            if by_weekday and app_weekday in by_weekday:
                self._trigger(audio_file)
            return

        # --------------------------------------------------
        # MONTHLY → only if day of month matches list
        # --------------------------------------------------
        if frequency == "MONTHLY":
            by_month_day = recurrence.get("byMonthDay", [])
            if by_month_day and day in by_month_day:
                self._trigger(audio_file)
            return

    def _trigger(self, audio_file):
        """Non-blocking audio trigger."""
        if not self.audio:
            return

        if not self.audio.available:
            return

        if self.audio.is_playing():
            return

        path = self.storage.get_audio_path(audio_file)

        try:
            _thread.start_new_thread(
                self.audio.play_wav,
                (path,)
            )
            print("[SCHED] Trigger:", path)
        except Exception as e:
            print("[SCHED] Thread start failed:", e)
