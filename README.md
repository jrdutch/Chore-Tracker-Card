# Chore Tracker Card

A Home Assistant custom card for tracking family chores with points and allowance rewards — synced across every device and HA user in your home.

![Chore Tracker Card](images/screenshot.png)

## Features

- **Family Members** — Add any number of family members with custom avatars
- **Assigned Chores** — Create chores and assign them to one or multiple members
- **Available Chores pool** — Optional bonus chores members can claim once their own list is done
- **Points & Allowance** — Assign point values and dollar amounts to each chore; earnings tally automatically
- **Private Totals** — The bottom of the card shows only the selected member's points and money, so siblings can't compare balances (an all-members scoreboard is opt-in)
- **Rewards & Cash Out** — Spend points on a customizable reward catalog, or cash out earned money
- **Weekly Streak Bonus** — Finish all assigned chores 7 days straight for +5 bonus points
- **Day-Scheduled Chores** — A chore set for Tuesday and Wednesday only appears on those days; daily and weekday chores reset at your local midnight
- **Automation Events** — Fires events on the HA bus when chores are completed, so you can automate lights, notifications, and payouts
- **Visual Editor** — Configure title and password right in the dashboard UI editor, no YAML needed
- **Instant Cross-device Sync** — With the integration, data lives in Home Assistant: every device updates live and checking off chores never reloads the dashboard
- **Admin Console** — Parent console (password-gated) for managing members, chores, and the pool
- **Approval Mode** (optional) — Kids mark chores done, but points are only awarded after a parent approves them
- **Safe Deletes** — Destructive buttons require a second confirming tap
- **Auto Emoji** — Chores automatically get matching emoji icons based on their name, with manual override
- **HA Theme Support** — Uses your Home Assistant theme (works with light, dark, and glass themes)
- **Localized** — English, Spanish, German, French, and Dutch out of the box, following each user's HA language

## Installation

Chore Tracker is a Home Assistant **integration that bundles its own card**. The integration stores chore data in Home Assistant instead of in your dashboard, so checking off a chore no longer reloads the dashboard, and every device updates instantly.

### HACS (recommended)
1. HACS → ⋮ → **Custom repositories** → add `https://github.com/jrdutch/Chore-Tracker-Card` with category **Integration**
2. Install **Chore Tracker**, then **restart Home Assistant**
3. Settings → Devices & services → **Add integration** → **Chore Tracker**
4. Add the card to a dashboard (`type: custom:chore-tracker-card`). The card resource is registered for you.

### Upgrading from 1.x
1. In HACS, remove the old **Frontend** entry for this repository
2. Settings → Dashboards → ⋮ → **Resources**: delete the old `/hacsfiles/Chore-Tracker-Card/...` entry
3. Follow the HACS steps above

Your dashboards don't need editing — the card type is unchanged. The first time the card loads, it hands your existing members, chores, points and rewards to the integration automatically. The old data is left in the dashboard config as a safety net.

### Rolling back
Every 1.x release still has its `chore-tracker-card.js` attached on the Releases page, and the `card-v1` branch holds the last 1.x source.

### Recommended: keep the data sensor out of the recorder
`sensor.chore_tracker_data` holds the whole dataset in its attributes. Excluding it keeps your database small (the per-member sensors are small and worth recording):

```yaml
recorder:
  exclude:
    entities:
      - sensor.chore_tracker_data
```

### Entities
| Entity | State | Attributes |
| --- | --- | --- |
| `sensor.chore_tracker_data` | number of chores | the card's dataset |
| `sensor.chore_tracker_<member>` | points | dollars, streak_days, chores_done, chores_total, all_done, pending_count |

Every action the card takes is also a service under `chore_tracker.*` (toggle, approve, redeem, cash out, add/update/delete members, chores and rewards, …), so automations and scripts can drive it too.

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
| `show_family_totals` | `false` | When `true`, the bottom of the card lists every member's points and money. Off by default so only the selected member's totals are visible |
| `require_approval` | `false` | When `true`, marking a chore adds it to a pending list; an admin approves (awards points) or rejects it in the admin console |
| `language` | *(HA user language)* | UI language override. Built in: `en`, `es`, `de`, `fr`, `nl`. Follows your HA profile language automatically when unset |

Older configs may also contain `storage_key`, `data`, `sync_delay_seconds` or `lovelace_url_path`. With the integration installed these are ignored and can be left alone or deleted — see [Card-only mode](#card-only-mode-no-integration).

## How data is stored and synced

With the integration, all chore data lives in Home Assistant's own storage (`.storage/chore_tracker`), not in your dashboard:

- **Shared** across every HA user account and device — parents, kids, phones, wall tablets
- **Live**: every change is pushed to all open cards through `sensor.chore_tracker_data`, so other devices update within a moment
- **No dashboard reloads**: the card saves through the `chore_tracker.*` services, never by rewriting the dashboard config, so YAML-mode dashboards work too
- **Runs without a browser**: midnight resets, streaks and one-off chore cleanup happen in Home Assistant itself, and are caught up at startup if HA was off at midnight
- **Backed up** with your normal Home Assistant backups

The browser's `localStorage` is only a local cache for a fast first paint.

### Card-only mode (no integration)

If the card is installed without the integration it falls back to 1.x behaviour: data is stored inside the card's entry in the dashboard config (UI-managed dashboards only), and saving rebuilds the dashboard view. In that mode these extra options apply:

| Option | Default | Description |
| --- | --- | --- |
| `sync_delay_seconds` | `8` | Wait after the last change before saving, so a run of check-offs costs one dashboard reload |
| `storage_key` | *(auto)* | Stable identity for the card's data — stamped automatically, don't change it |
| `lovelace_url_path` | *(auto)* | Only if dashboard auto-detection fails |
| `data` | *(managed)* | The stored dataset — written by the card, don't edit by hand |

## Admin Console

Click the ⚙️ gear icon and enter the admin password to:

- Add / edit / delete family members
- Add / edit / delete chores with point and dollar values
- Assign chores to one or multiple members
- Set recurrence (one-time, daily, weekdays)
- Manage the Available Chores pool
- Reset a chore's completion status
- Adjust a member's points and money directly (corrections are logged)
- Set a member's streak, for days missed because chores weren't approved in time
- Reset a member's earnings

Deleting or resetting requires a second confirming tap, so a stray finger can't wipe anything.

> **About the password:** it's a convenience gate to keep kids out of the parent console, not a security boundary — anyone who can edit the dashboard can read it from the card config.

## Approval mode

Turn on **Require admin approval** in the card's visual editor (or set `require_approval: true` in YAML) and the flow becomes:

1. A member taps a chore — it turns orange with an ⏳ "Waiting for approval" label (tapping again withdraws the request; no points yet)
2. The admin console's **Chores** tab shows a *Pending Approval* list at the top
3. ✔ **Approve** marks the chore completed and awards the points/dollars; ✖ **Reject** returns it to not-done
4. Approved chores can only be undone by an admin (reset), not by the member

The `chore_tracker_chore_pending` event fires on each request, so you can send parents a notification to review.

## Rewards, cash out, and streaks

At the bottom of the card, the totals bar shows the **currently selected member's** points and money — deliberately not everyone's, so siblings aren't nudged into comparing balances. Tap it (or the 🎁 Rewards button on their tab) to open that member's wallet:

- **Redeem Points** — spend points from the reward catalog. Rewards they can't afford yet are greyed out.
- **Cash Out** — hand over their earned allowance and reset the balance to $0.
- Admins can also **edit a balance directly** in Admin → Members — useful for correcting a mistake or awarding a one-off bonus. The change is written to the member's activity log as a signed adjustment (`+10⭐`, `-$1.50`) so balances never move without a trace.
- Recent redemptions are listed in the wallet, and the full log lives in the admin console's **Rewards** tab.

The card ships with a starter reward catalog you can edit, reorder, or replace entirely in **Admin → Rewards**. Suggested costs assume a typical chore is worth about 5 points:

| Tier | Examples | Points |
| --- | --- | --- |
| Small treats | Pick the car music (10), soda with dinner (15), extra snack (15), 30 min tablet or games (20) | 10–20 |
| Weekly treats | Extra dessert (30), 20 minutes with Mom or Dad (30), game night pick (35), choose dinner (40), pick the movie (40), stay up 30 min late (45), skip a chore (50) | 30–50 |
| Big rewards | Pizza / takeout pick (75), ice cream or park outing (120), small toy or $5 trip (150), friend sleepover (175), big day out (200) | 75–200 |

If you'd rather show a family scoreboard, enable **Show everyone's totals at the bottom** in the visual editor (`show_family_totals: true`).

### Weekly streak bonus

Completing **all assigned chores** (extras claimed from the pool don't count) every day for 7 days straight earns **+5 bonus points**, and again for each further 7-day run. Current streaks show as a 🔥 chip on the member's tab and in their wallet.

If a day gets missed because chores weren't approved in time, an admin can **set the streak directly** in Admin → Members. That credits the skipped days so the run isn't lost. It deliberately does *not* pay the bonus — an admin typing a number shouldn't mint points — so if the bonus was genuinely owed, add those points in the same form.

### Points or money on extra chores

An Available Chore that offers **both** points and a dollar value makes the claimer choose one when they claim it — they earn that reward only, never both. Chores offering just one reward type are claimed with no extra step.

## Available Chores (pool)

The pool holds optional extra chores that members can **claim** — but only after completing **all** of their currently assigned chores. Claiming asks which eligible member is taking the chore and moves it to their personal list.

## Recurring & day-scheduled chores

Each chore has a recurrence setting in the admin console:

| Setting | Shows up | Resets |
| --- | --- | --- |
| One-time / No reset | Until finished | Drops off the list the day after it's completed |
| Daily | Every day | Every day at local midnight |
| Weekdays (Mon–Fri) | Mon–Fri only | Each weekday at local midnight |
| Only on chosen days | Only on the days you tick | On each of those days |

So a chore set for **Tue + Wed** is simply absent from everyone's list on Monday, Thursday, Friday, and the weekend — no clutter, and the "2 of 5 done" progress counts only what's actually due today.

**One-time chores** (and extras claimed from the Available Chores pool) stay on the list, ticked, for the rest of the day they're finished — so a mis-tap can be undone — and are cleared the next day. Once every assigned member has finished one, it's removed entirely.

**Earnings are kept** across resets — points and dollars are only removed if a chore is manually unchecked or an admin resets it.

Streaks understand the schedule too: a day where nothing was scheduled keeps a streak alive rather than breaking it, and the current day never breaks a streak before it's over.

## Automation events

Chore Tracker fires events on the Home Assistant bus that you can use as automation triggers (they fire for changes made from the card, services, or automations alike):

| Event | When | Data |
| --- | --- | --- |
| `chore_tracker_chore_completed` | A chore is completed (or approved, in approval mode) | `member`, `chore`, `points`, `dollars` |
| `chore_tracker_chore_pending` | A member requests approval for a chore (approval mode) | `member`, `chore` |
| `chore_tracker_streak_bonus` | A member completes 7 straight perfect days | `member`, `days`, `points` |
| `chore_tracker_reward_redeemed` | Points spent on a reward | `member`, `reward`, `points`, `points_remaining` |
| `chore_tracker_cash_out` | Earned money cashed out | `member`, `amount` |
| `chore_tracker_balance_adjusted` | An admin edited a member's points or money | `member`, `points_change`, `dollars_change`, `points`, `dollars` |
| `chore_tracker_streak_adjusted` | An admin set a member's streak | `member`, `from`, `to` |
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
