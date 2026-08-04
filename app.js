import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js';
import { getFirestore, doc, getDoc, onSnapshot, setDoc, updateDoc, deleteDoc, arrayUnion, collection, query, where } from 'https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js';

const firebaseConfig = { apiKey: 'AIzaSyCxMQNFI35QS2qE4TbUDi14rQ5LfJuthAw', authDomain: 'gen-lang-client-0513521672.firebaseapp.com', projectId: 'gen-lang-client-0513521672', storageBucket: 'gen-lang-client-0513521672.firebasestorage.app', messagingSenderId: '358176864493', appId: '1:358176864493:web:24591e445aa4fe8612f4e4' };
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const STORAGE_KEY = 'aifa.finance.v2';
const DEFAULT_DATA = { users: {}, workspaces: {}, currentEmail: null, activeWorkspaceId: null };
const TYPE_LABELS = { income: 'Pendapatan', expense: 'Pengeluaran', saving: 'Tabungan' };
const MAX_ROOMS = 5;
const EMAIL_TYPOS = {
  'gmai.com': 'gmail.com',
  'gmal.com': 'gmail.com',
  'gmial.com': 'gmail.com',
  'gmaill.com': 'gmail.com',
  'gmail.co': 'gmail.com',
  'gmail.co.id': 'gmail.com',
  'gmail.comm': 'gmail.com',
  'gmail.com.': 'gmail.com',
  'gmaill.com': 'gmail.com',
  'yahoo.co': 'yahoo.com',
  'yahoo.co.id': 'yahoo.com',
  'yahho.com': 'yahoo.com',
};
const state = loadState();
let selectedType = 'expense', showSavings = false, deferredPrompt;
let pendingNewAccountEmail = null;
let pendingSetPasswordEmail = null;
let demoMode = false;
const DEMO_EMAIL = 'fulan@demo.aifa';
let confirmAction = null;
let longPressTimer = null;
let contextTargetId = null;
let editingTrxId = null;
let editType = 'expense';
let trxMenuOpenedAt = 0;
let unsubWorkspaces = null, unsubUsers = null;
const els = {
  authView: document.querySelector('#authView'), mainView: document.querySelector('#mainView'),
  stepAuth: document.querySelector('#stepAuth'), stepProfile: document.querySelector('#stepProfile'), stepWorkspace: document.querySelector('#stepWorkspace'),
  loginForm: document.querySelector('#loginForm'), emailInput: document.querySelector('#emailInput'), passwordInput: document.querySelector('#passwordInput'), loginError: document.querySelector('#loginError'), forgotPasswordLink: document.querySelector('#forgotPasswordLink'),
  demoButton: document.querySelector('#demoButton'), demoBanner: document.querySelector('#demoBanner'), demoExitBtn: document.querySelector('#demoExitBtn'), splashView: document.querySelector('#splashView'),
  onboardProfileForm: document.querySelector('#onboardProfileForm'), onboardAvatarPreview: document.querySelector('#onboardAvatarPreview'),
  onboardAvatarInput: document.querySelector('#onboardAvatarInput'), onboardNameInput: document.querySelector('#onboardNameInput'),
  onboardRoleInput: document.querySelector('#onboardRoleInput'), onboardWaInput: document.querySelector('#onboardWaInput'),
  onboardPasswordInput: document.querySelector('#onboardPasswordInput'), onboardPasswordConfirmInput: document.querySelector('#onboardPasswordConfirmInput'), onboardPasswordError: document.querySelector('#onboardPasswordError'),
  onboardWorkspaceForm: document.querySelector('#onboardWorkspaceForm'), onboardRoomNameInput: document.querySelector('#onboardRoomNameInput'),
  onboardQrisPanel: document.querySelector('#onboardQrisPanel'), onboardConfirmWaBtn: document.querySelector('#onboardConfirmWaBtn'),
  tierFreeCard: document.querySelector('#tierFreeCard'), tierPremiumCard: document.querySelector('#tierPremiumCard'),
  logoutButton: document.querySelector('#logoutButton'), userInitials: document.querySelector('#userInitials'),
  userName: document.querySelector('#userName'), userEmail: document.querySelector('#userEmail'),
  workspaceSelect: document.querySelector('#workspaceSelect'), createWorkspaceForm: document.querySelector('#createWorkspaceForm'),
  workspaceNameInput: document.querySelector('#workspaceNameInput'), memberList: document.querySelector('#memberList'),
  memberCount: document.querySelector('#memberCount'), shareInviteButton: document.querySelector('#shareInviteButton'),
  workspaceTitle: document.querySelector('#workspaceTitle'), periodLabel: document.querySelector('#periodLabel'),
  incomeTotal: document.querySelectorAll('.incomeTotal'), expenseTotal: document.querySelectorAll('.expenseTotal'),
  balanceTotal: document.querySelectorAll('.balanceTotal'), savingTotal: document.querySelectorAll('.savingTotal'),
  toggleSavingsButton: document.querySelectorAll('.toggleSavingsButton'),
  archiveButton: document.querySelector('#archiveButton'),
  chatFeed: document.querySelector('#chatFeed'), transactionForm: document.querySelector('#transactionForm'),
  transactionNoteInput: document.querySelector('#transactionNoteInput'), transactionAmountInput: document.querySelector('#transactionAmountInput'),
  resetDialog: document.querySelector('#resetDialog'), confirmRefreshButton: document.querySelector('#confirmRefreshButton'),
  toast: document.querySelector('#toast'), switchOptions: [...document.querySelectorAll('.switch-option')],
  mobileMenuButton: document.querySelector('#mobileMenuButton'), closeSidebarButton: document.querySelector('#closeSidebarButton'),
  openProfileButton: document.querySelector('#openProfileButton'), profileDialog: document.querySelector('#profileDialog'),
  profileForm: document.querySelector('#profileForm'), profileAvatarInput: document.querySelector('#profileAvatarInput'),
  profileAvatarPreview: document.querySelector('#profileAvatarPreview'), profileNameInput: document.querySelector('#profileNameInput'),
  profileRoleInput: document.querySelector('#profileRoleInput'), profilePaydayInput: document.querySelector('#profilePaydayInput'),
  profileWaInput: document.querySelector('#profileWaInput'),
  reminderToggle: document.querySelector('#reminderToggle'),
  reminderTimeInput: document.querySelector('#reminderTimeInput'), paydayAlertContainer: document.querySelector('#paydayAlertContainer'),
  profileCurPasswordInput: document.querySelector('#profileCurPasswordInput'), profileNewPasswordInput: document.querySelector('#profileNewPasswordInput'), profileNewPassword2Input: document.querySelector('#profileNewPassword2Input'),
  setPasswordDialog: document.querySelector('#setPasswordDialog'), setPasswordForm: document.querySelector('#setPasswordForm'),
  setPasswordEmail: document.querySelector('#setPasswordEmail'), setPasswordNewInput: document.querySelector('#setPasswordNewInput'),
  setPasswordConfirmInput: document.querySelector('#setPasswordConfirmInput'), setPasswordError: document.querySelector('#setPasswordError'),
  setPasswordCancelBtn: document.querySelector('#setPasswordCancelBtn'), setPasswordSaveBtn: document.querySelector('#setPasswordSaveBtn'),
  archiveView: document.querySelector('#archiveView'), archiveFeed: document.querySelector('#archiveFeed'),
  closeArchiveButton: document.querySelector('#closeArchiveButton'), installBanner: document.querySelector('#installBanner'),
  installButton: document.querySelector('#installButton'), closeInstallBanner: document.querySelector('#closeInstallBanner'),
  upgradeDialog: document.querySelector('#upgradeDialog'), confirmUpgradeWA: document.querySelector('#confirmUpgradeWA'),
  closeUpgradeButton: document.querySelector('#closeUpgradeButton'),
  iosBanner: document.querySelector('#iosBanner'),
  closeIosBanner: document.querySelector('#closeIosBanner'),
  wsDropdownTrigger: document.querySelector('#wsDropdownTrigger'),
  wsDropdownPanel: document.querySelector('#wsDropdownPanel'),
  wsDropdownList: document.querySelector('#wsDropdownList'),
  wsDropdownLabel: document.querySelector('#wsDropdownLabel'),
  profileBubbleTrigger: document.querySelector('#profileBubbleTrigger'),
  profileBubbleMenu: document.querySelector('#profileBubbleMenu'),
  workspaceSettingsButton: document.querySelector('#workspaceSettingsButton'),
  newAccountDialog: document.querySelector('#newAccountDialog'),
  newAccountEmail: document.querySelector('#newAccountEmail'),
  newAccountHint: document.querySelector('#newAccountHint'),
  newAccountCreateBtn: document.querySelector('#newAccountCreateBtn'),
  newAccountCancelBtn: document.querySelector('#newAccountCancelBtn'),
  newAccountFixBtn: document.querySelector('#newAccountFixBtn'),
  roomSettingsDialog: document.querySelector('#roomSettingsDialog'),
  roomSettingsNameDisplay: document.querySelector('#roomSettingsNameDisplay'),
  roomSettingsNameText: document.querySelector('#roomSettingsNameText'),
  roomSettingsNameEditBtn: document.querySelector('#roomSettingsNameEditBtn'),
  roomSettingsNameForm: document.querySelector('#roomSettingsNameForm'),
  roomSettingsNameInput: document.querySelector('#roomSettingsNameInput'),
  roomSettingsMemberList: document.querySelector('#roomSettingsMemberList'),
  roomSettingsMemberCount: document.querySelector('#roomSettingsMemberCount'),
  roomSettingsResetBtn: document.querySelector('#roomSettingsResetBtn'),
  roomSettingsDeleteBtn: document.querySelector('#roomSettingsDeleteBtn'),
  roomWishlistForm: document.querySelector('#roomWishlistForm'),
  roomWishlistNameInput: document.querySelector('#roomWishlistNameInput'),
  roomWishlistPriceInput: document.querySelector('#roomWishlistPriceInput'),
  roomWishlistList: document.querySelector('#roomWishlistList'),
  wishlistAchievedBanner: document.querySelector('#wishlistAchievedBanner'),
  wishlistAchievedText: document.querySelector('#wishlistAchievedText'),
  wishlistAchievedClose: document.querySelector('#wishlistAchievedClose'),
  confirmDialog: document.querySelector('#confirmDialog'),
  confirmDialogTitle: document.querySelector('#confirmDialogTitle'),
  confirmDialogMessage: document.querySelector('#confirmDialogMessage'),
  confirmDialogOk: document.querySelector('#confirmDialogOk'),
  confirmDialogCancel: document.querySelector('#confirmDialogCancel'),
  trxMenu: document.querySelector('#trxMenu'),
  trxMenuEdit: document.querySelector('#trxMenuEdit'),
  trxMenuDelete: document.querySelector('#trxMenuDelete'),
  editTransactionDialog: document.querySelector('#editTransactionDialog'),
  editTransactionForm: document.querySelector('#editTransactionForm'),
  editTypeSwitch: document.querySelector('#editTypeSwitch'),
  editTypeOptions: document.querySelectorAll('#editTypeSwitch .switch-option'),
  editNoteInput: document.querySelector('#editNoteInput'),
  editAmountInput: document.querySelector('#editAmountInput'),
};

boot();

function setupPasswordToggles() {
  const eye = '<svg class="pw-eye" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>';
  const eyeOff = '<svg class="pw-eye-off" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>';
  document.querySelectorAll('input[type="password"]').forEach(input => {
    const wrap = document.createElement('div');
    wrap.className = 'pw-field';
    input.parentNode.insertBefore(wrap, input);
    wrap.appendChild(input);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'pw-toggle';
    btn.setAttribute('aria-label', 'Tampilkan password');
    btn.setAttribute('aria-pressed', 'false');
    btn.innerHTML = eye + eyeOff;
    btn.addEventListener('click', () => {
      const showing = input.type === 'text';
      input.type = showing ? 'password' : 'text';
      btn.classList.toggle('showing', !showing);
      btn.setAttribute('aria-label', showing ? 'Tampilkan password' : 'Sembunyikan password');
      btn.setAttribute('aria-pressed', String(!showing));
      input.focus();
    });
    wrap.appendChild(btn);
  });
}

function boot() {
  setupPasswordToggles();
  bindEvents();
  setupInstallBanner();
  startReminderScheduler();
  window.addEventListener('popstate', handlePopState);
  const splashShownAt = Date.now();
  const hideSplash = () => {
    if (!els.splashView) return;
    const wait = Math.max(0, 1000 - (Date.now() - splashShownAt));
    setTimeout(() => { if (els.splashView) els.splashView.classList.add('hidden'); }, wait);
  };
  if (state.currentEmail) {
    if (els.splashView) { els.splashView.classList.remove('hidden'); els.authView.classList.add('hidden'); }
    getDoc(doc(db, 'users', state.currentEmail)).then(snap => {
      if (snap.exists()) {
        state.users[state.currentEmail] = snap.data();
        subscribeToData(); render(); showStep('dashboard');
        hideSplash();
        refreshReminderConfig();
        const p = new URLSearchParams(window.location.search);
        if (p.get('inviteId') && p.get('inviteName')) {
          joinWorkspaceFromInvite(p.get('inviteId'), p.get('inviteName')).then(render);
        }
      } else {
        state.currentEmail = null;
        saveState();
        hideSplash();
        showStep('auth');
      }
    }).catch((err) => {
      console.error('boot getUser error:', err);
      hideSplash();
      showToast('Gagal terhubung ke server. Cek koneksi & izin Firestore.');
      showStep('auth');
    });
  } else {
    hideSplash();
    showStep('auth');
  }
}

function showStep(step, pushHistory = true) {
  els.stepAuth.classList.add('hidden');
  els.stepProfile.classList.add('hidden');
  els.stepWorkspace.classList.add('hidden');
  els.authView.classList.remove('hidden');
  els.mainView.classList.add('hidden');
  if (step === 'auth') {
    els.stepAuth.classList.remove('hidden');
    if (pushHistory) history.replaceState({ page: 'auth' }, '');
    return;
  }
  if (step === 'profile') {
    els.stepProfile.classList.remove('hidden');
    if (pushHistory) history.pushState({ page: 'profile' }, '');
    return;
  }
  if (step === 'workspace') {
    els.stepWorkspace.classList.remove('hidden');
    if (pushHistory) history.pushState({ page: 'workspace' }, '');
    return;
  }
  if (step === 'dashboard') {
    els.authView.classList.add('hidden');
    els.mainView.classList.remove('hidden');
    if (pushHistory) history.replaceState({ page: 'dashboard' }, '');
    setTimeout(() => { if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission(); }, 2000);
  }
}

function handlePopState(e) {
  const page = e.state?.page;

  // ARCHIVE open → close it
  if (page !== 'archive' && !els.archiveView.classList.contains('hidden')) {
    els.archiveView.classList.add('hidden');
    return;
  }
  if (page === 'archive') {
    // state is archive but we need to handle back FROM archive
    els.archiveView.classList.add('hidden');
    history.pushState({ page: 'dashboard' }, '');
    return;
  }

  // SIDEBAR open on mobile → close it
  if (page === 'sidebar' || (page !== 'sidebar' && els.mainView.classList.contains('mobile-sidebar-open'))) {
    els.mainView.classList.remove('mobile-sidebar-open');
    if (page === 'sidebar') history.pushState({ page: 'dashboard' }, '');
    return;
  }

  // ONBOARDING steps
  if (page === 'profile') { showStep('auth', false); return; }
  if (page === 'workspace') { showStep('profile', false); return; }

  // DASHBOARD or AUTH root — prevent app exit by pushing state back
  if (page === 'dashboard') {
    history.pushState({ page: 'dashboard' }, '');
    return;
  }
  if (page === 'auth' || !page) {
    if (state.currentEmail && state.users[state.currentEmail]) {
      history.pushState({ page: 'dashboard' }, '');
      showStep('dashboard', false);
    } else {
      history.pushState({ page: 'auth' }, '');
      showStep('auth', false);
    }
  }
}


function subscribeToData() {
  if (demoMode) return;
  if (!state.currentEmail) return;
  if (unsubWorkspaces) unsubWorkspaces();
  if (unsubUsers) unsubUsers();
  const wq = query(collection(db, 'workspaces'), where('members', 'array-contains', state.currentEmail));
  unsubWorkspaces = onSnapshot(wq, (snap) => {
    snap.docChanges().forEach((ch) => {
      if (ch.type === 'added' || ch.type === 'modified') state.workspaces[ch.doc.id] = ch.doc.data();
      if (ch.type === 'removed') delete state.workspaces[ch.doc.id];
    });
    render();
  }, (err) => {
    console.error('Gagal memuat ruang:', err);
    showToast('Gagal memuat ruang dari server. Cek koneksi & izin Firestore.');
  });
  unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
    snap.docChanges().forEach((ch) => {
      if (ch.type === 'added' || ch.type === 'modified') state.users[ch.doc.id] = ch.doc.data();
    });
    render();
  }, (err) => {
    console.error('Gagal memuat data pengguna:', err);
  });
}

async function joinWorkspaceFromInvite(inviteId, inviteName) {
  // Safely add member to existing Firestore workspace using arrayUnion
  try {
    const wsRef = doc(db, 'workspaces', inviteId);
    const wsSnap = await getDoc(wsRef);
    if (wsSnap.exists()) {
      if (!wsSnap.data().members.includes(state.currentEmail)) {
        if (getUserWorkspaces().length >= MAX_ROOMS) {
          showToast('Maksimal ' + MAX_ROOMS + ' ruang per akun.');
          return;
        }
        await updateDoc(wsRef, { members: arrayUnion(state.currentEmail) });
      }
      state.workspaces[inviteId] = wsSnap.data();
      if (!state.workspaces[inviteId].members.includes(state.currentEmail)) {
        state.workspaces[inviteId].members.push(state.currentEmail);
      }
    } else {
      // Workspace not in Firestore yet (edge case) — create a minimal placeholder
      const fp = { id: createId('period'), label: 'Periode 1', startedAt: new Date().toISOString(), endedAt: null };
      const wsData = { id: inviteId, name: inviteName, ownerEmail: 'unknown', members: [state.currentEmail], invites: [], activePeriodId: fp.id, periods: [fp], transactions: [], createdAt: new Date().toISOString() };
      await setDoc(wsRef, wsData);
      state.workspaces[inviteId] = wsData;
    }
  } catch (err) {
    console.error('joinWorkspaceFromInvite error:', err);
  }
  state.activeWorkspaceId = inviteId;
  saveState();
  window.history.replaceState({}, document.title, window.location.pathname);
  showToast('Berhasil bergabung ke ruang ' + inviteName);
}

async function sha256Hex(str) {
  const data = new TextEncoder().encode(str);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}
function fallbackHash(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) >>> 0;
  return 'fb_' + h.toString(16) + '_' + str.length;
}
async function hashPassword(password, salt) {
  if (crypto && crypto.subtle) return sha256Hex(salt + ':' + password);
  return fallbackHash(salt + ':' + password);
}
async function makePassword(password) {
  const bytes = crypto.getRandomValues ? crypto.getRandomValues(new Uint8Array(16)) : new Uint8Array(16);
  const salt = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  return { salt, hash: await hashPassword(password, salt) };
}
async function verifyPassword(password, stored) {
  if (!stored || !stored.salt || !stored.hash) return false;
  return (await hashPassword(password, stored.salt)) === stored.hash;
}
function hasPassword(user) { return !!(user && user.password && user.password.salt && user.password.hash); }

function buildDemoData() {
  const now = Date.now();
  const day = 86400000;
  function u(email, name, role, wa) {
    return { email, name, role, wa: wa || null, avatarUrl: null, tier: 'free', createdAt: new Date(now - 90 * day).toISOString() };
  }
  const fulan = u(DEMO_EMAIL, 'Fulan', 'Suami', '6281111111111');
  const fulanah = u('fulanah@demo.aifa', 'Fulanah', 'Istri', '6282222222222');
  const fulanati = u('fulanati@demo.aifa', 'Fulanati', 'Kakak', null);
  const fulanatiti = u('fulanatiti@demo.aifa', 'Fulanatiti', 'Adik', null);
  const fulanation = u('fulanation@demo.aifa', 'Fulanation', 'Keponakan', null);
  const ful = u('ful@demo.aifa', 'Ful', 'Teman', null);
  const fulaa = u('fulaa@demo.aifa', 'Fulaa', 'Teman', null);
  const fulanansi = u('fulanansi@demo.aifa', 'Fulanansi', 'Kolega', null);
  const allUsers = [fulan, fulanah, fulanati, fulanatiti, fulanation, ful, fulaa, fulanansi];
  const users = {};
  allUsers.forEach(x => { users[x.email] = x; });

  function trx(type, amount, note, actor, periodId, offsetDays, privateOwner) {
    return { id: 'd' + Math.random().toString(36).slice(2, 10), type, amount, note, actorEmail: actor.email, periodId, privateOwnerEmail: privateOwner || null, createdAt: new Date(now - offsetDays * day).toISOString() };
  }
  function mkRoom(id, name, members, ownerEmail) {
    const p1 = { id: id + '-p1', label: 'Periode 1', startedAt: new Date(now - 70 * day).toISOString(), endedAt: new Date(now - 40 * day).toISOString() };
    const p2 = { id: id + '-p2', label: 'Periode 2', startedAt: new Date(now - 40 * day).toISOString(), endedAt: new Date(now - 10 * day).toISOString() };
    const p3 = { id: id + '-p3', label: 'Periode 3', startedAt: new Date(now - 10 * day).toISOString(), endedAt: null };
    return { id, name, ownerEmail, members, invites: [], activePeriodId: p3.id, periods: [p1, p2, p3], transactions: [], createdAt: new Date(now - 70 * day).toISOString(), wishlist: [] };
  }

  const r1 = mkRoom('demo-pribadi', 'Pribadi', [fulan.email], fulan.email);
  r1.transactions = [
    trx('income', 5000000, 'Gaji bulanan', fulan, r1.activePeriodId, 8),
    trx('expense', 1200000, 'Kontrakan kos', fulan, r1.activePeriodId, 8),
    trx('expense', 350000, 'Sembako', fulan, r1.activePeriodId, 5),
    trx('saving', 500000, 'Tabungan motor', fulan, null, 5, fulan.email),
    trx('income', 5000000, 'Gaji bulanan', fulan, r1.periods[1].id, 38),
    trx('expense', 1200000, 'Kontrakan kos', fulan, r1.periods[1].id, 38),
    trx('expense', 400000, 'Token listrik', fulan, r1.periods[1].id, 30),
    trx('saving', 500000, 'Tabungan motor', fulan, null, 30, fulan.email),
    trx('income', 4500000, 'Gaji bulanan', fulan, r1.periods[0].id, 68),
    trx('expense', 1200000, 'Kontrakan kos', fulan, r1.periods[0].id, 68),
  ];

  const r2 = mkRoom('demo-berdua', 'Berdua', [fulan.email, fulanah.email], fulan.email);
  r2.transactions = [
    trx('income', 5000000, 'Gaji Fulan', fulan, r2.activePeriodId, 8),
    trx('income', 4500000, 'Gaji Fulanah', fulanah, r2.activePeriodId, 8),
    trx('expense', 2500000, 'Belanja bulanan', fulanah, r2.activePeriodId, 7),
    trx('expense', 450000, 'Listrik + air', fulan, r2.activePeriodId, 6),
    trx('expense', 200000, 'Makan malam bareng', fulan, r2.activePeriodId, 2),
    trx('saving', 1000000, 'Tabungan liburan', fulan, null, 6, fulan.email),
    trx('saving', 1000000, 'Dana darurat', fulanah, null, 4, fulanah.email),
    trx('income', 1500000, 'Bonus proyek', fulan, r2.periods[1].id, 35),
    trx('income', 5000000, 'Gaji Fulan', fulan, r2.periods[1].id, 38),
    trx('income', 4500000, 'Gaji Fulanah', fulanah, r2.periods[1].id, 38),
    trx('expense', 2300000, 'Belanja bulanan', fulanah, r2.periods[1].id, 37),
    trx('expense', 350000, 'Bensin', fulan, r2.periods[1].id, 25),
    trx('saving', 1000000, 'Tabungan liburan', fulan, null, 30, fulan.email),
    trx('income', 4800000, 'Gaji Fulan', fulan, r2.periods[0].id, 68),
    trx('income', 4300000, 'Gaji Fulanah', fulanah, r2.periods[0].id, 68),
    trx('expense', 2100000, 'Belanja bulanan', fulanah, r2.periods[0].id, 67),
    trx('expense', 1500000, 'Bayar kontrakan', fulan, r2.periods[0].id, 66),
  ];
  r2.wishlist = [{ id: 'd-w1', name: 'Liburan ke Bali', price: 5000000, createdAt: new Date(now - 20 * day).toISOString() }];

  const r3 = mkRoom('demo-banyak', 'Banyak Orang', allUsers.map(x => x.email), fulan.email);
  r3.transactions = [
    trx('income', 500000, 'Iuran kebersihan', fulanati, r3.activePeriodId, 6),
    trx('income', 500000, 'Iuran keamanan', ful, r3.activePeriodId, 6),
    trx('income', 300000, 'Iuran kas bersama', fulanah, r3.activePeriodId, 6),
    trx('expense', 650000, 'Sembako bersama', fulanah, r3.activePeriodId, 5),
    trx('expense', 800000, 'Servis AC rumah', fulanation, r3.activePeriodId, 4),
    trx('expense', 250000, 'Snack arisan', fulaa, r3.activePeriodId, 3),
    trx('income', 450000, 'Iuran kebersihan', fulanatiti, r3.periods[1].id, 35),
    trx('income', 450000, 'Iuran keamanan', ful, r3.periods[1].id, 35),
    trx('expense', 2000000, 'Renovasi dapur', fulanansi, r3.periods[1].id, 32),
    trx('expense', 400000, 'Kebutuhan bersama', fulanati, r3.periods[1].id, 28),
    trx('income', 400000, 'Iuran kebersihan', fulanati, r3.periods[0].id, 65),
    trx('income', 400000, 'Iuran keamanan', ful, r3.periods[0].id, 65),
    trx('expense', 1500000, 'Pesta keluarga', fulaa, r3.periods[0].id, 60),
  ];

  return { users, workspaces: { [r1.id]: r1, [r2.id]: r2, [r3.id]: r3 }, activeId: r2.id };
}

function enterDemo() {
  demoMode = true;
  const d = buildDemoData();
  state.users = d.users;
  state.workspaces = d.workspaces;
  state.currentEmail = DEMO_EMAIL;
  state.activeWorkspaceId = d.activeId;
  if (unsubWorkspaces) unsubWorkspaces();
  if (unsubUsers) unsubUsers();
  unsubWorkspaces = null; unsubUsers = null;
  if (els.demoBanner) els.demoBanner.classList.remove('hidden');
  showStep('dashboard'); render();
  showToast('Mode demo diaktifkan. Data tidak tersimpan.');
}

function exitDemo() {
  demoMode = false;
  if (els.demoBanner) els.demoBanner.classList.add('hidden');
  Object.assign(state, { currentEmail: null, activeWorkspaceId: null, users: {}, workspaces: {} });
  showSavings = false;
  saveState();
  showStep('auth');
}

function completeLogin(email, data) {
  state.currentEmail = email;
  state.users[email] = data;
  saveState(); subscribeToData();
  const p = new URLSearchParams(window.location.search);
  if (p.get('inviteId') && p.get('inviteName')) joinWorkspaceFromInvite(p.get('inviteId'), p.get('inviteName')).then(render);
  ensureActiveWorkspace(); showStep('dashboard'); render();
  showToast('Selamat datang, ' + (data.name || email.split('@')[0]) + '!');
}

function beginSetPassword(email) {
  pendingSetPasswordEmail = email;
  if (els.setPasswordEmail) els.setPasswordEmail.textContent = email;
  if (els.setPasswordNewInput) els.setPasswordNewInput.value = '';
  if (els.setPasswordConfirmInput) els.setPasswordConfirmInput.value = '';
  if (els.setPasswordError) els.setPasswordError.style.display = 'none';
  if (els.setPasswordDialog && typeof els.setPasswordDialog.showModal === 'function') els.setPasswordDialog.showModal();
}

function resizeImage(file, cb) {  const reader = new FileReader();
  reader.onload = (ev) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const size = 128; canvas.width = size; canvas.height = size;
      const ctx = canvas.getContext('2d');
      const minSize = Math.min(img.width, img.height);
      ctx.drawImage(img, (img.width - minSize) / 2, (img.height - minSize) / 2, minSize, minSize, 0, 0, size, size);
      cb(canvas.toDataURL('image/jpeg', 0.7));
    };
    img.src = ev.target.result;
  };
  reader.readAsDataURL(file);
}
function bindEvents() {
  els.loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = normalizeEmail(els.emailInput.value);
    const password = els.passwordInput.value;
    if (els.loginError) els.loginError.style.display = 'none';
    if (!email || !password) return;
    const btn = document.querySelector('#loginSubmitBtn');
    btn.disabled = true; btn.textContent = 'Memeriksa...';
    try {
      const userSnap = await getDoc(doc(db, 'users', email));
      if (userSnap.exists()) {
        const data = userSnap.data();
        if (!hasPassword(data)) {
          state.users[email] = data;
          beginSetPassword(email);
          return;
        }
        const ok = await verifyPassword(password, data.password);
        if (!ok) {
          if (els.loginError) { els.loginError.textContent = 'Password salah. Coba lagi.'; els.loginError.style.display = 'block'; }
          return;
        }
        completeLogin(email, data);
      } else {
        pendingNewAccountEmail = email;
        els.newAccountEmail.textContent = email;
        const parts = email.split('@');
        const fix = parts.length === 2 ? EMAIL_TYPOS[parts[1].toLowerCase()] : null;
        if (fix && els.newAccountFixBtn) {
          const fixed = parts[0] + '@' + fix;
          els.newAccountFixBtn.textContent = 'Maksudnya ' + fixed + '?';
          els.newAccountFixBtn.dataset.fixedEmail = fixed;
          els.newAccountFixBtn.classList.remove('hidden');
        } else if (els.newAccountFixBtn) {
          els.newAccountFixBtn.classList.add('hidden');
        }
        els.newAccountDialog.showModal();
      }
    } catch (err) {
      console.error(err);
      alert('Gagal memeriksa akun. Pastikan koneksi internet lancar dan coba lagi.');
    } finally { btn.disabled = false; btn.textContent = 'Masuk'; }
  });

  els.forgotPasswordLink && els.forgotPasswordLink.addEventListener('click', (e) => {
    e.preventDefault();
    const email = normalizeEmail(els.emailInput.value) || '[email akunmu]';
    window.open('https://wa.me/6285179813540?text=' + encodeURIComponent('Halo Admin AiFa, saya lupa password akun. Email saya: ' + email + '. Mohon bantuan reset password.'), '_blank');
  });

  els.demoButton && els.demoButton.addEventListener('click', enterDemo);
  els.demoExitBtn && els.demoExitBtn.addEventListener('click', exitDemo);

  els.setPasswordForm && els.setPasswordForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = pendingSetPasswordEmail; if (!email) return;
    const pw = els.setPasswordNewInput.value;
    const pw2 = els.setPasswordConfirmInput.value;
    const errEl = els.setPasswordError;
    errEl.style.display = 'none';
    if (pw.length < 6) { errEl.textContent = 'Password minimal 6 karakter.'; errEl.style.display = 'block'; return; }
    if (pw !== pw2) { errEl.textContent = 'Password tidak sama.'; errEl.style.display = 'block'; return; }
    const btn = els.setPasswordSaveBtn;
    btn.disabled = true; btn.textContent = 'Menyimpan...';
    try {
      const data = Object.assign({}, state.users[email] || {});
      data.password = await makePassword(pw);
      state.users[email] = data;
      await setDoc(doc(db, 'users', email), data);
      els.setPasswordDialog.close();
      pendingSetPasswordEmail = null;
      completeLogin(email, data);
    } catch (err) {
      console.error('setPassword error:', err);
      errEl.textContent = 'Gagal menyimpan password. Cek koneksi lalu coba lagi.';
      errEl.style.display = 'block';
      btn.disabled = false; btn.textContent = 'Simpan & Masuk';
    }
  });
  els.setPasswordCancelBtn && els.setPasswordCancelBtn.addEventListener('click', () => { pendingSetPasswordEmail = null; els.setPasswordDialog.close(); els.passwordInput.focus(); });
  els.setPasswordDialog && els.setPasswordDialog.addEventListener('click', (e) => { if (e.target === els.setPasswordDialog) { pendingSetPasswordEmail = null; els.setPasswordDialog.close(); } });

  els.newAccountCreateBtn && els.newAccountCreateBtn.addEventListener('click', () => {
    els.newAccountDialog.close();
    beginNewAccount(pendingNewAccountEmail);
  });
  els.newAccountCancelBtn && els.newAccountCancelBtn.addEventListener('click', () => {
    pendingNewAccountEmail = null;
    els.emailInput.focus();
  });
  els.newAccountFixBtn && els.newAccountFixBtn.addEventListener('click', () => {
    const fixed = els.newAccountFixBtn.dataset.fixedEmail;
    els.newAccountDialog.close();
    pendingNewAccountEmail = null;
    if (fixed) {
      els.emailInput.value = fixed;
      els.emailInput.focus();
    }
  });

  els.onboardAvatarInput && els.onboardAvatarInput.addEventListener('change', (e) => {
    const file = e.target.files[0]; if (!file) return;
    resizeImage(file, (d) => { els.onboardAvatarPreview.style.backgroundImage = 'url(' + d + ')'; els.onboardAvatarPreview.textContent = ''; els.onboardAvatarPreview.dataset.avatar = d; });
  });

  els.onboardProfileForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const errEl = els.onboardPasswordError;
    errEl.style.display = 'none';
    const pw = els.onboardPasswordInput.value;
    const pw2 = els.onboardPasswordConfirmInput.value;
    if (pw.length < 6) { errEl.textContent = 'Password minimal 6 karakter.'; errEl.style.display = 'block'; return; }
    if (pw !== pw2) { errEl.textContent = 'Password tidak sama.'; errEl.style.display = 'block'; return; }
    const userObj = { email: state.currentEmail, name: els.onboardNameInput.value.trim() || state.currentEmail.split('@')[0], role: els.onboardRoleInput.value.trim() || null, wa: els.onboardWaInput.value.trim() || null, avatarUrl: els.onboardAvatarPreview.dataset.avatar || null, tier: 'free', createdAt: new Date().toISOString() };
    userObj.password = await makePassword(pw);
    state.users[state.currentEmail] = userObj;
    setDoc(doc(db, 'users', state.currentEmail), userObj).catch((err) => {
      console.error('createUser error:', err);
      showToast('Gagal menyimpan akun ke server: ' + (err.code || err.message));
    });
    saveState();
    const pid = sessionStorage.getItem('pendingInviteId'), pname = sessionStorage.getItem('pendingInviteName');
    if (pid) {
      joinWorkspaceFromInvite(pid, pname || 'Ruang Bersama');
      sessionStorage.removeItem('pendingInviteId'); sessionStorage.removeItem('pendingInviteName');
      subscribeToData(); showStep('dashboard'); render();
    } else { showStep('workspace'); }
  });

  document.querySelectorAll('input[name="tier"]').forEach(r => {
    r.addEventListener('change', () => {
      if (r.value === 'premium' && r.checked) { els.onboardQrisPanel.classList.remove('hidden'); els.tierPremiumCard.classList.add('selected'); els.tierFreeCard.classList.remove('selected'); }
      else { els.onboardQrisPanel.classList.add('hidden'); els.tierFreeCard.classList.add('selected'); els.tierPremiumCard.classList.remove('selected'); }
    });
  });
  els.tierFreeCard.classList.add('selected');

  els.onboardConfirmWaBtn && els.onboardConfirmWaBtn.addEventListener('click', () => {
    window.open('https://wa.me/6285179813540?text=' + encodeURIComponent('Halo Admin AiFa, saya sudah transfer Rp50.000 untuk upgrade akun AiFa Premium. Email saya: ' + state.currentEmail), '_blank');
  });

  els.onboardWorkspaceForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const roomName = els.onboardRoomNameInput.value.trim() || 'Ruang Bersama';
    const chosenTier = (document.querySelector('input[name="tier"]:checked') || {}).value || 'free';
    const ws = createWorkspace(roomName, state.currentEmail);
    if (!ws) return;
    state.users[state.currentEmail].tier = chosenTier === 'premium' ? 'pending' : 'free';
    setDoc(doc(db, 'users', state.currentEmail), state.users[state.currentEmail]).catch(console.error);
    state.activeWorkspaceId = ws.id;
    saveState(); subscribeToData(); showStep('dashboard'); render();
    showToast('Ruang "' + roomName + '" berhasil dibuat!');
  });

  els.logoutButton.addEventListener('click', () => {
    if (unsubWorkspaces) unsubWorkspaces();
    if (unsubUsers) unsubUsers();
    unsubWorkspaces = null; unsubUsers = null;
    demoMode = false;
    if (els.demoBanner) els.demoBanner.classList.add('hidden');
    Object.assign(state, { currentEmail: null, activeWorkspaceId: null, users: {}, workspaces: {} });
    showSavings = false; saveState(); showStep('auth');
    els.emailInput.value = '';
    if (els.passwordInput) { els.passwordInput.value = ''; if (els.loginError) els.loginError.style.display = 'none'; }
  });

  els.closeInstallBanner && els.closeInstallBanner.addEventListener('click', () => { els.installBanner.classList.remove('show'); setTimeout(() => els.installBanner.classList.add('hidden'), 300); localStorage.setItem('installBannerDismissed', 'true'); });
  els.installButton && els.installButton.addEventListener('click', async () => { if (!deferredPrompt) return; deferredPrompt.prompt(); const { outcome } = await deferredPrompt.userChoice; if (outcome === 'accepted') { els.installBanner.classList.remove('show'); setTimeout(() => els.installBanner.classList.add('hidden'), 300); } deferredPrompt = null; });
  els.workspaceSelect.addEventListener('change', () => { state.activeWorkspaceId = els.workspaceSelect.value; saveState(); render(); els.mainView.classList.remove('mobile-sidebar-open'); });
  els.createWorkspaceForm.addEventListener('submit', (e) => { e.preventDefault(); const name = els.workspaceNameInput.value.trim(); if (!name || !state.currentEmail) return; const ws = createWorkspace(name, state.currentEmail); if (!ws) return; state.activeWorkspaceId = ws.id; els.workspaceNameInput.value = ''; saveState(); render(); closeWsDropdown(); showToast('Ruang ' + ws.name + ' dibuat.'); els.mainView.classList.remove('mobile-sidebar-open'); });

  els.shareInviteButton && els.shareInviteButton.addEventListener('click', async () => {
    const ws = getActiveWorkspace(); if (!ws) return;
    const url = location.origin + location.pathname + '?inviteId=' + encodeURIComponent(ws.id) + '&inviteName=' + encodeURIComponent(ws.name);
    try { if (navigator.share) await navigator.share({ title: 'Undangan: ' + ws.name, url }); else { await navigator.clipboard.writeText(url); showToast('Link undangan disalin!'); } } catch { showToast('Gagal membagikan link.'); }
  });

  els.switchOptions.forEach(b => b.addEventListener('click', () => { selectedType = b.dataset.type; renderTypeSwitch(); }));
  els.closeUpgradeButton && els.closeUpgradeButton.addEventListener('click', () => els.upgradeDialog.close());
  els.confirmUpgradeWA && els.confirmUpgradeWA.addEventListener('click', () => { window.open('https://wa.me/6285179813540?text=' + encodeURIComponent('Halo Admin AiFa, saya sudah transfer Rp50.000. Email: ' + state.currentEmail), '_blank'); els.upgradeDialog.close(); });

  els.transactionForm.addEventListener('submit', (ev) => {
    ev.preventDefault(); if (!state.activeWorkspaceId) return;
    const ws = state.workspaces[state.activeWorkspaceId]; if (!ws) return;
    const tier = (state.users[state.currentEmail] || {}).tier || 'free';
    if (tier === 'free') { const cnt = (ws.transactions || []).filter(t => t.periodId === ws.activePeriodId).length; if (cnt >= 30) { els.upgradeDialog.showModal(); return; } }
    const note = els.transactionNoteInput.value.trim(), amount = parseAmount(els.transactionAmountInput.value);
    if (!note || amount <= 0) return;
    ws.transactions.push({ id: createId('trx'), type: selectedType, note, amount, actorEmail: state.currentEmail, periodId: selectedType === 'saving' ? null : ws.activePeriodId, createdAt: new Date().toISOString(), privateOwnerEmail: selectedType === 'saving' ? state.currentEmail : null });
    els.transactionNoteInput.value = ''; els.transactionAmountInput.value = '';
    saveState(); render(); showToast(selectedType === 'saving' ? 'Tabungan privat tercatat.' : TYPE_LABELS[selectedType] + ' tercatat.'); scrollFeedToBottom();
  });

  els.transactionAmountInput.addEventListener('input', () => { const a = parseAmount(els.transactionAmountInput.value); els.transactionAmountInput.value = a > 0 ? formatPlainNumber(a) : ''; });
  els.toggleSavingsButton.forEach(b => b.addEventListener('click', () => { showSavings = !showSavings; renderTotals(); }));
  els.archiveButton.addEventListener('click', () => { els.archiveView.classList.remove('hidden'); renderArchive(); history.pushState({ page: 'archive' }, ''); });
  els.closeArchiveButton && els.closeArchiveButton.addEventListener('click', () => els.archiveView.classList.add('hidden'));
  els.paydayAlertContainer && els.paydayAlertContainer.addEventListener('click', () => { const ws = getActiveWorkspace(); if (!ws) return; if (typeof els.resetDialog.showModal === 'function') { els.resetDialog.showModal(); return; } refreshWorkspace(ws); });
  els.confirmRefreshButton.addEventListener('click', () => { const ws = getActiveWorkspace(); if (ws) refreshWorkspace(ws); els.resetDialog.close(); });
  els.mobileMenuButton && els.mobileMenuButton.addEventListener('click', () => {
    els.mainView.classList.add('mobile-sidebar-open');
    history.pushState({ page: 'sidebar' }, '');
  });
  els.closeSidebarButton && els.closeSidebarButton.addEventListener('click', () => els.mainView.classList.remove('mobile-sidebar-open'));

  els.openProfileButton && els.openProfileButton.addEventListener('click', () => {
    const user = state.users[state.currentEmail]; if (!user) return;
    els.profileNameInput.value = user.name || ''; els.profileRoleInput.value = user.role || ''; els.profilePaydayInput.value = user.payday || ''; els.profileWaInput.value = user.wa || '';
    if (els.reminderToggle) { els.reminderToggle.checked = !!(user.reminder && user.reminder.enabled); els.reminderTimeInput.value = (user.reminder && user.reminder.time) || '20:00'; }
    if (els.profileCurPasswordInput) { els.profileCurPasswordInput.value = ''; els.profileNewPasswordInput.value = ''; els.profileNewPassword2Input.value = ''; }
    if (user.avatarUrl) { els.profileAvatarPreview.style.backgroundImage = 'url(' + user.avatarUrl + ')'; els.profileAvatarPreview.textContent = ''; }
    else { els.profileAvatarPreview.style.backgroundImage = 'none'; els.profileAvatarPreview.textContent = initials(user.name || user.email); }
    els.profileDialog.showModal();
  });
  els.profileAvatarInput && els.profileAvatarInput.addEventListener('change', (e) => { const file = e.target.files[0]; if (!file) return; resizeImage(file, (d) => { els.profileAvatarPreview.style.backgroundImage = 'url(' + d + ')'; els.profileAvatarPreview.textContent = ''; els.profileAvatarPreview.dataset.newAvatar = d; }); });
  els.profileForm && els.profileForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const user = state.users[state.currentEmail]; if (!user) return;
    user.name = els.profileNameInput.value.trim(); user.role = els.profileRoleInput.value.trim(); user.payday = parseInt(els.profilePaydayInput.value, 10) || null; user.wa = els.profileWaInput.value.trim();
    if (els.profileAvatarPreview.dataset.newAvatar) { user.avatarUrl = els.profileAvatarPreview.dataset.newAvatar; delete els.profileAvatarPreview.dataset.newAvatar; }
    if (els.reminderToggle) { user.reminder = { enabled: els.reminderToggle.checked, time: els.reminderTimeInput.value || '20:00' }; }
    const cur = els.profileCurPasswordInput.value, nw = els.profileNewPasswordInput.value, nw2 = els.profileNewPassword2Input.value;
    if (cur || nw || nw2) {
      if (!hasPassword(user)) { showToast('Akun ini belum punya password.'); return; }
      const ok = await verifyPassword(cur, user.password);
      if (!ok) { showToast('Password saat ini salah.'); return; }
      if (nw.length < 6) { showToast('Password baru minimal 6 karakter.'); return; }
      if (nw !== nw2) { showToast('Password baru tidak sama.'); return; }
      user.password = await makePassword(nw);
      els.profileCurPasswordInput.value = ''; els.profileNewPasswordInput.value = ''; els.profileNewPassword2Input.value = '';
      showToast('Password berhasil diganti!');
    }
    saveState(); render(); syncReminder();
    els.profileDialog.close();
  });

  // Custom workspace dropdown toggle
  els.wsDropdownTrigger && els.wsDropdownTrigger.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = els.wsDropdownTrigger.getAttribute('aria-expanded') === 'true';
    isOpen ? closeWsDropdown() : openWsDropdown();
  });

  // Profile bubble toggle
  els.profileBubbleTrigger && els.profileBubbleTrigger.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = els.profileBubbleMenu.classList.contains('hidden');
    els.profileBubbleMenu.classList.toggle('hidden', !isOpen);
    els.profileBubbleTrigger.classList.toggle('open', isOpen);
  });

  els.wsDropdownPanel && els.wsDropdownPanel.addEventListener('click', e => e.stopPropagation());
  els.profileBubbleMenu && els.profileBubbleMenu.addEventListener('click', e => e.stopPropagation());

  // Close dropdowns on outside click
  document.addEventListener('click', () => {
    closeWsDropdown();
    if (els.profileBubbleMenu) {
      els.profileBubbleMenu.classList.add('hidden');
      els.profileBubbleTrigger.classList.remove('open');
    }
  });

  // Workspace Settings
  els.workspaceSettingsButton && els.workspaceSettingsButton.addEventListener('click', openRoomSettings);

  els.roomSettingsNameEditBtn && els.roomSettingsNameEditBtn.addEventListener('click', () => {
    if (els.roomSettingsNameDisplay) els.roomSettingsNameDisplay.style.display = 'none';
    els.roomSettingsNameForm.style.display = 'flex';
    els.roomSettingsNameInput.focus();
    els.roomSettingsNameInput.select();
  });

  els.roomSettingsNameForm && els.roomSettingsNameForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const ws = getActiveWorkspace(); if (!ws) return;
    const newName = els.roomSettingsNameInput.value.trim();
    if (!newName || newName === ws.name) return;
    ws.name = newName;
    saveState(); render();
    if (els.roomSettingsNameText) els.roomSettingsNameText.textContent = newName;
    els.roomSettingsNameForm.style.display = 'none';
    if (els.roomSettingsNameDisplay) els.roomSettingsNameDisplay.style.display = 'flex';
    showToast('Nama ruang disimpan.');
  });

  els.roomWishlistForm && els.roomWishlistForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const ws = getActiveWorkspace(); if (!ws) return;
    const name = els.roomWishlistNameInput.value.trim();
    const price = parseAmount(els.roomWishlistPriceInput.value);
    if (!name || price <= 0) return;
    if (!ws.wishlist) ws.wishlist = [];
    ws.wishlist.push({ id: createId('wish'), name, price, createdAt: new Date().toISOString() });
    els.roomWishlistNameInput.value = '';
    els.roomWishlistPriceInput.value = '';
    saveState(); render(); renderRoomWishlist(ws); updateWishlistBanner();
    showToast('Wishlist ditambahkan.');
  });

  els.roomWishlistList && els.roomWishlistList.addEventListener('click', (e) => {
    const btn = e.target.closest('.wishlist-remove'); if (!btn) return;
    const ws = getActiveWorkspace(); if (!ws) return;
    ws.wishlist = (ws.wishlist || []).filter(w => w.id !== btn.dataset.id);
    saveState(); render(); renderRoomWishlist(ws); updateWishlistBanner();
  });

  els.wishlistAchievedClose && els.wishlistAchievedClose.addEventListener('click', () => {
    const ws = getActiveWorkspace(); if (!ws) return;
    const achieved = getAchievedWishlist(ws);
    const dismiss = readWishlistDismissals();
    const today = new Date().toISOString().slice(0, 10);
    achieved.forEach(w => { dismiss[w.id] = today; });
    localStorage.setItem(WISHLIST_DISMISS_KEY, JSON.stringify(dismiss));
    els.wishlistAchievedBanner.classList.add('hidden');
  });

  els.roomSettingsResetBtn && els.roomSettingsResetBtn.addEventListener('click', () => {
    const ws = getActiveWorkspace(); if (!ws) return;
    openConfirm('Reset chat ruang?', 'Semua isi chat di ruang "' + ws.name + '" (pendapatan, pengeluaran, dan arsip) akan dihapus. Tabungan privat tetap aman.', 'Ya, reset', () => {
      ws.transactions = [];
      saveState(); render();
      showToast('Chat ruang telah di-reset.');
    });
  });

  els.roomSettingsDeleteBtn && els.roomSettingsDeleteBtn.addEventListener('click', () => {
    const ws = getActiveWorkspace(); if (!ws) return;
    openConfirm('Hapus ruang ini?', 'Ruang "' + ws.name + '" beserta semua catatannya akan dihapus permanen untuk semua anggota.', 'Ya, hapus', () => {
      deleteWorkspace(ws.id);
    });
  });

  els.confirmDialogOk && els.confirmDialogOk.addEventListener('click', () => {
    els.confirmDialog.close();
    const cb = confirmAction; confirmAction = null;
    if (cb) cb();
  });
  els.confirmDialogCancel && els.confirmDialogCancel.addEventListener('click', () => { confirmAction = null; });

  els.trxMenuEdit && els.trxMenuEdit.addEventListener('click', () => {
    const t = findTrxById(contextTargetId);
    closeTrxMenu();
    if (t) openEditTransaction(t);
  });
  els.trxMenuDelete && els.trxMenuDelete.addEventListener('click', () => {
    const t = findTrxById(contextTargetId);
    closeTrxMenu();
    if (!t) return;
    openConfirm('Hapus catatan ini?', 'Catatan "' + t.note + '" sebesar ' + formatCurrency(t.amount) + ' akan dihapus permanen.', 'Hapus', () => {
      const ws = getActiveWorkspace(); if (!ws) return;
      ws.transactions = ws.transactions.filter(x => x.id !== t.id);
      saveState(); render();
      showToast('Catatan dihapus.');
    });
  });
  document.addEventListener('click', (e) => {
    if (els.trxMenu && !els.trxMenu.contains(e.target)) {
      if (Date.now() - trxMenuOpenedAt > 350) closeTrxMenu();
    }
  });
  els.editTypeOptions.forEach(b => b.addEventListener('click', () => { editType = b.dataset.type; renderEditTypeSwitch(); }));
  els.editTransactionForm && els.editTransactionForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const t = findTrxById(editingTrxId); const ws = getActiveWorkspace();
    if (!t || !ws) return;
    const note = els.editNoteInput.value.trim();
    const amount = parseAmount(els.editAmountInput.value);
    if (!note || amount <= 0) return;
    t.note = note; t.amount = amount; t.type = editType;
    if (editType === 'saving') { t.periodId = null; t.privateOwnerEmail = state.currentEmail; }
    else { t.periodId = ws.activePeriodId; t.privateOwnerEmail = null; }
    saveState(); render(); els.editTransactionDialog.close();
    showToast('Catatan diperbarui.');
  });
  els.editTransactionDialog && els.editTransactionDialog.addEventListener('close', () => { editingTrxId = null; });
}

function beginNewAccount(email) {
  if (!email) return;
  state.currentEmail = email;
  els.onboardNameInput.value = email.split('@')[0];
  const p = new URLSearchParams(window.location.search);
  if (p.get('inviteId')) {
    sessionStorage.setItem('pendingInviteId', p.get('inviteId'));
    sessionStorage.setItem('pendingInviteName', p.get('inviteName') || '');
    window.history.replaceState({}, document.title, window.location.pathname);
  }
  showStep('profile');
}

function render() {
  if (!state.currentEmail || !state.users[state.currentEmail]) return;
  ensureActiveWorkspace();
  renderAccount(); renderWorkspaces(); renderMembers(); renderHeader(); renderTotals(); renderTypeSwitch(); renderFeed();
}

function renderAccount() {
  const user = state.users[state.currentEmail]; if (!user) return;
  els.userName.textContent = user.name;
  if (els.userEmail) els.userEmail.textContent = user.email;
  const el = document.getElementById('userInitials');
  if (el) {
    if (user.avatarUrl) { el.style.backgroundImage = 'url(' + user.avatarUrl + ')'; el.textContent = ''; }
    else { el.style.backgroundImage = 'none'; el.textContent = initials(user.name || user.email); }
  }
}

function renderWorkspaces() {
  const wss = getUserWorkspaces();
  // Sync hidden native select (used for JS compat)
  els.workspaceSelect.innerHTML = '';
  wss.forEach(ws => { const o = document.createElement('option'); o.value = ws.id; o.textContent = ws.name; els.workspaceSelect.append(o); });
  if (state.activeWorkspaceId) els.workspaceSelect.value = state.activeWorkspaceId;

  // Render custom dropdown options
  if (els.wsDropdownList) {
    els.wsDropdownList.innerHTML = '';
    wss.forEach(ws => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'ws-option' + (ws.id === state.activeWorkspaceId ? ' active' : '');
      const shared = (ws.members || []).length > 1;
      const owner = state.users[ws.ownerEmail];
      const sub = shared
        ? (owner && owner.email !== state.currentEmail ? 'Bersama dengan ' + owner.name : 'Bersama')
        : 'Pribadi';
      btn.innerHTML = '<span class="ws-option-text">' + escapeHtml(ws.name) + '<small class="ws-sub">' + escapeHtml(sub) + '</small></span>' + '<svg class="ws-check" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>';
      btn.addEventListener('click', () => {
        state.activeWorkspaceId = ws.id;
        saveState(); render(); closeWsDropdown();
        els.mainView.classList.remove('mobile-sidebar-open');
      });
      els.wsDropdownList.append(btn);
    });
  }
  // Update trigger label
  const active = wss.find(w => w.id === state.activeWorkspaceId);
  if (els.wsDropdownLabel) els.wsDropdownLabel.textContent = active ? active.name : 'Pilih ruang...';
}

function openWsDropdown() {
  els.wsDropdownPanel.classList.remove('hidden');
  els.wsDropdownTrigger.setAttribute('aria-expanded', 'true');
}
function closeWsDropdown() {
  els.wsDropdownPanel.classList.add('hidden');
  els.wsDropdownTrigger.setAttribute('aria-expanded', 'false');
}


function renderMembers() {
  const ws = getActiveWorkspace(); if (!ws) return;
  els.memberCount.textContent = String(ws.members.length); els.memberList.innerHTML = '';
  ws.members.forEach(email => {
    const user = state.users[email]; const item = document.createElement('div');
    item.className = 'member-chip'; item.style.position = 'relative';
    let av = '<span class="mini-avatar">' + escapeHtml(initials(user?.name || email)) + '</span>';
    if (user?.avatarUrl) av = '<span class="mini-avatar" style="background-image:url(' + user.avatarUrl + ');background-size:cover;background-position:center"></span>';
    let waHtml = '';
    if (user?.wa) {
      let n = user.wa.replace(/\D/g, ''); if (n.startsWith('0')) n = '62' + n.slice(1);
      waHtml = '<a href="https://wa.me/' + n + '" target="_blank" style="position:absolute;right:8px;top:50%;transform:translateY(-50%);color:#25D366"><svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg></a>';
    }
    let roleHtml = user?.role ? ' \u2022 <i>' + escapeHtml(user.role) + '</i>' : '';
    item.innerHTML = av + '<span>' + escapeHtml(user?.name || email) + roleHtml + '<br><small>' + escapeHtml(email) + '</small></span>' + waHtml;
    els.memberList.append(item);
  });
}

function openRoomSettings() {
  const ws = getActiveWorkspace(); if (!ws) return;
  if (els.roomSettingsNameText) els.roomSettingsNameText.textContent = ws.name;
  els.roomSettingsNameInput.value = ws.name;
  els.roomSettingsNameForm.style.display = 'none';
  if (els.roomSettingsNameDisplay) els.roomSettingsNameDisplay.style.display = 'flex';
  renderRoomSettingsMembers(ws);
  renderRoomWishlist(ws);
  if (typeof els.roomSettingsDialog.showModal === 'function') els.roomSettingsDialog.showModal();
}

function renderRoomSettingsMembers(ws) {
  if (!els.roomSettingsMemberList) return;
  els.roomSettingsMemberCount.textContent = String(ws.members.length);
  els.roomSettingsMemberList.innerHTML = '';
  ws.members.forEach(email => {
    const user = state.users[email];
    const item = document.createElement('div');
    item.className = 'member-chip';
    let av = '<span class="mini-avatar">' + escapeHtml(initials(user?.name || email)) + '</span>';
    if (user?.avatarUrl) av = '<span class="mini-avatar" style="background-image:url(' + user.avatarUrl + ');background-size:cover;background-position:center"></span>';
    const roleHtml = user?.role ? ' \u2022 <i>' + escapeHtml(user.role) + '</i>' : '';
    item.innerHTML = av + '<span>' + escapeHtml(user?.name || email) + roleHtml + '<br><small>' + escapeHtml(email) + '</small></span>';
    els.roomSettingsMemberList.append(item);
  });
}

function renderRoomWishlist(ws) {
  if (!els.roomWishlistList) return;
  els.roomWishlistList.innerHTML = '';
  const items = ws.wishlist || [];
  if (!items.length) {
    const e = document.createElement('div');
    e.style.cssText = 'padding:8px;font-size:0.8rem;color:var(--muted);';
    e.textContent = 'Belum ada wishlist.';
    els.roomWishlistList.append(e);
    return;
  }
  items.forEach(w => {
    const item = document.createElement('div');
    item.className = 'wishlist-item';
    item.innerHTML = '<span>' + escapeHtml(w.name) + '</span><span class="wishlist-price">' + formatCurrency(w.price) + '</span><button class="wishlist-remove" data-id="' + escapeHtml(w.id) + '" type="button" title="Hapus">&times;</button>';
    els.roomWishlistList.append(item);
  });
}

const WISHLIST_DISMISS_KEY = 'aifa.wishlist.dismissed';

function getAchievedWishlist(ws) {
  if (!ws || !Array.isArray(ws.wishlist) || !state.currentEmail) return [];
  const tot = calculateTotals(ws);
  return ws.wishlist.filter(w => w.price > 0 && tot.saving >= w.price);
}

function readWishlistDismissals() {
  try { return JSON.parse(localStorage.getItem(WISHLIST_DISMISS_KEY) || '{}'); } catch { return {}; }
}

function updateWishlistBanner() {
  if (!els.wishlistAchievedBanner || !state.currentEmail) return;
  const ws = getActiveWorkspace();
  const achieved = getAchievedWishlist(ws);
  const today = new Date().toISOString().slice(0, 10);
  const dismiss = readWishlistDismissals();
  let shown = null;
  for (const item of achieved) {
    if (dismiss[item.id] !== today) { shown = item; break; }
  }
  if (!shown) {
    els.wishlistAchievedBanner.classList.add('hidden');
    return;
  }
  els.wishlistAchievedText.textContent = 'Selamat, tabungan anda mencapai wishlist ' + shown.name + '!';
  els.wishlistAchievedBanner.classList.remove('hidden');
}

function deleteWorkspace(id) {
  const ws = state.workspaces[id];
  deleteDoc(doc(db, 'workspaces', id)).catch(err => {
    console.error('deleteWorkspace error:', err);
    if (ws) state.workspaces[id] = ws;
    if (els.roomSettingsDialog && els.roomSettingsDialog.open) els.roomSettingsDialog.close();
    render();
    showToast('Gagal menghapus ruang: ' + (err.code || err.message));
  });
  delete state.workspaces[id];
  if (state.activeWorkspaceId === id) state.activeWorkspaceId = null;
  const remaining = getUserWorkspaces();
  if (remaining.length) state.activeWorkspaceId = remaining[0].id;
  saveState(); render();
  if (els.roomSettingsDialog && els.roomSettingsDialog.open) els.roomSettingsDialog.close();
  showToast('Ruang dihapus.');
}

function openConfirm(title, message, okLabel, callback) {
  if (!els.confirmDialog) return;
  els.confirmDialogTitle.textContent = title;
  els.confirmDialogMessage.textContent = message;
  if (els.confirmDialogOk) els.confirmDialogOk.textContent = okLabel || 'Ya';
  confirmAction = callback;
  els.confirmDialog.showModal();
}

function renderHeader() {
  const ws = getActiveWorkspace(); if (!ws) return;
  const p = getActivePeriod(ws);
  const title = 'Ruang ' + ws.name;
  document.querySelectorAll('#workspaceTitle').forEach(el => el.textContent = title);
  els.periodLabel.textContent = p ? 'Periode aktif sejak ' + formatDate(p.startedAt) : 'Periode aktif';
}

function renderTotals() {
  const ws = getActiveWorkspace(); if (!ws) return;
  const t = calculateTotals(ws);
  els.incomeTotal.forEach(el => el.textContent = formatSummaryCurrency(t.income - t.expense));
  els.expenseTotal.forEach(el => el.textContent = formatSummaryCurrency(t.expense));
  els.balanceTotal.forEach(el => el.textContent = formatSummaryCurrency(t.income - t.expense));
  els.savingTotal.forEach(el => el.textContent = showSavings ? formatSummaryCurrency(t.saving) : '***');
}

function renderTypeSwitch() {
  els.switchOptions.forEach(b => b.classList.toggle('active', b.dataset.type === selectedType));
  const ph = { expense: 'Contoh: makan siang, bensin', income: 'Contoh: gaji, bonus', saving: 'Contoh: tabung motor' }[selectedType];
  els.transactionNoteInput.placeholder = ph;
}

function checkPaydayAlert(ws) {
  if (!els.paydayAlertContainer) return;
  const payday = state.users[state.currentEmail]?.payday;
  if (!payday) { els.paydayAlertContainer.classList.add('hidden'); return; }
  const p = getActivePeriod(ws); const now = new Date();
  let rd = new Date(now.getFullYear(), now.getMonth(), payday);
  if (now.getDate() < payday) rd.setMonth(rd.getMonth() - 1);
  if (p && new Date(p.startedAt) < rd) els.paydayAlertContainer.classList.remove('hidden');
  else els.paydayAlertContainer.classList.add('hidden');
}

function renderFeed() {
  const ws = getActiveWorkspace(); if (!ws) return;
  checkPaydayAlert(ws);
  updateWishlistBanner();
  const txs = ws.transactions.filter(t => t.type !== 'saving' && t.periodId === ws.activePeriodId).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  els.chatFeed.innerHTML = '';
  if (!txs.length) { const e = document.createElement('div'); e.className = 'empty-state'; e.textContent = 'Belum ada catatan.'; els.chatFeed.append(e); return; }
  const f = document.createDocumentFragment();
  txs.forEach(t => { f.append(createTransactionBubble(t)); });
  els.chatFeed.append(f); scrollFeedToBottom();
}

function renderArchive() {
  const ws = getActiveWorkspace(); if (!ws) return;
  els.archiveFeed.innerHTML = '';
  const txs = ws.transactions.filter(t => t.type !== 'saving' && t.periodId !== ws.activePeriodId).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  const recap = document.createElement('div');
  recap.className = 'archive-recap';
  const tot = calculateAllTotals(ws);
  recap.innerHTML = '<div class="archive-recap-title">Rekapan Semua Catatan</div>'
    + '<div class="archive-recap-grid">'
    + '<div class="archive-recap-item income-text"><span>Pemasukan</span><strong>' + formatCurrency(tot.income) + '</strong></div>'
    + '<div class="archive-recap-item expense-text"><span>Pengeluaran</span><strong>' + formatCurrency(tot.expense) + '</strong></div>'
    + '<div class="archive-recap-item saving-text"><span>Tabungan</span><strong>' + (showSavings ? formatCurrency(tot.saving) : '***') + '</strong></div>'
    + '</div>';
  els.archiveFeed.append(recap);
  if (!txs.length) { const e = document.createElement('div'); e.className = 'empty-state'; e.textContent = 'Belum ada catatan dari periode sebelumnya.'; els.archiveFeed.append(e); els.archiveFeed.scrollTop = els.archiveFeed.scrollHeight; return; }
  const f = document.createDocumentFragment();
  txs.forEach(t => { f.append(createTransactionBubble(t)); });
  els.archiveFeed.append(f); els.archiveFeed.scrollTop = els.archiveFeed.scrollHeight;
}

function calculateAllTotals(ws) {
  return (ws.transactions || []).reduce((tot, t) => {
    if (t.type === 'income') tot.income += t.amount;
    if (t.type === 'expense') tot.expense += t.amount;
    if (t.type === 'saving' && t.privateOwnerEmail === state.currentEmail) tot.saving += t.amount;
    return tot;
  }, { income: 0, expense: 0, saving: 0 });
}

function createTransactionBubble(t) {
  const author = state.users[t.actorEmail];
  const msg = document.createElement('article');
  const mine = t.actorEmail === state.currentEmail;
  let av = '<span class="mini-avatar">' + escapeHtml(initials(author?.name || t.actorEmail)) + '</span>';
  if (author?.avatarUrl) av = '<span class="mini-avatar" style="background-image:url(' + author.avatarUrl + ');background-size:cover;background-position:center"></span>';
  msg.className = 'message' + (mine ? ' mine' : '');
  msg.innerHTML = av + '<div class="bubble"><div class="bubble-header"><strong>' + escapeHtml(author?.name || t.actorEmail) + '</strong><span>' + formatTime(t.createdAt) + '</span></div><div>' + escapeHtml(t.note) + '</div><div class="bubble-total"><span class="tag ' + t.type + '">' + TYPE_LABELS[t.type] + '</span><span>' + formatCurrency(t.amount) + '</span></div></div>';
  if (mine) {
    msg.dataset.id = t.id;
    msg.addEventListener('contextmenu', (e) => { e.preventDefault(); openTrxMenu(t.id, e.clientX, e.clientY); });
    msg.addEventListener('touchstart', (e) => {
      if (e.touches.length !== 1) return;
      clearTimeout(longPressTimer);
      longPressTimer = setTimeout(() => {
        const p = e.touches[0];
        openTrxMenu(t.id, p.clientX, p.clientY);
        try { e.preventDefault(); } catch (err) { /* noop */ }
      }, 500);
    }, { passive: false });
    msg.addEventListener('touchmove', () => clearTimeout(longPressTimer));
    msg.addEventListener('touchend', () => clearTimeout(longPressTimer));
    msg.addEventListener('touchcancel', () => clearTimeout(longPressTimer));
  }
  return msg;
}

function findTrxById(id) {
  const ws = getActiveWorkspace(); if (!ws) return null;
  return (ws.transactions || []).find(x => x.id === id) || null;
}

function openTrxMenu(id, x, y) {
  if (!els.trxMenu) return;
  contextTargetId = id;
  const menu = els.trxMenu;
  menu.classList.remove('hidden');
  trxMenuOpenedAt = Date.now();
  menu.style.left = '0px';
  menu.style.top = '0px';
  const mw = menu.offsetWidth || 140, mh = menu.offsetHeight || 88;
  const vw = window.innerWidth, vh = window.innerHeight;
  menu.style.left = Math.max(8, Math.min(x, vw - mw - 8)) + 'px';
  menu.style.top = Math.max(8, Math.min(y, vh - mh - 8)) + 'px';
}

function closeTrxMenu() {
  if (els.trxMenu) els.trxMenu.classList.add('hidden');
  contextTargetId = null;
}

function openEditTransaction(t) {
  if (!els.editTransactionDialog) return;
  editingTrxId = t.id;
  editType = t.type;
  els.editNoteInput.value = t.note || '';
  els.editAmountInput.value = t.amount > 0 ? formatPlainNumber(t.amount) : '';
  renderEditTypeSwitch();
  els.editTransactionDialog.showModal();
}

function renderEditTypeSwitch() {
  els.editTypeOptions.forEach(b => b.classList.toggle('active', b.dataset.type === editType));
}

function refreshWorkspace(ws) {
  const op = getActivePeriod(ws); if (op) op.endedAt = new Date().toISOString();
  const np = { id: createId('period'), label: 'Periode ' + (ws.periods.length + 1), startedAt: new Date().toISOString(), endedAt: null };
  ws.periods.push(np); ws.activePeriodId = np.id;
  saveState(); render(); showToast('Periode baru dimulai. Tabungan privat tetap tersimpan.');
}

function calculateTotals(ws) {
  return ws.transactions.reduce((tot, t) => {
    if (t.type === 'saving' && t.privateOwnerEmail === state.currentEmail) { tot.saving += t.amount; return tot; }
    if (t.type === 'income') { tot.income += t.amount; return tot; }
    if (t.periodId !== ws.activePeriodId) return tot;
    if (t.type === 'expense') tot.expense += t.amount;
    return tot;
  }, { income: 0, expense: 0, saving: 0 });
}

function ensureActiveWorkspace() {
  const wss = getUserWorkspaces(); if (!wss.length) return;
  if (!wss.some(w => w.id === state.activeWorkspaceId)) state.activeWorkspaceId = wss[0].id;
}

function createWorkspace(name, ownerEmail) {
  if (getUserWorkspaces().length >= MAX_ROOMS) {
    showToast('Maksimal ' + MAX_ROOMS + ' ruang per akun.');
    return null;
  }
  const fp = { id: createId('period'), label: 'Periode 1', startedAt: new Date().toISOString(), endedAt: null };
  const ws = { id: createId('room'), name, ownerEmail, members: [ownerEmail], invites: [], activePeriodId: fp.id, periods: [fp], transactions: [], createdAt: new Date().toISOString() };
  state.workspaces[ws.id] = ws;
  setDoc(doc(db, 'workspaces', ws.id), ws).catch((err) => {
    console.error('createWorkspace error:', err);
    delete state.workspaces[ws.id];
    if (state.activeWorkspaceId === ws.id) state.activeWorkspaceId = null;
    render();
    showToast('Gagal menyimpan ruang ke server: ' + (err.code || err.message));
  });
  return ws;
}

function getUserWorkspaces() { return !state.currentEmail ? [] : Object.values(state.workspaces).filter(w => (w.members || []).includes(state.currentEmail)); }
function getActiveWorkspace() { return state.workspaces[state.activeWorkspaceId] || null; }
function getActivePeriod(ws) { return ws.periods.find(p => p.id === ws.activePeriodId) || null; }

function loadState() {
  try {
    const local = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    return { ...JSON.parse(JSON.stringify(DEFAULT_DATA)), currentEmail: local.currentEmail || null, activeWorkspaceId: local.activeWorkspaceId || null };
  } catch { return JSON.parse(JSON.stringify(DEFAULT_DATA)); }
}

function saveState() {
  if (demoMode) return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ currentEmail: state.currentEmail, activeWorkspaceId: state.activeWorkspaceId }));
  if (state.currentEmail && state.users[state.currentEmail]) setDoc(doc(db, 'users', state.currentEmail), state.users[state.currentEmail]).catch(console.error);
  if (state.activeWorkspaceId && state.workspaces[state.activeWorkspaceId]) setDoc(doc(db, 'workspaces', state.activeWorkspaceId), state.workspaces[state.activeWorkspaceId]).catch(console.error);
}

function setupInstallBanner() {
  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

  if (isStandalone) return; // Already installed, don't show anything

  if (isIos) {
    // iOS doesn't support beforeinstallprompt — show manual guide
    if (!localStorage.getItem('iosBannerDismissed')) {
      setTimeout(() => {
        els.iosBanner.classList.remove('hidden');
        setTimeout(() => els.iosBanner.classList.add('show'), 50);
      }, 3000);
    }
    els.closeIosBanner && els.closeIosBanner.addEventListener('click', () => {
      els.iosBanner.classList.remove('show');
      setTimeout(() => els.iosBanner.classList.add('hidden'), 300);
      localStorage.setItem('iosBannerDismissed', 'true');
    });
  } else {
    // Android / Desktop: use native install prompt
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
      if (!localStorage.getItem('installBannerDismissed')) {
        els.installBanner.classList.remove('hidden');
        setTimeout(() => els.installBanner.classList.add('show'), 100);
      }
    });
  }
}

function normalizeEmail(v) { return v.trim().toLowerCase(); }

// ── Daily reminder ──
function openReminderDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('aifa-reminder', 1);
    req.onupgradeneeded = () => { if (!req.result.objectStoreNames.contains('kv')) req.result.createObjectStore('kv'); };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
function reminderPut(key, value) {
  return openReminderDB().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction('kv', 'readwrite');
    tx.objectStore('kv').put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  })).catch(() => {});
}
function reminderGet(key) {
  return openReminderDB().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction('kv', 'readonly');
    const req = tx.objectStore('kv').get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  })).catch(() => null);
}
function reminderConfig() {
  const user = state.users[state.currentEmail];
  return { enabled: !!(user && user.reminder && user.reminder.enabled), time: (user && user.reminder && user.reminder.time) || '', email: state.currentEmail || '' };
}
function syncReminder() {
  const cfg = reminderConfig();
  reminderPut('config', cfg);
  if (cfg.enabled) {
    if ('Notification' in window && Notification.permission === 'granted') {
      registerPeriodicSync();
      showToast('Pengingat harian aktif.');
    } else {
      requestNotificationPermission();
    }
  } else {
    showToast('Pengingat harian dimatikan.');
  }
}
function refreshReminderConfig() {
  const cfg = reminderConfig();
  reminderPut('config', cfg);
  if (cfg.enabled && 'Notification' in window && Notification.permission === 'granted') registerPeriodicSync();
}
function requestNotificationPermission() {
  if (!('Notification' in window)) { showToast('Browser ini tidak mendukung notifikasi.'); return; }
  Notification.requestPermission().then(perm => {
    if (perm === 'granted') { registerPeriodicSync(); showToast('Notifikasi diizinkan. Pengingat harian aktif.'); }
    else { showToast('Izin notifikasi ditolak. Nyalakan lewat pengaturan browser.'); }
  }).catch(() => {});
}
async function registerPeriodicSync() {
  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.ready;
      if (reg.periodicSync) await reg.periodicSync.register('daily-reminder', { minInterval: 24 * 60 * 60 * 1000 });
    }
  } catch (err) { /* not supported or not installed */ }
}
function startReminderScheduler() {
  if (!('Notification' in window)) return;
  setInterval(checkDailyReminder, 30000);
}
function checkDailyReminder() {
  const user = state.users[state.currentEmail];
  if (!user || !user.reminder || !user.reminder.enabled || !user.reminder.time) return;
  if (Notification.permission !== 'granted') return;
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const hhmm = now.toTimeString().slice(0, 5);
  if (hhmm !== user.reminder.time) return;
  const lastKey = 'aifa.reminder.last.' + state.currentEmail;
  if (localStorage.getItem(lastKey) === today) return;
  localStorage.setItem(lastKey, today);
  showDailyNotification();
}
function showDailyNotification() {
  const ws = getActiveWorkspace();
  const body = ws ? 'Catat pengeluaran hari ini di ruang "' + ws.name + '" agar tidak lupa!' : 'Catat pengeluaran hari ini agar tidak lupa!';
  const opts = { body, icon: './icon-192.png', badge: './icon-192.png', tag: 'aifa-daily' };
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.ready.then(reg => reg.showNotification('AiFa - Jangan lupa catat!', Object.assign({}, opts, { data: { url: location.origin + location.pathname } }))).catch(() => {});
  } else if ('Notification' in window) {
    try { new Notification('AiFa - Jangan lupa catat!', opts); } catch (err) { /* noop */ }
  }
}
function parseAmount(v) { return Number(String(v).replace(/[^\d]/g, '') || 0); }
function formatPlainNumber(v) { return new Intl.NumberFormat('id-ID').format(v); }
function formatCurrency(v) { return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(v); }
function formatSummaryCurrency(v) {
  if (v === 0) return '0'; const a = Math.abs(v);
  if (a >= 1e6) { const x = v / 1e6; return (Number.isInteger(x) ? x : x.toFixed(1)) + 'jt'; }
  if (a >= 1e3) { const x = v / 1e3; return (Number.isInteger(x) ? x : x.toFixed(1)) + 'k'; }
  return String(v);
}
function formatDate(v) { return new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(v)); }
function formatTime(v) { return new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit' }).format(new Date(v)); }
function initials(v) { return String(v).split(/[\s@._-]+/).filter(Boolean).slice(0, 2).map(p => p[0].toUpperCase()).join(''); }
function createId(prefix) { return prefix + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 9); }
function escapeHtml(v) { return String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;'); }
function scrollFeedToBottom() {
  if (!els.chatFeed) return;
  els.chatFeed.scrollTop = els.chatFeed.scrollHeight;
  requestAnimationFrame(() => { els.chatFeed.scrollTop = els.chatFeed.scrollHeight; });
}
let toastTimer = null;

function showToast(msg) {
  els.toast.textContent = msg;
  els.toast.classList.remove('hiding');
  els.toast.classList.remove('hidden');
  void els.toast.offsetWidth;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    els.toast.classList.add('hiding');
    setTimeout(() => els.toast.classList.add('hidden'), 600);
  }, 2200);
}