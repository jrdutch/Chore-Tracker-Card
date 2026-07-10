// Chore Tracker Card for Home Assistant
import { LitElement, html, css, nothing } from 'lit';
import { makeLocalizer } from './translations.js';

const CARD_VERSION = '1.7.0';
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
  const lower = String(title || '').toLowerCase();
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

// Coerce to a finite number, treating NaN/Infinity/garbage as 0
function num(v) {
  const n = typeof v === 'number' ? v : parseFloat(v);
  return Number.isFinite(n) ? n : 0;
}

// Round to cents — avoids floating-point drift from repeated +/- on dollars
function round2(v) {
  return Math.round(num(v) * 100) / 100;
}

function isWeekday() {
  const d = new Date().getDay(); // 0=Sun, 6=Sat
  return d >= 1 && d <= 5;
}

const DEFAULT_CONFIG = {
  title: 'Chore Tracker',
  admin_password: '1234',
};

class ChoreTrackerCard extends LitElement {
  constructor() {
    super();
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
    this._syncError = null;
    this._confirmKey = null;
    this._loginError = '';
    this._editRecurrence = null; // live value of the recurrence select while editing
  }

  set hass(hass) {
    this._hass = hass;
    this._subscribeToUpdates();
    if (!this._initialRenderDone && this._config) {
      this._initialRenderDone = true;
      this._loadData();
      this.requestUpdate();
    }
  }

  get hass() {
    return this._hass;
  }

  // Translator for the configured/user language, cached until it changes
  get _t() {
    const lang = this._config?.language || this._hass?.locale?.language || this._hass?.language || 'en';
    if (lang !== this._tLang) {
      this._tLang = lang;
      this._localize = makeLocalizer(lang);
    }
    return this._localize;
  }

  _recurLabel(c) {
    const t = this._t;
    if (c.recurrence === 'daily') return `🔁 ${t('daily')}`;
    if (c.recurrence === 'weekdays') return `🔁 ${t('weekdays')}`;
    if (c.recurrence === 'weekly') {
      const days = t('days');
      return `🔁 ${(c.recurrenceDays || []).map(d => days[d]).join(', ') || t('weekly')}`;
    }
    return '';
  }

  setConfig(config) {
    this._config = { ...DEFAULT_CONFIG, ...config };
    // Data is embedded directly in the card config (written there by _saveData).
    // Load it synchronously so the card is ready on first render.
    this._loadData();
    this.requestUpdate();
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
    this._saveTimer = setTimeout(() => {
      this._saveTimer = null;
      this._flushSave();
    }, 500);
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

  _callWS(msg) {
    if (typeof this._hass.callWS === 'function') return this._hass.callWS(msg);
    if (this._hass.connection?.sendMessagePromise) return this._hass.connection.sendMessagePromise(msg);
    throw new Error('No WS API');
  }

  // Fetch the config of the dashboard this card lives on. Explicit config
  // wins, otherwise derive it from the page URL (first path segment).
  // The default dashboard ("lovelace") must be requested as url_path null.
  async _fetchDashboardConfig() {
    let urlPath = this._config.lovelace_url_path;
    if (!urlPath) {
      const seg = window.location.pathname.split('/')[1] || '';
      urlPath = seg;
    }
    if (!urlPath || urlPath === 'lovelace') urlPath = null;

    try {
      const cfg = await this._callWS({ type: 'lovelace/config', url_path: urlPath });
      return { cfg, urlPath };
    } catch (err) {
      // Fallback: search every storage-mode dashboard for this card
      const dashboards = await this._callWS({ type: 'lovelace/dashboards/list' });
      for (const dash of [{ url_path: null }, ...(dashboards || [])]) {
        if (dash.mode && dash.mode !== 'storage') continue;
        const p = dash.url_path === 'lovelace' ? null : dash.url_path;
        if (p === urlPath) continue; // already tried
        try {
          const cfg = await this._callWS({ type: 'lovelace/config', url_path: p });
          if (JSON.stringify(cfg).includes('custom:chore-tracker-card')) {
            return { cfg, urlPath: p };
          }
        } catch (_) { /* dashboard has no stored config — skip */ }
      }
      throw err;
    }
  }

  // Find this card's node inside a dashboard config tree, using the same
  // identity rules as saving: storage_key first, then legacy title match.
  _findCardNode(cfg) {
    const myKey = this._config.storage_key || null;
    const matches = (node) => {
      if (node.type !== 'custom:chore-tracker-card') return false;
      if (myKey) return node.storage_key === myKey;
      return !node.storage_key &&
        (node.title || '') === (this._config.title || 'Chore Tracker');
    };
    let result = null;
    const walk = (nodes) => {
      if (!Array.isArray(nodes) || result) return;
      for (const node of nodes) {
        if (!node || typeof node !== 'object') continue;
        if (matches(node)) { result = node; return; }
        walk(node.cards);
        if (node.card) walk([node.card]);
      }
    };
    for (const view of (cfg.views || [])) {
      walk(view.cards);
      for (const section of (view.sections || [])) {
        walk(section.cards);
      }
    }
    return result;
  }

  // Writes data into the card's own lovelace dashboard config entry so it is
  // shared across ALL HA users and devices, not just the current browser.
  // The config is re-fetched immediately before every save so we patch the
  // freshest version of the dashboard.
  async _writeToLovelace() {
    if (!this._hass) return;
    try {
      const fetched = await this._fetchDashboardConfig();
      const cfg = JSON.parse(JSON.stringify(fetched.cfg));
      const node = this._findCardNode(cfg);

      if (node) {
        node.data = JSON.parse(JSON.stringify(this._data));
        // Stamp a permanent identity on first save so future matching
        // doesn't depend on the title.
        if (!node.storage_key) {
          node.storage_key = this._config.storage_key || this._uid();
          this._config = { ...this._config, storage_key: node.storage_key };
        }
        await this._callWS({
          type: 'lovelace/config/save',
          url_path: fetched.urlPath,
          config: cfg,
        });
        this._lastLocalSave = Date.now();
        this._setSyncError(null);
        console.info(`ChoreTracker v${CARD_VERSION}: data saved to dashboard config (synced to all devices)`);
      } else {
        this._setSyncError('card_not_found');
        console.warn('ChoreTracker: could not find card in lovelace config — data saved to localStorage only');
      }
    } catch (e) {
      this._setSyncError('sync_failed');
      console.warn('ChoreTracker: lovelace save failed —', e.message || e);
    }
  }

  // Surface sync failures in the card instead of only the console. With lit's
  // diffed rendering this is safe to do mid-edit — unrelated DOM is untouched.
  _setSyncError(message) {
    this._syncError = message || null;
    this.requestUpdate();
  }

  // ─── LIVE REFRESH ───────────────────────────────────────────────────────
  // HA fires lovelace_updated whenever any client saves the dashboard.
  // Pull the fresh data so this device updates without a page reload —
  // but never while the user is in the middle of something.
  _subscribeToUpdates() {
    if (this._updatesSubscribed || !this._hass?.connection?.subscribeEvents) return;
    this._updatesSubscribed = true;
    this._hass.connection.subscribeEvents(() => {
      clearTimeout(this._refreshTimer);
      this._refreshTimer = setTimeout(() => this._refreshFromServer(), 400);
    }, 'lovelace_updated');
  }

  _isUserBusy() {
    if (this._state.view === 'admin') return true;
    if (this._state.claimingChore) return true;
    const active = this.shadowRoot?.activeElement;
    return !!(active && (active.tagName === 'INPUT' || active.tagName === 'SELECT'));
  }

  async _refreshFromServer() {
    // Ignore the echo of our own save
    if (this._saving || this._saveTimer || (Date.now() - (this._lastLocalSave || 0)) < 2000) return;
    if (this._isUserBusy()) return;
    try {
      const { cfg } = await this._fetchDashboardConfig();
      const node = this._findCardNode(cfg);
      if (!node || !node.data) return;
      const fresh = JSON.stringify(node.data);
      if (fresh === JSON.stringify(this._data)) return; // nothing new
      this._data = JSON.parse(fresh);
      localStorage.setItem(this._storageKey(), fresh);
      this._checkRecurrenceResets();
      this.requestUpdate();
      console.info(`ChoreTracker v${CARD_VERSION}: refreshed data from another device`);
    } catch (_) { /* transient — next lovelace_updated will retry */ }
  }

  _uid() {
    return Math.random().toString(36).slice(2, 10);
  }

  // Don't lose a debounced save if the card is removed (dashboard switch,
  // edit mode, etc.) before the timer fires.
  disconnectedCallback() {
    super.disconnectedCallback();
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
        } else if (chore.recurrence === 'weekly' &&
                   (chore.recurrenceDays || []).includes(new Date().getDay())) {
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

  render() {
    if (!this._config || !this._data) return nothing;

    // Default active tab to first member or pool
    if (!this._state.activeTab) {
      const first = (this._data.members || [])[0];
      this._state.activeTab = first ? first.id : 'pool';
    }

    return html`
      <ha-card>
        ${this._syncError ? html`<div class="sync-banner">⚠️ ${this._t(this._syncError)}</div>` : nothing}
        ${this._state.view === 'admin' ? this._renderAdmin() : this._renderMain()}
      </ha-card>
    `;
  }

  _setState(patch) {
    Object.assign(this._state, patch);
    this.requestUpdate();
  }

  _renderMain() {
    const members = this._data.members || [];
    const poolCount = this._getPoolChores().length;
    const activeTab = this._state.activeTab;

    return html`
      <div class="header">
        <span class="header-title">${this._config.title || 'Chore Tracker'}</span>
        <button class="icon-btn" title="Admin"
          @click=${() => this._setState({ view: 'admin', editingChore: null, editingMember: null })}>⚙️</button>
      </div>
      <div class="tab-bar">
        ${members.map(m => {
          const chores = this._getMemberChores(m.id);
          const done = chores.filter(c => c.completed).length;
          const total = chores.length;
          const allDone = total > 0 && done === total;
          return html`
            <button class="member-tab ${activeTab === m.id ? 'active' : ''}"
              @click=${() => this._setState({ activeTab: m.id, claimingChore: null })}>
              <span class="tab-avatar ${allDone ? 'done' : ''}">${m.avatar || m.name[0].toUpperCase()}</span>
              <span class="tab-name">${m.name}</span>
              ${total > 0 ? html`<span class="tab-badge ${allDone ? 'badge-done' : ''}">${done}/${total}</span>` : nothing}
            </button>
          `;
        })}
        <button class="member-tab ${activeTab === 'pool' ? 'active' : ''}"
          @click=${() => this._setState({ activeTab: 'pool', claimingChore: null })}>
          <span class="tab-avatar pool-icon">📋</span>
          <span class="tab-name">${this._t('available_chores')}</span>
          ${poolCount > 0 ? html`<span class="tab-badge">${poolCount}</span>` : nothing}
        </button>
      </div>
      <div class="tab-content">
        ${activeTab === 'pool' ? this._renderPool() : this._renderMemberPanel(activeTab)}
      </div>
      ${this._state.claimingChore ? this._renderClaimModal() : nothing}
    `;
  }

  _renderMemberPanel(memberId) {
    const m = (this._data.members || []).find(x => x.id === memberId);
    if (!m) return html`<div class="empty">${this._t('member_not_found')}</div>`;

    const chores = this._getMemberChores(m.id);
    const done = chores.filter(c => c.completed).length;
    const total = chores.length;
    const pct = total ? Math.round((done / total) * 100) : 0;
    const allDone = total > 0 && done === total;
    const poolAvailable = this._getPoolChores().length > 0;

    return html`
      <div class="member-summary">
        <div class="summary-left">
          <div class="summary-avatar">${m.avatar || m.name[0].toUpperCase()}</div>
          <div>
            <div class="summary-name">${m.name}</div>
            <div class="summary-stats">
              <span class="stat-chip">⭐ ${m.points || 0} ${this._t('pts')}</span>
              <span class="stat-chip">💵 $${num(m.dollars).toFixed(2)}</span>
            </div>
          </div>
        </div>
        <div class="summary-progress">
          <div class="progress-bar-wrap"><div class="progress-bar" style="width:${pct}%"></div></div>
          <div class="progress-label">${this._t('of_done', { done, total })}</div>
        </div>
      </div>
      <div class="chores-list">
        ${chores.length ? chores.map(c => html`
          <div class="chore-item ${c.completed ? 'completed' : ''}">
            <button class="chore-check ${c.completed ? 'checked' : ''}"
              @click=${() => this._toggleChore(c.id, m.id)}>
              ${c.completed ? '✔' : ''}
            </button>
            <span class="chore-emoji">${c.emoji || getChoreEmoji(c.title)}</span>
            <div class="chore-body">
              <span class="chore-title">${c.title}</span>
              ${c.recurrence && c.recurrence !== 'none' ? html`<span class="chore-recur">${this._recurLabel(c)}</span>` : nothing}
            </div>
            <div class="chore-rewards">
              ${c.points ? html`<span class="reward-badge points">⭐${c.points}</span>` : nothing}
              ${c.dollars ? html`<span class="reward-badge dollars">💵$${num(c.dollars).toFixed(2)}</span>` : nothing}
            </div>
          </div>
        `) : html`<div class="empty">${this._t('no_chores_assigned')}</div>`}
      </div>
      ${allDone && poolAvailable ? html`
        <div class="claim-banner" @click=${() => this._setState({ activeTab: 'pool' })}>
          ${this._t('all_done_banner')}
        </div>
      ` : nothing}
    `;
  }

  _renderPool() {
    const pool = this._getPoolChores();
    const eligibles = this._eligibleClaimers();
    const claimed = (this._data.pool || []).filter(c => c.claimedBy);

    return html`
      <div class="pool-header">
        <div class="pool-info">
          ${eligibles.length > 0
            ? html`<span class="pool-eligible">✅ ${this._t('can_claim', { names: eligibles.map(m => m.name).join(', ') })}</span>`
            : html`<span class="pool-none">${this._t('complete_all_to_claim')}</span>`}
        </div>
      </div>
      <div class="chores-list">
        ${pool.length ? pool.map(c => html`
          <div class="chore-item">
            <span class="chore-emoji">${c.emoji || getChoreEmoji(c.title)}</span>
            <div class="chore-body">
              <span class="chore-title">${c.title}</span>
            </div>
            <div class="chore-rewards">
              ${c.points ? html`<span class="reward-badge points">⭐${c.points}</span>` : nothing}
              ${c.dollars ? html`<span class="reward-badge dollars">💵$${num(c.dollars).toFixed(2)}</span>` : nothing}
            </div>
            <button class="claim-btn ${eligibles.length === 0 ? 'disabled' : ''}"
              ?disabled=${eligibles.length === 0}
              title=${eligibles.length === 0 ? this._t('no_eligible') : ''}
              @click=${() => this._setState({ claimingChore: c.id })}>
              ${this._t('claim')}
            </button>
          </div>
        `) : html`<div class="empty">${this._t('no_pool_chores')}</div>`}
      </div>
      ${claimed.length > 0 ? html`
        <div class="section-label">${this._t('already_claimed')}</div>
        <div class="chores-list claimed-list">
          ${claimed.map(c => {
            const claimer = (this._data.members || []).find(m => m.id === c.claimedBy);
            return html`
              <div class="chore-item claimed">
                <span class="chore-emoji">${c.emoji || getChoreEmoji(c.title)}</span>
                <div class="chore-body">
                  <span class="chore-title">${c.title}</span>
                  <span class="chore-recur">${this._t('claimed_by', { name: claimer ? claimer.name : this._t('unknown') })}</span>
                </div>
              </div>
            `;
          })}
        </div>
      ` : nothing}
    `;
  }

  _renderClaimModal() {
    const choreId = this._state.claimingChore;
    const chore = (this._data.pool || []).find(c => c.id === choreId);
    if (!chore) return nothing;
    const eligibles = this._eligibleClaimers();

    return html`
      <div class="modal-overlay" @click=${() => this._setState({ claimingChore: null })}>
        <div class="modal" @click=${e => e.stopPropagation()}>
          <div class="modal-title">${this._t('assign')} "${chore.emoji || getChoreEmoji(chore.title)} ${chore.title}"</div>
          <div class="modal-subtitle">${this._t('who_claiming')}</div>
          <div class="modal-members">
            ${eligibles.map(m => html`
              <button class="modal-member-btn" @click=${() => this._claimChore(choreId, m.id)}>
                <span class="modal-avatar">${m.avatar || m.name[0].toUpperCase()}</span>
                <span>${m.name}</span>
              </button>
            `)}
          </div>
          <button class="secondary-btn" @click=${() => this._setState({ claimingChore: null })}>${this._t('cancel')}</button>
        </div>
      </div>
    `;
  }

  // ─── ADMIN ────────────────────────────────────────────────────────────────

  _renderAdmin() {
    if (!this._state.adminUnlocked) return this._renderAdminLogin();
    const tab = this._state.adminTab;
    return html`
      <div class="header">
        <button class="back-btn" @click=${() => this._setState({ view: 'main', adminUnlocked: false })}>← ${this._t('back')}</button>
        <span class="header-title">${this._t('admin_console')}</span>
        <button class="icon-btn" title="Lock" @click=${() => this._setState({ view: 'main', adminUnlocked: false })}>🔒</button>
      </div>
      <div class="tab-bar admin-tabs">
        ${['chores', 'members', 'pool'].map(t => html`
          <button class="member-tab ${tab === t ? 'active' : ''}"
            @click=${() => this._setState({ adminTab: t, editingChore: null, editingMember: null })}>
            ${t === 'chores' ? this._t('chores') : t === 'members' ? this._t('members') : this._t('available_chores')}
          </button>
        `)}
      </div>
      <div class="tab-content">
        ${tab === 'chores' ? this._renderAdminChores() : nothing}
        ${tab === 'members' ? this._renderAdminMembers() : nothing}
        ${tab === 'pool' ? this._renderAdminPool() : nothing}
      </div>
    `;
  }

  _renderAdminLogin() {
    return html`
      <div class="header">
        <button class="back-btn" @click=${() => this._setState({ view: 'main' })}>← ${this._t('back')}</button>
        <span class="header-title">${this._t('admin_console')}</span>
      </div>
      <div class="admin-login">
        <div class="login-icon">🔐</div>
        <div class="login-title">${this._t('enter_admin_password')}</div>
        <input class="admin-input" id="admin-password" type="password" placeholder=${this._t('password')}
          @keydown=${e => { if (e.key === 'Enter') this._adminLogin(); }} />
        <div class="login-error">${this._loginError}</div>
        <button class="primary-btn" @click=${() => this._adminLogin()}>${this._t('unlock')}</button>
      </div>
    `;
  }

  // Two-tap confirmation for destructive actions: first tap arms the button
  // (turns red / shows "Confirm?"), second tap within 3s executes.
  _confirmThen(key, fn) {
    if (this._confirmKey === key) {
      this._confirmKey = null;
      clearTimeout(this._confirmTimer);
      fn();
      return;
    }
    this._confirmKey = key;
    clearTimeout(this._confirmTimer);
    this._confirmTimer = setTimeout(() => {
      this._confirmKey = null;
      this.requestUpdate();
    }, 3000);
    this.requestUpdate();
  }

  _dangerBtn(key, label, fn) {
    const armed = this._confirmKey === key;
    return html`
      <button class="danger-btn ${armed ? 'armed' : ''}" @click=${() => this._confirmThen(key, fn)}>
        ${armed ? this._t('confirm') : label}
      </button>
    `;
  }

  _dangerIconBtn(key, icon, title, fn) {
    const armed = this._confirmKey === key;
    return html`
      <button class="icon-btn dark ${armed ? 'armed' : ''}" title=${title}
        @click=${() => this._confirmThen(key, fn)}>
        ${armed ? '❗' : icon}
      </button>
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
      const recurrence = this._editRecurrence ?? (chore.recurrence || 'none');
      return html`
        <div class="edit-form">
          <div class="form-title">${isNew ? this._t('add_chore') : this._t('edit_chore')}</div>
          <label>${this._t('title')}</label>
          <input class="form-input" id="ec-title" .value=${chore.title || ''} placeholder=${this._t('chore_name')} />
          <label>${this._t('emoji_override')}</label>
          <input class="form-input" id="ec-emoji" .value=${chore.emoji || ''} placeholder="e.g. 🧹" />
          <label>${this._t('points')}</label>
          <input class="form-input" id="ec-points" type="number" min="0" .value=${String(chore.points || 0)} />
          <label>${this._t('dollar_value')}</label>
          <input class="form-input" id="ec-dollars" type="number" min="0" step="0.01" .value=${String(chore.dollars || 0)} />
          <label>${this._t('recurrence')}</label>
          <select class="form-input" id="ec-recurrence" .value=${recurrence}
            @change=${e => { this._editRecurrence = e.target.value; this.requestUpdate(); }}>
            <option value="none">${this._t('recur_none')}</option>
            <option value="daily">🔁 ${this._t('recur_daily')}</option>
            <option value="weekdays">🔁 ${this._t('recur_weekdays')}</option>
            <option value="weekly">🔁 ${this._t('recur_weekly')}</option>
          </select>
          ${recurrence === 'weekly' ? html`
            <div class="assign-list">
              ${this._t('days').map((day, i) => html`
                <label class="assign-item">
                  <input type="checkbox" id="ec-day-${i}" .checked=${(chore.recurrenceDays || []).includes(i)} />
                  ${day}
                </label>
              `)}
            </div>
          ` : nothing}
          <label>${this._t('assign_to')}</label>
          <div class="assign-list">
            ${members.length ? members.map(m => html`
              <label class="assign-item">
                <input type="checkbox" id="assign-${m.id}" .checked=${(chore.assignedTo || []).includes(m.id)} />
                ${m.avatar || m.name[0].toUpperCase()} ${m.name}
              </label>
            `) : html`<span class="empty-inline">${this._t('add_members_first')}</span>`}
          </div>
          <div class="form-actions">
            <button class="primary-btn" @click=${() => this._saveChore(editing)}>${this._t('save')}</button>
            <button class="secondary-btn" @click=${() => this._cancelEdit()}>${this._t('cancel')}</button>
            ${!isNew ? this._dangerBtn(`del-chore:${editing}`, this._t('delete'), () => this._deleteChore(editing)) : nothing}
          </div>
        </div>
      `;
    }

    return html`
      <div class="admin-section">
        <button class="primary-btn full-btn" @click=${() => this._startEditChore('new')}>+ ${this._t('add_chore')}</button>
        ${chores.map(c => {
          const assignedNames = (c.assignedTo || [])
            .map(id => members.find(m => m.id === id)?.name).filter(Boolean).join(', ');
          const recurLabel = c.recurrence && c.recurrence !== 'none' ? ` · ${this._recurLabel(c)}` : '';
          return html`
            <div class="admin-item">
              <span class="chore-emoji">${c.emoji || getChoreEmoji(c.title)}</span>
              <div class="admin-item-info">
                <div class="admin-item-title">${c.title}</div>
                <div class="admin-item-meta">${assignedNames || this._t('unassigned')} · ⭐${c.points || 0} · 💵$${num(c.dollars).toFixed(2)}${recurLabel}</div>
              </div>
              <div class="admin-item-actions">
                <button class="icon-btn dark" @click=${() => this._startEditChore(c.id)}>✏️</button>
                ${this._dangerIconBtn(`reset-chore:${c.id}`, '🔄', this._t('reset_completion'), () => this._resetChore(c.id))}
              </div>
            </div>
          `;
        })}
        ${chores.length === 0 ? html`<div class="empty">${this._t('no_chores_yet')}</div>` : nothing}
      </div>
    `;
  }

  _startEditChore(id) {
    this._editRecurrence = null;
    this._setState({ editingChore: id });
  }

  _cancelEdit() {
    this._editRecurrence = null;
    this._setState({ editingChore: null, editingMember: null });
  }

  _renderAdminMembers() {
    const members = this._data.members || [];
    const editing = this._state.editingMember;

    if (editing !== null) {
      const isNew = editing === 'new';
      const member = isNew ? { name: '', avatar: '' } : members.find(m => m.id === editing) || {};
      return html`
        <div class="edit-form">
          <div class="form-title">${isNew ? this._t('add_member') : this._t('edit_member')}</div>
          <label>${this._t('name')}</label>
          <input class="form-input" id="em-name" .value=${member.name || ''} placeholder=${this._t('name')} />
          <label>${this._t('avatar')}</label>
          <input class="form-input" id="em-avatar" .value=${member.avatar || ''} placeholder="e.g. 👦 or JD" />
          ${!isNew ? html`
            <div class="member-totals">
              <span>⭐ ${member.points || 0} ${this._t('pts')}</span>
              <span>💵 $${num(member.dollars).toFixed(2)}</span>
            </div>
            ${this._dangerBtn(`reset-earn:${editing}`, this._t('reset_earnings'), () => this._resetMemberEarnings(editing))}
          ` : nothing}
          <div class="form-actions">
            <button class="primary-btn" @click=${() => this._saveMember(editing)}>${this._t('save')}</button>
            <button class="secondary-btn" @click=${() => this._cancelEdit()}>${this._t('cancel')}</button>
            ${!isNew ? this._dangerBtn(`del-member:${editing}`, this._t('delete'), () => this._deleteMember(editing)) : nothing}
          </div>
        </div>
      `;
    }

    return html`
      <div class="admin-section">
        <button class="primary-btn full-btn" @click=${() => this._setState({ editingMember: 'new' })}>+ ${this._t('add_member')}</button>
        ${members.map(m => html`
          <div class="admin-item">
            <span class="tab-avatar small-avatar">${m.avatar || m.name[0].toUpperCase()}</span>
            <div class="admin-item-info">
              <div class="admin-item-title">${m.name}</div>
              <div class="admin-item-meta">⭐ ${m.points || 0} ${this._t('pts')} · 💵 $${num(m.dollars).toFixed(2)}</div>
            </div>
            <div class="admin-item-actions">
              <button class="icon-btn dark" @click=${() => this._setState({ editingMember: m.id })}>✏️</button>
              ${this._dangerIconBtn(`reset-earn:${m.id}`, '💰', this._t('reset_earnings'), () => this._resetMemberEarnings(m.id))}
            </div>
          </div>
        `)}
        ${members.length === 0 ? html`<div class="empty">${this._t('no_members_yet')}</div>` : nothing}
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
      return html`
        <div class="edit-form">
          <div class="form-title">${isNew ? this._t('add_available_chore') : this._t('edit_available_chore')}</div>
          <label>${this._t('title')}</label>
          <input class="form-input" id="pc-title" .value=${chore.title || ''} placeholder=${this._t('chore_name')} />
          <label>${this._t('emoji_optional')}</label>
          <input class="form-input" id="pc-emoji" .value=${chore.emoji || ''} placeholder="e.g. 🧹" />
          <label>${this._t('points')}</label>
          <input class="form-input" id="pc-points" type="number" min="0" .value=${String(chore.points || 0)} />
          <label>${this._t('dollar_value')}</label>
          <input class="form-input" id="pc-dollars" type="number" min="0" step="0.01" .value=${String(chore.dollars || 0)} />
          <div class="form-actions">
            <button class="primary-btn" @click=${() => this._savePoolChore(editing)}>${this._t('save')}</button>
            <button class="secondary-btn" @click=${() => this._cancelEdit()}>${this._t('cancel')}</button>
            ${!isNew ? this._dangerBtn(`del-pool:${editing}`, this._t('delete'), () => this._deletePoolChore(editing)) : nothing}
          </div>
        </div>
      `;
    }

    return html`
      <div class="admin-section">
        <button class="primary-btn full-btn" @click=${() => this._setState({ editingChore: 'new-pool' })}>+ ${this._t('add_available_chore')}</button>
        ${pool.map(c => {
          const claimer = c.claimedBy ? members.find(m => m.id === c.claimedBy) : null;
          return html`
            <div class="admin-item">
              <span class="chore-emoji">${c.emoji || getChoreEmoji(c.title)}</span>
              <div class="admin-item-info">
                <div class="admin-item-title">${c.title}</div>
                <div class="admin-item-meta">${claimer ? this._t('claimed_by', { name: claimer.name }) : this._t('available')} · ⭐${c.points || 0} · 💵$${num(c.dollars).toFixed(2)}</div>
              </div>
              <div class="admin-item-actions">
                <button class="icon-btn dark" @click=${() => this._setState({ editingChore: c.id })}>✏️</button>
                ${c.claimedBy ? html`<button class="icon-btn dark" title=${this._t('unclaim')} @click=${() => this._unclaimPoolChore(c.id)}>↩️</button>` : nothing}
                ${this._dangerIconBtn(`del-pool:${c.id}`, '🗑️', this._t('delete'), () => this._deletePoolChore(c.id))}
              </div>
            </div>
          `;
        })}
        ${pool.length === 0 ? html`<div class="empty">${this._t('no_pool_yet')}</div>` : nothing}
      </div>
    `;
  }

  // ─── DATA MUTATIONS ──────────────────────────────────────────────────────

  _adminLogin() {
    const input = this.shadowRoot.getElementById('admin-password');
    if (input && input.value === String(this._config.admin_password || '1234')) {
      this._loginError = '';
      this._setState({ adminUnlocked: true });
    } else {
      this._loginError = this._t('incorrect_password');
      this.requestUpdate();
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
      const pts = num(chore.points);
      const dlr = num(chore.dollars);
      if (!wasCompleted) {
        member.points = num(member.points) + pts;
        member.dollars = round2(num(member.dollars) + dlr);
      } else {
        member.points = Math.max(0, num(member.points) - pts);
        member.dollars = Math.max(0, round2(num(member.dollars) - dlr));
      }
    }
    // Fire HA bus events so users can automate on chore activity
    // (celebration lights, notifications, allowance payouts…)
    if (member && !wasCompleted) {
      this._fireHAEvent('chore_tracker_chore_completed', {
        member: member.name,
        chore: chore.title,
        points: num(chore.points),
        dollars: num(chore.dollars),
      });
      if (this._allChoresDone(memberId)) {
        this._fireHAEvent('chore_tracker_all_done', {
          member: member.name,
          total_points: num(member.points),
          total_dollars: num(member.dollars),
        });
      }
    }

    this._saveData();
    this.requestUpdate();
  }

  _fireHAEvent(eventType, data) {
    if (!this._hass?.callApi) return;
    this._hass.callApi('POST', `events/${eventType}`, data)
      .catch(e => console.warn(`ChoreTracker: could not fire ${eventType} event —`, e.message || e));
  }

  _getInput(id) {
    return this.shadowRoot.getElementById(id);
  }

  _saveChore(editing) {
    const title = this._getInput('ec-title')?.value?.trim();
    if (!title) return;
    const emoji = this._getInput('ec-emoji')?.value?.trim() || '';
    const points = Math.max(0, Math.round(num(this._getInput('ec-points')?.value)));
    const dollars = Math.max(0, round2(this._getInput('ec-dollars')?.value));
    const recurrence = this._getInput('ec-recurrence')?.value || 'none';
    const recurrenceDays = [];
    for (let i = 0; i < 7; i++) {
      if (this._getInput(`ec-day-${i}`)?.checked) recurrenceDays.push(i);
    }
    const assignedTo = [];
    this.shadowRoot.querySelectorAll('[id^="assign-"]').forEach(cb => {
      if (cb.checked) assignedTo.push(cb.id.replace('assign-', ''));
    });

    if (editing === 'new') {
      this._data.chores.push({ id: this._uid(), title, emoji, points, dollars, recurrence, recurrenceDays, assignedTo, memberStates: {} });
    } else {
      const chore = (this._data.chores || []).find(c => c.id === editing);
      if (chore) Object.assign(chore, { title, emoji, points, dollars, recurrence, recurrenceDays, assignedTo });
    }
    this._saveData();
    this._cancelEdit();
  }

  _deleteChore(id) {
    this._data.chores = (this._data.chores || []).filter(c => c.id !== id);
    this._saveData();
    this._cancelEdit();
  }

  _resetChore(id) {
    const chore = (this._data.chores || []).find(c => c.id === id);
    if (!chore) return;
    (chore.assignedTo || []).forEach(memberId => {
      const state = ((chore.memberStates || {})[memberId] || {});
      if (state.completed) {
        const member = (this._data.members || []).find(m => m.id === memberId);
        if (member) {
          member.points = Math.max(0, num(member.points) - num(chore.points));
          member.dollars = Math.max(0, round2(num(member.dollars) - num(chore.dollars)));
        }
      }
    });
    chore.memberStates = {};
    this._saveData();
    this.requestUpdate();
  }

  _saveMember(editing) {
    const name = this._getInput('em-name')?.value?.trim();
    if (!name) return;
    const avatar = this._getInput('em-avatar')?.value?.trim() || '';
    if (editing === 'new') {
      this._data.members.push({ id: this._uid(), name, avatar, points: 0, dollars: 0 });
    } else {
      const m = (this._data.members || []).find(m => m.id === editing);
      if (m) Object.assign(m, { name, avatar });
    }
    this._saveData();
    this._cancelEdit();
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
    this._cancelEdit();
  }

  _resetMemberEarnings(id) {
    const m = (this._data.members || []).find(m => m.id === id);
    if (m) { m.points = 0; m.dollars = 0; }
    this._saveData();
    this.requestUpdate();
  }

  _savePoolChore(editing) {
    const title = this._getInput('pc-title')?.value?.trim();
    if (!title) return;
    const emoji = this._getInput('pc-emoji')?.value?.trim() || '';
    const points = Math.max(0, Math.round(num(this._getInput('pc-points')?.value)));
    const dollars = Math.max(0, round2(this._getInput('pc-dollars')?.value));
    if (editing === 'new-pool') {
      if (!this._data.pool) this._data.pool = [];
      this._data.pool.push({ id: this._uid(), title, emoji, points, dollars, claimedBy: null });
    } else {
      const chore = (this._data.pool || []).find(c => c.id === editing);
      if (chore) Object.assign(chore, { title, emoji, points, dollars });
    }
    this._saveData();
    this._cancelEdit();
  }

  _deletePoolChore(id) {
    this._data.pool = (this._data.pool || []).filter(c => c.id !== id);
    this._data.chores = (this._data.chores || []).filter(c => c._poolRef !== id);
    this._saveData();
    this._cancelEdit();
  }

  _unclaimPoolChore(id) {
    const chore = (this._data.pool || []).find(c => c.id === id);
    if (chore) chore.claimedBy = null;
    this._data.chores = (this._data.chores || []).filter(c => c._poolRef !== id);
    this._saveData();
    this.requestUpdate();
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
    this._setState({ claimingChore: null, activeTab: memberId });
  }

  // ─── STYLES ──────────────────────────────────────────────────────────────

  static styles = css`
    :host { display: block; font-family: var(--paper-font-body1_-_font-family, 'Roboto', sans-serif); }
    * { box-sizing: border-box; }
    ha-card {
      overflow: hidden;
      color: var(--primary-text-color, #333);
      position: relative;
    }
    .sync-banner {
      background: #B71C1C; color: #fff;
      padding: 7px 14px; font-size: 0.78rem; font-weight: 600;
      text-align: center;
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
    .icon-btn.dark.armed { background: #c62828; color: #fff; }

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
    .danger-btn.armed { background: #8b0000; outline: 2px solid #ff8a80; }
    .empty {
      text-align: center; color: var(--secondary-text-color, #999);
      padding: 20px; font-size: 0.88rem;
    }
  `;

  static getStubConfig() {
    return { title: 'Family Chores', admin_password: '1234' };
  }

  static getConfigElement() {
    return document.createElement('chore-tracker-card-editor');
  }

  getCardSize() { return 5; }
}

// ─── VISUAL CONFIG EDITOR ────────────────────────────────────────────────────
// Shown in the dashboard UI editor so users never have to touch YAML.
class ChoreTrackerCardEditor extends LitElement {
  static styles = css`
    .editor { display: flex; flex-direction: column; gap: 12px; padding: 8px 0; }
    label { display: flex; flex-direction: column; gap: 4px; font-size: 0.85rem; font-weight: 500; color: var(--primary-text-color); }
    input {
      padding: 10px 12px; border: 1px solid var(--divider-color, #ccc);
      border-radius: 6px; font-size: 0.95rem;
      background: var(--card-background-color, #fff); color: var(--primary-text-color, #333);
    }
    input:focus { border-color: #0288D1; outline: none; }
    .hint { font-size: 0.75rem; font-weight: 400; color: var(--secondary-text-color, #888); }
  `;

  set hass(hass) { this._hass = hass; }

  setConfig(config) {
    this._config = { ...config };
    this.requestUpdate();
  }

  render() {
    if (!this._config) return nothing;
    return html`
      <div class="editor">
        <label>Title
          <input id="cfg-title" .value=${this._config.title || ''} placeholder="Family Chores"
            @input=${() => this._valueChanged()} />
        </label>
        <label>Admin password
          <input id="cfg-password" .value=${this._config.admin_password || ''} placeholder="1234"
            @input=${() => this._valueChanged()} />
          <span class="hint">Gate for the parent console. Not a security boundary — anyone who can edit the dashboard can see it.</span>
        </label>
        <label>Dashboard URL path (advanced)
          <input id="cfg-urlpath" .value=${this._config.lovelace_url_path || ''} placeholder="auto-detected"
            @input=${() => this._valueChanged()} />
          <span class="hint">Leave empty unless sync can't find your dashboard automatically.</span>
        </label>
      </div>
    `;
  }

  _valueChanged() {
    const get = (id) => this.shadowRoot.getElementById(id)?.value?.trim() || '';
    // Preserve managed keys (data, storage_key) — only touch what we edit
    const config = { ...this._config };
    config.title = get('cfg-title') || 'Chore Tracker';
    config.admin_password = get('cfg-password') || '1234';
    const urlPath = get('cfg-urlpath');
    if (urlPath) config.lovelace_url_path = urlPath;
    else delete config.lovelace_url_path;
    this._config = config;
    this.dispatchEvent(new CustomEvent('config-changed', {
      detail: { config },
      bubbles: true,
      composed: true,
    }));
  }
}

if (!customElements.get('chore-tracker-card')) {
  customElements.define('chore-tracker-card', ChoreTrackerCard);
}
if (!customElements.get('chore-tracker-card-editor')) {
  customElements.define('chore-tracker-card-editor', ChoreTrackerCardEditor);
}

window.customCards = window.customCards || [];
if (!window.customCards.find(c => c.type === 'chore-tracker-card')) {
  window.customCards.push({
    type: 'chore-tracker-card',
    name: 'Chore Tracker Card',
    description: 'Track family chores with points and allowance rewards',
  });
}
