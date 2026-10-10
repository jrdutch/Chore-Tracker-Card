"""Entities for Chore Tracker.

Two kinds:

* ``sensor.chore_tracker_data`` carries the whole dataset in its attributes.
  This is what the card reads, and Home Assistant pushes attribute changes to
  every connected client for free — that is the live sync.
* one sensor per member, whose numeric state is their points, so balances can
  be graphed, used in conditions and shown on ordinary dashboard cards.
"""

from __future__ import annotations

from homeassistant.components.sensor import SensorEntity, SensorStateClass
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.dispatcher import async_dispatcher_connect
from homeassistant.helpers.device_registry import DeviceEntryType
from homeassistant.helpers.entity import DeviceInfo
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.helpers.entity_registry import async_get as async_get_entity_registry
from homeassistant.util import dt as dt_util

from . import logic
from .const import DOMAIN, SIGNAL_DATA_UPDATED
from .store import ChoreTrackerStore


async def async_setup_entry(
    hass: HomeAssistant, entry: ConfigEntry, async_add_entities: AddEntitiesCallback
) -> None:
    store: ChoreTrackerStore = hass.data[DOMAIN][entry.entry_id]["store"]

    data_sensor = ChoreTrackerDataSensor(entry, store)
    async_add_entities([data_sensor])

    known: set[str] = set()

    @callback
    def sync_member_entities() -> None:
        """Create entities for new members and drop them for deleted ones."""
        current = {m["id"]: m for m in store.data.get("members") or []}

        added = [
            ChoreTrackerMemberSensor(entry, store, member_id)
            for member_id in current
            if member_id not in known
        ]
        if added:
            known.update(m.member_id for m in added)
            async_add_entities(added)

        removed = known - set(current)
        if removed:
            registry = async_get_entity_registry(hass)
            for member_id in removed:
                unique_id = f"{entry.entry_id}_{member_id}"
                entity_id = registry.async_get_entity_id("sensor", DOMAIN, unique_id)
                if entity_id:
                    registry.async_remove(entity_id)
            known.difference_update(removed)

    sync_member_entities()
    entry.async_on_unload(
        async_dispatcher_connect(hass, SIGNAL_DATA_UPDATED, sync_member_entities)
    )


def _device_info(entry: ConfigEntry) -> DeviceInfo:
    return DeviceInfo(
        identifiers={(DOMAIN, entry.entry_id)},
        name="Chore Tracker",
        manufacturer="Chore Tracker",
        entry_type=DeviceEntryType.SERVICE,
    )


class ChoreTrackerBase(SensorEntity):
    _attr_should_poll = False
    _attr_has_entity_name = True

    def __init__(self, entry: ConfigEntry, store: ChoreTrackerStore) -> None:
        self._entry = entry
        self._store = store
        self._attr_device_info = _device_info(entry)

    async def async_added_to_hass(self) -> None:
        self.async_on_remove(
            async_dispatcher_connect(
                self.hass, SIGNAL_DATA_UPDATED, self.async_write_ha_state
            )
        )


class ChoreTrackerDataSensor(ChoreTrackerBase):
    """The card's data source. Exclude from the recorder — see the README."""

    _attr_name = "Data"
    _attr_icon = "mdi:clipboard-list"

    def __init__(self, entry: ConfigEntry, store: ChoreTrackerStore) -> None:
        super().__init__(entry, store)
        self._attr_unique_id = f"{entry.entry_id}_data"

    @property
    def native_value(self) -> int:
        """A small, meaningful number — never the payload itself."""
        return len(self._store.data.get("chores") or [])

    @property
    def extra_state_attributes(self) -> dict:
        data = self._store.data
        history = data.get("history") or []
        return {
            "members": data.get("members") or [],
            "chores": data.get("chores") or [],
            "pool": data.get("pool") or [],
            "rewards": data.get("rewards") or [],
            "settings": data.get("settings") or {},
            # Only the tail rides along; the full log stays out of attributes
            # so the payload (and the recorder's row size) stays bounded.
            # Full log (capped at HISTORY_MAX by the store) — the card saves
            # the whole dataset back, so it must see all of it.
            "history": history,
        }


class ChoreTrackerMemberSensor(ChoreTrackerBase):
    """Points as the state, with today's progress and streak as attributes."""

    _attr_icon = "mdi:account-child"
    _attr_native_unit_of_measurement = "points"
    _attr_state_class = SensorStateClass.MEASUREMENT

    def __init__(self, entry: ConfigEntry, store: ChoreTrackerStore, member_id: str) -> None:
        super().__init__(entry, store)
        self.member_id = member_id
        # Keyed on the internal id, so renaming a member changes the friendly
        # name but keeps the entity id — automations don't break on a typo fix.
        self._attr_unique_id = f"{entry.entry_id}_{member_id}"

    @property
    def _member(self) -> dict | None:
        return logic.find_member(self._store.data, self.member_id)

    @property
    def available(self) -> bool:
        return self._member is not None

    @property
    def name(self) -> str:
        member = self._member
        return member.get("name") if member else self.member_id

    @property
    def native_value(self) -> int:
        member = self._member
        return logic.as_int(member.get("points")) if member else 0

    @property
    def extra_state_attributes(self) -> dict:
        member = self._member
        if not member:
            return {}
        data = self._store.data
        require_approval = bool((data.get("settings") or {}).get("require_approval"))
        today = dt_util.now().date()
        dow = logic.weekday_index(today)

        chores = logic.member_chores(data, self.member_id, dow, require_approval)
        done = sum(1 for chore in chores if chore["completed"])
        pending = sum(1 for chore in chores if chore["pending"])
        streak = logic.streak_run(data, member, today)["length"]

        return {
            "member_id": self.member_id,
            "dollars": logic.round2(member.get("dollars")),
            "streak_days": streak,
            "chores_done": done,
            "chores_total": len(chores),
            "all_done": bool(chores) and done == len(chores),
            "pending_count": pending,
        }
