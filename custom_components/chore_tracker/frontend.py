"""Serves the bundled Lovelace card and registers it as a resource.

Mirrors the approach chores4kids uses: copy the JS into ``/config/www`` and add
a Lovelace resource pointing at it, with a content hash in the query string so
browsers pick up a new build instead of serving a stale cached one.
"""

from __future__ import annotations

import hashlib
import logging
import shutil
from pathlib import Path

from homeassistant.core import HomeAssistant

_LOGGER = logging.getLogger(__name__)

CARD_FILENAME = "chore-tracker-card.js"
RESOURCE_URL = f"/local/{CARD_FILENAME}"


def _hash(path: Path) -> str:
    digest = hashlib.sha256()
    digest.update(path.read_bytes())
    return digest.hexdigest()[:12]


def _copy_card(hass: HomeAssistant) -> str | None:
    """Copy the bundled card into /config/www, returning its content hash."""
    source = Path(__file__).parent / "www" / CARD_FILENAME
    if not source.is_file():
        _LOGGER.warning("chore_tracker: bundled card missing at %s", source)
        return None

    www = Path(hass.config.path("www"))
    www.mkdir(parents=True, exist_ok=True)
    target = www / CARD_FILENAME

    token = _hash(source)
    if not target.is_file() or _hash(target) != token:
        shutil.copyfile(source, target)
        _LOGGER.info("chore_tracker: installed %s", target)
    return token


async def async_setup_frontend(hass: HomeAssistant) -> None:
    """Install the card and make sure Lovelace knows about it."""
    token = await hass.async_add_executor_job(_copy_card, hass)
    if not token:
        return

    url = f"{RESOURCE_URL}?v={token}"
    try:
        await _register_resource(hass, url)
    except Exception:  # noqa: BLE001 - never block setup over a resource entry
        _LOGGER.exception(
            "chore_tracker: could not register the Lovelace resource. "
            "Add %s manually under Settings > Dashboards > Resources", url
        )


async def _register_resource(hass: HomeAssistant, url: str) -> None:
    lovelace = hass.data.get("lovelace")
    resources = getattr(lovelace, "resources", None) if lovelace else None
    if resources is None:
        _LOGGER.debug("chore_tracker: Lovelace resources unavailable (YAML mode?)")
        return

    if hasattr(resources, "async_load") and not getattr(resources, "loaded", False):
        await resources.async_load()
        resources.loaded = True

    existing = [
        item
        for item in resources.async_items()
        if str(item.get("url", "")).split("?")[0] == RESOURCE_URL
    ]

    if not existing:
        await resources.async_create_item({"res_type": "module", "url": url})
        _LOGGER.info("chore_tracker: registered Lovelace resource %s", url)
        return

    # Refresh the cache-busting token when the bundled card changes.
    current = existing[0]
    if current.get("url") != url:
        await resources.async_update_item(current["id"], {"res_type": "module", "url": url})
        _LOGGER.info("chore_tracker: updated Lovelace resource to %s", url)
