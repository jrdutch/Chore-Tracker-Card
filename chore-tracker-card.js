// Chore Tracker Card for Home Assistant
// A comprehensive chore management card for families

const CHORE_EMOJIS = {
  // Cleaning
  vacuum: '🧹', vacuuming: '🧹', sweep: '🧹', sweeping: '🧹', mop: '🪣', mopping: '🪣',
  dust: '🧹', dusting: '🧹', clean: '🧽', cleaning: '🧽', scrub: '🧽', scrubbing: '🧽',
  wipe: '🧽', wiping: '🧽', wash: '🫧', washing: '🫧', sanitize: '🧴', disinfect: '🧴',
  // Kitchen
  dishes: '🍽️', dish: '🍽️', dishwasher: '🍽️', cook: '👨‍🍳', cooking: '👨‍🍳',
  kitchen: '🍳', trash: '🗑️', garbage: '🗑️', recycling: '♻️', recycle: '♻️',
  groceries: '🛒', grocery: '🛒', counters: '🧽', counter: '🧽',
  // Laundry
  laundry: '👕', clothes: '👕', fold: '👕', folding: '👕', ironing: '👔', iron: '👔',
  // Bathroom
  bathroom: '🚽', toilet: '🚽', shower: '🚿', bath: '🛁', sink: '🚰',
  // Outdoor
  lawn: '🌿', mow: '🌿', mowing: '🌿', garden: '🌱', gardening: '🌱', plant: '🌱',
  water: '💧', watering: '💧', rake: '🍂', raking: '🍂', shovel: '🪴', snow: '❄️',
  // Pet care
  pet: '🐾', dog: '🐕', cat: '🐈', fish: '🐟', feed: '🥣', feeding: '🥣',
  walk: '🦮', walking: '🦮', litter: '🐱',
  // School / Study
  homework: '📚', study: '📖', studying: '📖', read: '📖', reading: '📖',
  practice: '🎵', music: '🎵',
  // Organizing
  organize: '📦', organizing: '📦', tidy: '🗂️', tidying: '🗂️', declutter: '📦',
  sort: '🗂️', sorting: '🗂️', bedroom: '🛏️', bed: '🛏️', room: '🏠',
  // Errands
  mail: '📬', car: '🚗', window: '🪟', windows: '🪟',
};

function getChoreEmoji(title) {
  const lower = title.toLowerCase();
  for (const [keyword, emoji] of Object.entries(CHORE_EMOJIS)) {
    if (lower.includes(keyword)) return emoji;
  }
  return '✅';
}

const DEFAULT_CONFIG = {
  title: 'Chore Tracker',
  admin_password: '1234',
  members: [],
  chores: [],
  pool: [],
};

class ChoreTrackerCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._state = {
      view: 'home', // home | member | admin | pool
      activeMember: null,
      adminUnlocked: false,
      adminTab: 'chores', // chores | members | pool
      editingChore: null,
      editingMember: null,
      confirmReset: null,
    };
  }

  set hass(hass) {
    this._hass = hass;
    if (!this._initialRenderDone) {
      this._initialRenderDone = true;
      this._render();
    }
  }

  setConfig(config) {
    this._config = { ...DEFAULT_CONFIG, ...config };
    if (!this._data) this._loadData();
    this._render();
  }

  _storageKey() {
    return `chore_tracker_${this._config.title || 'default'}`;
  }

  _loadData() {
    try {
      const raw = localStorage.getItem(this._storageKey());
      if (raw) {
        this._data = JSON.parse(raw);
      } else {
        this._data = {
          members: (this._config.members || []).map(m => ({
            id: this._uid(),
            name: m.name || m,
            avatar: m.avatar || '',
            points: 0,
            dollars: 0,
            chores: [],
          })),
          chores: (this._config.chores || []).map(c => ({
            id: this._uid(),
            title: c.title || c,
            emoji: c.emoji || '',
            points: c.points || 0,
            dollars: c.dollars || 0,
            assignedTo: c.assignedTo || [],
            claimable: c.claimable || false,
          })),
          pool: (this._config.pool || []).map(c => ({
            id: this._uid(),
            title: c.title || c,
            emoji: c.emoji || '',
            points: c.points || 0,
            dollars: c.dollars || 0,
            claimedBy: null,
          })),
        };
        this._saveData();
      }
    } catch (e) {
      this._data = { members: [], chores: [], pool: [] };
    }
  }

  _saveData() {
    localStorage.setItem(this._storageKey(), JSON.stringify(this._data));
  }

  _uid() {
    return Math.random().toString(36).slice(2, 10);
  }

  _getMemberChores(memberId) {
    return (this._data.chores || []).filter(c =>
      c.assignedTo && c.assignedTo.includes(memberId)
    ).map(c => {
      const memberState = (c.memberStates || {})[memberId] || { completed: false };
      return { ...c, completed: memberState.completed };
    });
  }

  _getPoolChores() {
    return (this._data.pool || []).filter(c => !c.claimedBy);
  }

  _allCompleted(memberId) {
    const chores = this._getMemberChores(memberId);
    return chores.length > 0 && chores.every(c => c.completed);
  }

  _render() {
    if (!this._config || !this._data) return;
    const s = this._state;
    this.shadowRoot.innerHTML = `
      <style>${this._styles()}</style>
      <div class="card">
        ${s.view === 'home' ? this._renderHome() : ''}
        ${s.view === 'member' ? this._renderMember() : ''}
        ${s.view === 'admin' ? this._renderAdmin() : ''}
        ${s.view === 'pool' ? this._renderPool() : ''}
      </div>
    `;
    this._attachEvents();
  }

  _renderHome() {
    const members = this._data.members || [];
    const memberCards = members.map(m => {
      const chores = this._getMemberChores(m.id);
      const done = chores.filter(c => c.completed).length;
      const total = chores.length;
      const pct = total ? Math.round((done / total) * 100) : 0;
      return `
        <div class="member-card" data-action="view-member" data-id="${m.id}">
          <div class="member-avatar">${m.avatar || m.name[0].toUpperCase()}</div>
          <div class="member-info">
            <div class="member-name">${m.name}</div>
            <div class="member-stats">
              <span class="stat">⭐ ${m.points || 0} pts</span>
              <span class="stat">💵 $${(m.dollars || 0).toFixed(2)}</span>
            </div>
            <div class="progress-bar-wrap">
              <div class="progress-bar" style="width:${pct}%"></div>
            </div>
            <div class="progress-label">${done}/${total} chores done</div>
          </div>
        </div>
      `;
    }).join('');

    const poolCount = this._getPoolChores().length;

    return `
      <div class="header">
        <span class="header-title">${this._config.title || 'Chore Tracker'}</span>
        <div class="header-actions">
          <button class="icon-btn" data-action="view-pool" title="Chore Pool">🎱</button>
          <button class="icon-btn" data-action="view-admin" title="Admin">⚙️</button>
        </div>
      </div>
      <div class="pool-banner" data-action="view-pool">
        🎱 Chore Pool — <strong>${poolCount}</strong> available chore${poolCount !== 1 ? 's' : ''} to claim
      </div>
      <div class="members-list">
        ${memberCards || '<div class="empty">No family members added yet. Open admin to add members.</div>'}
      </div>
    `;
  }

  _renderMember() {
    const m = this._data.members.find(x => x.id === this._state.activeMember);
    if (!m) return this._renderHome();
    const chores = this._getMemberChores(m.id);
    const allDone = this._allCompleted(m.id);
    const poolCount = this._getPoolChores().length;

    const choreItems = chores.map(c => `
      <div class="chore-item ${c.completed ? 'completed' : ''}">
        <button class="chore-check ${c.completed ? 'checked' : ''}" data-action="toggle-chore" data-choreid="${c.id}" data-memberid="${m.id}">
          ${c.completed ? '✔' : ''}
        </button>
        <span class="chore-emoji">${c.emoji || getChoreEmoji(c.title)}</span>
        <span class="chore-title">${c.title}</span>
        <div class="chore-rewards">
          ${c.points ? `<span class="reward-badge points">⭐${c.points}</span>` : ''}
          ${c.dollars ? `<span class="reward-badge dollars">💵$${parseFloat(c.dollars).toFixed(2)}</span>` : ''}
        </div>
      </div>
    `).join('');

    return `
      <div class="header">
        <button class="back-btn" data-action="go-home">← Back</button>
        <span class="header-title">${m.name}'s Chores</span>
      </div>
      <div class="member-summary">
        <div class="summary-avatar">${m.avatar || m.name[0].toUpperCase()}</div>
        <div class="summary-stats">
          <div class="stat-big">⭐ <strong>${m.points || 0}</strong> points</div>
          <div class="stat-big">💵 <strong>$${(m.dollars || 0).toFixed(2)}</strong> earned</div>
        </div>
      </div>
      <div class="chores-section">
        <div class="section-title">My Chores</div>
        <div class="chores-list">
          ${choreItems || '<div class="empty">No chores assigned yet!</div>'}
        </div>
      </div>
      ${allDone && poolCount > 0 ? `
        <div class="claim-banner" data-action="view-pool">
          🎉 All chores done! Claim more from the pool →
        </div>
      ` : ''}
    `;
  }

  _renderPool() {
    const m = this._state.activeMember
      ? this._data.members.find(x => x.id === this._state.activeMember)
      : null;
    const canClaim = m ? this._allCompleted(m.id) : false;
    const pool = this._getPoolChores();

    const items = pool.map(c => `
      <div class="chore-item">
        <span class="chore-emoji">${c.emoji || getChoreEmoji(c.title)}</span>
        <span class="chore-title">${c.title}</span>
        <div class="chore-rewards">
          ${c.points ? `<span class="reward-badge points">⭐${c.points}</span>` : ''}
          ${c.dollars ? `<span class="reward-badge dollars">💵$${parseFloat(c.dollars).toFixed(2)}</span>` : ''}
        </div>
        ${m ? `
          <button class="claim-btn ${!canClaim ? 'disabled' : ''}"
            data-action="claim-chore" data-choreid="${c.id}" data-memberid="${m ? m.id : ''}"
            ${!canClaim ? 'disabled title="Complete all current chores first"' : ''}>
            Claim
          </button>
        ` : ''}
      </div>
    `).join('');

    return `
      <div class="header">
        <button class="back-btn" data-action="${m ? 'view-member' : 'go-home'}">← Back</button>
        <span class="header-title">Chore Pool</span>
      </div>
      ${m ? `<div class="pool-context">Viewing as: <strong>${m.name}</strong>${!canClaim ? ' — Complete your chores first to claim!' : ' — You can claim chores!'}</div>` : ''}
      <div class="chores-list">
        ${items || '<div class="empty">No chores in the pool right now!</div>'}
      </div>
    `;
  }

  _renderAdmin() {
    if (!this._state.adminUnlocked) return this._renderAdminLogin();
    const tab = this._state.adminTab;
    return `
      <div class="header">
        <button class="back-btn" data-action="go-home">← Back</button>
        <span class="header-title">Admin Console</span>
        <button class="icon-btn" data-action="admin-logout" title="Lock">🔒</button>
      </div>
      <div class="tabs">
        <button class="tab ${tab === 'chores' ? 'active' : ''}" data-action="admin-tab" data-tab="chores">Chores</button>
        <button class="tab ${tab === 'members' ? 'active' : ''}" data-action="admin-tab" data-tab="members">Members</button>
        <button class="tab ${tab === 'pool' ? 'active' : ''}" data-action="admin-tab" data-tab="pool">Pool</button>
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
        <button class="back-btn" data-action="go-home">← Back</button>
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
      const chore = editing === 'new'
        ? { title: '', emoji: '', points: 0, dollars: 0, assignedTo: [], claimable: false }
        : chores.find(c => c.id === editing) || {};
      return `
        <div class="edit-form">
          <div class="form-title">${editing === 'new' ? 'Add Chore' : 'Edit Chore'}</div>
          <label>Title</label>
          <input class="form-input" id="ec-title" value="${chore.title || ''}" placeholder="Chore name" />
          <label>Emoji (optional override)</label>
          <input class="form-input" id="ec-emoji" value="${chore.emoji || ''}" placeholder="e.g. 🧹" />
          <label>Points</label>
          <input class="form-input" id="ec-points" type="number" min="0" value="${chore.points || 0}" />
          <label>Dollar Value ($)</label>
          <input class="form-input" id="ec-dollars" type="number" min="0" step="0.01" value="${chore.dollars || 0}" />
          <label>Assign To</label>
          <div class="assign-list">
            ${members.map(m => `
              <label class="assign-item">
                <input type="checkbox" id="assign-${m.id}" ${(chore.assignedTo || []).includes(m.id) ? 'checked' : ''} />
                ${m.name}
              </label>
            `).join('')}
          </div>
          <div class="form-actions">
            <button class="primary-btn" data-action="save-chore" data-id="${editing}">Save</button>
            <button class="secondary-btn" data-action="cancel-edit">Cancel</button>
            ${editing !== 'new' ? `<button class="danger-btn" data-action="delete-chore" data-id="${editing}">Delete</button>` : ''}
          </div>
        </div>
      `;
    }

    return `
      <div class="admin-section">
        <button class="primary-btn" data-action="new-chore">+ Add Chore</button>
        ${chores.map(c => {
          const assignedNames = (c.assignedTo || [])
            .map(id => members.find(m => m.id === id)?.name)
            .filter(Boolean).join(', ');
          const allMembersDone = members.filter(m => (c.assignedTo||[]).includes(m.id)).every(m => {
            const state = ((c.memberStates||{})[m.id]||{});
            return state.completed;
          });
          return `
            <div class="admin-chore-item">
              <div class="chore-emoji">${c.emoji || getChoreEmoji(c.title)}</div>
              <div class="admin-chore-info">
                <div class="chore-title">${c.title}</div>
                <div class="chore-meta">${assignedNames ? `👥 ${assignedNames}` : 'Unassigned'} · ⭐${c.points||0} · 💵$${parseFloat(c.dollars||0).toFixed(2)}</div>
              </div>
              <div class="admin-chore-actions">
                <button class="icon-btn" data-action="edit-chore" data-id="${c.id}">✏️</button>
                <button class="icon-btn" data-action="reset-chore" data-id="${c.id}" title="Reset">🔄</button>
              </div>
            </div>
          `;
        }).join('')}
        ${chores.length === 0 ? '<div class="empty">No chores yet. Add one above!</div>' : ''}
      </div>
    `;
  }

  _renderAdminMembers() {
    const members = this._data.members || [];
    const editing = this._state.editingMember;

    if (editing !== null) {
      const member = editing === 'new'
        ? { name: '', avatar: '' }
        : members.find(m => m.id === editing) || {};
      return `
        <div class="edit-form">
          <div class="form-title">${editing === 'new' ? 'Add Member' : 'Edit Member'}</div>
          <label>Name</label>
          <input class="form-input" id="em-name" value="${member.name || ''}" placeholder="Family member's name" />
          <label>Avatar (emoji or initials)</label>
          <input class="form-input" id="em-avatar" value="${member.avatar || ''}" placeholder="e.g. 👦 or AB" />
          ${editing !== 'new' ? `
            <div class="member-totals">
              <span>⭐ Total Points: ${member.points || 0}</span>
              <span>💵 Total Earned: $${(member.dollars || 0).toFixed(2)}</span>
            </div>
            <button class="secondary-btn" data-action="reset-member-earnings" data-id="${editing}">Reset Earnings</button>
          ` : ''}
          <div class="form-actions">
            <button class="primary-btn" data-action="save-member" data-id="${editing}">Save</button>
            <button class="secondary-btn" data-action="cancel-edit">Cancel</button>
            ${editing !== 'new' ? `<button class="danger-btn" data-action="delete-member" data-id="${editing}">Delete</button>` : ''}
          </div>
        </div>
      `;
    }

    return `
      <div class="admin-section">
        <button class="primary-btn" data-action="new-member">+ Add Member</button>
        ${members.map(m => `
          <div class="admin-chore-item">
            <div class="member-avatar small">${m.avatar || m.name[0].toUpperCase()}</div>
            <div class="admin-chore-info">
              <div class="chore-title">${m.name}</div>
              <div class="chore-meta">⭐ ${m.points||0} pts · 💵 $${(m.dollars||0).toFixed(2)}</div>
            </div>
            <div class="admin-chore-actions">
              <button class="icon-btn" data-action="edit-member" data-id="${m.id}">✏️</button>
              <button class="icon-btn" data-action="reset-member-earnings" data-id="${m.id}" title="Reset earnings">💰</button>
            </div>
          </div>
        `).join('')}
        ${members.length === 0 ? '<div class="empty">No members yet. Add one above!</div>' : ''}
      </div>
    `;
  }

  _renderAdminPool() {
    const pool = this._data.pool || [];
    const members = this._data.members || [];
    const editing = this._state.editingChore;

    if (editing !== null) {
      const chore = editing === 'new-pool'
        ? { title: '', emoji: '', points: 0, dollars: 0 }
        : pool.find(c => c.id === editing) || {};
      return `
        <div class="edit-form">
          <div class="form-title">${editing === 'new-pool' ? 'Add Pool Chore' : 'Edit Pool Chore'}</div>
          <label>Title</label>
          <input class="form-input" id="pc-title" value="${chore.title || ''}" placeholder="Chore name" />
          <label>Emoji (optional override)</label>
          <input class="form-input" id="pc-emoji" value="${chore.emoji || ''}" placeholder="e.g. 🧹" />
          <label>Points</label>
          <input class="form-input" id="pc-points" type="number" min="0" value="${chore.points || 0}" />
          <label>Dollar Value ($)</label>
          <input class="form-input" id="pc-dollars" type="number" min="0" step="0.01" value="${chore.dollars || 0}" />
          <div class="form-actions">
            <button class="primary-btn" data-action="save-pool-chore" data-id="${editing}">Save</button>
            <button class="secondary-btn" data-action="cancel-edit">Cancel</button>
            ${editing !== 'new-pool' ? `<button class="danger-btn" data-action="delete-pool-chore" data-id="${editing}">Delete</button>` : ''}
          </div>
        </div>
      `;
    }

    return `
      <div class="admin-section">
        <button class="primary-btn" data-action="new-pool-chore">+ Add Pool Chore</button>
        ${pool.map(c => {
          const claimer = c.claimedBy ? members.find(m => m.id === c.claimedBy) : null;
          return `
            <div class="admin-chore-item">
              <div class="chore-emoji">${c.emoji || getChoreEmoji(c.title)}</div>
              <div class="admin-chore-info">
                <div class="chore-title">${c.title}</div>
                <div class="chore-meta">${claimer ? `Claimed by ${claimer.name}` : 'Available'} · ⭐${c.points||0} · 💵$${parseFloat(c.dollars||0).toFixed(2)}</div>
              </div>
              <div class="admin-chore-actions">
                <button class="icon-btn" data-action="edit-pool-chore" data-id="${c.id}">✏️</button>
                ${c.claimedBy ? `<button class="icon-btn" data-action="unclaim-pool-chore" data-id="${c.id}" title="Unclaim">↩️</button>` : ''}
                <button class="icon-btn" data-action="delete-pool-chore" data-id="${c.id}">🗑️</button>
              </div>
            </div>
          `;
        }).join('')}
        ${pool.length === 0 ? '<div class="empty">No pool chores yet.</div>' : ''}
      </div>
    `;
  }

  _attachEvents() {
    this.shadowRoot.querySelectorAll('[data-action]').forEach(el => {
      el.addEventListener('click', e => this._handleAction(e));
    });
    // Enter key on admin password
    const pwInput = this.shadowRoot.getElementById('admin-password');
    if (pwInput) {
      pwInput.addEventListener('keydown', e => {
        if (e.key === 'Enter') this._adminLogin();
      });
    }
  }

  _handleAction(e) {
    const el = e.currentTarget;
    const action = el.dataset.action;
    const id = el.dataset.id;

    switch (action) {
      case 'go-home':
        this._state.view = 'home';
        this._state.editingChore = null;
        this._state.editingMember = null;
        break;
      case 'view-member':
        this._state.view = 'member';
        this._state.activeMember = el.dataset.id;
        break;
      case 'view-admin':
        this._state.view = 'admin';
        this._state.editingChore = null;
        this._state.editingMember = null;
        break;
      case 'view-pool':
        this._state.view = 'pool';
        break;
      case 'admin-login':
        this._adminLogin();
        return;
      case 'admin-logout':
        this._state.adminUnlocked = false;
        this._state.view = 'home';
        break;
      case 'admin-tab':
        this._state.adminTab = el.dataset.tab;
        this._state.editingChore = null;
        this._state.editingMember = null;
        break;
      case 'toggle-chore':
        this._toggleChore(el.dataset.choreid, el.dataset.memberid);
        return;
      case 'new-chore':
        this._state.editingChore = 'new';
        break;
      case 'edit-chore':
        this._state.editingChore = id;
        break;
      case 'save-chore':
        this._saveChore(el.dataset.id);
        return;
      case 'delete-chore':
        this._deleteChore(id);
        return;
      case 'reset-chore':
        this._resetChore(id);
        return;
      case 'new-member':
        this._state.editingMember = 'new';
        break;
      case 'edit-member':
        this._state.editingMember = id;
        break;
      case 'save-member':
        this._saveMember(el.dataset.id);
        return;
      case 'delete-member':
        this._deleteMember(id);
        return;
      case 'reset-member-earnings':
        this._resetMemberEarnings(id);
        return;
      case 'cancel-edit':
        this._state.editingChore = null;
        this._state.editingMember = null;
        break;
      case 'new-pool-chore':
        this._state.editingChore = 'new-pool';
        break;
      case 'edit-pool-chore':
        this._state.editingChore = id;
        break;
      case 'save-pool-chore':
        this._savePoolChore(el.dataset.id);
        return;
      case 'delete-pool-chore':
        this._deletePoolChore(id);
        return;
      case 'unclaim-pool-chore':
        this._unclaimPoolChore(id);
        return;
      case 'claim-chore':
        this._claimChore(el.dataset.choreid, el.dataset.memberid);
        return;
    }
    this._render();
  }

  _adminLogin() {
    const input = this.shadowRoot.getElementById('admin-password');
    const errEl = this.shadowRoot.getElementById('login-error');
    if (input && input.value === String(this._config.admin_password || '1234')) {
      this._state.adminUnlocked = true;
      this._render();
    } else {
      if (errEl) errEl.textContent = 'Incorrect password. Try again.';
    }
  }

  _toggleChore(choreId, memberId) {
    const chore = this._data.chores.find(c => c.id === choreId);
    if (!chore) return;
    if (!chore.memberStates) chore.memberStates = {};
    if (!chore.memberStates[memberId]) chore.memberStates[memberId] = { completed: false };
    const wasCompleted = chore.memberStates[memberId].completed;
    chore.memberStates[memberId].completed = !wasCompleted;

    // Award points/dollars when completing
    if (!wasCompleted) {
      const member = this._data.members.find(m => m.id === memberId);
      if (member) {
        member.points = (member.points || 0) + (chore.points || 0);
        member.dollars = (member.dollars || 0) + parseFloat(chore.dollars || 0);
      }
    } else {
      // Deduct if unchecking
      const member = this._data.members.find(m => m.id === memberId);
      if (member) {
        member.points = Math.max(0, (member.points || 0) - (chore.points || 0));
        member.dollars = Math.max(0, (member.dollars || 0) - parseFloat(chore.dollars || 0));
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
    const assignedTo = [];
    this.shadowRoot.querySelectorAll('[id^="assign-"]').forEach(cb => {
      if (cb.checked) assignedTo.push(cb.id.replace('assign-', ''));
    });

    if (editing === 'new') {
      this._data.chores.push({ id: this._uid(), title, emoji, points, dollars, assignedTo, memberStates: {} });
    } else {
      const chore = this._data.chores.find(c => c.id === editing);
      if (chore) Object.assign(chore, { title, emoji, points, dollars, assignedTo });
    }
    this._saveData();
    this._state.editingChore = null;
    this._render();
  }

  _deleteChore(id) {
    this._data.chores = this._data.chores.filter(c => c.id !== id);
    this._saveData();
    this._state.editingChore = null;
    this._render();
  }

  _resetChore(id) {
    const chore = this._data.chores.find(c => c.id === id);
    if (!chore) return;
    // Deduct earnings for members who had it completed, then reset
    (chore.assignedTo || []).forEach(memberId => {
      const state = (chore.memberStates || {})[memberId] || {};
      if (state.completed) {
        const member = this._data.members.find(m => m.id === memberId);
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
      const m = this._data.members.find(m => m.id === editing);
      if (m) Object.assign(m, { name, avatar });
    }
    this._saveData();
    this._state.editingMember = null;
    this._render();
  }

  _deleteMember(id) {
    this._data.members = this._data.members.filter(m => m.id !== id);
    // Remove from assigned chores
    this._data.chores.forEach(c => {
      c.assignedTo = (c.assignedTo || []).filter(mid => mid !== id);
      if (c.memberStates) delete c.memberStates[id];
    });
    this._saveData();
    this._state.editingMember = null;
    this._render();
  }

  _resetMemberEarnings(id) {
    const m = this._data.members.find(m => m.id === id);
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
      this._data.pool.push({ id: this._uid(), title, emoji, points, dollars, claimedBy: null });
    } else {
      const chore = this._data.pool.find(c => c.id === editing);
      if (chore) Object.assign(chore, { title, emoji, points, dollars });
    }
    this._saveData();
    this._state.editingChore = null;
    this._render();
  }

  _deletePoolChore(id) {
    this._data.pool = this._data.pool.filter(c => c.id !== id);
    this._saveData();
    this._state.editingChore = null;
    this._render();
  }

  _unclaimPoolChore(id) {
    const chore = this._data.pool.find(c => c.id === id);
    if (chore) {
      // Remove from member's assigned chores list if it was moved there
      chore.claimedBy = null;
    }
    // Also remove it from regular chores if it was added there
    this._data.chores = this._data.chores.filter(c => c._poolRef !== id);
    this._saveData();
    this._render();
  }

  _claimChore(choreId, memberId) {
    if (!memberId) return;
    if (!this._allCompleted(memberId)) return;

    const poolChore = this._data.pool.find(c => c.id === choreId);
    if (!poolChore || poolChore.claimedBy) return;

    // Move pool chore to member's assigned chores
    const newChore = {
      id: this._uid(),
      title: poolChore.title,
      emoji: poolChore.emoji,
      points: poolChore.points,
      dollars: poolChore.dollars,
      assignedTo: [memberId],
      memberStates: {},
      _poolRef: choreId,
    };
    this._data.chores.push(newChore);
    poolChore.claimedBy = memberId;

    this._saveData();
    this._state.view = 'member';
    this._render();
  }

  _styles() {
    return `
      :host {
        display: block;
        font-family: var(--paper-font-body1_-_font-family, 'Roboto', sans-serif);
      }
      .card {
        background: var(--card-background-color, var(--ha-card-background, #fff));
        border-radius: var(--ha-card-border-radius, 12px);
        box-shadow: var(--ha-card-box-shadow, 0 2px 8px rgba(0,0,0,0.15));
        overflow: hidden;
        color: var(--primary-text-color, #333);
      }
      .header {
        background: #003366;
        color: #fff;
        padding: 14px 16px;
        display: flex;
        align-items: center;
        gap: 10px;
        min-height: 52px;
      }
      .header-title {
        flex: 1;
        font-size: 1.1rem;
        font-weight: 700;
        letter-spacing: 0.5px;
      }
      .header-actions {
        display: flex;
        gap: 6px;
      }
      .back-btn {
        background: rgba(255,255,255,0.15);
        border: none;
        color: #fff;
        cursor: pointer;
        padding: 6px 10px;
        border-radius: 8px;
        font-size: 0.85rem;
        font-weight: 600;
        transition: background 0.2s;
      }
      .back-btn:hover { background: rgba(255,255,255,0.25); }
      .icon-btn {
        background: rgba(255,255,255,0.1);
        border: none;
        color: #fff;
        cursor: pointer;
        width: 36px;
        height: 36px;
        border-radius: 8px;
        font-size: 1.1rem;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background 0.2s;
      }
      .icon-btn:hover { background: rgba(255,255,255,0.2); }
      .pool-banner, .claim-banner {
        background: linear-gradient(135deg, #4FC3F7, #0288D1);
        color: #fff;
        padding: 12px 16px;
        cursor: pointer;
        font-size: 0.9rem;
        transition: opacity 0.2s;
      }
      .pool-banner:hover, .claim-banner:hover { opacity: 0.9; }
      .claim-banner {
        background: linear-gradient(135deg, #43A047, #1B5E20);
        margin: 12px;
        border-radius: 10px;
        text-align: center;
      }
      .pool-context {
        background: var(--secondary-background-color, #f5f5f5);
        padding: 10px 16px;
        font-size: 0.85rem;
        color: var(--secondary-text-color, #666);
        border-bottom: 1px solid var(--divider-color, #e0e0e0);
      }
      .members-list {
        padding: 12px;
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .member-card {
        background: var(--secondary-background-color, #f9f9f9);
        border: 1px solid var(--divider-color, #e8e8e8);
        border-radius: 12px;
        padding: 14px;
        display: flex;
        align-items: center;
        gap: 14px;
        cursor: pointer;
        transition: all 0.2s;
        border-left: 4px solid #4FC3F7;
      }
      .member-card:hover {
        background: var(--hover-color, #f0f4ff);
        transform: translateY(-1px);
        box-shadow: 0 3px 10px rgba(0,0,0,0.1);
      }
      .member-avatar {
        width: 48px;
        height: 48px;
        background: linear-gradient(135deg, #003366, #0288D1);
        color: #fff;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.4rem;
        font-weight: 700;
        flex-shrink: 0;
      }
      .member-avatar.small {
        width: 36px;
        height: 36px;
        font-size: 1rem;
      }
      .member-info { flex: 1; min-width: 0; }
      .member-name {
        font-weight: 700;
        font-size: 1rem;
        color: var(--primary-text-color, #222);
        margin-bottom: 4px;
      }
      .member-stats {
        display: flex;
        gap: 12px;
        margin-bottom: 6px;
      }
      .stat {
        font-size: 0.8rem;
        color: var(--secondary-text-color, #666);
        background: var(--chip-background-color, rgba(0,51,102,0.08));
        padding: 2px 8px;
        border-radius: 12px;
      }
      .progress-bar-wrap {
        height: 6px;
        background: var(--divider-color, #e0e0e0);
        border-radius: 3px;
        overflow: hidden;
        margin-bottom: 3px;
      }
      .progress-bar {
        height: 100%;
        background: linear-gradient(90deg, #4FC3F7, #0288D1);
        border-radius: 3px;
        transition: width 0.4s ease;
      }
      .progress-label {
        font-size: 0.75rem;
        color: var(--secondary-text-color, #888);
      }
      .member-summary {
        display: flex;
        align-items: center;
        gap: 16px;
        padding: 16px;
        background: linear-gradient(135deg, rgba(0,51,102,0.05), rgba(79,195,247,0.1));
        border-bottom: 1px solid var(--divider-color, #e0e0e0);
      }
      .summary-avatar {
        width: 56px;
        height: 56px;
        background: linear-gradient(135deg, #003366, #0288D1);
        color: #fff;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.6rem;
        font-weight: 700;
      }
      .summary-stats { flex: 1; }
      .stat-big {
        font-size: 0.95rem;
        color: var(--primary-text-color, #333);
        margin-bottom: 4px;
      }
      .chores-section { padding: 12px; }
      .section-title {
        font-size: 0.8rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 1px;
        color: #0288D1;
        margin-bottom: 10px;
        padding-left: 4px;
      }
      .chores-list { display: flex; flex-direction: column; gap: 8px; }
      .chore-item {
        display: flex;
        align-items: center;
        gap: 10px;
        background: var(--secondary-background-color, #f9f9f9);
        border: 1px solid var(--divider-color, #e8e8e8);
        border-radius: 10px;
        padding: 10px 12px;
        transition: all 0.2s;
      }
      .chore-item.completed {
        opacity: 0.6;
        background: var(--success-color, rgba(67,160,71,0.08));
        border-color: var(--success-color, #43A047);
      }
      .chore-check {
        width: 26px;
        height: 26px;
        border: 2px solid var(--divider-color, #ccc);
        border-radius: 6px;
        background: transparent;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 0.85rem;
        color: #43A047;
        flex-shrink: 0;
        transition: all 0.2s;
      }
      .chore-check.checked {
        background: #43A047;
        border-color: #43A047;
        color: #fff;
      }
      .chore-emoji { font-size: 1.3rem; flex-shrink: 0; }
      .chore-title {
        flex: 1;
        font-size: 0.95rem;
        color: var(--primary-text-color, #333);
        font-weight: 500;
      }
      .chore-meta {
        font-size: 0.78rem;
        color: var(--secondary-text-color, #777);
        margin-top: 2px;
      }
      .chore-rewards { display: flex; gap: 5px; flex-shrink: 0; }
      .reward-badge {
        font-size: 0.72rem;
        padding: 2px 7px;
        border-radius: 10px;
        font-weight: 600;
      }
      .reward-badge.points {
        background: rgba(255,193,7,0.15);
        color: #E65100;
      }
      .reward-badge.dollars {
        background: rgba(67,160,71,0.15);
        color: #2E7D32;
      }
      .claim-btn {
        padding: 6px 12px;
        background: #0288D1;
        color: #fff;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        font-size: 0.82rem;
        font-weight: 600;
        transition: background 0.2s;
        flex-shrink: 0;
      }
      .claim-btn:hover:not(.disabled) { background: #01579B; }
      .claim-btn.disabled {
        background: var(--disabled-color, #ccc);
        cursor: not-allowed;
        color: #999;
      }
      .tabs {
        display: flex;
        background: var(--secondary-background-color, #f5f5f5);
        border-bottom: 1px solid var(--divider-color, #e0e0e0);
      }
      .tab {
        flex: 1;
        padding: 10px;
        border: none;
        background: transparent;
        cursor: pointer;
        font-size: 0.85rem;
        font-weight: 600;
        color: var(--secondary-text-color, #666);
        border-bottom: 3px solid transparent;
        transition: all 0.2s;
      }
      .tab.active {
        color: #0288D1;
        border-bottom-color: #0288D1;
        background: var(--card-background-color, #fff);
      }
      .tab-content { padding: 12px; }
      .admin-section { display: flex; flex-direction: column; gap: 10px; }
      .admin-chore-item {
        display: flex;
        align-items: center;
        gap: 10px;
        background: var(--secondary-background-color, #f9f9f9);
        border: 1px solid var(--divider-color, #e8e8e8);
        border-radius: 10px;
        padding: 10px 12px;
      }
      .admin-chore-info { flex: 1; min-width: 0; }
      .admin-chore-actions { display: flex; gap: 4px; }
      .admin-chore-actions .icon-btn {
        background: var(--secondary-background-color, #eee);
        color: var(--primary-text-color, #333);
        width: 32px;
        height: 32px;
        font-size: 0.9rem;
      }
      .admin-chore-actions .icon-btn:hover {
        background: var(--hover-color, #ddd);
      }
      .edit-form {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .form-title {
        font-size: 1rem;
        font-weight: 700;
        color: #003366;
        margin-bottom: 6px;
      }
      .edit-form label {
        font-size: 0.8rem;
        font-weight: 600;
        color: var(--secondary-text-color, #666);
        margin-top: 4px;
      }
      .form-input {
        padding: 9px 12px;
        border: 1.5px solid var(--divider-color, #ccc);
        border-radius: 8px;
        font-size: 0.9rem;
        background: var(--card-background-color, #fff);
        color: var(--primary-text-color, #333);
        transition: border-color 0.2s;
        width: 100%;
        box-sizing: border-box;
      }
      .form-input:focus {
        border-color: #0288D1;
        outline: none;
      }
      .assign-list {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        padding: 8px 0;
      }
      .assign-item {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 0.88rem;
        cursor: pointer;
        padding: 5px 10px;
        background: var(--secondary-background-color, #f5f5f5);
        border-radius: 8px;
        border: 1px solid var(--divider-color, #e0e0e0);
      }
      .assign-item input { cursor: pointer; }
      .form-actions {
        display: flex;
        gap: 8px;
        margin-top: 8px;
        flex-wrap: wrap;
      }
      .primary-btn {
        padding: 9px 18px;
        background: #003366;
        color: #fff;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        font-size: 0.88rem;
        font-weight: 600;
        transition: background 0.2s;
      }
      .primary-btn:hover { background: #01579B; }
      .secondary-btn {
        padding: 9px 18px;
        background: var(--secondary-background-color, #f5f5f5);
        color: var(--primary-text-color, #333);
        border: 1.5px solid var(--divider-color, #ccc);
        border-radius: 8px;
        cursor: pointer;
        font-size: 0.88rem;
        font-weight: 600;
        transition: background 0.2s;
      }
      .secondary-btn:hover { background: var(--hover-color, #e5e5e5); }
      .danger-btn {
        padding: 9px 18px;
        background: #c62828;
        color: #fff;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        font-size: 0.88rem;
        font-weight: 600;
        transition: background 0.2s;
      }
      .danger-btn:hover { background: #b71c1c; }
      .admin-login {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 14px;
        padding: 32px 24px;
      }
      .login-icon { font-size: 3rem; }
      .login-title {
        font-size: 1rem;
        font-weight: 700;
        color: var(--primary-text-color, #333);
      }
      .admin-input {
        width: 100%;
        max-width: 260px;
        padding: 10px 14px;
        border: 1.5px solid var(--divider-color, #ccc);
        border-radius: 8px;
        font-size: 1rem;
        background: var(--card-background-color, #fff);
        color: var(--primary-text-color, #333);
        text-align: center;
        box-sizing: border-box;
      }
      .admin-input:focus { border-color: #0288D1; outline: none; }
      .login-error { color: #c62828; font-size: 0.85rem; min-height: 18px; }
      .member-totals {
        display: flex;
        gap: 16px;
        padding: 10px;
        background: var(--secondary-background-color, #f5f5f5);
        border-radius: 8px;
        font-size: 0.88rem;
        font-weight: 600;
        color: var(--primary-text-color, #333);
      }
      .empty {
        text-align: center;
        color: var(--secondary-text-color, #999);
        padding: 24px 16px;
        font-size: 0.9rem;
      }
    `;
  }

  static getStubConfig() {
    return {
      title: 'Family Chores',
      admin_password: '1234',
    };
  }

  getCardSize() {
    return 4;
  }
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
