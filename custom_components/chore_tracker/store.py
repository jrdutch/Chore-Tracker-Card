"""Persistent storage for Chore Tracker.

Holds the family's chore data in Home Assistant's own ``.storage`` rather than
in the Lovelace dashboard config, which is what lets the card save without
triggering a dashboard rebuild.
"""

from __future__ import annotations

import logging
import uuid
from typing import Any

from homeassistant.core import HomeAssistant
from homeassistant.helpers.storage import Store

from .const import DEFAULT_REWARDS, DEFAULT_SETTINGS, HISTORY_MAX, STORAGE_KEY, STORAGE_VERSION

_LOGGER = logging.getLogger(__name__)


def new_id() -> str:
    """Short opaque id, same shape the card has always generated."""
    return uuid.uuid4().hex[:8]


def empty_data() -> dict[str, Any]:
    return {
        "members": [],
        "chores": [],
        "pool": [],
        "rewards": [],
        "history": [],
        "settings": dict(DEFAULT_SETTINGS),
    }


class ChoreTrackerStore:
    """Thin wrapper around ``Store`` with the shape the card expects."""

    def __init__(self, hass: HomeAssistant) -> None:
        self._store = Store(hass, STORAGE_VERSION, STORAGE_KEY)
        self.data: dict[str, Any] = empty_data()

    async def async_load(self) -> dict[str, Any]:
        stored = await self._store.async_load()
        if stored:
            self.data = self._normalise(stored)
        else:
            self.data = empty_data()
            self.data["rewards"] = [dict(r, id=new_id()) for r in DEFAULT_REWARDS]
        return self.data

    @staticmethod
    def _normalise(stored: dict[str, Any]) -> dict[str, Any]:
        """Tolerate partial or older payloads without losing what is there."""
        data = empty_data()
        for key in ("members", "chores", "pool", "rewards", "history"):
            value = stored.get(key)
            if isinstance(value, list):
                data[key] = value
        settings = stored.get("settings")
        if isinstance(settings, dict):
            data["settings"] = {**DEFAULT_SETTINGS, **settings}
        return data

    @property
    def is_empty(self) -> bool:
        """True when nothing has been set up yet — used to guard the import."""
        return not self.data.get("members") and not self.data.get("chores")

    def setting(self, key: str) -> Any:
        return self.data.get("settings", {}).get(key, DEFAULT_SETTINGS.get(key))

    def trim_history(self) -> None:
        history = self.data.get("history") or []
        if len(history) > HISTORY_MAX:
            self.data["history"] = history[-HISTORY_MAX:]

    def async_schedule_save(self) -> None:
        """Queue a debounced write; several rapid changes collapse into one."""
        self.trim_history()
        self._store.async_delay_save(lambda: self.data, 2)

    async def async_save_now(self) -> None:
        self.trim_history()
        await self._store.async_save(self.data)
