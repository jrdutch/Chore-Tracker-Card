"""Service handlers — every mutation the card performs.

Each handler mutates the store, fires any matching bus event, then signals
entities to refresh. The card calls these instead of writing the dashboard,
which is what removes the reload.
"""

from __future__ import annotations

import logging
from typing import Any, Callable

import voluptuous as vol
from homeassistant.core import HomeAssistant, ServiceCall
from homeassistant.helpers import config_validation as cv
from homeassistant.helpers.dispatcher import async_dispatcher_send
from homeassistant.util import dt as dt_util

from . import logic
from .const import (
    DOMAIN,
    EVENT_ALL_DONE,
    EVENT_BALANCE_ADJUSTED,
    EVENT_CASH_OUT,
    EVENT_CHORE_COMPLETED,
    EVENT_CHORE_PENDING,
    EVENT_CHORE_REJECTED,
    EVENT_REWARD_REDEEMED,
    EVENT_STREAK_ADJUSTED,
    EVENT_STREAK_BONUS,
    SIGNAL_DATA_UPDATED,
)
from .store import ChoreTrackerStore, new_id

_LOGGER = logging.getLogger(__name__)

MEMBER_ID = vol.Schema({vol.Required("member_id"): cv.string})
CHORE_MEMBER = vol.Schema(
    {vol.Required("chore_id"): cv.string, vol.Required("member_id"): cv.string}
)


def _today(hass: HomeAssistant):
    """Local calendar date — chores roll over at the family's midnight."""
    return dt_util.now().date()


class ChoreTrackerServices:
    """Registers and implements the integration's services."""

    def __init__(self, hass: HomeAssistant, store: ChoreTrackerStore) -> None:
        self.hass = hass
        self.store = store

    # ── plumbing ─────────────────────────────────────────────────────────

    @property
    def data(self) -> dict[str, Any]:
        return self.store.data

    @property
    def require_approval(self) -> bool:
        return bool(self.store.setting("require_approval"))

    def _commit(self) -> None:
        self.store.async_schedule_save()
        async_dispatcher_send(self.hass, SIGNAL_DATA_UPDATED)

    def _fire(self, event: str, payload: dict[str, Any]) -> None:
        self.hass.bus.async_fire(event, payload)

    def _member(self, member_id: str) -> dict | None:
        return logic.find_member(self.data, member_id)

    def _log(self, entry: dict[str, Any]) -> None:
        history = self.data.setdefault("history", [])
        history.append({"id": new_id(), "date": logic.date_key(_today(self.hass)), **entry})

    def _update_streak(self, member_id: str) -> None:
        bonus = logic.update_streak(
            self.data,
            member_id,
            _today(self.hass),
            self.require_approval,
            int(self.store.setting("streak_days") or 7),
            int(self.store.setting("streak_bonus") or 5),
        )
        if bonus:
            member = self._member(member_id)
            run = logic.streak_run(self.data, member, _today(self.hass)) if member else {"length": 0}
            self._fire(
                EVENT_STREAK_BONUS,
                {
                    "member": member.get("name") if member else "",
                    "days": run["length"],
                    "points": bonus,
                },
            )

    def _after_completion(self, chore: dict, member: dict) -> None:
        """Events and streak upkeep shared by the toggle and approve paths."""
        self._fire(
            EVENT_CHORE_COMPLETED,
            {
                "member": member.get("name"),
                "chore": chore.get("title"),
                "points": logic.num(chore.get("points")),
                "dollars": logic.num(chore.get("dollars")),
            },
        )
        dow = logic.weekday_index(_today(self.hass))
        if logic.all_chores_done(self.data, member["id"], dow, self.require_approval):
            self._fire(
                EVENT_ALL_DONE,
                {
                    "member": member.get("name"),
                    "total_points": logic.num(member.get("points")),
                    "total_dollars": logic.num(member.get("dollars")),
                },
            )

    # ── chores ───────────────────────────────────────────────────────────

    async def toggle_chore(self, call: ServiceCall) -> None:
        chore = logic.find_chore(self.data, call.data["chore_id"])
        member = self._member(call.data["member_id"])
        if not chore or not member:
            return
        states = chore.setdefault("memberStates", {})
        state = states.setdefault(member["id"], {})

        if self.require_approval:
            # Tapping requests approval; points wait for an admin.
            if state.get("completed"):
                return
            if state.get("pending"):
                state["pending"] = False
            else:
                state["pending"] = True
                self._fire(
                    EVENT_CHORE_PENDING,
                    {"member": member.get("name"), "chore": chore.get("title")},
                )
            self._commit()
            return

        was_completed = bool(state.get("completed"))
        state["completed"] = not was_completed
        state["pending"] = False
        if state["completed"]:
            state["completedDate"] = logic.date_key(_today(self.hass))
        else:
            state.pop("completedDate", None)

        points = logic.num(chore.get("points"))
        dollars = logic.num(chore.get("dollars"))
        if was_completed:
            member["points"] = max(0, logic.num(member.get("points")) - points)
            member["dollars"] = max(0.0, logic.round2(logic.num(member.get("dollars")) - dollars))
        else:
            member["points"] = logic.num(member.get("points")) + points
            member["dollars"] = logic.round2(logic.num(member.get("dollars")) + dollars)
            self._after_completion(chore, member)

        self._update_streak(member["id"])
        self._commit()

    async def approve_chore(self, call: ServiceCall) -> None:
        chore = logic.find_chore(self.data, call.data["chore_id"])
        member = self._member(call.data["member_id"])
        if not chore or not member:
            return
        state = (chore.get("memberStates") or {}).get(member["id"])
        if not state or not state.get("pending") or state.get("completed"):
            return

        state["pending"] = False
        state["completed"] = True
        state["completedDate"] = logic.date_key(_today(self.hass))
        member["points"] = logic.num(member.get("points")) + logic.num(chore.get("points"))
        member["dollars"] = logic.round2(
            logic.num(member.get("dollars")) + logic.num(chore.get("dollars"))
        )

        self._after_completion(chore, member)
        self._update_streak(member["id"])
        self._commit()

    async def reject_chore(self, call: ServiceCall) -> None:
        chore = logic.find_chore(self.data, call.data["chore_id"])
        if not chore:
            return
        state = (chore.get("memberStates") or {}).get(call.data["member_id"])
        if not state or not state.get("pending"):
            return
        state["pending"] = False
        member = self._member(call.data["member_id"])
        self._fire(
            EVENT_CHORE_REJECTED,
            {"member": member.get("name") if member else "", "chore": chore.get("title")},
        )
        self._commit()

    async def reset_chore(self, call: ServiceCall) -> None:
        """Clear completion for one member, or everyone when member_id is absent."""
        chore = logic.find_chore(self.data, call.data["chore_id"])
        if not chore:
            return
        states = chore.setdefault("memberStates", {})
        targets = (
            [call.data["member_id"]]
            if call.data.get("member_id")
            else list(chore.get("assignedTo") or [])
        )
        for member_id in targets:
            state = states.get(member_id)
            if state and state.get("completed"):
                member = self._member(member_id)
                if member:
                    member["points"] = max(
                        0, logic.num(member.get("points")) - logic.num(chore.get("points"))
                    )
                    member["dollars"] = max(
                        0.0,
                        logic.round2(
                            logic.num(member.get("dollars")) - logic.num(chore.get("dollars"))
                        ),
                    )
            states.pop(member_id, None)
            self._update_streak(member_id)
        self._commit()

    async def add_chore(self, call: ServiceCall) -> None:
        self.data.setdefault("chores", []).append(
            {
                "id": new_id(),
                "title": call.data["title"],
                "emoji": call.data.get("emoji", ""),
                "points": logic.as_int(call.data.get("points")),
                "dollars": logic.round2(call.data.get("dollars")),
                "recurrence": call.data.get("recurrence", "none"),
                "recurrenceDays": call.data.get("recurrence_days") or [],
                "assignedTo": call.data.get("assigned_to") or [],
                "memberStates": {},
            }
        )
        self._commit()

    async def update_chore(self, call: ServiceCall) -> None:
        chore = logic.find_chore(self.data, call.data["chore_id"])
        if not chore:
            return
        for key, field in (
            ("title", "title"),
            ("emoji", "emoji"),
            ("recurrence", "recurrence"),
        ):
            if key in call.data:
                chore[field] = call.data[key]
        if "points" in call.data:
            chore["points"] = logic.as_int(call.data["points"])
        if "dollars" in call.data:
            chore["dollars"] = logic.round2(call.data["dollars"])
        if "recurrence_days" in call.data:
            chore["recurrenceDays"] = call.data["recurrence_days"] or []
        if "assigned_to" in call.data:
            chore["assignedTo"] = call.data["assigned_to"] or []
        self._commit()

    async def delete_chore(self, call: ServiceCall) -> None:
        chore_id = call.data["chore_id"]
        self.data["chores"] = [c for c in self.data.get("chores", []) if c.get("id") != chore_id]
        self._commit()

    async def reorder_chore(self, call: ServiceCall) -> None:
        self._move(self.data.setdefault("chores", []), call.data["chore_id"], call.data["delta"])
        self._commit()

    # ── pool ─────────────────────────────────────────────────────────────

    async def add_pool_chore(self, call: ServiceCall) -> None:
        self.data.setdefault("pool", []).append(
            {
                "id": new_id(),
                "title": call.data["title"],
                "emoji": call.data.get("emoji", ""),
                "points": logic.as_int(call.data.get("points")),
                "dollars": logic.round2(call.data.get("dollars")),
                "claimedBy": None,
            }
        )
        self._commit()

    async def update_pool_chore(self, call: ServiceCall) -> None:
        chore = next(
            (c for c in self.data.get("pool", []) if c.get("id") == call.data["chore_id"]), None
        )
        if not chore:
            return
        for key in ("title", "emoji"):
            if key in call.data:
                chore[key] = call.data[key]
        if "points" in call.data:
            chore["points"] = logic.as_int(call.data["points"])
        if "dollars" in call.data:
            chore["dollars"] = logic.round2(call.data["dollars"])
        self._commit()

    async def delete_pool_chore(self, call: ServiceCall) -> None:
        pool_id = call.data["chore_id"]
        self.data["pool"] = [c for c in self.data.get("pool", []) if c.get("id") != pool_id]
        self.data["chores"] = [
            c for c in self.data.get("chores", []) if c.get("_poolRef") != pool_id
        ]
        self._commit()

    async def reorder_pool_chore(self, call: ServiceCall) -> None:
        self._move(self.data.setdefault("pool", []), call.data["chore_id"], call.data["delta"])
        self._commit()

    async def claim_pool_chore(self, call: ServiceCall) -> None:
        pool_chore = next(
            (c for c in self.data.get("pool", []) if c.get("id") == call.data["chore_id"]), None
        )
        member = self._member(call.data["member_id"])
        if not pool_chore or not member or pool_chore.get("claimedBy"):
            return
        dow = logic.weekday_index(_today(self.hass))
        if not logic.all_chores_done(self.data, member["id"], dow, self.require_approval):
            return

        points = logic.num(pool_chore.get("points"))
        dollars = logic.num(pool_chore.get("dollars"))
        reward_type = call.data.get("reward_type")
        has_both = points > 0 and dollars > 0
        take_points = reward_type == "points" if has_both else points > 0
        take_dollars = reward_type == "dollars" if has_both else dollars > 0

        self.data.setdefault("chores", []).append(
            {
                "id": new_id(),
                "title": pool_chore.get("title"),
                "emoji": pool_chore.get("emoji"),
                "points": points if take_points else 0,
                "dollars": dollars if take_dollars else 0,
                "assignedTo": [member["id"]],
                "memberStates": {},
                "recurrence": "none",
                "_poolRef": pool_chore["id"],
            }
        )
        pool_chore["claimedBy"] = member["id"]
        self._commit()

    async def unclaim_pool_chore(self, call: ServiceCall) -> None:
        pool_id = call.data["chore_id"]
        chore = next((c for c in self.data.get("pool", []) if c.get("id") == pool_id), None)
        if chore:
            chore["claimedBy"] = None
        self.data["chores"] = [
            c for c in self.data.get("chores", []) if c.get("_poolRef") != pool_id
        ]
        self._commit()

    # ── members ──────────────────────────────────────────────────────────

    async def add_member(self, call: ServiceCall) -> None:
        self.data.setdefault("members", []).append(
            {
                "id": new_id(),
                "name": call.data["name"],
                "avatar": call.data.get("avatar", ""),
                "points": logic.as_int(call.data.get("points")),
                "dollars": logic.round2(call.data.get("dollars")),
                "perfectDays": [],
                "streak": {"start": None, "awarded": 0},
            }
        )
        self._commit()

    async def update_member(self, call: ServiceCall) -> None:
        member = self._member(call.data["member_id"])
        if not member:
            return
        if "name" in call.data:
            member["name"] = call.data["name"]
        if "avatar" in call.data:
            member["avatar"] = call.data["avatar"]

        # Manual balance edits are logged so a balance never moves silently.
        d_points = 0
        d_dollars = 0.0
        if "points" in call.data:
            target = max(0, logic.as_int(call.data["points"]))
            d_points = target - logic.as_int(member.get("points"))
            member["points"] = target
        if "dollars" in call.data:
            target = max(0.0, logic.round2(call.data["dollars"]))
            d_dollars = logic.round2(target - logic.num(member.get("dollars")))
            member["dollars"] = target
        if d_points or d_dollars:
            self._log(
                {
                    "memberId": member["id"],
                    "type": "adjust",
                    "label": "Adjustment",
                    "emoji": "✏️",
                    "points": d_points,
                    "dollars": d_dollars,
                }
            )
            self._fire(
                EVENT_BALANCE_ADJUSTED,
                {
                    "member": member.get("name"),
                    "points_change": d_points,
                    "dollars_change": d_dollars,
                    "points": logic.num(member.get("points")),
                    "dollars": logic.num(member.get("dollars")),
                },
            )

        if "streak" in call.data:
            before = logic.streak_run(self.data, member, _today(self.hass))["length"]
            after = max(0, logic.as_int(call.data["streak"]))
            if after != before:
                logic.set_streak(
                    self.data,
                    member,
                    after,
                    _today(self.hass),
                    int(self.store.setting("streak_days") or 7),
                )
                self._log(
                    {
                        "memberId": member["id"],
                        "type": "streak",
                        "label": f"Streak set to {after} (was {before})",
                        "emoji": "🔥",
                    }
                )
                self._fire(
                    EVENT_STREAK_ADJUSTED,
                    {"member": member.get("name"), "from": before, "to": after},
                )
        self._commit()

    async def delete_member(self, call: ServiceCall) -> None:
        member_id = call.data["member_id"]
        self.data["members"] = [
            m for m in self.data.get("members", []) if m.get("id") != member_id
        ]
        for chore in self.data.get("chores", []):
            chore["assignedTo"] = [m for m in (chore.get("assignedTo") or []) if m != member_id]
            (chore.get("memberStates") or {}).pop(member_id, None)
        self._commit()

    async def reset_earnings(self, call: ServiceCall) -> None:
        member = self._member(call.data["member_id"])
        if not member:
            return
        member["points"] = 0
        member["dollars"] = 0
        self._commit()

    # ── rewards ──────────────────────────────────────────────────────────

    async def add_reward(self, call: ServiceCall) -> None:
        self.data.setdefault("rewards", []).append(
            {
                "id": new_id(),
                "label": call.data["label"],
                "emoji": call.data.get("emoji", ""),
                "cost": logic.as_int(call.data.get("cost")),
            }
        )
        self._commit()

    async def update_reward(self, call: ServiceCall) -> None:
        reward = next(
            (r for r in self.data.get("rewards", []) if r.get("id") == call.data["reward_id"]),
            None,
        )
        if not reward:
            return
        for key in ("label", "emoji"):
            if key in call.data:
                reward[key] = call.data[key]
        if "cost" in call.data:
            reward["cost"] = logic.as_int(call.data["cost"])
        self._commit()

    async def delete_reward(self, call: ServiceCall) -> None:
        reward_id = call.data["reward_id"]
        self.data["rewards"] = [
            r for r in self.data.get("rewards", []) if r.get("id") != reward_id
        ]
        self._commit()

    async def reorder_reward(self, call: ServiceCall) -> None:
        self._move(self.data.setdefault("rewards", []), call.data["reward_id"], call.data["delta"])
        self._commit()

    async def redeem_reward(self, call: ServiceCall) -> None:
        member = self._member(call.data["member_id"])
        reward = next(
            (r for r in self.data.get("rewards", []) if r.get("id") == call.data["reward_id"]),
            None,
        )
        if not member or not reward:
            return
        cost = logic.as_int(reward.get("cost"))
        if logic.num(member.get("points")) < cost:
            return
        member["points"] = logic.num(member.get("points")) - cost
        self._log(
            {
                "memberId": member["id"],
                "type": "reward",
                "label": reward.get("label"),
                "emoji": reward.get("emoji"),
                "points": cost,
            }
        )
        self._fire(
            EVENT_REWARD_REDEEMED,
            {
                "member": member.get("name"),
                "reward": reward.get("label"),
                "points": cost,
                "points_remaining": logic.num(member.get("points")),
            },
        )
        self._commit()

    async def cash_out(self, call: ServiceCall) -> None:
        member = self._member(call.data["member_id"])
        if not member:
            return
        amount = logic.round2(member.get("dollars"))
        if amount <= 0:
            return
        member["dollars"] = 0
        self._log(
            {
                "memberId": member["id"],
                "type": "cash",
                "label": "Cash Out",
                "emoji": "💵",
                "dollars": amount,
            }
        )
        self._fire(EVENT_CASH_OUT, {"member": member.get("name"), "amount": amount})
        self._commit()

    # ── settings & system ────────────────────────────────────────────────

    async def set_settings(self, call: ServiceCall) -> None:
        settings = self.data.setdefault("settings", {})
        for key in ("require_approval", "streak_days", "streak_bonus"):
            if key in call.data:
                settings[key] = call.data[key]
        self._commit()

    async def import_data(self, call: ServiceCall) -> None:
        """One-time import of the card's old dashboard-stored data.

        Guarded by the store being empty so a repeated call can't duplicate
        members or double-count points.
        """
        if not self.store.is_empty and not call.data.get("force"):
            _LOGGER.info("chore_tracker: import skipped, data already present")
            return
        payload = call.data.get("data") or {}
        for key in ("members", "chores", "pool", "rewards", "history"):
            value = payload.get(key)
            if isinstance(value, list):
                self.data[key] = value
        if isinstance(payload.get("settings"), dict):
            self.data["settings"].update(payload["settings"])
        _LOGGER.info(
            "chore_tracker: imported %s members and %s chores",
            len(self.data.get("members", [])),
            len(self.data.get("chores", [])),
        )
        await self.store.async_save_now()
        async_dispatcher_send(self.hass, SIGNAL_DATA_UPDATED)

    async def run_daily_maintenance(self, call: ServiceCall | None = None) -> None:
        """Recurrence resets, one-off retirement and streak upkeep."""
        changed = logic.check_recurrence_resets(self.data, _today(self.hass))
        for member in list(self.data.get("members") or []):
            self._update_streak(member["id"])
        if changed:
            _LOGGER.debug("chore_tracker: daily maintenance applied resets")
        self._commit()

    # ── helpers ──────────────────────────────────────────────────────────

    @staticmethod
    def _move(items: list[dict], item_id: str, delta: int) -> None:
        index = next((i for i, item in enumerate(items) if item.get("id") == item_id), -1)
        target = index + delta
        if index < 0 or target < 0 or target >= len(items):
            return
        items[index], items[target] = items[target], items[index]


SERVICE_SCHEMAS: dict[str, vol.Schema] = {
    "toggle_chore": CHORE_MEMBER,
    "approve_chore": CHORE_MEMBER,
    "reject_chore": CHORE_MEMBER,
    "reset_chore": vol.Schema(
        {vol.Required("chore_id"): cv.string, vol.Optional("member_id"): cv.string}
    ),
    "add_chore": vol.Schema(
        {
            vol.Required("title"): cv.string,
            vol.Optional("emoji"): cv.string,
            vol.Optional("points"): vol.Coerce(float),
            vol.Optional("dollars"): vol.Coerce(float),
            vol.Optional("recurrence"): cv.string,
            vol.Optional("recurrence_days"): [vol.Coerce(int)],
            vol.Optional("assigned_to"): [cv.string],
        }
    ),
    "update_chore": vol.Schema(
        {
            vol.Required("chore_id"): cv.string,
            vol.Optional("title"): cv.string,
            vol.Optional("emoji"): cv.string,
            vol.Optional("points"): vol.Coerce(float),
            vol.Optional("dollars"): vol.Coerce(float),
            vol.Optional("recurrence"): cv.string,
            vol.Optional("recurrence_days"): [vol.Coerce(int)],
            vol.Optional("assigned_to"): [cv.string],
        }
    ),
    "delete_chore": vol.Schema({vol.Required("chore_id"): cv.string}),
    "reorder_chore": vol.Schema(
        {vol.Required("chore_id"): cv.string, vol.Required("delta"): vol.Coerce(int)}
    ),
    "add_pool_chore": vol.Schema(
        {
            vol.Required("title"): cv.string,
            vol.Optional("emoji"): cv.string,
            vol.Optional("points"): vol.Coerce(float),
            vol.Optional("dollars"): vol.Coerce(float),
        }
    ),
    "update_pool_chore": vol.Schema(
        {
            vol.Required("chore_id"): cv.string,
            vol.Optional("title"): cv.string,
            vol.Optional("emoji"): cv.string,
            vol.Optional("points"): vol.Coerce(float),
            vol.Optional("dollars"): vol.Coerce(float),
        }
    ),
    "delete_pool_chore": vol.Schema({vol.Required("chore_id"): cv.string}),
    "reorder_pool_chore": vol.Schema(
        {vol.Required("chore_id"): cv.string, vol.Required("delta"): vol.Coerce(int)}
    ),
    "claim_pool_chore": vol.Schema(
        {
            vol.Required("chore_id"): cv.string,
            vol.Required("member_id"): cv.string,
            vol.Optional("reward_type"): vol.In(["points", "dollars"]),
        }
    ),
    "unclaim_pool_chore": vol.Schema({vol.Required("chore_id"): cv.string}),
    "add_member": vol.Schema(
        {
            vol.Required("name"): cv.string,
            vol.Optional("avatar"): cv.string,
            vol.Optional("points"): vol.Coerce(float),
            vol.Optional("dollars"): vol.Coerce(float),
        }
    ),
    "update_member": vol.Schema(
        {
            vol.Required("member_id"): cv.string,
            vol.Optional("name"): cv.string,
            vol.Optional("avatar"): cv.string,
            vol.Optional("points"): vol.Coerce(float),
            vol.Optional("dollars"): vol.Coerce(float),
            vol.Optional("streak"): vol.Coerce(int),
        }
    ),
    "delete_member": MEMBER_ID,
    "reset_earnings": MEMBER_ID,
    "add_reward": vol.Schema(
        {
            vol.Required("label"): cv.string,
            vol.Optional("emoji"): cv.string,
            vol.Optional("cost"): vol.Coerce(float),
        }
    ),
    "update_reward": vol.Schema(
        {
            vol.Required("reward_id"): cv.string,
            vol.Optional("label"): cv.string,
            vol.Optional("emoji"): cv.string,
            vol.Optional("cost"): vol.Coerce(float),
        }
    ),
    "delete_reward": vol.Schema({vol.Required("reward_id"): cv.string}),
    "reorder_reward": vol.Schema(
        {vol.Required("reward_id"): cv.string, vol.Required("delta"): vol.Coerce(int)}
    ),
    "redeem_reward": vol.Schema(
        {vol.Required("member_id"): cv.string, vol.Required("reward_id"): cv.string}
    ),
    "cash_out": MEMBER_ID,
    "set_settings": vol.Schema(
        {
            vol.Optional("require_approval"): cv.boolean,
            vol.Optional("streak_days"): vol.Coerce(int),
            vol.Optional("streak_bonus"): vol.Coerce(int),
        }
    ),
    "import_data": vol.Schema(
        {vol.Required("data"): dict, vol.Optional("force"): cv.boolean}
    ),
    "run_daily_maintenance": vol.Schema({}),
}


def async_register_services(hass: HomeAssistant, services: ChoreTrackerServices) -> None:
    for name, schema in SERVICE_SCHEMAS.items():
        handler: Callable = getattr(services, name)
        hass.services.async_register(DOMAIN, name, handler, schema=schema)


def async_unregister_services(hass: HomeAssistant) -> None:
    for name in SERVICE_SCHEMAS:
        hass.services.async_remove(DOMAIN, name)
