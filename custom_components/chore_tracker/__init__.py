"""Chore Tracker integration.

Stores the family's chore data in Home Assistant rather than in the Lovelace
dashboard config. The card reads an entity and writes through services, so
saving a chore no longer makes Home Assistant rebuild the dashboard.
"""

from __future__ import annotations

import logging

from homeassistant.config_entries import ConfigEntry
from homeassistant.const import Platform
from homeassistant.core import HomeAssistant
from homeassistant.helpers.event import async_track_time_change

from .const import DOMAIN
from .frontend import async_setup_frontend
from .services import (
    ChoreTrackerServices,
    async_register_services,
    async_unregister_services,
)
from .store import ChoreTrackerStore

_LOGGER = logging.getLogger(__name__)

PLATFORMS = [Platform.SENSOR]


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    store = ChoreTrackerStore(hass)
    await store.async_load()

    services = ChoreTrackerServices(hass, store)
    hass.data.setdefault(DOMAIN, {})[entry.entry_id] = {
        "store": store,
        "services": services,
    }

    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
    async_register_services(hass, services)
    await async_setup_frontend(hass)

    # Catch up on any days Home Assistant was off, then keep the rollover
    # honest whether or not a browser is open — the card no longer has to be
    # loaded for chores to reset.
    await services.run_daily_maintenance()

    async def _midnight(_now) -> None:
        await services.run_daily_maintenance()

    entry.async_on_unload(
        async_track_time_change(hass, _midnight, hour=0, minute=0, second=5)
    )

    _LOGGER.info(
        "chore_tracker: ready with %s members and %s chores",
        len(store.data.get("members", [])),
        len(store.data.get("chores", [])),
    )
    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    unloaded = await hass.config_entries.async_unload_platforms(entry, PLATFORMS)
    if unloaded:
        entry_data = hass.data[DOMAIN].pop(entry.entry_id, None)
        if entry_data:
            await entry_data["store"].async_save_now()
        if not hass.data[DOMAIN]:
            async_unregister_services(hass)
            hass.data.pop(DOMAIN, None)
    return unloaded
