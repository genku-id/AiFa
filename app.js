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
let confirmAction = null;
let unsubWorkspaces = null, unsubUsers = null;
const els = {
  authView: document.querySelector('#authView'), mainView: document.querySelector('#mainView'),
  stepAuth: document.querySelector('#stepAuth'), stepProfile: document.querySelector('#stepProfile'), stepWorkspace: document.querySelector('#stepWorkspace'),
  loginForm: document.querySelector('#loginForm'), emailInput: document.querySelector('#emailInput'),
  onboardProfileForm: document.querySelector('#onboardProfileForm'), onboardAvatarPreview: document.querySelector('#onboardAvatarPreview'),
  onboardAvatarInput: document.querySelector('#onboardAvatarInput'), onboardNameInput: document.querySelector('#onboardNameInput'),
  onboardRoleInput: document.querySelector('#onboardRoleInput'), onboardWaInput: document.querySelector('#onboardWaInput'),
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
  profileWaInput: document.querySelector('#profileWaInput'), paydayAlertContainer: document.querySelector('#paydayAlertContainer'),
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
};

boot();

function boot() {
  bindEvents();
  setupInstallBanner();
  window.addEventListener('popstate', handlePopState);
  if (state.currentEmail) {
    getDoc(doc(db, 'users', state.currentEmail)).then(snap => {
      if (snap.exists()) {
        state.users[state.currentEmail] = snap.data();
        subscribeToData(); render(); showStep('dashboard');
        const p = new URLSearchParams(window.location.search);
        if (p.get('inviteId') && p.get('inviteName')) {
          joinWorkspaceFromInvite(p.get('inviteId'), p.get('inviteName')).then(render);
        }
      } else {
        state.currentEmail = null;
        saveState();
        showStep('auth');
      }
    }).catch((err) => {
      console.error('boot getUser error:', err);
      showToast('Gagal terhubung ke server. Cek koneksi & izin Firestore.');
      showStep('auth');
    });
  } else { showStep('auth'); }
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

function resizeImage(file, cb) {
  const reader = new FileReader();
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
    if (!email) return;
    const btn = document.querySelector('#loginSubmitBtn');
    btn.disabled = true; btn.textContent = 'Memeriksa...';
    try {
      const userSnap = await getDoc(doc(db, 'users', email));
      if (userSnap.exists()) {
        state.currentEmail = email;
        state.users[email] = userSnap.data();
        saveState(); subscribeToData();
        const p = new URLSearchParams(window.location.search);
        if (p.get('inviteId') && p.get('inviteName')) joinWorkspaceFromInvite(p.get('inviteId'), p.get('inviteName')).then(render);
        ensureActiveWorkspace(); showStep('dashboard'); render();
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
      if (state.users[email]) {
        state.currentEmail = email;
        subscribeToData(); ensureActiveWorkspace(); showStep('dashboard'); render();
      } else {
        alert('Gagal memeriksa akun. Pastikan koneksi internet lancar dan coba lagi.');
      }
    } finally { btn.disabled = false; btn.textContent = 'Lanjutkan'; }
  });

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
    const userObj = { email: state.currentEmail, name: els.onboardNameInput.value.trim() || state.currentEmail.split('@')[0], role: els.onboardRoleInput.value.trim() || null, wa: els.onboardWaInput.value.trim() || null, avatarUrl: els.onboardAvatarPreview.dataset.avatar || null, tier: 'free', createdAt: new Date().toISOString() };
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
    Object.assign(state, { currentEmail: null, activeWorkspaceId: null, users: {}, workspaces: {} });
    showSavings = false; saveState(); showStep('auth');
    els.emailInput.value = '';
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
    if (user.avatarUrl) { els.profileAvatarPreview.style.backgroundImage = 'url(' + user.avatarUrl + ')'; els.profileAvatarPreview.textContent = ''; }
    else { els.profileAvatarPreview.style.backgroundImage = 'none'; els.profileAvatarPreview.textContent = initials(user.name || user.email); }
    els.profileDialog.showModal();
  });
  els.profileAvatarInput && els.profileAvatarInput.addEventListener('change', (e) => { const file = e.target.files[0]; if (!file) return; resizeImage(file, (d) => { els.profileAvatarPreview.style.backgroundImage = 'url(' + d + ')'; els.profileAvatarPreview.textContent = ''; els.profileAvatarPreview.dataset.newAvatar = d; }); });
  els.profileForm && els.profileForm.addEventListener('submit', () => {
    const user = state.users[state.currentEmail]; if (!user) return;
    user.name = els.profileNameInput.value.trim(); user.role = els.profileRoleInput.value.trim(); user.payday = parseInt(els.profilePaydayInput.value, 10) || null; user.wa = els.profileWaInput.value.trim();
    if (els.profileAvatarPreview.dataset.newAvatar) { user.avatarUrl = els.profileAvatarPreview.dataset.newAvatar; delete els.profileAvatarPreview.dataset.newAvatar; }
    saveState(); render();
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

  els.roomSettingsNameForm && els.roomSettingsNameForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const ws = getActiveWorkspace(); if (!ws) return;
    const newName = els.roomSettingsNameInput.value.trim();
    if (!newName || newName === ws.name) return;
    ws.name = newName;
    saveState(); render();
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
  els.roomSettingsNameInput.value = ws.name;
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
  els.incomeTotal.forEach(el => el.textContent = formatSummaryCurrency(t.income));
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
  const txs = ws.transactions.filter(t => t.type !== 'saving' && t.periodId !== ws.activePeriodId).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  els.archiveFeed.innerHTML = '';
  if (!txs.length) { const e = document.createElement('div'); e.className = 'empty-state'; e.textContent = 'Belum ada arsip.'; els.archiveFeed.append(e); return; }
  const f = document.createDocumentFragment();
  txs.forEach(t => { f.append(createTransactionBubble(t)); });
  els.archiveFeed.append(f); els.archiveFeed.scrollTop = els.archiveFeed.scrollHeight;
}

function createTransactionBubble(t) {
  const author = state.users[t.actorEmail];
  const msg = document.createElement('article');
  const mine = t.actorEmail === state.currentEmail;
  let av = '<span class="mini-avatar">' + escapeHtml(initials(author?.name || t.actorEmail)) + '</span>';
  if (author?.avatarUrl) av = '<span class="mini-avatar" style="background-image:url(' + author.avatarUrl + ');background-size:cover;background-position:center"></span>';
  msg.className = 'message' + (mine ? ' mine' : '');
  msg.innerHTML = av + '<div class="bubble"><div class="bubble-header"><strong>' + escapeHtml(author?.name || t.actorEmail) + '</strong><span>' + formatTime(t.createdAt) + '</span></div><div>' + escapeHtml(t.note) + '</div><div class="bubble-total"><span class="tag ' + t.type + '">' + TYPE_LABELS[t.type] + '</span><span>' + formatCurrency(t.amount) + '</span></div></div>';
  return msg;
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
    if (t.periodId !== ws.activePeriodId) return tot;
    if (t.type === 'income') tot.income += t.amount;
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
function scrollFeedToBottom() { requestAnimationFrame(() => { els.chatFeed.scrollTop = els.chatFeed.scrollHeight; }); }
let toastTimer = null;
function showToast(msg) { els.toast.textContent = msg; els.toast.classList.remove('hidden'); clearTimeout(toastTimer); toastTimer = setTimeout(() => els.toast.classList.add('hidden'), 2600); }