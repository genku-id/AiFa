import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js';
import { getFirestore, doc, getDoc, onSnapshot, setDoc, updateDoc, deleteDoc, arrayUnion, arrayRemove, collection, query, where, orderBy, deleteField } from 'https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js';
import { getAuth, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendEmailVerification, sendPasswordResetEmail, fetchSignInMethodsForEmail, applyActionCode, signOut as authSignOut, deleteUser, reauthenticateWithCredential, EmailAuthProvider } from 'https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js';

const firebaseConfig = { apiKey: 'AIzaSyCxMQNFI35QS2qE4TbUDi14rQ5LfJuthAw', authDomain: 'gen-lang-client-0513521672.firebaseapp.com', projectId: 'gen-lang-client-0513521672', storageBucket: 'gen-lang-client-0513521672.firebasestorage.app', messagingSenderId: '358176864493', appId: '1:358176864493:web:24591e445aa4fe8612f4e4' };
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const STORAGE_KEY = 'aifa.finance.v2';
const DEFAULT_DATA = { users: {}, workspaces: {}, messages: {}, currentEmail: null, activeWorkspaceId: null };
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
let firebaseSignedIn = false;
let demoMode = false;
const DEMO_EMAIL = 'fulan@demo.aifa';
let confirmAction = null;
let periodRecoveryPrompted = false;
let longPressTimer = null;
let contextTargetId = null;
let editingTrxId = null;
let editingChatId = null;
let contextKind = 'finance';
let composerMode = localStorage.getItem('aifa.composer.mode') === 'chat' ? 'chat' : 'finance';
let modeMenuOpenedAt = 0;
let editType = 'expense';
let trxMenuOpenedAt = 0;
let unsubWorkspaces = null;
let messageSubs = {};
let userSubs = {};
let migratedWs = new Set();
const els = {
  authView: document.querySelector('#authView'), mainView: document.querySelector('#mainView'),
  stepAuth: document.querySelector('#stepAuth'), stepProfile: document.querySelector('#stepProfile'), stepWorkspace: document.querySelector('#stepWorkspace'),
  loginForm: document.querySelector('#loginForm'), emailInput: document.querySelector('#emailInput'), passwordInput: document.querySelector('#passwordInput'), loginError: document.querySelector('#loginError'), forgotPasswordLink: document.querySelector('#forgotPasswordLink'),
  signupButton: document.querySelector('#signupButton'),
  newAccountDialog: document.querySelector('#newAccountDialog'),
  newAccountTitle: document.querySelector('#newAccountTitle'),
  newAccountNotFound: document.querySelector('#newAccountNotFound'),
  newAccountEmailField: document.querySelector('#newAccountEmailField'),
  newAccountEmailInput: document.querySelector('#newAccountEmailInput'),
  verifyBanner: document.querySelector('#verifyBanner'),
  verifyBannerText: document.querySelector('#verifyBannerText'),
  resendVerifyBtn: document.querySelector('#resendVerifyBtn'),
  closeVerifyBanner: document.querySelector('#closeVerifyBanner'),
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
  modeDotsBtn: document.querySelector('#modeDotsBtn'), modeMenu: document.querySelector('#modeMenu'), modeMenuItems: [...document.querySelectorAll('.mode-menu-item')],
  composerFinanceTypes: document.querySelector('#composerFinanceTypes'), composerFinanceInputs: document.querySelector('#composerFinanceInputs'), composerChatBox: document.querySelector('#composerChatBox'), chatInput: document.querySelector('#chatInput'),
  editChatDialog: document.querySelector('#editChatDialog'), editChatForm: document.querySelector('#editChatForm'), editChatInput: document.querySelector('#editChatInput'),
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
  profileCurPasswordInput: document.querySelector('#profileCurPasswordInput'), profileNewPasswordInput: document.querySelector('#profileNewPasswordInput'), profileNewPassword2Input: document.querySelector('#profileNewPassword2Input'), profileDeleteBtn: document.querySelector('#profileDeleteBtn'),
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
  handleVerifyEmailFromUrl();
  onAuthStateChanged(auth, (u) => {
    if (u) { firebaseSignedIn = true; }
    refreshVerifyBanner();
  });
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
  Object.values(messageSubs).forEach(u => u());
  Object.values(userSubs).forEach(u => u());
  messageSubs = {};
  userSubs = {};
  state.messages = {};
  const wq = query(collection(db, 'workspaces'), where('members', 'array-contains', state.currentEmail));
  unsubWorkspaces = onSnapshot(wq, (snap) => {
    snap.docChanges().forEach((ch) => {
      if (ch.type === 'added' || ch.type === 'modified') { const d = ch.doc.data(); if (!d.id) d.id = ch.doc.id; state.workspaces[ch.doc.id] = d; migrateLegacyChat(state.workspaces[ch.doc.id]); }
      if (ch.type === 'removed') delete state.workspaces[ch.doc.id];
    });
    resubscribeMessages();
    resubscribeUsers();
    render();
  }, (err) => {
    console.error('Gagal memuat ruang:', err);
    showToast('Gagal memuat ruang dari server. Cek koneksi & izin Firestore.');
  });
  resubscribeUsers();
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
    return { id, name, ownerEmail, members, invites: [], activePeriodId: p3.id, periods: [p1, p2, p3], transactions: [], chat: [], createdAt: new Date(now - 70 * day).toISOString(), wishlist: [] };
  }
  function chatMsg(text, actor, offsetDays) {
    return { id: 'd' + Math.random().toString(36).slice(2, 10), text, actorEmail: actor.email, createdAt: new Date(now - offsetDays * day).toISOString() };
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
  r2.chat = [
    chatMsg('Sayang, gajian sudah masuk ya', fulan, 1),
    chatMsg('Alhamdulillah! Aku nabung buat liburan bulan depan', fulanah, 1),
    chatMsg('Siap, tabungan liburan sudah aku tambah 1 juta', fulan, 0.8),
    chatMsg('Oke, nanti malam aku belanja bulanan', fulanah, 0.5),
  ];

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
  r3.chat = [
    chatMsg('Iuran kebersihan bulan ini sudah terkumpul ya', fulanati, 2),
    chatMsg('Iuran keamanan aman dipegang, minggu ini ada perbaikan pos ronda', ful, 1.5),
    chatMsg('Makasih semua, saya catat di sini biar transparan', fulan, 1),
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
  Object.values(messageSubs).forEach(u => u());
  Object.values(userSubs).forEach(u => u());
  unsubWorkspaces = null; messageSubs = {}; userSubs = {};
  state.messages = {};
  if (els.demoBanner) els.demoBanner.classList.remove('hidden');
  if (els.verifyBanner) els.verifyBanner.classList.add('hidden');
  showStep('dashboard'); render();
  showToast('Mode demo diaktifkan. Data tidak tersimpan.');
}

function exitDemo() {
  demoMode = false;
  if (els.demoBanner) els.demoBanner.classList.add('hidden');
  if (els.verifyBanner) els.verifyBanner.classList.add('hidden');
  Object.assign(state, { currentEmail: null, activeWorkspaceId: null, users: {}, workspaces: {}, messages: {} });
  showSavings = false; els.toggleSavingsButton.forEach(b => b.classList.remove('revealed'));
  periodRecoveryPrompted = false;
  saveState();
  showStep('auth');
}

function getVerifyTarget() {
  return { url: location.origin + location.pathname, handleCodeInApp: true };
}

async function ensureUserDoc(email) {
  const snap = await getDoc(doc(db, 'users', email));
  if (snap.exists()) return snap.data();
  const userObj = { email, name: email.split('@')[0], role: null, wa: null, avatarUrl: null, tier: 'free', createdAt: new Date().toISOString() };
  await setDoc(doc(db, 'users', email), userObj);
  return userObj;
}

async function trySendVerification(user) {
  try {
    await sendEmailVerification(user, getVerifyTarget());
  } catch (err) {
    if (err.code === 'auth/unauthorized-continue-uri') {
      try { await sendEmailVerification(user); } catch (e2) { throw e2; }
    } else { throw err; }
  }
}

async function sendVerificationLinkIfNeeded() {
  const u = auth.currentUser;
  if (!u || u.emailVerified) return;
  try { await trySendVerification(u); }
  catch (err) {
    if (err.code === 'auth/too-many-requests') {
      console.warn('sendVerification throttled:', err);
      showToast('Email verifikasi terlalu sering dikirim. Tunggu sebentar lalu gunakan tombol "Kirim ulang link".');
    } else {
      console.error('sendVerification error:', err);
      showToast('Gagal mengirim email verifikasi. Kamu tetap bisa pakai tombol "Kirim ulang link" nanti.');
    }
  }
}

async function migrateLegacyAccount(email, password, data) {
  try {
    await createUserWithEmailAndPassword(auth, email, password);
  } catch (err) {
    if (err.code === 'auth/invalid-email' || err.code === 'auth/operation-not-allowed') { firebaseSignedIn = false; return null; }
    if (err.code === 'auth/email-already-in-use') {
      try { await signInWithEmailAndPassword(auth, email, password); } catch (e2) { firebaseSignedIn = false; return null; }
    } else { throw err; }
  }
  firebaseSignedIn = true;
  try { await setDoc(doc(db, 'users', email), Object.assign({}, data, { migratedToFb: true }), { merge: true }); } catch (e) { console.error('markMigrated error:', e); }
  await sendVerificationLinkIfNeeded();
  return auth.currentUser;
}

function refreshVerifyBanner() {
  if (!els.verifyBanner) return;
  const u = auth.currentUser;
  if (demoMode || !u || u.emailVerified) { els.verifyBanner.classList.add('hidden'); return; }
  els.verifyBanner.classList.remove('hidden');
}

async function handleVerifyEmailFromUrl() {
  const p = new URLSearchParams(window.location.search);
  if (p.get('mode') !== 'verifyEmail') return;
  const oobCode = p.get('oobCode');
  if (!oobCode) return;
  try {
    await applyActionCode(auth, oobCode);
    if (auth.currentUser) { try { await auth.currentUser.reload(); } catch (e) {} }
    showToast('Email kamu sudah terverifikasi!');
    refreshVerifyBanner();
  } catch (err) {
    console.warn('verifyEmail action failed:', err.code || err.message);
  } finally {
    window.history.replaceState({}, document.title, window.location.pathname);
  }
}

function completeLogin(email, data) {
  state.currentEmail = email;
  state.users[email] = data;
  saveState(); subscribeToData();
  const p = new URLSearchParams(window.location.search);
  if (p.get('inviteId') && p.get('inviteName')) joinWorkspaceFromInvite(p.get('inviteId'), p.get('inviteName')).then(render);
  ensureActiveWorkspace(); showStep('dashboard'); render();
  refreshVerifyBanner();
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
      try {
        const cred = await signInWithEmailAndPassword(auth, email, password);
        firebaseSignedIn = true;
        const data = await ensureUserDoc(cred.user.email);
        completeLogin(email, data);
        if (!cred.user.emailVerified) showToast('Email belum diverifikasi. Cek inbox untuk link verifikasi.');
        return;
      } catch (fErr) {
        const legacyOnly = ['auth/invalid-credential', 'auth/user-not-found', 'auth/wrong-password', 'auth/invalid-email', 'auth/operation-not-allowed'].includes(fErr.code);
        if (!legacyOnly) {
          console.error('firebase signIn error:', fErr.code || fErr);
          if (fErr.code === 'auth/too-many-requests') {
            if (els.loginError) { els.loginError.textContent = 'Terlalu banyak percobaan. Tunggu sebentar lalu coba lagi.'; els.loginError.style.display = 'block'; }
            return;
          }
        }
      }
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
        const fbUser = await migrateLegacyAccount(email, password, data);
        completeLogin(email, data);
        if (fbUser && !fbUser.emailVerified) showToast('Akun disinkronkan. Link verifikasi dikirim ke email kamu.');
        return;
      } else {
        pendingNewAccountEmail = email;
        els.newAccountDialog.dataset.mode = 'notfound';
        els.newAccountTitle.textContent = 'Akun tidak ditemukan';
        if (els.newAccountNotFound) els.newAccountNotFound.classList.remove('hidden');
        if (els.newAccountEmailField) els.newAccountEmailField.classList.add('hidden');
        if (els.newAccountHint) { els.newAccountHint.textContent = 'Buat akun baru dengan email ini, atau batal untuk memeriksa kembali penulisan email.'; els.newAccountHint.style.color = ''; }
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

  els.forgotPasswordLink && els.forgotPasswordLink.addEventListener('click', async (e) => {
    e.preventDefault();
    const email = normalizeEmail(els.emailInput.value);
    if (!email) { els.emailInput.focus(); return; }
    const link = els.forgotPasswordLink;
    link.textContent = 'Mengirim...';
    try {
      const methods = await fetchSignInMethodsForEmail(auth, email);
      if (methods && methods.length > 0) {
        await sendPasswordResetEmail(auth, email);
        showToast('Link reset password terkirim ke email kamu.');
        return;
      }
      const snap = await getDoc(doc(db, 'users', email));
      if (snap.exists()) {
        const tempPw = 'temp-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
        try {
          await createUserWithEmailAndPassword(auth, email, tempPw);
        } catch (cErr) {
          if (cErr.code !== 'auth/email-already-in-use') throw cErr;
        }
        await sendPasswordResetEmail(auth, email);
        try { await updateDoc(doc(db, 'users', email), { migratedToFb: true }); } catch (ue) { console.error('markMigrated error:', ue); }
        try { if (auth.currentUser) await authSignOut(auth); } catch (se) {}
        showToast('Link reset password terkirim ke email kamu.');
        return;
      }
      showToast('Email tidak terdaftar di AiFa. Periksa kembali penulisannya.');
    } catch (err) {
      if (err.code === 'auth/too-many-requests') showToast('Terlalu sering. Tunggu sebentar lalu coba lagi.');
      else { console.error('forgotPassword error:', err); showToast('Gagal mengirim link. Coba lagi nanti.'); }
    } finally { link.textContent = 'Lupa password?'; }
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
      let fbOk = false;
      try {
        await createUserWithEmailAndPassword(auth, email, pw);
        fbOk = true;
      } catch (fbErr) {
        if (fbErr.code === 'auth/email-already-in-use') {
          await signInWithEmailAndPassword(auth, email, pw);
          fbOk = true;
        } else if (fbErr.code === 'auth/invalid-email' || fbErr.code === 'auth/operation-not-allowed') {
          fbOk = false;
        } else { throw fbErr; }
      }
      firebaseSignedIn = fbOk;
      if (fbOk) await sendVerificationLinkIfNeeded();
      els.setPasswordDialog.close();
      pendingSetPasswordEmail = null;
      completeLogin(email, data);
      if (fbOk && auth.currentUser && !auth.currentUser.emailVerified) showToast('Password tersimpan. Link verifikasi dikirim ke email kamu.');
    } catch (err) {
      console.error('setPassword error:', err);
      errEl.textContent = 'Gagal menyimpan password. Cek koneksi lalu coba lagi.';
      errEl.style.display = 'block';
      btn.disabled = false; btn.textContent = 'Simpan & Masuk';
    }
  });
  els.setPasswordCancelBtn && els.setPasswordCancelBtn.addEventListener('click', () => { pendingSetPasswordEmail = null; els.setPasswordDialog.close(); els.passwordInput.focus(); });
  els.setPasswordDialog && els.setPasswordDialog.addEventListener('click', (e) => { if (e.target === els.setPasswordDialog) { pendingSetPasswordEmail = null; els.setPasswordDialog.close(); } });

  els.signupButton && els.signupButton.addEventListener('click', (e) => {
    e.preventDefault();
    pendingNewAccountEmail = null;
    els.newAccountDialog.dataset.mode = 'signup';
    els.newAccountTitle.textContent = 'Buat Akun Baru';
    if (els.newAccountNotFound) els.newAccountNotFound.classList.add('hidden');
    if (els.newAccountEmailField) els.newAccountEmailField.classList.remove('hidden');
    if (els.newAccountFixBtn) els.newAccountFixBtn.classList.add('hidden');
    if (els.newAccountHint) { els.newAccountHint.textContent = 'Masukkan email untuk membuat akun baru.'; els.newAccountHint.style.color = ''; }
    if (els.newAccountEmailInput) els.newAccountEmailInput.value = normalizeEmail(els.emailInput.value);
    els.newAccountDialog.showModal();
    if (els.newAccountEmailInput) setTimeout(() => els.newAccountEmailInput.focus(), 50);
  });

  els.newAccountCreateBtn && els.newAccountCreateBtn.addEventListener('click', () => {
    const mode = els.newAccountDialog.dataset.mode || 'notfound';
    const email = mode === 'signup' ? normalizeEmail(els.newAccountEmailInput.value) : pendingNewAccountEmail;
    if (!email) { if (els.newAccountEmailInput) els.newAccountEmailInput.focus(); return; }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { els.newAccountHint.textContent = 'Format email tidak valid.'; els.newAccountHint.style.color = 'var(--danger,#d9534f)'; return; }
    els.newAccountDialog.close();
    if (mode === 'signup') els.emailInput.value = email;
    beginNewAccount(email);
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
    const submitBtn = els.onboardProfileForm.querySelector('button[type="submit"]');
    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Menyimpan...'; }
    try {
      const email = state.currentEmail;
      const userObj = { email, name: els.onboardNameInput.value.trim() || email.split('@')[0], role: els.onboardRoleInput.value.trim() || null, wa: els.onboardWaInput.value.trim() || null, avatarUrl: els.onboardAvatarPreview.dataset.avatar || null, tier: 'free', createdAt: new Date().toISOString() };
      let fbCreated = false;
      try {
        await createUserWithEmailAndPassword(auth, email, pw);
        fbCreated = true;
      } catch (fbErr) {
        if (fbErr.code === 'auth/email-already-in-use') {
          errEl.textContent = 'Email ini sudah terdaftar. Silakan masuk dengan password-nya.';
          errEl.style.display = 'block';
          return;
        }
        if (fbErr.code !== 'auth/invalid-email' && fbErr.code !== 'auth/operation-not-allowed') throw fbErr;
      }
      firebaseSignedIn = fbCreated;
      if (!fbCreated) userObj.password = await makePassword(pw);
      state.users[email] = userObj;
      try { await setDoc(doc(db, 'users', email), userObj); }
      catch (se) { console.error('createUser error:', se); showToast('Gagal menyimpan akun ke server: ' + (se.code || se.message)); }
      if (fbCreated) await sendVerificationLinkIfNeeded();
      saveState();
      const pid = sessionStorage.getItem('pendingInviteId'), pname = sessionStorage.getItem('pendingInviteName');
      if (pid) {
        joinWorkspaceFromInvite(pid, pname || 'Ruang Bersama');
        sessionStorage.removeItem('pendingInviteId'); sessionStorage.removeItem('pendingInviteName');
        subscribeToData(); showStep('dashboard'); render();
      } else { showStep('workspace'); }
      refreshVerifyBanner();
      if (fbCreated) showToast('Akun dibuat! Link verifikasi dikirim ke email kamu.');
      else showToast('Akun dibuat!');
    } catch (err) {
      console.error('onboard error:', err);
      errEl.textContent = 'Gagal membuat akun. Cek koneksi lalu coba lagi.';
      errEl.style.display = 'block';
    } finally { if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Lanjut &rarr;'; } }
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

  function clearSession() {
    if (unsubWorkspaces) unsubWorkspaces();
    Object.values(messageSubs).forEach(u => u());
    Object.values(userSubs).forEach(u => u());
    unsubWorkspaces = null; messageSubs = {}; userSubs = {};
    demoMode = false;
    if (els.demoBanner) els.demoBanner.classList.add('hidden');
    Object.assign(state, { currentEmail: null, activeWorkspaceId: null, users: {}, workspaces: {}, messages: {} });
    showSavings = false; els.toggleSavingsButton.forEach(b => b.classList.remove('revealed'));
    periodRecoveryPrompted = false;
    firebaseSignedIn = false;
    if (els.verifyBanner) els.verifyBanner.classList.add('hidden');
    ['profileDialog', 'setPasswordDialog', 'roomSettingsDialog', 'confirmDialog', 'newAccountDialog'].forEach(id => {
      const d = els[id]; if (d && d.open && typeof d.close === 'function') { try { d.close(); } catch (e) {} }
    });
    try { if (auth.currentUser) authSignOut(auth); } catch (e) {}
    saveState(); showStep('auth');
    els.emailInput.value = '';
    if (els.passwordInput) { els.passwordInput.value = ''; if (els.loginError) els.loginError.style.display = 'none'; }
  }

  els.logoutButton.addEventListener('click', clearSession);

  els.resendVerifyBtn && els.resendVerifyBtn.addEventListener('click', async () => {
    const u = auth.currentUser; if (!u) return;
    els.resendVerifyBtn.disabled = true; els.resendVerifyBtn.textContent = 'Mengirim...';
    try { await trySendVerification(u); showToast('Link verifikasi dikirim ulang. Cek inbox kamu.'); }
    catch (err) { console.error('resend verify error:', err); showToast('Gagal mengirim link. Coba lagi nanti.'); }
    finally { els.resendVerifyBtn.disabled = false; els.resendVerifyBtn.textContent = 'Kirim ulang link'; }
  });
  els.closeVerifyBanner && els.closeVerifyBanner.addEventListener('click', () => { if (els.verifyBanner) els.verifyBanner.classList.add('hidden'); });

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
    if (composerMode === 'chat') {
      const text = els.chatInput.value.trim();
      if (!text) return;
      const msg = { id: createId('chat'), text, actorEmail: state.currentEmail, createdAt: new Date().toISOString() };
      getChats(ws).push(msg);
      els.chatInput.value = '';
      if (!demoMode) setDoc(doc(db, 'workspaces', ws.id, 'messages', msg.id), msg).catch((err) => {
        console.error('sendChat error:', err);
        showToast('Gagal mengirim pesan: ' + (err.code || err.message));
      });
      render(); scrollFeedToBottom();
      return;
    }
    const tier = (state.users[state.currentEmail] || {}).tier || 'free';
    if (tier === 'free') { const cnt = (ws.transactions || []).filter(t => t.periodId === ws.activePeriodId).length; if (cnt >= 30) { els.upgradeDialog.showModal(); return; } }
    const note = els.transactionNoteInput.value.trim(), amount = parseAmount(els.transactionAmountInput.value);
    if (!note || amount <= 0) return;
    const tx = { id: createId('trx'), type: selectedType, note, amount, actorEmail: state.currentEmail, periodId: selectedType === 'saving' ? null : ws.activePeriodId, createdAt: new Date().toISOString(), privateOwnerEmail: selectedType === 'saving' ? state.currentEmail : null };
    ws.transactions.push(tx);
    els.transactionNoteInput.value = ''; els.transactionAmountInput.value = '';
    if (!demoMode) updateDoc(doc(db, 'workspaces', ws.id), { transactions: arrayUnion(tx) }).catch((err) => {
      console.error('addTransaction error:', err);
      showToast('Gagal menyimpan: ' + (err.code || err.message));
    });
    render(); showToast(selectedType === 'saving' ? 'Tabungan tercatat.' : TYPE_LABELS[selectedType] + ' tercatat.'); scrollFeedToBottom();
  });

  els.modeDotsBtn && els.modeDotsBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleModeMenu();
  });
  els.chatInput && els.chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && composerMode === 'chat') {
      e.preventDefault();
      els.transactionForm.requestSubmit();
    }
  });
  els.modeMenuItems && els.modeMenuItems.forEach(b => b.addEventListener('click', () => {
    composerMode = b.dataset.mode;
    localStorage.setItem('aifa.composer.mode', composerMode);
    closeModeMenu();
    renderComposerMode();
    if (composerMode === 'chat') els.chatInput && els.chatInput.focus();
  }));
  renderComposerMode();

  els.transactionAmountInput.addEventListener('input', () => { const a = parseAmount(els.transactionAmountInput.value); els.transactionAmountInput.value = a > 0 ? formatPlainNumber(a) : ''; });
  els.incomeTotal.forEach(el => el.addEventListener('click', () => { el.classList.toggle('expanded'); renderTotals(); }));
  els.toggleSavingsButton.forEach(b => b.addEventListener('click', () => {
    showSavings = !showSavings;
    els.toggleSavingsButton.forEach(btn => btn.classList.toggle('revealed', showSavings));
    renderTotals();
    if (els.archiveView && !els.archiveView.classList.contains('hidden')) renderArchive();
  }));
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

  // Hapus akun
  els.profileDeleteBtn && els.profileDeleteBtn.addEventListener('click', () => {
    const email = state.currentEmail; if (!email) return;
    const pw = els.profileCurPasswordInput ? els.profileCurPasswordInput.value : '';
    if (!pw) { showToast('Isi kolom "Password saat ini" sebagai konfirmasi.'); return; }
    openConfirm('Hapus akun?', 'Akun "' + email + '" dan seluruh datanya akan dihapus permanen. Ruang yang kamu buat dipindah ke anggota lain (jika tidak ada, ruang dihapus). Tindakan ini tidak bisa dibatalkan.', 'Ya, hapus akun', async () => {
      if (demoMode) { clearSession(); showToast('Akun demo dihapus.'); return; }
      try {
        const user = state.users[email];
        if (auth.currentUser) {
          try { await reauthenticateWithCredential(auth.currentUser, EmailAuthProvider.credential(email, pw)); }
          catch (ea) { console.error('reauth error:', ea.code || ea); showToast('Password salah.'); return; }
        } else if (!user || !hasPassword(user)) {
          showToast('Akun ini tidak bisa diverifikasi. Hubungi admin.'); return;
        } else {
          const ok = await verifyPassword(pw, user.password);
          if (!ok) { showToast('Password salah.'); return; }
        }
        for (const wsId of Object.keys(state.workspaces)) {
          const ws = state.workspaces[wsId];
          if (!(ws.members || []).includes(email)) continue;
          if (ws.ownerEmail === email) {
            const others = (ws.members || []).filter(m => m !== email);
            if (others.length) {
              try { await updateDoc(doc(db, 'workspaces', wsId), { ownerEmail: others[0] }); } catch (e) { console.error('transfer owner error:', e); }
            } else {
              const msgs = (state.messages && state.messages[wsId]) || [];
              msgs.forEach(m => deleteDoc(doc(db, 'workspaces', wsId, 'messages', m.id)).catch(console.error));
              try { await deleteDoc(doc(db, 'workspaces', wsId)); } catch (e) { console.error('delete ws error:', e); }
            }
          } else {
            try { await updateDoc(doc(db, 'workspaces', wsId), { members: arrayRemove(email) }); } catch (e) { console.error('remove member error:', e); }
          }
        }
        try { await deleteDoc(doc(db, 'users', email)); } catch (e) { console.error('delete user doc error:', e); }
        try { if (auth.currentUser) await deleteUser(auth.currentUser); } catch (e) { console.error('deleteUser error:', e); }
        clearSession();
        showToast('Akun berhasil dihapus.');
      } catch (err) {
        console.error('delete account error:', err);
        showToast('Gagal menghapus akun. Coba lagi nanti.');
      }
    });
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
    openConfirm('Reset chat ruang?', 'Semua isi chat di ruang "' + ws.name + '" (pesan chat, pendapatan, pengeluaran, dan arsip) akan dihapus. Tabungan tetap aman.', 'Ya, reset', () => {
      const oldTx = (ws.transactions || []).slice();
      ws.transactions = [];
      const chats = getChats(ws);
      if (!demoMode) chats.slice().forEach(c => deleteDoc(doc(db, 'workspaces', ws.id, 'messages', c.id)).catch(console.error));
      chats.length = 0;
      if (!demoMode && oldTx.length) updateDoc(doc(db, 'workspaces', ws.id), { transactions: arrayRemove(...oldTx) }).catch(console.error);
      render();
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
    if (contextKind === 'chat') {
      const c = findChatById(contextTargetId);
      closeTrxMenu();
      if (c) openEditChat(c);
    } else {
      const t = findTrxById(contextTargetId);
      closeTrxMenu();
      if (t) openEditTransaction(t);
    }
  });
  els.trxMenuDelete && els.trxMenuDelete.addEventListener('click', () => {
    const kind = contextKind;
    const t = kind === 'chat' ? findChatById(contextTargetId) : findTrxById(contextTargetId);
    closeTrxMenu();
    if (!t) return;
    if (kind === 'chat') {
      openConfirm('Hapus pesan ini?', 'Pesan akan dihapus.', 'Hapus', () => {
        const ws = getActiveWorkspace(); if (!ws) return;
        const chats = getChats(ws);
        const idx = chats.findIndex(x => x.id === t.id);
        if (idx >= 0) chats.splice(idx, 1);
        if (!demoMode) deleteDoc(doc(db, 'workspaces', ws.id, 'messages', t.id)).catch(console.error);
        render();
        showToast('Pesan dihapus.');
      });
    } else {
      openConfirm('Hapus catatan ini?', 'Catatan "' + t.note + '" sebesar ' + formatCurrency(t.amount) + ' akan dihapus permanen.', 'Hapus', () => {
        const ws = getActiveWorkspace(); if (!ws) return;
        ws.transactions = ws.transactions.filter(x => x.id !== t.id);
        if (!demoMode) updateDoc(doc(db, 'workspaces', ws.id), { transactions: arrayRemove(t) }).catch(console.error);
        render();
        showToast('Catatan dihapus.');
      });
    }
  });
  document.addEventListener('click', (e) => {
    if (els.trxMenu && !els.trxMenu.contains(e.target)) {
      if (Date.now() - trxMenuOpenedAt > 350) closeTrxMenu();
    }
  });
  document.addEventListener('click', (e) => {
    if (els.modeMenu && els.modeDotsBtn && !els.modeMenu.contains(e.target) && !els.modeDotsBtn.contains(e.target)) {
      if (Date.now() - modeMenuOpenedAt > 350) closeModeMenu();
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
    const oldTx = { ...t };
    t.note = note; t.amount = amount; t.type = editType;
    if (editType === 'saving') { t.periodId = null; t.privateOwnerEmail = state.currentEmail; }
    else { t.periodId = ws.activePeriodId; t.privateOwnerEmail = null; }
    if (!demoMode) {
      const wsRef = doc(db, 'workspaces', ws.id);
      updateDoc(wsRef, { transactions: arrayRemove(oldTx) }).then(() => updateDoc(wsRef, { transactions: arrayUnion({ ...t }) })).catch((err) => {
        console.error('editTransaction error:', err);
        showToast('Gagal memperbarui: ' + (err.code || err.message));
      });
    }
    render(); els.editTransactionDialog.close();
    showToast('Catatan diperbarui.');
  });
  els.editTransactionDialog && els.editTransactionDialog.addEventListener('close', () => { editingTrxId = null; });
  els.editChatForm && els.editChatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const c = findChatById(editingChatId); const ws = getActiveWorkspace();
    if (!c || !ws) return;
    const text = els.editChatInput.value.trim();
    if (!text) return;
    c.text = text;
    if (!demoMode) updateDoc(doc(db, 'workspaces', ws.id, 'messages', c.id), { text }).catch(console.error);
    render(); els.editChatDialog.close();
    showToast('Pesan diperbarui.');
  });
  els.editChatDialog && els.editChatDialog.addEventListener('close', () => { editingChatId = null; });
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
  maybeSuggestPeriodRecovery();
}

function findPeriodRecovery(ws) {
  if (!ws || !ws.periods || ws.periods.length < 2) return null;
  const hasTx = (pid) => (ws.transactions || []).some(t => t.periodId === pid);
  const lastIdx = ws.periods.length - 1;
  if (ws.activePeriodId !== ws.periods[lastIdx].id) return null;
  if (hasTx(ws.activePeriodId)) return null;
  const toRemove = [];
  let idx = lastIdx;
  while (idx > 0 && !hasTx(ws.periods[idx].id)) { toRemove.push(ws.periods[idx].id); idx--; }
  if (!toRemove.includes(ws.activePeriodId)) return null;
  const target = ws.periods[idx];
  if (!target || !target.endedAt || !hasTx(target.id)) return null;
  return { removeIds: toRemove, restoreId: target.id };
}

function maybeSuggestPeriodRecovery() {
  if (periodRecoveryPrompted) return;
  if (els.authView && !els.authView.classList.contains('hidden')) return;
  const ws = getActiveWorkspace(); if (!ws) return;
  const rec = findPeriodRecovery(ws); if (!rec) return;
  periodRecoveryPrompted = true;
  openConfirm('Pulihkan periode sebelumnya?', 'Periode aktif saat ini kosong dan tampaknya terbuat tidak sengaja. Catatan periode sebelumnya (termasuk pengeluaran semua anggota) akan dikembalikan lagi.', 'Pulihkan', () => {
    const target = ws.periods.find(p => p.id === rec.restoreId);
    if (target) target.endedAt = null;
    ws.periods = ws.periods.filter(p => !rec.removeIds.includes(p.id));
    ws.activePeriodId = rec.restoreId;
    saveState(); render(); showToast('Periode sebelumnya dipulihkan.');
  });
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
  const msgs = (state.messages && state.messages[id]) || [];
  if (!demoMode) msgs.forEach(m => deleteDoc(doc(db, 'workspaces', id, 'messages', m.id)).catch(console.error));
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
  const net = t.income - t.expense - t.saving;
  els.incomeTotal.forEach(el => el.textContent = el.classList.contains('expanded') ? formatCurrency(net) : formatSummaryCurrency(net));
  els.expenseTotal.forEach(el => el.textContent = formatSummaryCurrency(t.expense));
  els.balanceTotal.forEach(el => el.textContent = formatSummaryCurrency(t.income - t.expense - t.saving));
  els.savingTotal.forEach(el => el.textContent = showSavings ? formatSummaryCurrency(t.saving) : '***');
}

function renderTypeSwitch() {
  els.switchOptions.forEach(b => b.classList.toggle('active', b.dataset.type === selectedType));
  const ph = { expense: 'Contoh: makan siang, bensin', income: 'Contoh: gaji, bonus', saving: 'Contoh: tabung motor' }[selectedType];
  els.transactionNoteInput.placeholder = ph;
}

function checkPaydayAlert(ws) {
  if (!els.paydayAlertContainer) return;
  const user = state.users[state.currentEmail];
  const payday = user?.payday;
  if (!payday) { els.paydayAlertContainer.classList.add('hidden'); return; }
  const now = new Date();
  let rd = new Date(now.getFullYear(), now.getMonth(), payday);
  if (now.getDate() < payday) rd.setMonth(rd.getMonth() - 1);
  const hasOwnExpenses = (ws.transactions || []).some(t => t.type === 'expense' && t.periodId === ws.activePeriodId && t.actorEmail === state.currentEmail);
  const lastCleared = user.expenseClearedAt ? new Date(user.expenseClearedAt) : null;
  if (hasOwnExpenses && (!lastCleared || lastCleared < rd)) els.paydayAlertContainer.classList.remove('hidden');
  else els.paydayAlertContainer.classList.add('hidden');
}

function renderFeed() {
  const ws = getActiveWorkspace(); if (!ws) return;
  checkPaydayAlert(ws);
  updateWishlistBanner();
  const txs = ws.transactions.filter(t => t.type === 'saving' || t.periodId === ws.activePeriodId).map(t => ({ kind: 'finance', data: t }));
  const chats = getChats(ws).map(c => ({ kind: 'chat', data: c }));
  const items = txs.concat(chats).sort((a, b) => new Date(a.data.createdAt) - new Date(b.data.createdAt));
  els.chatFeed.innerHTML = '';
  if (!items.length) { const e = document.createElement('div'); e.className = 'empty-state'; e.textContent = 'Belum ada catatan atau pesan.'; els.chatFeed.append(e); return; }
  const f = document.createDocumentFragment();
  items.forEach(it => { f.append(it.kind === 'chat' ? createChatBubble(it.data) : createTransactionBubble(it.data)); });
  els.chatFeed.append(f); scrollFeedToBottom();
}

function renderComposerMode() {
  if (composerMode === 'chat') {
    els.composerFinanceTypes.classList.add('hidden');
    els.composerFinanceInputs.classList.add('hidden');
    els.composerChatBox.classList.remove('hidden');
    els.transactionNoteInput.disabled = true;
    els.transactionAmountInput.disabled = true;
    els.chatInput.disabled = false;
  } else {
    els.composerChatBox.classList.add('hidden');
    els.composerFinanceTypes.classList.remove('hidden');
    els.composerFinanceInputs.classList.remove('hidden');
    els.chatInput.disabled = true;
    els.transactionNoteInput.disabled = false;
    els.transactionAmountInput.disabled = false;
  }
  renderModeMenuCheck();
}

function toggleModeMenu() {
  if (els.modeMenu.classList.contains('hidden')) openModeMenu();
  else closeModeMenu();
}

function openModeMenu() {
  const btn = els.modeDotsBtn, menu = els.modeMenu;
  if (!btn || !menu) return;
  renderModeMenuCheck();
  menu.classList.remove('hidden');
  menu.style.left = '0px';
  menu.style.top = '0px';
  const r = btn.getBoundingClientRect();
  const mw = menu.offsetWidth || 132, mh = menu.offsetHeight || 88;
  let x = Math.max(8, Math.min(r.left, window.innerWidth - mw - 8));
  let y = r.top - mh - 6;
  if (y < 8) y = r.bottom + 6;
  menu.style.left = x + 'px';
  menu.style.top = y + 'px';
  modeMenuOpenedAt = Date.now();
}

function closeModeMenu() {
  if (els.modeMenu) els.modeMenu.classList.add('hidden');
}

function renderModeMenuCheck() {
  els.modeMenuItems.forEach(b => b.classList.toggle('active', b.dataset.mode === composerMode));
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
    if (t.type === 'saving') tot.saving += t.amount;
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
  contextKind = 'finance';
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

function createChatBubble(c) {
  const author = state.users[c.actorEmail];
  const msg = document.createElement('article');
  const mine = c.actorEmail === state.currentEmail;
  let av = '<span class="mini-avatar">' + escapeHtml(initials(author?.name || c.actorEmail)) + '</span>';
  if (author?.avatarUrl) av = '<span class="mini-avatar" style="background-image:url(' + author.avatarUrl + ');background-size:cover;background-position:center"></span>';
  msg.className = 'message' + (mine ? ' mine' : '');
  msg.innerHTML = av + '<div class="bubble"><div class="bubble-header"><strong>' + escapeHtml(author?.name || c.actorEmail) + '</strong><span>' + formatTime(c.createdAt) + '</span></div><div>' + escapeHtml(c.text) + '</div></div>';
  if (mine) {
    msg.dataset.id = c.id;
    msg.addEventListener('contextmenu', (e) => { e.preventDefault(); openChatMenu(c.id, e.clientX, e.clientY); });
    msg.addEventListener('touchstart', (e) => {
      if (e.touches.length !== 1) return;
      clearTimeout(longPressTimer);
      longPressTimer = setTimeout(() => {
        const p = e.touches[0];
        openChatMenu(c.id, p.clientX, p.clientY);
        try { e.preventDefault(); } catch (err) { /* noop */ }
      }, 500);
    }, { passive: false });
    msg.addEventListener('touchmove', () => clearTimeout(longPressTimer));
    msg.addEventListener('touchend', () => clearTimeout(longPressTimer));
    msg.addEventListener('touchcancel', () => clearTimeout(longPressTimer));
  }
  return msg;
}

function openChatMenu(id, x, y) {
  if (!els.trxMenu) return;
  contextTargetId = id;
  contextKind = 'chat';
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

function findChatById(id) {
  const ws = getActiveWorkspace(); if (!ws) return null;
  return getChats(ws).find(x => x.id === id) || null;
}

function openEditChat(c) {
  if (!els.editChatDialog) return;
  editingChatId = c.id;
  els.editChatInput.value = c.text || '';
  els.editChatDialog.showModal();
}

function pruneChat(ws) {
  const msgs = state.messages && state.messages[ws.id];
  if (!msgs || !msgs.length) return;
  const cutoff = Date.now() - 30 * 86400000;
  const old = msgs.filter(c => new Date(c.createdAt).getTime() < cutoff);
  if (old.length) {
    state.messages[ws.id] = msgs.filter(c => new Date(c.createdAt).getTime() >= cutoff);
    if (!demoMode) old.forEach(c => deleteDoc(doc(db, 'workspaces', ws.id, 'messages', c.id)).catch(console.error));
  }
}

function getChats(ws) {
  if (!ws) return [];
  if (!state.messages[ws.id]) state.messages[ws.id] = ws.chat || [];
  return state.messages[ws.id];
}

function resubscribeMessages() {
  if (demoMode || !state.currentEmail) return;
  const joined = getUserWorkspaces();
  const ids = new Set(joined.map(w => w.id));
  for (const id of Object.keys(messageSubs)) {
    if (!ids.has(id)) { messageSubs[id](); delete messageSubs[id]; delete state.messages[id]; }
  }
  joined.forEach(w => {
    if (messageSubs[w.id]) return;
    const q = query(collection(db, 'workspaces', w.id, 'messages'), orderBy('createdAt', 'asc'));
    messageSubs[w.id] = onSnapshot(q, (snap) => {
      state.messages[w.id] = snap.docs.map(d => d.data());
      pruneChat(w);
      render();
    }, (err) => { console.error('Gagal memuat pesan:', err); });
  });
}

function resubscribeUsers() {
  if (demoMode || !state.currentEmail) return;
  const emails = new Set([state.currentEmail]);
  Object.values(state.workspaces).forEach(w => (w.members || []).forEach(m => emails.add(m)));
  for (const email of Object.keys(userSubs)) {
    if (!emails.has(email)) { userSubs[email](); delete userSubs[email]; }
  }
  emails.forEach(email => {
    if (userSubs[email]) return;
    userSubs[email] = onSnapshot(doc(db, 'users', email), (snap) => {
      if (snap.exists()) state.users[email] = snap.data();
      render();
    }, (err) => { console.error('Gagal memuat pengguna:', err); });
  });
}

async function migrateLegacyChat(ws) {
  if (demoMode || !ws || migratedWs.has(ws.id)) return;
  const legacy = ws.chat;
  if (!Array.isArray(legacy) || !legacy.length) return;
  migratedWs.add(ws.id);
  try {
    await Promise.all(legacy.map(c => setDoc(doc(db, 'workspaces', ws.id, 'messages', c.id), c).catch(console.error)));
    await updateDoc(doc(db, 'workspaces', ws.id), { chat: deleteField() });
    ws.chat = [];
    if (state.messages[ws.id]) state.messages[ws.id].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    render();
  } catch (err) {
    console.error('migrateLegacyChat error:', err);
    migratedWs.delete(ws.id);
  }
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
  const removed = (ws.transactions || []).filter(t => t.type === 'expense' && t.periodId === ws.activePeriodId && t.actorEmail === state.currentEmail);
  ws.transactions = (ws.transactions || []).filter(t => !removed.includes(t));
  const user = state.users[state.currentEmail];
  if (user) user.expenseClearedAt = new Date().toISOString();
  if (!demoMode) {
    if (removed.length) updateDoc(doc(db, 'workspaces', ws.id), { transactions: arrayRemove(...removed) }).catch(console.error);
    if (user) updateDoc(doc(db, 'users', state.currentEmail), { expenseClearedAt: user.expenseClearedAt }).catch(console.error);
  }
  render(); showToast('Pengeluaranmu di periode ini telah dihapus.');
}

function calculateTotals(ws) {
  return ws.transactions.reduce((tot, t) => {
    if (t.type === 'saving') { tot.saving += t.amount; return tot; }
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
  if (state.activeWorkspaceId && state.workspaces[state.activeWorkspaceId]) {
    const wsData = { ...state.workspaces[state.activeWorkspaceId] };
    delete wsData.chat;
    setDoc(doc(db, 'workspaces', state.activeWorkspaceId), wsData).catch(console.error);
  }
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