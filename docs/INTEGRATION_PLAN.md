# Implementation Plan — Chore Tracker Integration (v2.0.0)

Moving chore data out of the Lovelace dashboard config and into a Home Assistant
custom integration, so saving a chore no longer forces a dashboard reload.

Modelled on [`qlerup/chores4kids`](https://github.com/qlerup/chores4kids), which
solves the same problem with a single HACS repository: an integration that
bundles and auto-registers its own Lovelace card.

---

## Assumptions (override before we start)

| Decision | Assumed | Consequence if changed |
| --- | --- | --- |
| Integration domain | `chore_tracker` | Becomes the service prefix (`chore_tracker.toggle_chore`) and entity prefix. Changing it later is a breaking change for automations. |
| Per-member sensors | **Yes**, one per member | Skipping them means automations must dig through JSON attributes and you lose points history/graphs. |
| Repository | Convert **this** repo to HACS category `integration` | Alternative is a second repo; converting keeps the stars, topics, screenshot and history. Requires existing installs to remove and re-add the custom repo as "Integration". |

---

## 1. Why this fixes the problem

Today the card stores its data inside the dashboard configuration. Writing that
makes Home Assistant broadcast a config change, and every client rebuilds the
whole view — the reload the kids are complaining about. No card can suppress it.

The integration approach replaces both halves of that:

- **Reads** come from entity attributes. HA already pushes state changes to every
  connected client over its existing websocket, so a change on one device appears
  on all others in milliseconds. Free live sync, no polling, no dashboard write.
- **Writes** are service calls (`hass.callService('chore_tracker', ...)`), which
  touch nothing the dashboard cares about. **No reload, ever.**

Everything deleted as a result: the 8-second sync debounce, scroll restoration,
save-conflict handling, the sync-failure banner, and the whole
`lovelace/config/save` path.

---

## 2. Repository layout after the change

```
custom_components/chore_tracker/
  __init__.py            setup/teardown, dispatcher wiring, daily scheduler
  manifest.json          domain, version, config_flow, iot_class: local_push
  const.py               domain, signals, defaults, storage key
  config_flow.py         one-click "Add Integration", single instance
  store.py               Store wrapper, schema version + migrations
  logic.py               PURE functions ported 1:1 from the card's JS
  services.py            service handlers
  services.yaml          service definitions (gives the HA UI its forms)
  sensor.py              data sensor + per-member sensors
  frontend.py            copy card JS to /config/www + auto-register resource
  translations/en.json   config flow strings
  www/
    chore-tracker-card.js    built bundle (build output target)

src/                     card source (UI code unchanged)
tools/screenshot.mjs     pre-release render + assertion harness
hacs.json                category becomes "integration"
```

The esbuild step changes its output target to
`custom_components/chore_tracker/www/chore-tracker-card.js`. A copy stays at the
repo root during the transition so manual installs keep working.

---

## 3. Data model

The stored shape is **unchanged** from what the card uses today, so the port is
mechanical:

```jsonc
{
  "members":  [{ "id", "name", "avatar", "points", "dollars",
                 "perfectDays": [], "streak": { "start", "awarded" } }],
  "chores":   [{ "id", "title", "emoji", "points", "dollars",
                 "recurrence", "recurrenceDays": [], "assignedTo": [],
                 "memberStates": { "<memberId>": { "completed", "pending",
                                    "completedDate", "lastResetDate", "archived" } },
                 "_poolRef" }],
  "pool":     [{ "id", "title", "emoji", "points", "dollars", "claimedBy" }],
  "rewards":  [{ "id", "label", "emoji", "cost" }],
  "history":  [{ "id", "memberId", "type", "label", "emoji",
                 "points", "dollars", "date" }],
  "settings": { "require_approval": false, "streak_days": 7, "streak_bonus": 5 }
}
```

### Where settings live

The in-card **admin console (⚙️ gear) does not change** — same card, same gear,
same tabs, same password prompt. The only shift is which of the *dashboard card
editor's* options survive.

The principle: **card config = how this card looks for this viewer**;
**integration settings = family-wide rules the server enforces**.

| Setting | Today | After | Why |
| --- | --- | --- | --- |
| `title` | Card editor | Card editor | Presentation, per-card |
| `language` | Card editor | Card editor | Per-viewer presentation |
| `show_family_totals` | Card editor | Card editor | Presentation, per-card |
| `admin_password` | Card editor | Card editor | Stays put — a client-side gate, and keeping it here avoids any lock-out risk |
| `require_approval` | Card editor | **Admin console** | The server enforces it, so it must be one family-wide value, not per-card |
| `sync_delay_seconds` | Card editor | *removed* | No debounce needed — writes no longer touch the dashboard |
| `lovelace_url_path` | Card editor | *removed* | Nothing to locate in the dashboard config any more |
| `storage_key` | Card config | *removed* | The integration owns the data |

Two new family-wide values also live in `settings` and become editable from the
admin console: `streak_days` (7) and `streak_bonus` (5), which are currently
hard-coded constants.

Storage: `homeassistant.helpers.storage.Store(hass, 1, "chore_tracker")` with
delayed writes, a schema version, and a migration hook.

---

## 4. Services

Roughly 24 handlers, one per mutation the card performs today. Every handler
validates with `voluptuous`, mutates the store, then fires
`async_dispatcher_send(hass, SIGNAL_DATA_UPDATED)` so sensors refresh.

| Area | Services |
| --- | --- |
| Members | `add_member`, `update_member`, `delete_member`, `reset_earnings` |
| Chores | `add_chore`, `update_chore`, `delete_chore`, `reorder_chore`, `toggle_chore`, `approve_chore`, `reject_chore`, `reset_chore` |
| Pool | `add_pool_chore`, `update_pool_chore`, `delete_pool_chore`, `reorder_pool_chore`, `claim_pool_chore`, `unclaim_pool_chore` |
| Rewards | `add_reward`, `update_reward`, `delete_reward`, `reorder_reward`, `redeem_reward` |
| Money | `cash_out` |
| System | `import_data`, `set_settings`, `run_daily_maintenance` (debug) |

`reset_chore` takes an optional `member_id` — omitted means reset for everyone,
matching the current per-member reset picker.

`claim_pool_chore` takes `reward_type` (`points` | `dollars`) for chores that
offer both.

---

## 5. Entities

### `sensor.chore_tracker_data`
Carries the whole dataset in attributes for the card to render.

- **State:** chore count (a small, meaningful number — not the payload)
- **Attributes:** `members`, `chores`, `pool`, `rewards`, `settings`,
  `history_recent` (last 10 only)
- Full history stays out of attributes to bound the payload; the card fetches it
  on demand via a `chore_tracker/get_history` websocket command.

### `sensor.chore_tracker_<member>` (one per member)
- **State:** points (numeric, `state_class: measurement` so it graphs and gets
  long-term statistics)
- **Attributes:** `dollars`, `streak_days`, `chores_done`, `chores_total`,
  `all_done`, `pending_count`, `member_id`
- **`unique_id` keys on the internal member ID**, not the name — renaming a kid
  changes the friendly name but keeps the entity ID, so automations don't break.
- Deleting a member removes its entity from the registry (no orphans).

### Recorder guidance (README)
```yaml
recorder:
  exclude:
    entities:
      - sensor.chore_tracker_data
```
The per-member sensors stay recorded — they're small and their history is the
point. This matters on a Pi's SD card.

---

## 6. Server-side scheduling

Currently recurrence resets, one-off retirement, and streak evaluation only run
**when someone opens the card**. Moving them into the integration means:

- `async_track_time_change(..., hour=0, minute=0, second=5)` runs daily
  maintenance at local midnight whether or not a browser is open
- The same routine runs at startup to catch days HA was powered off
- Streaks are evaluated for the closed-out day, so a missed day can no longer
  silently break a streak

All of this lives in `logic.py` as **pure functions ported 1:1** from the card's
current JavaScript, so behaviour is identical.

---

## 7. Card changes

The render code — every tab, modal, colour and string — is **reused verbatim**.
Only the data layer changes.

**Reads:** `_loadData()` reads `hass.states['sensor.chore_tracker_data'].attributes`.

**Live updates:** `set hass()` currently does nothing after first render (to avoid
the input-clearing bug). It will now compare the *entity object reference* for
the data sensor — that reference only changes when that entity changes, so the
check is cheap and fires exactly when it should.

**Writes:** every mutation becomes a service call, with a per-item busy lock
(the pattern chores4kids uses) so a double-tap can't fire twice.

**Deleted:** `_writeToLovelace`, `_flushSave`, `_saveTimer`, `SCROLL_STATE` and
scroll restoration, the sync banner, and the `storage_key`,
`lovelace_url_path`, `sync_delay_seconds` options.

**If the integration is missing:** the card shows a clear "Install the Chore
Tracker integration" message rather than silently falling back — a silent
fallback would hide a half-finished setup.

---

## 8. Migration path

No manual export, and nothing is destroyed:

1. User updates the repo and installs the integration, then restarts HA.
2. On first load, the card detects: integration present **and** the old
   `config.data` still exists **and** the integration store is empty.
3. It calls `chore_tracker.import_data` once with that data. The import is
   idempotent and guarded by the empty-store check.
4. The card then reads only from the integration.

The old `data` blob stays in the dashboard config, untouched, as a rollback
safety net. It can be deleted by hand later.

**HACS category change:** because the repo moves from `plugin` to `integration`,
the existing custom-repository entry must be removed and re-added with the
Integration category. Documented in the README with screenshots.

---

## 9. Phasing

Each phase is independently verifiable, so we never have a long broken stretch.

| Phase | Work | Verifiable outcome |
| --- | --- | --- |
| **1** | Integration skeleton, store, data sensor, `import_data`; card *reads* from the sensor but still writes to lovelace | Data appears in the card, sourced from the integration |
| **2** | All mutation services; card writes via service calls; delete the lovelace write path | **The reload is gone** — the headline fix |
| **3** | Port recurrence/retirement/streak logic to `logic.py`; midnight scheduler | Resets happen overnight with no browser open |
| **4** | Per-member sensors + entity lifecycle | Gauges, graphs and simple automations work |
| **5** | Config flow polish, README, HACS metadata, release workflow, v2.0.0 | Shippable |

Phase 2 is the one that solves the complaint. Phases 3–5 are improvements that
can land separately if you want to stop and live on it for a while.

---

## 10. Testing

- **Python:** `pytest` + `pytest-homeassistant-custom-component` covering
  `logic.py` (recurrence, day-scoping, streaks, one-off retirement) and each
  service handler. The fixtures mirror the ones already in
  `tools/screenshot.mjs`, so ported behaviour is checked against the same cases.
- **Card:** the existing screenshot harness continues, restubbed to provide
  `hass.states` and a recording `callService` instead of `config.data`. It keeps
  asserting day-scoping and one-off retirement at the render level, plus the
  light/dark passes.
- **Manual:** two devices side by side, checking off chores — confirm no reload
  and sub-second propagation.

---

## 11. Risks

| Risk | Mitigation |
| --- | --- |
| Data loss during migration | Old dashboard blob left intact; import guarded and idempotent |
| Attribute payload bloating the database | History trimmed to 10 in attributes; recorder exclusion documented |
| Behaviour drift porting JS → Python | Logic ported as pure functions with tests mirroring existing fixtures |
| Double-tap firing twice | Per-item busy locks in the card |
| HACS category confusion on upgrade | Documented remove/re-add steps, called out in the release notes |
| Integration needs an HA restart to update | Expected for integrations; card-only changes still don't |

---

## 12. What does not change

The design and structure stay exactly as they are: navy header, light-blue
accents, member tabs, the per-member totals bar, wallet, rewards catalog,
approval flow, day-scheduled chores, streaks, reordering, the admin console,
safe deletes, and all five languages. Your members, chores, points, rewards and
history migrate across untouched.
