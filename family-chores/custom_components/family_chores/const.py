"""Constants for the Family Chores integration."""

DOMAIN = "family_chores"

STORAGE_KEY = DOMAIN
STORAGE_VERSION = 1

# Dispatcher signal fired whenever stored data changes, so entities refresh.
SIGNAL_DATA_UPDATED = f"{DOMAIN}_data_updated"

# Bus events, kept aligned with the ones the original card fired so the same
# style of automation keeps working (with the new prefix).
EVENT_CHORE_COMPLETED = f"{DOMAIN}_chore_completed"
EVENT_CHORE_PENDING = f"{DOMAIN}_chore_pending"
EVENT_CHORE_REJECTED = f"{DOMAIN}_chore_rejected"
EVENT_ALL_DONE = f"{DOMAIN}_all_done"
EVENT_STREAK_BONUS = f"{DOMAIN}_streak_bonus"
EVENT_REWARD_REDEEMED = f"{DOMAIN}_reward_redeemed"
EVENT_CASH_OUT = f"{DOMAIN}_cash_out"

# Family-wide rules the server enforces. Presentation options stay on the card.
DEFAULT_SETTINGS = {
    "require_approval": False,
    "streak_days": 7,
    "streak_bonus": 5,
}

# Only the most recent entries ride along in entity attributes; the full log is
# fetched on demand so the attribute payload stays bounded.
HISTORY_ATTR_LIMIT = 10
HISTORY_MAX = 200

# Recurrence modes
RECUR_NONE = "none"
RECUR_DAILY = "daily"
RECUR_WEEKDAYS = "weekdays"
RECUR_WEEKLY = "weekly"

DEFAULT_REWARDS = [
    {"label": "Pick the music in the car", "emoji": "🎵", "cost": 10},
    {"label": "Soda with dinner", "emoji": "🥤", "cost": 15},
    {"label": "Extra snack of choice", "emoji": "🍿", "cost": 15},
    {"label": "30 min extra tablet time", "emoji": "📱", "cost": 20},
    {"label": "30 min extra video games", "emoji": "🎮", "cost": 20},
    {"label": "Extra dessert", "emoji": "🧁", "cost": 30},
    {"label": "20 minutes with Mom or Dad", "emoji": "💛", "cost": 30},
    {"label": "Pick family game night game", "emoji": "🎲", "cost": 35},
    {"label": "Choose dinner", "emoji": "🍽️", "cost": 40},
    {"label": "Pick the family movie", "emoji": "🎬", "cost": 40},
    {"label": "Stay up 30 minutes late", "emoji": "🌙", "cost": 45},
    {"label": "Skip one chore (free pass)", "emoji": "🎟️", "cost": 50},
    {"label": "Pizza / takeout pick", "emoji": "🍕", "cost": 75},
    {"label": "Ice cream or park outing", "emoji": "🍦", "cost": 120},
    {"label": "Small toy or $5 store trip", "emoji": "🎁", "cost": 150},
    {"label": "Friend sleepover", "emoji": "🏕️", "cost": 175},
    {"label": "Big day out (movies, mini golf, zoo)", "emoji": "🎢", "cost": 200},
]
