# Chore Tracker Card

A Home Assistant custom card for tracking family chores with points and allowance rewards.

## Features

- **Family Members** — Add any number of family members with custom avatars
- **Assigned Chores** — Create chores and assign them to one or multiple members
- **Chore Pool** — A pool of optional chores members can claim after finishing their list
- **Points & Allowance** — Assign point values and dollar amounts to each chore
- **Admin Console** — Password-protected parent console for managing everything
- **Chore Reset** — Admin can reset individual chores or a member's earnings
- **Auto Emoji** — Chores automatically get matching emoji icons based on their name
- **HA Theme Support** — Card uses your Home Assistant theme colors (background, text, etc.)

## Installation

### HACS (recommended)
1. Add this repository as a custom HACS repository (Frontend category)
2. Install "Chore Tracker Card"
3. Add the resource in your HA dashboard

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

All data (members, chores, progress, points) is stored in the browser's `localStorage`.

## Admin Console

Click the ⚙️ gear icon in the top right of the card and enter your admin password to access the admin console. From there you can:

- Add / edit / delete family members
- Add / edit / delete assigned chores (with point and dollar values)
- Assign chores to one or multiple family members
- Manage the chore pool
- Reset individual chore completion status
- Reset member earnings

## Chore Pool

The chore pool contains optional extra chores that members can **claim** once they have completed **all** of their currently assigned chores. Once claimed, a pool chore moves to that member's personal list.

## Emoji Matching

Chores are automatically matched to emoji based on keywords in the title (e.g., "vacuum" → 🧹, "dishes" → 🍽️, "laundry" → 👕). You can manually override the emoji for any chore in the admin console.

## Theme Support

The card uses HA CSS variables (`--card-background-color`, `--primary-text-color`, etc.) so it automatically adapts to your active theme. The header is Navy Blue (`#003366`) and accents are Light Blue (`#0288D1` / `#4FC3F7`).
