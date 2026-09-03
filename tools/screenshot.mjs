// Renders the built card in headless Chromium against stub data and saves
// screenshots. Run before cutting a release:  node tools/screenshot.mjs
//
// It stubs just enough of Home Assistant for the card to run standalone:
// an <ha-card> element, a hass object, and card config with embedded data.
import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdirSync } from 'fs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'tools', 'shots');
mkdirSync(outDir, { recursive: true });

// Dates relative to "today" so the sample always looks live
const d = new Date();
const iso = (offset) => {
  const x = new Date(d);
  x.setDate(x.getDate() - offset);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
};
const TODAY = iso(0);

const SAMPLE = {
  members: [
    { id: 'm1', name: 'Sarah',      avatar: 'S',  points: 62, dollars: 8.5 },
    { id: 'm2', name: 'Zechariah',  avatar: 'ZD', points: 35, dollars: 4.25 },
    { id: 'm3', name: 'Elizabeth',  avatar: 'E',  points: 48, dollars: 6 },
    { id: 'm4', name: 'Jordan',     avatar: 'J',  points: 120, dollars: 12.75,
      perfectDays: [iso(4), iso(3), iso(2), iso(1), iso(0)],
      streak: { start: iso(4), awarded: 0 } },
  ],
  chores: [
    { id: 'c1', title: 'Make Bed', emoji: '🛏️', points: 5, dollars: 0.5,
      recurrence: 'daily', assignedTo: ['m4','m1'],
      memberStates: { m4: { completed: true, lastResetDate: TODAY } } },
    { id: 'c2', title: 'pickup Dirty Clothes', emoji: '👕', points: 5, dollars: 0.5,
      recurrence: 'daily', assignedTo: ['m4'],
      memberStates: { m4: { completed: true, lastResetDate: TODAY } } },
    { id: 'c3', title: 'Pickup Toys', emoji: '🧸', points: 5, dollars: 0.5,
      recurrence: 'daily', assignedTo: ['m4'],
      memberStates: { m4: { pending: true, lastResetDate: TODAY } } },
    { id: 'c4', title: 'Put Away Books', emoji: '📕', points: 5, dollars: 0.5,
      recurrence: 'daily', assignedTo: ['m4'], memberStates: { m4: { lastResetDate: TODAY } } },
    { id: 'c5', title: 'Take Out Trash', emoji: '🗑️', points: 8, dollars: 1,
      recurrence: 'weekly', recurrenceDays: [d.getDay()],
      assignedTo: ['m4'], memberStates: { m4: { lastResetDate: TODAY } } },
    { id: 'c6', title: 'Mow the Lawn (other day)', emoji: '🌿', points: 8, dollars: 1,
      recurrence: 'weekly', recurrenceDays: [(d.getDay() + 3) % 7],
      assignedTo: ['m4'], memberStates: { m4: { lastResetDate: TODAY } } },
    // One-time chore finished yesterday — must have dropped off the list
    { id: 'c7', title: 'Clean the Garage (done yesterday)', emoji: '🧹', points: 20, dollars: 3,
      recurrence: 'none', assignedTo: ['m4'],
      memberStates: { m4: { completed: true, completedDate: iso(1) } } },
    // One-time chore finished today — stays until tomorrow (undo window)
    { id: 'c8', title: 'Sort Recycling (done today)', emoji: '♻️', points: 10, dollars: 1,
      recurrence: 'none', assignedTo: ['m4'],
      memberStates: { m4: { completed: true, completedDate: TODAY } } },
    // Claimed pool chore finished yesterday — must also drop off
    { id: 'c9', title: 'Wash the Car (claimed, done yesterday)', emoji: '🚗', points: 25, dollars: 0,
      recurrence: 'none', _poolRef: 'p2', assignedTo: ['m4'],
      memberStates: { m4: { completed: true, completedDate: iso(1) } } },
    // Legacy one-time chore with no completedDate (pre-upgrade data)
    { id: 'c10', title: 'Old Finished Chore (legacy)', emoji: '📦', points: 5, dollars: 0,
      recurrence: 'none', assignedTo: ['m4'],
      memberStates: { m4: { completed: true } } },
  ],
  pool: [
    { id: 'p1', title: 'Vacuum Living Room', emoji: '🧹', points: 15, dollars: 2, claimedBy: null },
    { id: 'p2', title: 'Wash the Car', emoji: '🚗', points: 25, dollars: 5, claimedBy: null },
  ],
  rewards: [
    { id: 'r1', label: 'Soda with dinner', emoji: '🥤', cost: 15 },
    { id: 'r2', label: '30 min extra tablet time', emoji: '📱', cost: 20 },
    { id: 'r3', label: '20 minutes with Mom or Dad', emoji: '💛', cost: 30 },
    { id: 'r4', label: 'Choose dinner', emoji: '🍽️', cost: 40 },
    { id: 'r5', label: 'Pizza / takeout pick', emoji: '🍕', cost: 75 },
    { id: 'r6', label: 'Big day out', emoji: '🎢', cost: 200 },
  ],
  history: [
    { id: 'h1', memberId: 'm4', type: 'reward', label: 'Soda with dinner', emoji: '🥤', points: 15, date: iso(2) },
    { id: 'h2', memberId: 'm4', type: 'cash', label: 'Cash Out', emoji: '💵', dollars: 5, date: iso(4) },
    { id: 'h3', memberId: 'm4', type: 'adjust', label: 'Adjustment', emoji: '✏️', points: 10, dollars: 0, date: iso(1) },
    { id: 'h4', memberId: 'm4', type: 'adjust', label: 'Adjustment', emoji: '✏️', points: -5, dollars: -1.5, date: iso(3) },
  ],
};

const HARNESS = `<!doctype html><html><head><meta charset="utf-8"><style>
  body { margin:0; padding:16px; background:#0e1621; font-family: Roboto, sans-serif; }
  #wrap { max-width: 620px; }
  ha-card { display:block; background:#1c2633; color:#e8eaed; border-radius:12px;
            box-shadow:0 2px 8px rgba(0,0,0,.4); }
  :root {
    --primary-text-color:#e8eaed; --secondary-text-color:#9aa0a6;
    --card-background-color:#1c2633; --secondary-background-color:#232f3e;
    --divider-color:#3a4757; --ha-card-background:#1c2633;
  }
</style></head><body><div id="wrap"></div></body></html>`;

// Use a preinstalled Chromium when the bundled one isn't downloaded
// (CHROME_PATH lets CI/dev machines point at their own build).
import { existsSync } from 'fs';
const candidates = [
  process.env.CHROME_PATH,
  '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/usr/bin/google-chrome',
].filter(Boolean);
const executablePath = candidates.find(p => existsSync(p));

const browser = await chromium.launch(
  executablePath ? { executablePath, args: ['--no-sandbox'] } : {}
);
const page = await browser.newPage({ viewport: { width: 660, height: 900 }, deviceScaleFactor: 2 });
const errors = [];
page.on('pageerror', e => errors.push(String(e)));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });

await page.setContent(HARNESS);
await page.addScriptTag({ path: join(root, 'chore-tracker-card.js'), type: 'module' });
await page.waitForFunction(() => !!customElements.get('chore-tracker-card'));

await page.evaluate((sample) => {
  // Minimal ha-card stand-in so the card renders outside Home Assistant
  if (!customElements.get('ha-card')) {
    customElements.define('ha-card', class extends HTMLElement {});
  }
  const el = document.createElement('chore-tracker-card');
  el.setConfig({
    title: 'Family Chores',
    admin_password: '1234',
    require_approval: true,
    data: sample,
  });
  el.hass = { locale: { language: 'en' }, language: 'en', callWS: async () => { throw new Error('offline'); } };
  document.getElementById('wrap').appendChild(el);
}, SAMPLE);

await page.waitForTimeout(600);

const card = page.locator('chore-tracker-card');
const shots = [];

// 1. Member view (Jordan — has a pending chore and a live streak)
await page.evaluate(() => {
  const el = document.querySelector('chore-tracker-card');
  el._state.activeTab = 'm4';
  el.requestUpdate();
});
await page.waitForTimeout(300);
await card.screenshot({ path: join(outDir, '01-member.png') });
shots.push('01-member.png');

// 2. Wallet / rewards modal
await page.evaluate(() => {
  const el = document.querySelector('chore-tracker-card');
  el._state.walletMember = 'm4';
  el._state.walletView = 'menu';
  el.requestUpdate();
});
await page.waitForTimeout(300);
await card.screenshot({ path: join(outDir, '02-wallet.png') });
shots.push('02-wallet.png');

await page.evaluate(() => {
  const el = document.querySelector('chore-tracker-card');
  el._state.walletView = 'rewards';
  el.requestUpdate();
});
await page.waitForTimeout(300);
await card.screenshot({ path: join(outDir, '03-rewards.png') });
shots.push('03-rewards.png');

// 3. Available chores
await page.evaluate(() => {
  const el = document.querySelector('chore-tracker-card');
  el._state.walletMember = null;
  el._state.activeTab = 'pool';
  el.requestUpdate();
});
await page.waitForTimeout(300);
await card.screenshot({ path: join(outDir, '04-pool.png') });
shots.push('04-pool.png');

// 4. Admin console — chores tab with a pending approval
await page.evaluate(() => {
  const el = document.querySelector('chore-tracker-card');
  el._state.view = 'admin';
  el._state.adminUnlocked = true;
  el._state.adminTab = 'chores';
  el.requestUpdate();
});
await page.waitForTimeout(300);
await card.screenshot({ path: join(outDir, '05-admin-chores.png') });
shots.push('05-admin-chores.png');

// 5. Admin console — member editor with adjustable balances
await page.evaluate(() => {
  const el = document.querySelector('chore-tracker-card');
  el._state.adminTab = 'members';
  el._state.editingMember = 'm4';
  el.requestUpdate();
});
await page.waitForTimeout(300);
await card.screenshot({ path: join(outDir, '08-admin-member.png') });
shots.push('08-admin-member.png');

await page.evaluate(() => {
  const el = document.querySelector('chore-tracker-card');
  el._state.editingMember = null;
  el.requestUpdate();
});

// 6. Admin console — rewards catalog
await page.evaluate(() => {
  const el = document.querySelector('chore-tracker-card');
  el._state.adminTab = 'rewards';
  el.requestUpdate();
});
await page.waitForTimeout(300);
await card.screenshot({ path: join(outDir, '06-admin-rewards.png') });
shots.push('06-admin-rewards.png');

// Light theme pass — the empty checkbox and text must read on both
await page.evaluate(() => {
  const el = document.querySelector('chore-tracker-card');
  el._state.view = 'main';
  el._state.activeTab = 'm4';
  el.requestUpdate();
  document.body.style.background = '#f2f4f7';
  const r = document.documentElement.style;
  r.setProperty('--primary-text-color', '#212121');
  r.setProperty('--secondary-text-color', '#727272');
  r.setProperty('--card-background-color', '#ffffff');
  r.setProperty('--secondary-background-color', '#f5f5f5');
  r.setProperty('--divider-color', '#e0e0e0');
  r.setProperty('--ha-card-background', '#ffffff');
  document.querySelector('style').textContent += `
    ha-card { background:#fff !important; color:#212121 !important; }`;
});
await page.waitForTimeout(400);
await card.screenshot({ path: join(outDir, '07-light-theme.png') });
shots.push('07-light-theme.png');

// Verify day-scoping: a chore set for another weekday must not appear today
const dayCheck = await page.evaluate(() => {
  const el = document.querySelector('chore-tracker-card');
  return el._getMemberChores('m4').map(c => c.title);
});
const expectVisible = ['Take Out Trash', 'Sort Recycling (done today)'];
const expectHidden = [
  'Mow the Lawn (other day)',
  'Clean the Garage (done yesterday)',
  'Wash the Car (claimed, done yesterday)',
  'Old Finished Chore (legacy)',
];
expectVisible.forEach(t => {
  if (!dayCheck.includes(t)) errors.push(`Expected "${t}" to be visible today but it was not`);
});
expectHidden.forEach(t => {
  if (dayCheck.includes(t)) errors.push(`Expected "${t}" to be gone from today's list but it appeared`);
});
console.log(`Visible today: ${dayCheck.join(', ')}`);

// Verify the streak override lands on exactly the value an admin types,
// including crediting days that were never approved.
const streakCheck = await page.evaluate(() => {
  const el = document.querySelector('chore-tracker-card');
  const member = el._data.members.find(m => m.id === 'm4');
  const before = el._streakInfo(member).length;
  const results = { before, set: {} };
  for (const target of [7, 12, 3, 0, 5]) {
    el._setMemberStreak(member, target);
    results.set[target] = el._streakInfo(member).length;
  }
  return results;
});
console.log(`Streak override — start ${streakCheck.before}, ` +
  Object.entries(streakCheck.set).map(([k, v]) => `set ${k}->${v}`).join(', '));
for (const [target, actual] of Object.entries(streakCheck.set)) {
  if (String(actual) !== String(target)) {
    errors.push(`Streak override: asked for ${target} but got ${actual}`);
  }
}

await browser.close();

console.log('Screenshots written to tools/shots:');
shots.forEach(s => console.log('  ' + s));
if (errors.length) {
  console.log('\nRUNTIME ERRORS:');
  errors.forEach(e => console.log('  ' + e));
  process.exit(1);
}
console.log('\nNo runtime errors.');
