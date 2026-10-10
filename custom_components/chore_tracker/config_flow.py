"""Config flow for Chore Tracker — a single click, nothing to configure."""

from __future__ import annotations

from homeassistant import config_entries

from .const import DOMAIN


class ChoreTrackerConfigFlow(config_entries.ConfigFlow, domain=DOMAIN):
    """Only one instance makes sense: the family has one chore board."""

    VERSION = 1

    async def async_step_user(self, user_input=None):
        if self._async_current_entries():
            return self.async_abort(reason="single_instance_allowed")
        if user_input is None:
            return self.async_show_form(step_id="user")
        return self.async_create_entry(title="Chore Tracker", data={})
