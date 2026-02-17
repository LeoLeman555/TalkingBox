class MemoScheduler:
    """Trigger memos once when datetime matches."""

    MEMO_FILE = "memo.json"

    def __init__(self, rtc, storage, audio):
        self.rtc = rtc
        self.storage = storage
        self.audio = audio

        self.memos = []
        self.last_checked_minute = None
        self.triggered_ids = set()

        self._load_memos()

    def _load_memos(self):
        """Load memo.json from storage."""
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
        year, month, date, weekday, hour, minute, second = now

        if minute == self.last_checked_minute:
            return

        self.last_checked_minute = minute

        for memo in self.memos:
            self._evaluate_memo(memo, now)

    def _evaluate_memo(self, memo, now):
        """Evaluate one memo."""
        memo_id = memo.get("memoId")

        if not memo_id:
            return

        if memo_id in self.triggered_ids:
            return

        recurrence = memo.get("recurrence")

        if recurrence and recurrence.get("frequency") is not None:
            return

        start_date = memo.get("startDate")
        memo_time = memo.get("time")
        audio_file = memo.get("audioFile")

        if not start_date or not memo_time or not audio_file:
            return

        year, month, date, _, hour, minute, _ = now

        try:
            memo_year, memo_month, memo_day = map(int, start_date.split("-"))
            memo_hour, memo_minute = map(int, memo_time.split(":"))
        except Exception:
            return

        if (
            year == memo_year and
            month == memo_month and
            date == memo_day and
            hour == memo_hour and
            minute == memo_minute
        ):
            self._trigger(audio_file)
            self.triggered_ids.add(memo_id)

    def _trigger(self, audio_file):
        """Play audio safely."""
        if not self.audio.is_playing():
            path = self.storage.get_audio_path(audio_file)
            print("[SCHED] Trigger:", path)
            self.audio.play_wav(path)
