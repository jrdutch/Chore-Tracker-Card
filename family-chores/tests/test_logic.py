"""Behaviour tests for the ported chore rules.

Mirrors the fixtures in the card's screenshot harness so the Python port can be
checked against the same cases the JavaScript was verified with.

Runs standalone (``python3 tests/test_logic.py``) or under pytest.
"""

import sys
from datetime import date, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "custom_components" / "family_chores"))

import logic  # noqa: E402

TODAY = date(2026, 8, 22)  # a Saturday -> weekday_index 6
YESTERDAY = logic.date_key(TODAY - timedelta(days=1))
TODAY_KEY = logic.date_key(TODAY)
DOW = logic.weekday_index(TODAY)


def base_data():
    return {
        "members": [
            {"id": "m1", "name": "Jordan", "points": 120, "dollars": 12.75,
             "perfectDays": [], "streak": {"start": None, "awarded": 0}},
        ],
        "chores": [],
        "pool": [],
        "rewards": [],
        "history": [],
        "settings": {"require_approval": False, "streak_days": 7, "streak_bonus": 5},
    }


def chore(**kwargs):
    base = {
        "id": "c", "title": "Chore", "points": 5, "dollars": 0.5,
        "recurrence": "daily", "assignedTo": ["m1"], "memberStates": {},
    }
    base.update(kwargs)
    return base


# ── weekday maths ────────────────────────────────────────────────────────────

def test_weekday_index_matches_javascript():
    # JS getDay(): Sunday = 0 .. Saturday = 6
    assert logic.weekday_index(date(2026, 8, 23)) == 0  # Sunday
    assert logic.weekday_index(date(2026, 8, 24)) == 1  # Monday
    assert logic.weekday_index(date(2026, 8, 22)) == 6  # Saturday


# ── day scoping ──────────────────────────────────────────────────────────────

def test_weekly_chore_only_shows_on_its_days():
    today_only = chore(id="today", recurrence="weekly", recurrenceDays=[DOW])
    other_day = chore(id="other", recurrence="weekly", recurrenceDays=[(DOW + 3) % 7])
    assert logic.is_chore_due_on(today_only, DOW) is True
    assert logic.is_chore_due_on(other_day, DOW) is False


def test_weekdays_chore_hides_at_the_weekend():
    weekday_chore = chore(recurrence="weekdays")
    assert logic.is_chore_due_on(weekday_chore, 6) is False  # Saturday
    assert logic.is_chore_due_on(weekday_chore, 0) is False  # Sunday
    assert logic.is_chore_due_on(weekday_chore, 3) is True   # Wednesday


def test_weekly_with_no_days_picked_falls_back_to_every_day():
    half_configured = chore(recurrence="weekly", recurrenceDays=[])
    assert all(logic.is_chore_due_on(half_configured, d) for d in range(7))


def test_member_list_filters_to_todays_chores():
    data = base_data()
    data["chores"] = [
        chore(id="daily", title="Make Bed"),
        chore(id="today", title="Take Out Trash", recurrence="weekly", recurrenceDays=[DOW]),
        chore(id="other", title="Mow Lawn", recurrence="weekly", recurrenceDays=[(DOW + 3) % 7]),
    ]
    titles = [c["title"] for c in logic.member_chores(data, "m1", DOW, False)]
    assert titles == ["Make Bed", "Take Out Trash"]


# ── one-off retirement ───────────────────────────────────────────────────────

def test_one_off_done_today_stays_visible():
    data = base_data()
    data["chores"] = [chore(id="c1", title="Sort Recycling", recurrence="none",
                            memberStates={"m1": {"completed": True, "completedDate": TODAY_KEY}})]
    logic.check_recurrence_resets(data, TODAY)
    assert [c["title"] for c in logic.member_chores(data, "m1", DOW, False)] == ["Sort Recycling"]


def test_one_off_done_yesterday_drops_off():
    data = base_data()
    data["chores"] = [chore(id="c1", title="Clean Garage", recurrence="none",
                            memberStates={"m1": {"completed": True, "completedDate": YESTERDAY}})]
    logic.check_recurrence_resets(data, TODAY)
    assert logic.member_chores(data, "m1", DOW, False) == []
    assert data["chores"] == []  # everyone finished it, so it is removed outright


def test_legacy_one_off_without_completion_date_is_retired():
    data = base_data()
    data["chores"] = [chore(id="c1", title="Old Chore", recurrence="none",
                            memberStates={"m1": {"completed": True}})]
    logic.check_recurrence_resets(data, TODAY)
    assert logic.member_chores(data, "m1", DOW, False) == []


def test_claimed_pool_chore_retires_like_any_one_off():
    data = base_data()
    data["chores"] = [chore(id="c1", title="Wash Car", recurrence="none", _poolRef="p1",
                            memberStates={"m1": {"completed": True, "completedDate": YESTERDAY}})]
    logic.check_recurrence_resets(data, TODAY)
    assert logic.member_chores(data, "m1", DOW, False) == []


def test_one_off_kept_while_another_member_has_not_finished():
    data = base_data()
    data["members"].append({"id": "m2", "name": "Sarah", "points": 0, "dollars": 0})
    data["chores"] = [chore(id="c1", title="Shared", recurrence="none", assignedTo=["m1", "m2"],
                            memberStates={"m1": {"completed": True, "completedDate": YESTERDAY}})]
    logic.check_recurrence_resets(data, TODAY)
    assert len(data["chores"]) == 1                                  # not deleted
    assert logic.member_chores(data, "m1", DOW, False) == []         # gone for Jordan
    assert len(logic.member_chores(data, "m2", DOW, False)) == 1     # still there for Sarah


# ── recurrence resets ────────────────────────────────────────────────────────

def test_daily_chore_resets_but_keeps_earnings():
    data = base_data()
    data["chores"] = [chore(id="c1", memberStates={"m1": {"completed": True,
                                                          "lastResetDate": YESTERDAY}})]
    logic.check_recurrence_resets(data, TODAY)
    assert data["chores"][0]["memberStates"]["m1"]["completed"] is False
    assert data["members"][0]["points"] == 120  # untouched by the reset


def test_reset_is_idempotent_within_a_day():
    data = base_data()
    data["chores"] = [chore(id="c1", memberStates={"m1": {"completed": True,
                                                          "lastResetDate": YESTERDAY}})]
    logic.check_recurrence_resets(data, TODAY)
    data["chores"][0]["memberStates"]["m1"]["completed"] = True  # done again today
    logic.check_recurrence_resets(data, TODAY)
    assert data["chores"][0]["memberStates"]["m1"]["completed"] is True  # not wiped again


# ── streaks ──────────────────────────────────────────────────────────────────

def test_streak_counts_consecutive_perfect_days():
    data = base_data()
    data["chores"] = [chore(id="c1")]
    data["members"][0]["perfectDays"] = [
        logic.date_key(TODAY - timedelta(days=n)) for n in range(5)
    ]
    assert logic.streak_run(data, data["members"][0], TODAY)["length"] == 5


def test_unfinished_today_does_not_break_the_streak():
    data = base_data()
    data["chores"] = [chore(id="c1")]
    data["members"][0]["perfectDays"] = [
        logic.date_key(TODAY - timedelta(days=n)) for n in range(1, 5)
    ]
    # today missing from perfectDays; the day isn't over
    assert logic.streak_run(data, data["members"][0], TODAY)["length"] == 4


def test_day_with_nothing_scheduled_neither_extends_nor_breaks():
    data = base_data()
    # Only scheduled on today's weekday, so the six days between had nothing due
    data["chores"] = [chore(id="c1", recurrence="weekly", recurrenceDays=[DOW])]
    data["members"][0]["perfectDays"] = [TODAY_KEY, logic.date_key(TODAY - timedelta(days=7))]
    run = logic.streak_run(data, data["members"][0], TODAY)
    # Two chore days completed. The empty days bridge the gap but earn nothing,
    # so a weekly chore cannot inflate a streak to 7 in a fortnight.
    assert run["length"] == 2


def test_weekly_chore_needs_seven_actual_chore_days_for_a_bonus():
    data = base_data()
    data["chores"] = [chore(id="c1", recurrence="weekly", recurrenceDays=[DOW],
                            memberStates={"m1": {"completed": True}})]
    data["members"][0]["perfectDays"] = [
        logic.date_key(TODAY - timedelta(days=7 * n)) for n in range(1, 7)
    ]
    awarded = logic.update_streak(data, "m1", TODAY, False, 7, 5)
    assert awarded == 5  # seven Saturdays, not seven calendar days


def test_missed_scheduled_day_breaks_the_streak():
    data = base_data()
    data["chores"] = [chore(id="c1")]  # daily
    data["members"][0]["perfectDays"] = [
        TODAY_KEY,
        logic.date_key(TODAY - timedelta(days=1)),
        # day 2 missed
        logic.date_key(TODAY - timedelta(days=3)),
    ]
    assert logic.streak_run(data, data["members"][0], TODAY)["length"] == 2


def test_bonus_paid_once_per_seven_days():
    data = base_data()
    data["chores"] = [chore(id="c1", memberStates={"m1": {"completed": True}})]
    data["members"][0]["perfectDays"] = [
        logic.date_key(TODAY - timedelta(days=n)) for n in range(1, 7)
    ]
    awarded = logic.update_streak(data, "m1", TODAY, False, 7, 5)
    assert awarded == 5
    assert data["members"][0]["points"] == 125
    # running again the same day must not pay twice
    assert logic.update_streak(data, "m1", TODAY, False, 7, 5) == 0
    assert data["members"][0]["points"] == 125


def test_member_with_no_chores_has_no_streak():
    data = base_data()
    assert logic.streak_run(data, data["members"][0], TODAY)["length"] == 0


# ── money ────────────────────────────────────────────────────────────────────

def test_round2_stops_float_drift():
    total = 0.0
    for _ in range(10):
        total = logic.round2(total + 0.1)
    assert total == 1.0


def test_num_treats_garbage_as_zero():
    assert logic.num("abc") == 0
    assert logic.num(None) == 0
    assert logic.num("") == 0
    assert logic.num("12.5") == 12.5


if __name__ == "__main__":
    failures = 0
    for name, fn in sorted(globals().items()):
        if name.startswith("test_") and callable(fn):
            try:
                fn()
                print(f"  PASS  {name}")
            except AssertionError as err:
                failures += 1
                print(f"  FAIL  {name}: {err}")
            except Exception as err:  # noqa: BLE001
                failures += 1
                print(f"  ERROR {name}: {type(err).__name__}: {err}")
    print(f"\n{'FAILED' if failures else 'All tests passed'} ({failures} failure(s))")
    sys.exit(1 if failures else 0)
