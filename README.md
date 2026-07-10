# Chore Tracker Card

A Home Assistant custom card for tracking family chores with points and allowance rewards — synced across every device and HA user in your home.

## Features

- **Family Members** — Add any number of family members with custom avatars
- **Assigned Chores** — Create chores and assign them to one or multiple members
- **Available Chores pool** — Optional bonus chores members can claim once their own list is done
- **Points & Allowance** — Assign point values and dollar amounts to each chore; earnings tally automatically
- **Recurring Chores** — Chores can reset daily, on weekdays (Mon–Fri), or on specific days of the week, at your local midnight
- **Automation Events** — Fires events on the HA bus when chores are completed, so you can automate lights, notifications, and payouts
- **Visual Editor** — Configure title and password right in the dashboard UI editor, no YAML needed
- **Cross-device Sync** — Data is stored in the dashboard config, shared by all HA users and devices; changes made on one device appear live on the others
- **Admin Console** — Parent console (password-gated) for managing members, chores, and the pool
- **Safe Deletes** — Destructive buttons require a second confirming tap
- **Auto Emoji** — Chores automatically get matching emoji icons based on their name, with manual override
- **HA Theme Support** — Uses your Home Assistant theme (works with light, dark, and glass themes)
- **Localized** — English, Spanish, German, French, and Dutch out of the box, following each user's HA language

## Installation

### HACS (recommended)
1. Add this repository as a custom HACS repository (Frontend category)
2. Install "Chore Tracker Card"
3. HACS registers the resource automatically

### Manual
1. Copy `chore-tracker-card.js` to your `/config/www/` folder
2. In Home Assistant go to **Settings → Dashboards → Resources**
3. Add `/local/chore-tracker-card.js` as a JavaScript module

## Configuration

```yaml
type: custom:chore-tracker-card
title: Family Chores
admin_password: "yourpassword"
```

| Option | Default | Description |
| --- | --- | --- |
| `title` | `Chore Tracker` | Card title shown in the header |
| `admin_password` | `1234` | Password for the admin console |
| `language` | *(HA user language)* | UI language override. Built in: `en`, `es`, `de`, `fr`, `nl`. Follows your HA profile language automatically when unset |
| `storage_key` | *(auto)* | Stable identity for the card's data. Stamped into the config automatically on first save — don't change it, or the card loses track of its data |
| `lovelace_url_path` | *(auto)* | Only needed if auto-detection of the dashboard fails; set to the dashboard's URL path |
| `data` | *(managed)* | The card's data store (members, chores, pool). Written by the card itself — don't edit by hand |

## How data is stored and synced

The card stores everything **inside its own entry in the dashboard configuration**, saved via Home Assistant's websocket API. That makes the data:

- shared across **all HA user accounts** (parents, kids, wall tablets)
- shared across **all devices** — phones, browsers, kiosks
- updated **live**: when someone checks off a chore, other open devices refresh automatically

The browser's `localStorage` is used only as a local cache and offline fallback. If a sync save fails (for example on a YAML-mode dashboard, which cannot be written to), the card shows a red warning banner and keeps changes on that device only.

> **Note:** YAML-mode dashboards are not supported for sync — the dashboard must be UI-managed (storage mode).

## Admin Console

Click the ⚙️ gear icon and enter the admin password to:

- Add / edit / delete family members
- Add / edit / delete chores with point and dollar values
- Assign chores to one or multiple members
- Set recurrence (one-time, daily, weekdays)
- Manage the Available Chores pool
- Reset a chore's completion status
- Reset a member's earnings

Deleting or resetting requires a second confirming tap, so a stray finger can't wipe anything.

> **About the password:** it's a convenience gate to keep kids out of the parent console, not a security boundary — anyone who can edit the dashboard can read it from the card config.

## Available Chores (pool)

The pool holds optional extra chores that members can **claim** — but only after completing **all** of their currently assigned chores. Claiming asks which eligible member is taking the chore and moves it to their personal list.

## Recurring chores & earnings

Daily and weekday chores automatically uncheck at your local midnight so they're ready to do again. **Earnings are kept** — points and dollars are only removed if a chore is manually unchecked or an admin resets it.

## Automation events

The card fires events on the Home Assistant bus that you can use as automation triggers:

| Event | When | Data |
| --- | --- | --- |
| `chore_tracker_chore_completed` | A chore is checked off | `member`, `chore`, `points`, `dollars` |
| `chore_tracker_all_done` | A member finishes their whole list | `member`, `total_points`, `total_dollars` |

Example — flash a light when a kid finishes all their chores:

```yaml
trigger:
  - platform: event
    event_type: chore_tracker_all_done
action:
  - service: light.turn_on
    target:
      entity_id: light.living_room
    data:
      flash: short
```

## Emoji matching

Chores are automatically matched to emoji based on keywords in the title (e.g., "vacuum" → 🧹, "dishes" → 🍽️, "laundry" → 👕). You can manually override the emoji for any chore in the admin console.

## Theme support

The card follows your active HA theme via standard CSS variables and renders inside a real `ha-card` element, so themed backgrounds, blur, and glass effects apply. The header is Navy Blue (`#003366`) with Light Blue accents (`#0288D1` / `#4FC3F7`).
