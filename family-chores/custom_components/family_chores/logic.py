"""Pure chore rules, ported 1:1 from the card's JavaScript.

Deliberately free of Home Assistant imports so the behaviour can be tested
directly and compared against the original card's fixtures. Callers pass in
``today`` (a local ``YYYY-MM-DD`` string) and ``dow`` (0=Sunday .. 6=Saturday)
rather than these functions reading the clock themselves.
"""

from __future__ import annotations

from datetime import date, timedelta
from typing import Any

RECUR_NONE = "none"
RECUR_DAILY = "daily"
RECUR_WEEKDAYS = "weekdays"
RECUR_WEEKLY = "weekly"


# ── numbers ──────────────────────────────────────────────────────────────────

def num(value: Any) -> float:
    """Coerce anything to a finite number; garbage becomes 0."""
    try:
        result = float(value)
    except (TypeError, ValueError):
        return 0.0
    if result != result or result in (float("inf"), float("-inf")):
        return 0.0
    return result


def round2(value: Any) -> float:
    """Round to cents, avoiding float drift from repeated +/- on dollars."""
    return round(num(value) * 100) / 100


def as_int(value: Any) -> int:
    return int(round(num(value)))


# ── dates ────────────────────────────────────────────────────────────────────

def date_key(day: date) -> str:
    return day.strftime("%Y-%m-%d")


def parse_key(key: str) -> date | None:
    try:
        year, month, day = (int(part) for part in key.split("-"))
        return date(year, month, day)
    except (ValueError, AttributeError):
        return None


def weekday_index(day: date) -> int:
    """0=Sunday .. 6=Saturday, matching JavaScript's ``Date.getDay()``."""
    return (day.weekday() + 1) % 7


# ── scheduling ───────────────────────────────────────────────────────────────

def is_chore_due_on(chore: dict, dow: int) -> bool:
    """Whether a chore is scheduled for the given weekday.

    Daily and one-time chores are always due. "weekdays" covers Mon-Fri.
    "weekly" is limited to the days picked for it, and an empty pick list means
    every day so a half-configured chore isn't lost.
    """
    recurrence = chore.get("recurrence") or RECUR_NONE
    if recurrence == RECUR_WEEKDAYS:
        return 1 <= dow <= 5
    if recurrence == RECUR_WEEKLY:
        days = chore.get("recurrenceDays") or []
        return not days or dow in days
    return True


def member_state(chore: dict, member_id: str) -> dict:
    return (chore.get("memberStates") or {}).get(member_id) or {}


def member_chores_all(data: dict, member_id: str) -> list[dict]:
    """Every chore assigned to a member, whatever day it falls on."""
    return [
        chore
        for chore in data.get("chores") or []
        if member_id in (chore.get("assignedTo") or [])
        and not member_state(chore, member_id).get("archived")
    ]


def member_chores(data: dict, member_id: str, dow: int, require_approval: bool) -> list[dict]:
    """Chores a member should see today, with completion flags resolved."""
    result = []
    for chore in member_chores_all(data, member_id):
        if not is_chore_due_on(chore, dow):
            continue
        state = member_state(chore, member_id)
        entry = dict(chore)
        entry["completed"] = bool(state.get("completed"))
        entry["pending"] = bool(
            require_approval and state.get("pending") and not state.get("completed")
        )
        result.append(entry)
    return result


def main_chores(data: dict, member_id: str, dow: int, require_approval: bool) -> list[dict]:
    """Assigned chores excluding extras claimed from the pool."""
    return [
        chore
        for chore in member_chores(data, member_id, dow, require_approval)
        if not chore.get("_poolRef")
    ]


def all_chores_done(data: dict, member_id: str, dow: int, require_approval: bool) -> bool:
    chores = member_chores(data, member_id, dow, require_approval)
    return bool(chores) and all(chore["completed"] for chore in chores)


def all_main_chores_done(data: dict, member_id: str, dow: int, require_approval: bool) -> bool:
    chores = main_chores(data, member_id, dow, require_approval)
    return bool(chores) and all(chore["completed"] for chore in chores)


def find_member(data: dict, member_id: str) -> dict | None:
    for member in data.get("members") or []:
        if member.get("id") == member_id:
            return member
    return None


def find_chore(data: dict, chore_id: str) -> dict | None:
    for chore in data.get("chores") or []:
        if chore.get("id") == chore_id:
            return chore
    return None


def eligible_claimers(data: dict, dow: int, require_approval: bool) -> list[dict]:
    return [
        member
        for member in data.get("members") or []
        if all_chores_done(data, member["id"], dow, require_approval)
    ]


# ── streaks ──────────────────────────────────────────────────────────────────

def streak_run(data: dict, member: dict, today: date) -> dict:
    """Consecutive *chore days* completed, ending today.

    Walks backwards from today. Only days that actually had chores scheduled
    count towards the streak — a day where nothing was asked is skipped, so it
    neither extends the run nor breaks it. Today never breaks a streak because
    the day isn't over yet.

    Counting only scheduled days matters for members whose chores fall on a few
    weekdays: crediting the empty days in between would let a kid with a single
    Saturday chore reach a "7 day streak" after two Saturdays.
    """
    perfect = set(member.get("perfectDays") or [])
    scheduled_chores = [
        chore for chore in member_chores_all(data, member["id"]) if not chore.get("_poolRef")
    ]
    if not scheduled_chores:
        return {"length": 0, "start": None}

    length = 0
    start = None
    for offset in range(120):
        day = today - timedelta(days=offset)
        key = date_key(day)
        dow = weekday_index(day)

        if not any(is_chore_due_on(chore, dow) for chore in scheduled_chores):
            continue  # nothing was asked that day

        if key in perfect:
            length += 1
            start = key
            continue
        if offset == 0:
            continue  # today is still in progress
        break

    return {"length": length, "start": start}


def streak_info(data: dict, member: dict, today: date, streak_days: int) -> dict:
    run = streak_run(data, member, today)
    length = run["length"]
    return {"length": length, "to_go": streak_days - (length % streak_days)}


def update_streak(
    data: dict,
    member_id: str,
    today: date,
    require_approval: bool,
    streak_days: int,
    streak_bonus: int,
) -> int:
    """Record today's result and pay any bonus that has come due.

    Returns the number of bonus points awarded (0 if none).
    """
    member = find_member(data, member_id)
    if not member:
        return 0

    key = date_key(today)
    dow = weekday_index(today)
    perfect_days = list(member.get("perfectDays") or [])

    if all_main_chores_done(data, member_id, dow, require_approval):
        if key not in perfect_days:
            perfect_days.append(key)
    else:
        perfect_days = [day for day in perfect_days if day != key]

    member["perfectDays"] = sorted(set(perfect_days))[-120:]

    run = streak_run(data, member, today)
    streak = member.get("streak") or {"start": None, "awarded": 0}
    if streak.get("start") != run["start"]:
        streak = {"start": run["start"], "awarded": 0}

    awarded = int(streak.get("awarded") or 0)
    due = run["length"] // streak_days if streak_days > 0 else 0
    bonus = 0
    if due > awarded:
        bonus = (due - awarded) * streak_bonus
        member["points"] = num(member.get("points")) + bonus
        streak["awarded"] = due
    elif due < awarded:
        streak["awarded"] = due  # run shortened by an un-check

    member["streak"] = streak
    return bonus


# ── daily maintenance ────────────────────────────────────────────────────────

def retire_finished_one_offs(data: dict, today: str) -> bool:
    """Drop one-time chores once the day they were finished has passed.

    They stay visible, ticked, for the rest of that day so a mis-tap can be
    undone. A chore every assigned member has finished is removed outright.
    Entries with no ``completedDate`` predate this feature and are retired now.
    """
    chores = data.get("chores") or []
    keep: list[dict] = []
    changed = False

    for chore in chores:
        recurrence = chore.get("recurrence") or RECUR_NONE
        if recurrence != RECUR_NONE:
            keep.append(chore)
            continue

        states = chore.setdefault("memberStates", {})
        assigned = chore.get("assignedTo") or []
        for member_id in assigned:
            state = states.get(member_id)
            if not state or not state.get("completed") or state.get("archived"):
                continue
            if state.get("completedDate") != today:
                state["archived"] = True
                changed = True

        everyone_done = bool(assigned) and all(
            (states.get(member_id) or {}).get("archived") for member_id in assigned
        )
        if everyone_done:
            changed = True
        else:
            keep.append(chore)

    if len(keep) != len(chores):
        data["chores"] = keep
    return changed


def check_recurrence_resets(data: dict, today: date) -> bool:
    """Reset recurring chores that are due again, and retire finished one-offs.

    Earnings are kept — points and dollars are only removed when a chore is
    manually unchecked or an admin resets it.
    """
    today_key = date_key(today)
    dow = weekday_index(today)
    changed = retire_finished_one_offs(data, today_key)

    for chore in data.get("chores") or []:
        recurrence = chore.get("recurrence") or RECUR_NONE
        if recurrence == RECUR_NONE:
            continue

        states = chore.setdefault("memberStates", {})
        for member_id in chore.get("assignedTo") or []:
            state = states.setdefault(member_id, {})
            if state.get("lastResetDate") == today_key:
                continue

            should_reset = False
            if recurrence == RECUR_DAILY:
                should_reset = True
            elif recurrence == RECUR_WEEKDAYS and 1 <= dow <= 5:
                should_reset = True
            elif recurrence == RECUR_WEEKLY and dow in (chore.get("recurrenceDays") or []):
                should_reset = True

            if should_reset:
                states[member_id] = {"completed": False, "lastResetDate": today_key}
                changed = True

    return changed
