// Chore Tracker Card for Home Assistant
const CARD_VERSION = '1.3.1';
console.info(
  `%c CHORE-TRACKER-CARD %c v${CARD_VERSION} `,
  'color: white; background: #003366; font-weight: 700;',
  'color: #003366; background: #4FC3F7; font-weight: 700;'
);

const CHORE_EMOJIS = {
  vacuum: '🧹', vacuuming: '🧹', sweep: '🧹', sweeping: '🧹', mop: '🪣', mopping: '🪣',
  dust: '🧹', dusting: '🧹', clean: '🧽', cleaning: '🧽', scrub: '🧽', scrubbing: '🧽',
  wipe: '🧽', wiping: '🧽', wash: '🫧', washing: '🫧', sanitize: '🧴', disinfect: '🧴',
  dishes: '🍽️', dish: '🍽️', dishwasher: '🍽️', cook: '👨‍🍳', cooking: '👨‍🍳',
  kitchen: '🍳', trash: '🗑️', garbage: '🗑️', recycling: '♻️', recycle: '♻️',
  groceries: '🛒', grocery: '🛒', counters: '🧽', counter: '🧽',
  laundry: '👕', clothes: '👕', fold: '👕', folding: '👕', ironing: '👔', iron: '👔',
  bathroom: '🚽', toilet: '🚽', shower: '🚿', bath: '🛁', sink: '🚰',
  lawn: '🌿', mow: '🌿', mowing: '🌿', garden: '🌱', gardening: '🌱', plant: '🌱',
  water: '💧', watering: '💧', rake: '🍂', raking: '🍂', snow: '❄️',
  pet: '🐾', dog: '🐕', cat: '🐈', fish: '🐟', feed: '🥣', feeding: '🥣',
  walk: '🦮', walking: '🦮', litter: '🐱',
  homework: '📚', study: '📖', studying: '📖', read: '📖', reading: '📖',
  practice: '🎵', music: '🎵',
  organize: '📦', organizing: '📦', tidy: '🗂️', tidying: '🗂️', declutter: '📦',
  sort: '🗂️', sorting: '🗂️', bedroom: '🛏️', bed: '🛏️', room: '🏠',
  mail: '📬', car: '🚗', window: '🪟', windows: '🪟',
};

function getChoreEmoji(title) {
  const lower = title.toLowerCase();
  for (const [keyword, emoji] of Object.entries(CHORE_EMOJIS)) {
    if (lower.includes(keyword)) return emoji;
  }
  return '✅';
}

function todayStr() {
  // Local date, not UTC — recurrence must reset at the family's midnight
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

// Escape user-supplied text before interpolating into HTML — covers both
// element content and quoted attribute values.
function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function isWeekday() {
  const d = new Date().getDay(); // 0=Sun, 6=Sat
  return d >= 1 && d <= 5;
}

const DEFAULT_CONFIG = {
  title: 'Chore Tracker',
  admin_password: '1234',
};

class ChoreTrackerCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._state = {
      activeTab: null,     // member id or 'pool'
      adminUnlocked: false,
      adminTab: 'chores',  // chores | members | pool
      editingChore: null,
      editingMember: null,
      claimingChore: null, // pool chore id being claimed — shows member picker
      view: 'main',        // main | admin
    };
    this._initialRenderDone = false;
  }

  set hass(hass) {
    this._hass = hass;
    if (!this._initialRenderDone && this._config) {
      this._initialRenderDone = true;
      this._loadData();
      this._render();
    }
  }

  setConfig(config) {
    this._config = { ...DEFAULT_CONFIG, ...config };
    // Data is embedded directly in the card config (written there by _saveData).
    // Load it synchronously so the card is ready on first render.
    this._loadData();
    this._render();
  }

  _storageKey() {
    return `chore_tracker_${(this._config.title || 'default').replace(/\s+/g, '_')}`;
  }

  // Synchronous: reads from config.data (written by _saveData via lovelace/config/save).
  // Falls back to localStorage for pre-v1.2 migration.
  _loadData() {
    if (this._config.data && typeof this._config.data === 'object') {
      // HA deep-freezes the lovelace config it passes to cards, so clone it
      // to get mutable objects we can update.
      const d = JSON.parse(JSON.stringify(this._config.data));
      this._data = {
        members: d.members || [],
        chores:  d.chores  || [],
        pool:    d.pool    || [],
      };
      console.info(`ChoreTracker v${CARD_VERSION}: loaded data from dashboard config (synced)`);
      this._checkRecurrenceResets();
      return;
    }
    // Migration: check localStorage for data written by older versions
    try {
      const raw = localStorage.getItem(this._storageKey());
      if (raw) {
        this._data = JSON.parse(raw);
        console.info(`ChoreTracker v${CARD_VERSION}: migrating localStorage data to dashboard config…`);
        this._checkRecurrenceResets();
        this._saveData(); // push to lovelace config so all devices see it
        return;
      }
    } catch (_) {}
    this._data = { members: [], chores: [], pool: [] };
  }

  // Public save entry point. Writes localStorage immediately, then debounces
  // the (expensive, whole-dashboard) lovelace write so rapid toggles collapse
  // into a single save — this also shrinks the window for two devices
  // overwriting each other.
  _saveData() {
    localStorage.setItem(this._storageKey(), JSON.stringify(this._data));
    if (!this._hass) return;
    clearTimeout(this._saveTimer);
    this._saveTimer = setTimeout(() => this._flushSave(), 500);
  }

  // Serialize lovelace writes: never two in flight, and a save requested
  // while one is running re-runs after it finishes (with the latest data).
  async _flushSave() {
    if (this._saving) {
      this._savePending = true;
      return;
    }
    this._saving = true;
    try {
      await this._writeToLovelace();
    } finally {
      this._saving = false;
      if (this._savePending) {
        this._savePending = false;
        this._flushSave();
      }
    }
  }

  // Writes data into the card's own lovelace dashboard config entry so it is
  // shared across ALL HA users and devices, not just the current browser.
  // The config is re-fetched immediately before every save so we patch the
  // freshest version of the dashboard.
  async _writeToLovelace() {
    if (!this._hass) return;
    try {
      const callWS = (msg) => {
        if (typeof this._hass.callWS === 'function') return this._hass.callWS(msg);
        if (this._hass.connection?.sendMessagePromise) return this._hass.connection.sendMessagePromise(msg);
        throw new Error('No WS API');
      };

      // Figure out which dashboard this card lives on. Explicit config wins,
      // otherwise derive it from the page URL (first path segment).
      // The default dashboard ("lovelace") must be requested as url_path null.
      let urlPath = this._config.lovelace_url_path;
      if (!urlPath) {
        const seg = window.location.pathname.split('/')[1] || '';
        urlPath = seg;
      }
      if (!urlPath || urlPath === 'lovelace') urlPath = null;

      let lovelaceConfig;
      try {
        lovelaceConfig = await callWS({ type: 'lovelace/config', url_path: urlPath });
      } catch (err) {
        // Fallback: search every storage-mode dashboard for this card
        const dashboards = await callWS({ type: 'lovelace/dashboards/list' });
        let found = null;
        for (const dash of [{ url_path: null }, ...(dashboards || [])]) {
          if (found) break;
          if (dash.mode && dash.mode !== 'storage') continue;
          const p = dash.url_path === 'lovelace' ? null : dash.url_path;
          if (p === urlPath) continue; // already tried
          try {
            const cfg = await callWS({ type: 'lovelace/config', url_path: p });
            if (JSON.stringify(cfg).includes('custom:chore-tracker-card')) {
              found = { cfg, p };
            }
          } catch (_) { /* dashboard has no stored config — skip */ }
        }
        if (!found) throw err;
        lovelaceConfig = found.cfg;
        urlPath = found.p;
      }

      // Deep-clone so we don't mutate the live object
      const cfg = JSON.parse(JSON.stringify(lovelaceConfig));
      const dataSnapshot = JSON.parse(JSON.stringify(this._data));
      let found = false;

      // Card identity: prefer the stable storage_key (survives title renames
      // and duplicate titles); fall back to title matching for cards that
      // haven't been stamped with a key yet.
      const myKey = this._config.storage_key || null;
      const matches = (node) => {
        if (node.type !== 'custom:chore-tracker-card') return false;
        if (myKey) return node.storage_key === myKey;
        return !node.storage_key &&
          (node.title || '') === (this._config.title || 'Chore Tracker');
      };

      const patchCard = (nodes) => {
        if (!Array.isArray(nodes)) return;
        for (const node of nodes) {
          if (!node || typeof node !== 'object') continue;
          if (matches(node)) {
            node.data = dataSnapshot;
            // Stamp a permanent identity on first save so future matching
            // doesn't depend on the title.
            if (!node.storage_key) {
              node.storage_key = myKey || this._uid();
              this._config = { ...this._config, storage_key: node.storage_key };
            }
            found = true;
            return;
          }
          patchCard(node.cards);
          if (node.card) patchCard([node.card]);
        }
      };

      for (const view of (cfg.views || [])) {
        patchCard(view.cards);
        for (const section of (view.sections || [])) {
          patchCard(section.cards);
        }
      }

      if (found) {
        await callWS({
          type: 'lovelace/config/save',
          url_path: urlPath,
          config: cfg,
        });
        console.info(`ChoreTracker v${CARD_VERSION}: data saved to dashboard config (synced to all devices)`);
      } else {
        console.warn('ChoreTracker: could not find card in lovelace config — data saved to localStorage only');
      }
    } catch (e) {
      console.warn('ChoreTracker: lovelace save failed —', e.message || e);
    }
  }

  _uid() {
    return Math.random().toString(36).slice(2, 10);
  }

  // Don't lose a debounced save if the card is removed (dashboard switch,
  // edit mode, etc.) before the timer fires.
  disconnectedCallback() {
    if (this._saveTimer) {
      clearTimeout(this._saveTimer);
      this._saveTimer = null;
      this._flushSave();
    }
  }

  // Auto-reset chores based on recurrence schedule
  _checkRecurrenceResets() {
    const today = todayStr();
    let changed = false;
    (this._data.chores || []).forEach(chore => {
      if (!chore.recurrence || chore.recurrence === 'none') return;
      (chore.assignedTo || []).forEach(memberId => {
        if (!chore.memberStates) chore.memberStates = {};
        if (!chore.memberStates[memberId]) chore.memberStates[memberId] = {};
        const state = chore.memberStates[memberId];
        const lastReset = state.lastResetDate || '';
        if (lastReset === today) return; // already handled today

        let shouldReset = false;
        if (chore.recurrence === 'daily') {
          shouldReset = true;
        } else if (chore.recurrence === 'weekdays' && isWeekday()) {
          shouldReset = true;
        }

        if (shouldReset) {
          // Recurrence reset unchecks the chore but the member KEEPS the
          // points/dollars they earned — earnings are only removed when a
          // chore is manually unchecked or an admin resets it.
          chore.memberStates[memberId] = { completed: false, lastResetDate: today };
          changed = true;
        }
      });
    });
    if (changed) this._saveData();
  }

  _getMemberChores(memberId) {
    return (this._data.chores || [])
      .filter(c => (c.assignedTo || []).includes(memberId))
      .map(c => {
        const ms = ((c.memberStates || {})[memberId] || {});
        return { ...c, completed: ms.completed || false };
      });
  }

  _allChoresDone(memberId) {
    const chores = this._getMemberChores(memberId);
    return chores.length > 0 && chores.every(c => c.completed);
  }

  _getPoolChores() {
    return (this._data.pool || []).filter(c => !c.claimedBy);
  }

  _eligibleClaimers() {
    return (this._data.members || []).filter(m => this._allChoresDone(m.id));
  }

  // ─── RENDER ──────────────────────────────────────────────────────────────

  _render() {
    if (!this._config || !this._data) return;

    // Default active tab to first member or pool
    if (!this._state.activeTab) {
      const first = (this._data.members || [])[0];
      this._state.activeTab = first ? first.id : 'pool';
    }

    this.shadowRoot.innerHTML = `
      <style>${this._styles()}</style>
      <ha-card>
        ${this._state.view === 'admin' ? this._renderAdmin() : this._renderMain()}
      </ha-card>
    `;
    this._attachEvents();
  }

  _renderMain() {
    const members = this._data.members || [];
    const poolCount = this._getPoolChores().length;
    const activeTab = this._state.activeTab;

    const tabs = members.map(m => {
      const chores = this._getMemberChores(m.id);
      const done = chores.filter(c => c.completed).length;
      const total = chores.length;
      const allDone = total > 0 && done === total;
      return `
        <button class="member-tab ${activeTab === m.id ? 'active' : ''}" data-action="set-tab" data-tab="${m.id}">
          <span class="tab-avatar ${allDone ? 'done' : ''}">${esc(m.avatar || m.name[0].toUpperCase())}</span>
          <span class="tab-name">${esc(m.name)}</span>
          ${total > 0 ? `<span class="tab-badge ${allDone ? 'badge-done' : ''}">${done}/${total}</span>` : ''}
        </button>
      `;
    }).join('');

    const poolTab = `
      <button class="member-tab ${activeTab === 'pool' ? 'active' : ''}" data-action="set-tab" data-tab="pool">
        <span class="tab-avatar pool-icon">📋</span>
        <span class="tab-name">Available Chores</span>
        ${poolCount > 0 ? `<span class="tab-badge">${poolCount}</span>` : ''}
      </button>
    `;

    return `
      <div class="header">
        <span class="header-title">${esc(this._config.title || 'Chore Tracker')}</span>
        <button class="icon-btn" data-action="view-admin" title="Admin">⚙️</button>
      </div>
      <div class="tab-bar">
        ${tabs}
        ${poolTab}
      </div>
      <div class="tab-content">
        ${activeTab === 'pool' ? this._renderPool() : this._renderMemberPanel(activeTab)}
      </div>
      ${this._state.claimingChore ? this._renderClaimModal() : ''}
    `;
  }

  _renderMemberPanel(memberId) {
    const m = (this._data.members || []).find(x => x.id === memberId);
    if (!m) return '<div class="empty">Member not found.</div>';

    const chores = this._getMemberChores(m.id);
    const done = chores.filter(c => c.completed).length;
    const total = chores.length;
    const pct = total ? Math.round((done / total) * 100) : 0;
    const allDone = total > 0 && done === total;
    const poolAvailable = this._getPoolChores().length > 0;

    const recurrenceLabel = { none: '', daily: ' · 🔁 Daily', weekdays: ' · 🔁 Weekdays' };

    const choreItems = chores.map(c => `
      <div class="chore-item ${c.completed ? 'completed' : ''}">
        <button class="chore-check ${c.completed ? 'checked' : ''}"
          data-action="toggle-chore" data-choreid="${c.id}" data-memberid="${m.id}">
          ${c.completed ? '✔' : ''}
        </button>
        <span class="chore-emoji">${esc(c.emoji || getChoreEmoji(c.title))}</span>
        <div class="chore-body">
          <span class="chore-title">${esc(c.title)}</span>
          ${c.recurrence && c.recurrence !== 'none' ? `<span class="chore-recur">${recurrenceLabel[c.recurrence] || ''}</span>` : ''}
        </div>
        <div class="chore-rewards">
          ${c.points ? `<span class="reward-badge points">⭐${c.points}</span>` : ''}
          ${c.dollars ? `<span class="reward-badge dollars">💵$${parseFloat(c.dollars).toFixed(2)}</span>` : ''}
        </div>
      </div>
    `).join('');

    return `
      <div class="member-summary">
        <div class="summary-left">
          <div class="summary-avatar">${esc(m.avatar || m.name[0].toUpperCase())}</div>
          <div>
            <div class="summary-name">${esc(m.name)}</div>
            <div class="summary-stats">
              <span class="stat-chip">⭐ ${m.points || 0} pts</span>
              <span class="stat-chip">💵 $${(m.dollars || 0).toFixed(2)}</span>
            </div>
          </div>
        </div>
        <div class="summary-progress">
          <div class="progress-bar-wrap"><div class="progress-bar" style="width:${pct}%"></div></div>
          <div class="progress-label">${done} of ${total} done</div>
        </div>
      </div>
      <div class="chores-list">
        ${choreItems || '<div class="empty">No chores assigned yet!</div>'}
      </div>
      ${allDone && poolAvailable ? `
        <div class="claim-banner" data-action="set-tab" data-tab="pool">
          🎉 All done! Claim bonus chores from Available Chores →
        </div>
      ` : ''}
    `;
  }

  _renderPool() {
    const pool = this._getPoolChores();
    const eligibles = this._eligibleClaimers();

    const items = pool.map(c => `
      <div class="chore-item">
        <span class="chore-emoji">${esc(c.emoji || getChoreEmoji(c.title))}</span>
        <div class="chore-body">
          <span class="chore-title">${esc(c.title)}</span>
        </div>
        <div class="chore-rewards">
          ${c.points ? `<span class="reward-badge points">⭐${c.points}</span>` : ''}
          ${c.dollars ? `<span class="reward-badge dollars">💵$${parseFloat(c.dollars).toFixed(2)}</span>` : ''}
        </div>
        <button class="claim-btn ${eligibles.length === 0 ? 'disabled' : ''}"
          data-action="open-claim" data-choreid="${c.id}"
          ${eligibles.length === 0 ? 'disabled title="No members have completed their chores yet"' : ''}>
          Claim
        </button>
      </div>
    `).join('');

    const claimed = (this._data.pool || []).filter(c => c.claimedBy);
    const claimedItems = claimed.map(c => {
      const claimer = (this._data.members || []).find(m => m.id === c.claimedBy);
      return `
        <div class="chore-item claimed">
          <span class="chore-emoji">${esc(c.emoji || getChoreEmoji(c.title))}</span>
          <div class="chore-body">
            <span class="chore-title">${esc(c.title)}</span>
            <span class="chore-recur">Claimed by ${esc(claimer ? claimer.name : 'unknown')}</span>
          </div>
        </div>
      `;
    }).join('');

    return `
      <div class="pool-header">
        <div class="pool-info">
          ${eligibles.length > 0
            ? `<span class="pool-eligible">✅ ${esc(eligibles.map(m => m.name).join(', '))} can claim!</span>`
            : `<span class="pool-none">Complete all assigned chores to claim pool chores.</span>`}
        </div>
      </div>
      <div class="chores-list">
        ${items || '<div class="empty">No chores available in the pool.</div>'}
      </div>
      ${claimed.length > 0 ? `
        <div class="section-label">Already Claimed</div>
        <div class="chores-list claimed-list">
          ${claimedItems}
        </div>
      ` : ''}
    `;
  }

  _renderClaimModal() {
    const choreId = this._state.claimingChore;
    const chore = (this._data.pool || []).find(c => c.id === choreId);
    if (!chore) return '';
    const eligibles = this._eligibleClaimers();

    return `
      <div class="modal-overlay" data-action="close-claim">
        <div class="modal" onclick="event.stopPropagation()">
          <div class="modal-title">Assign "${esc(chore.emoji || getChoreEmoji(chore.title))} ${esc(chore.title)}"</div>
          <div class="modal-subtitle">Who is claiming this chore?</div>
          <div class="modal-members">
            ${eligibles.map(m => `
              <button class="modal-member-btn" data-action="confirm-claim" data-choreid="${choreId}" data-memberid="${m.id}">
                <span class="modal-avatar">${esc(m.avatar || m.name[0].toUpperCase())}</span>
                <span>${esc(m.name)}</span>
              </button>
            `).join('')}
          </div>
          <button class="secondary-btn" data-action="close-claim">Cancel</button>
        </div>
      </div>
    `;
  }

  // ─── ADMIN ────────────────────────────────────────────────────────────────

  _renderAdmin() {
    if (!this._state.adminUnlocked) return this._renderAdminLogin();
    const tab = this._state.adminTab;
    return `
      <div class="header">
        <button class="back-btn" data-action="go-main">← Back</button>
        <span class="header-title">Admin Console</span>
        <button class="icon-btn" data-action="admin-logout" title="Lock">🔒</button>
      </div>
      <div class="tab-bar admin-tabs">
        <button class="member-tab ${tab === 'chores' ? 'active' : ''}" data-action="admin-tab" data-tab="chores">Chores</button>
        <button class="member-tab ${tab === 'members' ? 'active' : ''}" data-action="admin-tab" data-tab="members">Members</button>
        <button class="member-tab ${tab === 'pool' ? 'active' : ''}" data-action="admin-tab" data-tab="pool">Available Chores</button>
      </div>
      <div class="tab-content">
        ${tab === 'chores' ? this._renderAdminChores() : ''}
        ${tab === 'members' ? this._renderAdminMembers() : ''}
        ${tab === 'pool' ? this._renderAdminPool() : ''}
      </div>
    `;
  }

  _renderAdminLogin() {
    return `
      <div class="header">
        <button class="back-btn" data-action="go-main">← Back</button>
        <span class="header-title">Admin Console</span>
      </div>
      <div class="admin-login">
        <div class="login-icon">🔐</div>
        <div class="login-title">Enter Admin Password</div>
        <input class="admin-input" id="admin-password" type="password" placeholder="Password" />
        <div class="login-error" id="login-error"></div>
        <button class="primary-btn" data-action="admin-login">Unlock</button>
      </div>
    `;
  }

  _renderAdminChores() {
    const members = this._data.members || [];
    const chores = this._data.chores || [];
    const editing = this._state.editingChore;

    if (editing !== null) {
      const isNew = editing === 'new';
      const chore = isNew ? { title: '', emoji: '', points: 0, dollars: 0, assignedTo: [], recurrence: 'none' }
        : chores.find(c => c.id === editing) || {};
      return `
        <div class="edit-form">
          <div class="form-title">${isNew ? 'Add Chore' : 'Edit Chore'}</div>
          <label>Title</label>
          <input class="form-input" id="ec-title" value="${this._esc(chore.title || '')}" placeholder="Chore name" />
          <label>Emoji (optional override)</label>
          <input class="form-input" id="ec-emoji" value="${this._esc(chore.emoji || '')}" placeholder="e.g. 🧹" />
          <label>Points</label>
          <input class="form-input" id="ec-points" type="number" min="0" value="${chore.points || 0}" />
          <label>Dollar Value ($)</label>
          <input class="form-input" id="ec-dollars" type="number" min="0" step="0.01" value="${chore.dollars || 0}" />
          <label>Recurrence</label>
          <select class="form-input" id="ec-recurrence">
            <option value="none" ${(!chore.recurrence || chore.recurrence === 'none') ? 'selected' : ''}>One-time / No reset</option>
            <option value="daily" ${chore.recurrence === 'daily' ? 'selected' : ''}>🔁 Daily (resets every day)</option>
            <option value="weekdays" ${chore.recurrence === 'weekdays' ? 'selected' : ''}>🔁 Weekdays (Mon–Fri)</option>
          </select>
          <label>Assign To</label>
          <div class="assign-list">
            ${members.length ? members.map(m => `
              <label class="assign-item">
                <input type="checkbox" id="assign-${m.id}" ${(chore.assignedTo || []).includes(m.id) ? 'checked' : ''} />
                ${esc(m.avatar || m.name[0].toUpperCase())} ${esc(m.name)}
              </label>
            `).join('') : '<span class="empty-inline">Add members first.</span>'}
          </div>
          <div class="form-actions">
            <button class="primary-btn" data-action="save-chore" data-id="${editing}">Save</button>
            <button class="secondary-btn" data-action="cancel-edit">Cancel</button>
            ${!isNew ? `<button class="danger-btn" data-action="delete-chore" data-id="${editing}">Delete</button>` : ''}
          </div>
        </div>
      `;
    }

    return `
      <div class="admin-section">
        <button class="primary-btn full-btn" data-action="new-chore">+ Add Chore</button>
        ${chores.map(c => {
          const assignedNames = (c.assignedTo || [])
            .map(id => members.find(m => m.id === id)?.name).filter(Boolean).join(', ');
          const recurLabel = c.recurrence === 'daily' ? ' · 🔁 Daily' : c.recurrence === 'weekdays' ? ' · 🔁 Weekdays' : '';
          return `
            <div class="admin-item">
              <span class="chore-emoji">${esc(c.emoji || getChoreEmoji(c.title))}</span>
              <div class="admin-item-info">
                <div class="admin-item-title">${esc(c.title)}</div>
                <div class="admin-item-meta">${esc(assignedNames || 'Unassigned')} · ⭐${c.points || 0} · 💵$${parseFloat(c.dollars || 0).toFixed(2)}${recurLabel}</div>
              </div>
              <div class="admin-item-actions">
                <button class="icon-btn dark" data-action="edit-chore" data-id="${c.id}">✏️</button>
                <button class="icon-btn dark" data-action="reset-chore" data-id="${c.id}" title="Reset completion">🔄</button>
              </div>
            </div>
          `;
        }).join('')}
        ${chores.length === 0 ? '<div class="empty">No chores yet.</div>' : ''}
      </div>
    `;
  }

  _renderAdminMembers() {
    const members = this._data.members || [];
    const editing = this._state.editingMember;

    if (editing !== null) {
      const isNew = editing === 'new';
      const member = isNew ? { name: '', avatar: '' } : members.find(m => m.id === editing) || {};
      return `
        <div class="edit-form">
          <div class="form-title">${isNew ? 'Add Member' : 'Edit Member'}</div>
          <label>Name</label>
          <input class="form-input" id="em-name" value="${this._esc(member.name || '')}" placeholder="Name" />
          <label>Avatar (emoji or initials)</label>
          <input class="form-input" id="em-avatar" value="${this._esc(member.avatar || '')}" placeholder="e.g. 👦 or JD" />
          ${!isNew ? `
            <div class="member-totals">
              <span>⭐ ${member.points || 0} pts</span>
              <span>💵 $${(member.dollars || 0).toFixed(2)}</span>
            </div>
            <button class="secondary-btn" data-action="reset-member-earnings" data-id="${editing}">Reset Earnings to $0</button>
          ` : ''}
          <div class="form-actions">
            <button class="primary-btn" data-action="save-member" data-id="${editing}">Save</button>
            <button class="secondary-btn" data-action="cancel-edit">Cancel</button>
            ${!isNew ? `<button class="danger-btn" data-action="delete-member" data-id="${editing}">Delete</button>` : ''}
          </div>
        </div>
      `;
    }

    return `
      <div class="admin-section">
        <button class="primary-btn full-btn" data-action="new-member">+ Add Member</button>
        ${members.map(m => `
          <div class="admin-item">
            <span class="tab-avatar small-avatar">${esc(m.avatar || m.name[0].toUpperCase())}</span>
            <div class="admin-item-info">
              <div class="admin-item-title">${esc(m.name)}</div>
              <div class="admin-item-meta">⭐ ${m.points || 0} pts · 💵 $${(m.dollars || 0).toFixed(2)}</div>
            </div>
            <div class="admin-item-actions">
              <button class="icon-btn dark" data-action="edit-member" data-id="${m.id}">✏️</button>
              <button class="icon-btn dark" data-action="reset-member-earnings" data-id="${m.id}" title="Reset earnings">💰</button>
            </div>
          </div>
        `).join('')}
        ${members.length === 0 ? '<div class="empty">No members yet.</div>' : ''}
      </div>
    `;
  }

  _renderAdminPool() {
    const pool = this._data.pool || [];
    const members = this._data.members || [];
    const editing = this._state.editingChore;

    if (editing !== null && (editing === 'new-pool' || pool.find(c => c.id === editing))) {
      const isNew = editing === 'new-pool';
      const chore = isNew ? { title: '', emoji: '', points: 0, dollars: 0 } : pool.find(c => c.id === editing) || {};
      return `
        <div class="edit-form">
          <div class="form-title">${isNew ? 'Add Available Chore' : 'Edit Available Chore'}</div>
          <label>Title</label>
          <input class="form-input" id="pc-title" value="${this._esc(chore.title || '')}" placeholder="Chore name" />
          <label>Emoji (optional)</label>
          <input class="form-input" id="pc-emoji" value="${this._esc(chore.emoji || '')}" placeholder="e.g. 🧹" />
          <label>Points</label>
          <input class="form-input" id="pc-points" type="number" min="0" value="${chore.points || 0}" />
          <label>Dollar Value ($)</label>
          <input class="form-input" id="pc-dollars" type="number" min="0" step="0.01" value="${chore.dollars || 0}" />
          <div class="form-actions">
            <button class="primary-btn" data-action="save-pool-chore" data-id="${editing}">Save</button>
            <button class="secondary-btn" data-action="cancel-edit">Cancel</button>
            ${!isNew ? `<button class="danger-btn" data-action="delete-pool-chore" data-id="${editing}">Delete</button>` : ''}
          </div>
        </div>
      `;
    }

    return `
      <div class="admin-section">
        <button class="primary-btn full-btn" data-action="new-pool-chore">+ Add Available Chore</button>
        ${pool.map(c => {
          const claimer = c.claimedBy ? members.find(m => m.id === c.claimedBy) : null;
          return `
            <div class="admin-item">
              <span class="chore-emoji">${esc(c.emoji || getChoreEmoji(c.title))}</span>
              <div class="admin-item-info">
                <div class="admin-item-title">${esc(c.title)}</div>
                <div class="admin-item-meta">${claimer ? `Claimed by ${esc(claimer.name)}` : 'Available'} · ⭐${c.points || 0} · 💵$${parseFloat(c.dollars || 0).toFixed(2)}</div>
              </div>
              <div class="admin-item-actions">
                <button class="icon-btn dark" data-action="edit-pool-chore" data-id="${c.id}">✏️</button>
                ${c.claimedBy ? `<button class="icon-btn dark" data-action="unclaim-pool-chore" data-id="${c.id}" title="Unclaim">↩️</button>` : ''}
                <button class="icon-btn dark" data-action="delete-pool-chore" data-id="${c.id}">🗑️</button>
              </div>
            </div>
          `;
        }).join('')}
        ${pool.length === 0 ? '<div class="empty">No pool chores yet.</div>' : ''}
      </div>
    `;
  }

  // ─── EVENTS ──────────────────────────────────────────────────────────────

  _attachEvents() {
    this.shadowRoot.querySelectorAll('[data-action]').forEach(el => {
      el.addEventListener('click', e => {
        e.stopPropagation();
        this._handleAction(e.currentTarget);
      });
    });
    const pw = this.shadowRoot.getElementById('admin-password');
    if (pw) pw.addEventListener('keydown', e => { if (e.key === 'Enter') this._adminLogin(); });
  }

  _handleAction(el) {
    const action = el.dataset.action;
    const id = el.dataset.id;

    switch (action) {
      case 'set-tab':
        this._state.activeTab = el.dataset.tab;
        this._state.claimingChore = null;
        break;
      case 'view-admin':
        this._state.view = 'admin';
        this._state.editingChore = null;
        this._state.editingMember = null;
        break;
      case 'go-main':
        this._state.view = 'main';
        this._state.adminUnlocked = false;
        break;
      case 'admin-login':
        this._adminLogin(); return;
      case 'admin-logout':
        this._state.adminUnlocked = false;
        this._state.view = 'main';
        break;
      case 'admin-tab':
        this._state.adminTab = el.dataset.tab;
        this._state.editingChore = null;
        this._state.editingMember = null;
        break;

      case 'toggle-chore':
        this._toggleChore(el.dataset.choreid, el.dataset.memberid); return;

      case 'new-chore': this._state.editingChore = 'new'; break;
      case 'edit-chore': this._state.editingChore = id; break;
      case 'save-chore': this._saveChore(el.dataset.id); return;
      case 'delete-chore': this._deleteChore(id); return;
      case 'reset-chore': this._resetChore(id); return;
      case 'cancel-edit':
        this._state.editingChore = null;
        this._state.editingMember = null;
        break;

      case 'new-member': this._state.editingMember = 'new'; break;
      case 'edit-member': this._state.editingMember = id; break;
      case 'save-member': this._saveMember(el.dataset.id); return;
      case 'delete-member': this._deleteMember(id); return;
      case 'reset-member-earnings': this._resetMemberEarnings(id); return;

      case 'new-pool-chore': this._state.editingChore = 'new-pool'; break;
      case 'edit-pool-chore': this._state.editingChore = id; break;
      case 'save-pool-chore': this._savePoolChore(el.dataset.id); return;
      case 'delete-pool-chore': this._deletePoolChore(id); return;
      case 'unclaim-pool-chore': this._unclaimPoolChore(id); return;

      case 'open-claim':
        this._state.claimingChore = el.dataset.choreid;
        break;
      case 'close-claim':
        this._state.claimingChore = null;
        break;
      case 'confirm-claim':
        this._claimChore(el.dataset.choreid, el.dataset.memberid); return;
    }
    this._render();
  }

  // ─── DATA MUTATIONS ──────────────────────────────────────────────────────

  _adminLogin() {
    const input = this.shadowRoot.getElementById('admin-password');
    const errEl = this.shadowRoot.getElementById('login-error');
    if (input && input.value === String(this._config.admin_password || '1234')) {
      this._state.adminUnlocked = true;
      this._render();
    } else {
      if (errEl) errEl.textContent = 'Incorrect password.';
    }
  }

  _toggleChore(choreId, memberId) {
    const chore = (this._data.chores || []).find(c => c.id === choreId);
    if (!chore) return;
    if (!chore.memberStates) chore.memberStates = {};
    if (!chore.memberStates[memberId]) chore.memberStates[memberId] = {};
    const state = chore.memberStates[memberId];
    const wasCompleted = state.completed;
    state.completed = !wasCompleted;

    const member = (this._data.members || []).find(m => m.id === memberId);
    if (member) {
      const pts = chore.points || 0;
      const dlr = parseFloat(chore.dollars || 0);
      if (!wasCompleted) {
        member.points = (member.points || 0) + pts;
        member.dollars = (member.dollars || 0) + dlr;
      } else {
        member.points = Math.max(0, (member.points || 0) - pts);
        member.dollars = Math.max(0, (member.dollars || 0) - dlr);
      }
    }
    this._saveData();
    this._render();
  }

  _saveChore(editing) {
    const title = this.shadowRoot.getElementById('ec-title')?.value?.trim();
    if (!title) return;
    const emoji = this.shadowRoot.getElementById('ec-emoji')?.value?.trim() || '';
    const points = parseInt(this.shadowRoot.getElementById('ec-points')?.value || 0);
    const dollars = parseFloat(this.shadowRoot.getElementById('ec-dollars')?.value || 0);
    const recurrence = this.shadowRoot.getElementById('ec-recurrence')?.value || 'none';
    const assignedTo = [];
    this.shadowRoot.querySelectorAll('[id^="assign-"]').forEach(cb => {
      if (cb.checked) assignedTo.push(cb.id.replace('assign-', ''));
    });

    if (editing === 'new') {
      this._data.chores.push({ id: this._uid(), title, emoji, points, dollars, recurrence, assignedTo, memberStates: {} });
    } else {
      const chore = (this._data.chores || []).find(c => c.id === editing);
      if (chore) Object.assign(chore, { title, emoji, points, dollars, recurrence, assignedTo });
    }
    this._saveData();
    this._state.editingChore = null;
    this._render();
  }

  _deleteChore(id) {
    this._data.chores = (this._data.chores || []).filter(c => c.id !== id);
    this._saveData();
    this._state.editingChore = null;
    this._render();
  }

  _resetChore(id) {
    const chore = (this._data.chores || []).find(c => c.id === id);
    if (!chore) return;
    (chore.assignedTo || []).forEach(memberId => {
      const state = ((chore.memberStates || {})[memberId] || {});
      if (state.completed) {
        const member = (this._data.members || []).find(m => m.id === memberId);
        if (member) {
          member.points = Math.max(0, (member.points || 0) - (chore.points || 0));
          member.dollars = Math.max(0, (member.dollars || 0) - parseFloat(chore.dollars || 0));
        }
      }
    });
    chore.memberStates = {};
    this._saveData();
    this._render();
  }

  _saveMember(editing) {
    const name = this.shadowRoot.getElementById('em-name')?.value?.trim();
    if (!name) return;
    const avatar = this.shadowRoot.getElementById('em-avatar')?.value?.trim() || '';
    if (editing === 'new') {
      this._data.members.push({ id: this._uid(), name, avatar, points: 0, dollars: 0 });
    } else {
      const m = (this._data.members || []).find(m => m.id === editing);
      if (m) Object.assign(m, { name, avatar });
    }
    this._saveData();
    this._state.editingMember = null;
    this._render();
  }

  _deleteMember(id) {
    this._data.members = (this._data.members || []).filter(m => m.id !== id);
    (this._data.chores || []).forEach(c => {
      c.assignedTo = (c.assignedTo || []).filter(mid => mid !== id);
      if (c.memberStates) delete c.memberStates[id];
    });
    if (this._state.activeTab === id) {
      this._state.activeTab = (this._data.members[0] || {}).id || 'pool';
    }
    this._saveData();
    this._state.editingMember = null;
    this._render();
  }

  _resetMemberEarnings(id) {
    const m = (this._data.members || []).find(m => m.id === id);
    if (m) { m.points = 0; m.dollars = 0; }
    this._saveData();
    this._render();
  }

  _savePoolChore(editing) {
    const title = this.shadowRoot.getElementById('pc-title')?.value?.trim();
    if (!title) return;
    const emoji = this.shadowRoot.getElementById('pc-emoji')?.value?.trim() || '';
    const points = parseInt(this.shadowRoot.getElementById('pc-points')?.value || 0);
    const dollars = parseFloat(this.shadowRoot.getElementById('pc-dollars')?.value || 0);
    if (editing === 'new-pool') {
      if (!this._data.pool) this._data.pool = [];
      this._data.pool.push({ id: this._uid(), title, emoji, points, dollars, claimedBy: null });
    } else {
      const chore = (this._data.pool || []).find(c => c.id === editing);
      if (chore) Object.assign(chore, { title, emoji, points, dollars });
    }
    this._saveData();
    this._state.editingChore = null;
    this._render();
  }

  _deletePoolChore(id) {
    this._data.pool = (this._data.pool || []).filter(c => c.id !== id);
    this._data.chores = (this._data.chores || []).filter(c => c._poolRef !== id);
    this._saveData();
    this._state.editingChore = null;
    this._render();
  }

  _unclaimPoolChore(id) {
    const chore = (this._data.pool || []).find(c => c.id === id);
    if (chore) chore.claimedBy = null;
    this._data.chores = (this._data.chores || []).filter(c => c._poolRef !== id);
    this._saveData();
    this._render();
  }

  _claimChore(choreId, memberId) {
    const poolChore = (this._data.pool || []).find(c => c.id === choreId);
    if (!poolChore || poolChore.claimedBy) return;
    if (!this._allChoresDone(memberId)) return;

    if (!this._data.chores) this._data.chores = [];
    this._data.chores.push({
      id: this._uid(),
      title: poolChore.title,
      emoji: poolChore.emoji,
      points: poolChore.points,
      dollars: poolChore.dollars,
      assignedTo: [memberId],
      memberStates: {},
      recurrence: 'none',
      _poolRef: choreId,
    });
    poolChore.claimedBy = memberId;

    this._saveData();
    this._state.claimingChore = null;
    this._state.activeTab = memberId;
    this._render();
  }

  _esc(str) {
    return esc(str);
  }

  // ─── STYLES ──────────────────────────────────────────────────────────────

  _styles() {
    return `
      :host { display: block; font-family: var(--paper-font-body1_-_font-family, 'Roboto', sans-serif); }
      * { box-sizing: border-box; }
      ha-card {
        overflow: hidden;
        color: var(--primary-text-color, #333);
        position: relative;
      }
      .header {
        background: #003366;
        color: #fff;
        padding: 12px 16px;
        display: flex;
        align-items: center;
        gap: 10px;
        min-height: 50px;
      }
      .header-title { flex: 1; font-size: 1.05rem; font-weight: 700; letter-spacing: 0.3px; }
      .back-btn {
        background: rgba(255,255,255,0.15); border: none; color: #fff; cursor: pointer;
        padding: 5px 10px; border-radius: 6px; font-size: 0.82rem; font-weight: 600;
      }
      .back-btn:hover { background: rgba(255,255,255,0.25); }
      .icon-btn {
        background: rgba(255,255,255,0.1); border: none; color: #fff; cursor: pointer;
        width: 34px; height: 34px; border-radius: 6px; font-size: 1rem;
        display: flex; align-items: center; justify-content: center;
      }
      .icon-btn:hover { background: rgba(255,255,255,0.2); }
      .icon-btn.dark {
        background: var(--secondary-background-color, #eee);
        color: var(--primary-text-color, #333);
      }
      .icon-btn.dark:hover { background: var(--divider-color, #ddd); }

      /* TAB BAR */
      .tab-bar {
        display: flex;
        overflow-x: auto;
        background: #003366;
        border-bottom: 2px solid #4FC3F7;
        scrollbar-width: none;
        gap: 2px;
        padding: 0 4px;
      }
      .tab-bar::-webkit-scrollbar { display: none; }
      .admin-tabs { background: var(--secondary-background-color, #f5f5f5); border-bottom-color: var(--divider-color, #ddd); }
      .member-tab {
        display: flex; flex-direction: column; align-items: center; gap: 2px;
        background: transparent; border: none; cursor: pointer;
        padding: 8px 12px; min-width: 70px;
        color: rgba(255,255,255,0.7); font-size: 0.72rem; font-weight: 600;
        border-bottom: 3px solid transparent; transition: all 0.2s; white-space: nowrap;
      }
      .admin-tabs .member-tab { color: var(--secondary-text-color, #666); }
      .member-tab.active { color: #fff; border-bottom-color: #4FC3F7; }
      .admin-tabs .member-tab.active { color: #0288D1; border-bottom-color: #0288D1; background: var(--card-background-color, #fff); }
      .member-tab:hover { color: #fff; background: rgba(255,255,255,0.08); }
      .admin-tabs .member-tab:hover { color: #0288D1; background: var(--hover-color, rgba(2,136,209,0.05)); }
      .tab-avatar {
        width: 32px; height: 32px;
        background: linear-gradient(135deg, #0077b6, #4FC3F7);
        color: #fff; border-radius: 50%;
        display: flex; align-items: center; justify-content: center;
        font-size: 0.9rem; font-weight: 700; flex-shrink: 0;
        transition: all 0.2s;
      }
      .tab-avatar.done { background: linear-gradient(135deg, #2e7d32, #66bb6a); }
      .tab-avatar.pool-icon { background: linear-gradient(135deg, #4a148c, #9c27b0); font-size: 1rem; }
      .small-avatar {
        width: 36px; height: 36px;
        background: linear-gradient(135deg, #003366, #0288D1);
        color: #fff; border-radius: 50%;
        display: flex; align-items: center; justify-content: center;
        font-size: 1rem; font-weight: 700;
      }
      .tab-name { font-size: 0.7rem; }
      .tab-badge {
        background: #4FC3F7; color: #003366;
        border-radius: 10px; padding: 1px 6px;
        font-size: 0.65rem; font-weight: 700; min-width: 20px; text-align: center;
      }
      .tab-badge.badge-done { background: #66bb6a; color: #fff; }

      /* CONTENT */
      .tab-content { padding: 12px; }

      /* MEMBER PANEL */
      .member-summary {
        display: flex; align-items: center; justify-content: space-between;
        gap: 12px; padding: 12px;
        background: linear-gradient(135deg, rgba(0,51,102,0.05), rgba(79,195,247,0.08));
        border-radius: 10px; margin-bottom: 12px;
        border: 1px solid rgba(79,195,247,0.2);
      }
      .summary-left { display: flex; align-items: center; gap: 12px; }
      .summary-avatar {
        width: 44px; height: 44px;
        background: linear-gradient(135deg, #003366, #0288D1);
        color: #fff; border-radius: 50%;
        display: flex; align-items: center; justify-content: center;
        font-size: 1.3rem; font-weight: 700; flex-shrink: 0;
      }
      .summary-name { font-weight: 700; font-size: 0.95rem; margin-bottom: 4px; }
      .summary-stats { display: flex; gap: 6px; flex-wrap: wrap; }
      .stat-chip {
        font-size: 0.75rem; padding: 2px 8px; border-radius: 10px;
        background: rgba(0,51,102,0.1); color: var(--primary-text-color, #333);
        font-weight: 600;
      }
      .summary-progress { flex: 1; max-width: 140px; text-align: right; }
      .progress-bar-wrap {
        height: 7px; background: var(--divider-color, #e0e0e0);
        border-radius: 4px; overflow: hidden; margin-bottom: 4px;
      }
      .progress-bar {
        height: 100%; background: linear-gradient(90deg, #4FC3F7, #0288D1);
        border-radius: 4px; transition: width 0.4s ease;
      }
      .progress-label { font-size: 0.72rem; color: var(--secondary-text-color, #888); }

      /* CHORE LIST */
      .chores-list { display: flex; flex-direction: column; gap: 7px; }
      .chore-item {
        display: flex; align-items: center; gap: 9px;
        background: var(--secondary-background-color, #f9f9f9);
        border: 1px solid var(--divider-color, #e8e8e8);
        border-radius: 10px; padding: 9px 11px;
        transition: all 0.2s;
      }
      .chore-item.completed { opacity: 0.55; background: rgba(67,160,71,0.06); border-color: rgba(67,160,71,0.3); }
      .chore-item.claimed { opacity: 0.6; }
      .chore-check {
        width: 24px; height: 24px; border: 2px solid var(--divider-color, #bbb);
        border-radius: 5px; background: transparent; cursor: pointer;
        display: flex; align-items: center; justify-content: center;
        font-size: 0.8rem; color: #fff; flex-shrink: 0; transition: all 0.2s;
      }
      .chore-check.checked { background: #43A047; border-color: #43A047; }
      .chore-emoji { font-size: 1.25rem; flex-shrink: 0; }
      .chore-body { flex: 1; min-width: 0; }
      .chore-title { font-size: 0.9rem; font-weight: 500; display: block; }
      .chore-recur { font-size: 0.72rem; color: #0288D1; }
      .chore-rewards { display: flex; gap: 4px; flex-shrink: 0; flex-wrap: wrap; justify-content: flex-end; }
      .reward-badge { font-size: 0.7rem; padding: 2px 6px; border-radius: 8px; font-weight: 600; }
      .reward-badge.points { background: rgba(255,193,7,0.15); color: #E65100; }
      .reward-badge.dollars { background: rgba(67,160,71,0.15); color: #2E7D32; }

      /* CLAIM BTN */
      .claim-btn {
        padding: 5px 11px; background: #0288D1; color: #fff; border: none;
        border-radius: 7px; cursor: pointer; font-size: 0.78rem; font-weight: 600;
        flex-shrink: 0; transition: background 0.2s;
      }
      .claim-btn:hover:not(.disabled) { background: #01579B; }
      .claim-btn.disabled { background: var(--disabled-color, #ccc); cursor: not-allowed; color: #888; }

      /* POOL */
      .pool-header { margin-bottom: 10px; }
      .pool-eligible { font-size: 0.82rem; color: #2e7d32; font-weight: 600; }
      .pool-none { font-size: 0.82rem; color: var(--secondary-text-color, #888); }
      .section-label {
        font-size: 0.72rem; font-weight: 700; text-transform: uppercase;
        letter-spacing: 1px; color: #0288D1; margin: 12px 0 6px;
      }
      .claimed-list { opacity: 0.7; }

      /* CLAIM MODAL */
      .modal-overlay {
        position: absolute; inset: 0;
        background: rgba(0,0,0,0.45);
        display: flex; align-items: center; justify-content: center;
        z-index: 10; border-radius: inherit;
      }
      .modal {
        background: var(--ha-card-background, #fff);
        border-radius: 14px; padding: 20px; width: 90%; max-width: 320px;
        display: flex; flex-direction: column; gap: 12px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.25);
      }
      .modal-title { font-size: 1rem; font-weight: 700; color: #003366; }
      .modal-subtitle { font-size: 0.83rem; color: var(--secondary-text-color, #666); }
      .modal-members { display: flex; flex-direction: column; gap: 8px; }
      .modal-member-btn {
        display: flex; align-items: center; gap: 12px;
        padding: 10px 14px; background: var(--secondary-background-color, #f5f5f5);
        border: 1.5px solid var(--divider-color, #ddd);
        border-radius: 10px; cursor: pointer; font-size: 0.9rem; font-weight: 600;
        color: var(--primary-text-color, #333); transition: all 0.2s;
      }
      .modal-member-btn:hover { border-color: #0288D1; background: rgba(2,136,209,0.06); color: #003366; }
      .modal-avatar {
        width: 36px; height: 36px;
        background: linear-gradient(135deg, #003366, #0288D1);
        color: #fff; border-radius: 50%;
        display: flex; align-items: center; justify-content: center;
        font-size: 1rem; font-weight: 700;
      }

      /* CLAIM BANNER */
      .claim-banner {
        margin-top: 12px; padding: 11px 14px;
        background: linear-gradient(135deg, #43A047, #1B5E20);
        color: #fff; border-radius: 10px; cursor: pointer;
        font-size: 0.88rem; font-weight: 600; text-align: center;
      }
      .claim-banner:hover { opacity: 0.9; }

      /* ADMIN */
      .admin-login {
        display: flex; flex-direction: column; align-items: center;
        gap: 14px; padding: 32px 24px;
      }
      .login-icon { font-size: 2.8rem; }
      .login-title { font-size: 1rem; font-weight: 700; }
      .admin-input {
        width: 100%; max-width: 240px; padding: 10px 14px;
        border: 1.5px solid var(--divider-color, #ccc); border-radius: 8px;
        font-size: 1rem; background: var(--card-background-color, #fff);
        color: var(--primary-text-color, #333); text-align: center;
      }
      .admin-input:focus { border-color: #0288D1; outline: none; }
      .login-error { color: #c62828; font-size: 0.82rem; min-height: 16px; }
      .admin-section { display: flex; flex-direction: column; gap: 8px; }
      .admin-item {
        display: flex; align-items: center; gap: 10px;
        background: var(--secondary-background-color, #f9f9f9);
        border: 1px solid var(--divider-color, #e8e8e8);
        border-radius: 10px; padding: 9px 11px;
      }
      .admin-item-info { flex: 1; min-width: 0; }
      .admin-item-title { font-size: 0.88rem; font-weight: 600; }
      .admin-item-meta { font-size: 0.74rem; color: var(--secondary-text-color, #777); margin-top: 2px; }
      .admin-item-actions { display: flex; gap: 4px; }
      .edit-form { display: flex; flex-direction: column; gap: 7px; }
      .form-title { font-size: 1rem; font-weight: 700; color: #003366; margin-bottom: 4px; }
      .edit-form label { font-size: 0.78rem; font-weight: 600; color: var(--secondary-text-color, #666); margin-top: 3px; }
      .form-input {
        padding: 8px 11px; border: 1.5px solid var(--divider-color, #ccc);
        border-radius: 7px; font-size: 0.88rem;
        background: var(--card-background-color, #fff); color: var(--primary-text-color, #333);
        width: 100%;
      }
      .form-input:focus { border-color: #0288D1; outline: none; }
      select.form-input { cursor: pointer; }
      .assign-list { display: flex; flex-wrap: wrap; gap: 7px; padding: 4px 0; }
      .assign-item {
        display: flex; align-items: center; gap: 6px; font-size: 0.84rem;
        cursor: pointer; padding: 5px 10px;
        background: var(--secondary-background-color, #f5f5f5);
        border-radius: 7px; border: 1px solid var(--divider-color, #e0e0e0);
      }
      .empty-inline { font-size: 0.82rem; color: var(--secondary-text-color, #999); }
      .form-actions { display: flex; gap: 8px; margin-top: 6px; flex-wrap: wrap; }
      .member-totals {
        display: flex; gap: 16px; padding: 9px 12px;
        background: var(--secondary-background-color, #f5f5f5);
        border-radius: 7px; font-size: 0.85rem; font-weight: 600;
      }
      .primary-btn {
        padding: 8px 16px; background: #003366; color: #fff; border: none;
        border-radius: 7px; cursor: pointer; font-size: 0.85rem; font-weight: 600;
      }
      .primary-btn:hover { background: #01579B; }
      .full-btn { width: 100%; }
      .secondary-btn {
        padding: 8px 16px; background: var(--secondary-background-color, #f5f5f5);
        color: var(--primary-text-color, #333); border: 1.5px solid var(--divider-color, #ccc);
        border-radius: 7px; cursor: pointer; font-size: 0.85rem; font-weight: 600;
      }
      .secondary-btn:hover { background: var(--hover-color, #e5e5e5); }
      .danger-btn {
        padding: 8px 16px; background: #c62828; color: #fff; border: none;
        border-radius: 7px; cursor: pointer; font-size: 0.85rem; font-weight: 600;
      }
      .danger-btn:hover { background: #b71c1c; }
      .empty {
        text-align: center; color: var(--secondary-text-color, #999);
        padding: 20px; font-size: 0.88rem;
      }
      .loading {
        display: flex; flex-direction: column; align-items: center;
        gap: 14px; padding: 40px 20px;
        color: var(--secondary-text-color, #888); font-size: 0.88rem;
      }
      .loading-spinner {
        width: 32px; height: 32px;
        border: 3px solid var(--divider-color, #e0e0e0);
        border-top-color: #0288D1;
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
      }
      @keyframes spin { to { transform: rotate(360deg); } }
    `;
  }

  static getStubConfig() {
    return { title: 'Family Chores', admin_password: '1234' };
  }

  getCardSize() { return 5; }
}

if (!customElements.get('chore-tracker-card')) {
  customElements.define('chore-tracker-card', ChoreTrackerCard);
}

window.customCards = window.customCards || [];
if (!window.customCards.find(c => c.type === 'chore-tracker-card')) {
  window.customCards.push({
    type: 'chore-tracker-card',
    name: 'Chore Tracker Card',
    description: 'Track family chores with points and allowance rewards',
  });
}
