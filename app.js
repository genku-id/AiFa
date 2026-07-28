import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore, doc, getDoc, onSnapshot, setDoc, collection, query, where } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCxMQNFI35QS2qE4TbUDi14rQ5LfJuthAw",
  authDomain: "gen-lang-client-0513521672.firebaseapp.com",
  projectId: "gen-lang-client-0513521672",
  storageBucket: "gen-lang-client-0513521672.firebasestorage.app",
  messagingSenderId: "358176864493",
  appId: "1:358176864493:web:24591e445aa4fe8612f4e4"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const STORAGE_KEY = "aifa.finance.v1";

const DEFAULT_DATA = {
  users: {},
  workspaces: {},
  currentEmail: null,
  activeWorkspaceId: null,
};

const TYPE_LABELS = {
  income: "Pendapatan",
  expense: "Pengeluaran",
  saving: "Tabungan",
};

const state = loadState();
let selectedType = "expense";
let showSavings = false;
let showArchive = false;

const els = {
  authView: document.querySelector("#authView"),
  mainView: document.querySelector("#mainView"),
  loginForm: document.querySelector("#loginForm"),
  demoButton: document.querySelector("#demoButton"),
  emailInput: document.querySelector("#emailInput"),
  nameInput: document.querySelector("#nameInput"),
  logoutButton: document.querySelector("#logoutButton"),
  userInitials: document.querySelector("#userInitials"),
  userName: document.querySelector("#userName"),
  userEmail: document.querySelector("#userEmail"),
  workspaceSelect: document.querySelector("#workspaceSelect"),
  createWorkspaceForm: document.querySelector("#createWorkspaceForm"),
  workspaceNameInput: document.querySelector("#workspaceNameInput"),
  memberList: document.querySelector("#memberList"),
  memberCount: document.querySelector("#memberCount"),
  shareInviteButton: document.querySelector("#shareInviteButton"),
  workspaceTitle: document.querySelector("#workspaceTitle"),
  periodLabel: document.querySelector("#periodLabel"),
  incomeTotal: document.querySelectorAll(".incomeTotal"),
  expenseTotal: document.querySelectorAll(".expenseTotal"),
  balanceTotal: document.querySelectorAll(".balanceTotal"),
  savingTotal: document.querySelectorAll(".savingTotal"),
  toggleSavingsButton: document.querySelectorAll(".toggleSavingsButton"),
  archiveButton: document.querySelector("#archiveButton"),
  clearDraftButton: document.querySelector("#clearDraftButton"),
  feedTitle: document.querySelector("#feedTitle"),
  feedSubtitle: document.querySelector("#feedSubtitle"),
  chatFeed: document.querySelector("#chatFeed"),
  transactionForm: document.querySelector("#transactionForm"),
  transactionNoteInput: document.querySelector("#transactionNoteInput"),
  transactionAmountInput: document.querySelector("#transactionAmountInput"),
  resetDialog: document.querySelector("#resetDialog"),
  confirmRefreshButton: document.querySelector("#confirmRefreshButton"),
  toast: document.querySelector("#toast"),
  switchOptions: [...document.querySelectorAll(".switch-option")],
  mobileMenuButton: document.querySelector("#mobileMenuButton"),
  closeSidebarButton: document.querySelector("#closeSidebarButton"),
  openProfileButton: document.querySelector("#openProfileButton"),
  profileDialog: document.querySelector("#profileDialog"),
  profileForm: document.querySelector("#profileForm"),
  profileAvatarInput: document.querySelector("#profileAvatarInput"),
  profileAvatarPreview: document.querySelector("#profileAvatarPreview"),
  profileNameInput: document.querySelector("#profileNameInput"),
  profileRoleInput: document.querySelector("#profileRoleInput"),
  profilePaydayInput: document.querySelector("#profilePaydayInput"),
  profileWaInput: document.querySelector("#profileWaInput"),
  paydayAlertContainer: document.querySelector("#paydayAlertContainer"),
  archiveView: document.querySelector("#archiveView"),
  archiveFeed: document.querySelector("#archiveFeed"),
  closeArchiveButton: document.querySelector("#closeArchiveButton"),
  installBanner: document.querySelector("#installBanner"),
  installButton: document.querySelector("#installButton"),
  closeInstallBanner: document.querySelector("#closeInstallBanner"),
  upgradeDialog: document.querySelector("#upgradeDialog"),
  confirmUpgradeWA: document.querySelector("#confirmUpgradeWA"),
  closeUpgradeButton: document.querySelector("#closeUpgradeButton"),
};

boot();

function boot() {
  subscribeToData();
  processInviteIfLoggedIn();
  bindEvents();
  migrateInvitesForCurrentUser();
  setupInstallBanner();
  startHourlyReminder();
  render();
}

let unsubWorkspaces = null;
let unsubUsers = null;

function subscribeToData() {
  if (!state.currentEmail) return;

  if (unsubWorkspaces) unsubWorkspaces();
  if (unsubUsers) unsubUsers();

  const workspacesQuery = query(collection(db, "workspaces"), where("members", "array-contains", state.currentEmail));
  unsubWorkspaces = onSnapshot(workspacesQuery, (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === "added" || change.type === "modified") {
        state.workspaces[change.doc.id] = change.doc.data();
      }
      if (change.type === "removed") {
        delete state.workspaces[change.doc.id];
      }
    });
    render();
  });

  unsubUsers = onSnapshot(collection(db, "users"), (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === "added" || change.type === "modified") {
        state.users[change.doc.id] = change.doc.data();
      }
    });
    render();
  });
}

function processInviteIfLoggedIn() {
  const params = new URLSearchParams(window.location.search);
  const inviteId = params.get("inviteId");
  const inviteName = params.get("inviteName");
  if (inviteId && inviteName && state.currentEmail) {
    joinWorkspaceFromInvite(inviteId, inviteName);
  }
}

function joinWorkspaceFromInvite(inviteId, inviteName) {
  if (!state.workspaces[inviteId]) {
    const firstPeriod = {
      id: createId("period"),
      label: "Periode 1",
      startedAt: new Date().toISOString(),
      endedAt: null,
    };
    state.workspaces[inviteId] = {
      id: inviteId,
      name: inviteName,
      ownerEmail: "unknown",
      members: [state.currentEmail],
      invites: [],
      activePeriodId: firstPeriod.id,
      periods: [firstPeriod],
      transactions: [],
      createdAt: new Date().toISOString(),
    };
  } else {
    if (!state.workspaces[inviteId].members.includes(state.currentEmail)) {
      state.workspaces[inviteId].members.push(state.currentEmail);
    }
  }
  state.activeWorkspaceId = inviteId;
  saveState();
  showToast(`Berhasil bergabung ke ruang ${inviteName}`);
  window.history.replaceState({}, document.title, window.location.pathname);
}

function bindEvents() {
  els.loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const email = normalizeEmail(els.emailInput.value);
    const name = els.nameInput.value.trim() || email.split("@")[0];

    if (!email) return;
    state.currentEmail = email;
    
    // Fetch user from DB first to prevent overwriting existing data
    try {
      const userRef = doc(db, "users", email);
      const userSnap = await getDoc(userRef);
      
      if (!userSnap.exists()) {
        const newUser = {
          email,
          name,
          tier: "free",
          createdAt: new Date().toISOString()
        };
        state.users[email] = newUser;
        await setDoc(userRef, newUser);
      } else {
        state.users[email] = userSnap.data();
      }
    } catch (err) {
      console.error("Login fetch error:", err);
    }

    subscribeToData();
    
    if ('Notification' in window && window.Notification.permission === 'default') {
      window.Notification.requestPermission();
    }
    
    const params = new URLSearchParams(window.location.search);
    const inviteId = params.get("inviteId");
    const inviteName = params.get("inviteName");
    
    if (inviteId && inviteName) {
      joinWorkspaceFromInvite(inviteId, inviteName);
    }
    
    migrateInvitesForCurrentUser();
    await ensureActiveWorkspaceAsync();
    saveState();
    render();
  });

  els.demoButton.style.display = "none"; // Hide demo button since we are using Firebase

  els.logoutButton.addEventListener("click", () => {
    state.currentEmail = null;
    state.activeWorkspaceId = null;
    showSavings = false;
    saveState();
    if (unsubWorkspaces) unsubWorkspaces();
    if (unsubUsers) unsubUsers();
    render();
  });

  els.closeInstallBanner?.addEventListener("click", () => {
    els.installBanner.classList.remove("show");
    setTimeout(() => els.installBanner.classList.add("hidden"), 300);
    localStorage.setItem("installBannerDismissed", "true");
  });

  els.installButton?.addEventListener("click", async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        els.installBanner.classList.remove("show");
        setTimeout(() => els.installBanner.classList.add("hidden"), 300);
      }
      deferredPrompt = null;
    }
  });

  els.workspaceSelect.addEventListener("change", () => {
    state.activeWorkspaceId = els.workspaceSelect.value;
    saveState();
    render();
    els.mainView.classList.remove("mobile-sidebar-open");
  });

  els.createWorkspaceForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const name = els.workspaceNameInput.value.trim();
    if (!name || !state.currentEmail) return;

    const workspace = createWorkspace(name, state.currentEmail);
    state.activeWorkspaceId = workspace.id;
    els.workspaceNameInput.value = "";
    saveState();
    render();
    showToast(`Ruang ${workspace.name} dibuat.`);
    els.mainView.classList.remove("mobile-sidebar-open");
  });

  if (els.shareInviteButton) {
    els.shareInviteButton.addEventListener("click", async () => {
      const workspace = getActiveWorkspace();
      if (!workspace) return;
      const url = window.location.origin + window.location.pathname + "?inviteId=" + encodeURIComponent(workspace.id) + "&inviteName=" + encodeURIComponent(workspace.name);
      
      try {
        if (navigator.share) {
          await navigator.share({
            title: `Undangan Ruang: ${workspace.name}`,
            text: `Ayo bergabung ke ruang catatan keuangan "${workspace.name}" di AiFa!`,
            url: url
          });
        } else {
          await navigator.clipboard.writeText(url);
          showToast("Link undangan disalin ke clipboard!");
        }
      } catch (err) {
        showToast("Gagal membagikan link.");
      }
    });
  }

  els.switchOptions.forEach((button) => {
    button.addEventListener("click", () => {
      selectedType = button.dataset.type;
      renderTypeSwitch();
    });
  });

  els.closeUpgradeButton?.addEventListener("click", () => {
    els.upgradeDialog.close();
  });

  els.confirmUpgradeWA?.addEventListener("click", () => {
    const waNumber = "6285179813540";
    const message = `Halo Admin AiFa, saya sudah transfer Rp50.000 untuk upgrade akun AiFa Premium dengan email saya: ${state.currentEmail}`;
    const waLink = `https://wa.me/${waNumber}?text=${encodeURIComponent(message)}`;
    window.open(waLink, "_blank");
    els.upgradeDialog.close();
  });

  els.transactionForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!state.activeWorkspaceId) return;
    
    const activeWorkspace = state.workspaces[state.activeWorkspaceId];
    if (!activeWorkspace) return;
    
    const activePeriodId = activeWorkspace.activePeriodId || "period_1";
    
    // PREMIUM TIER CHECK
    const currentUser = state.users[state.currentEmail] || {};
    const isFreeTier = !currentUser.tier || currentUser.tier === "free";
    
    if (isFreeTier) {
      const periodTxCount = (activeWorkspace.transactions || []).filter(t => t.periodId === activePeriodId).length;
      if (periodTxCount >= 30) {
        els.upgradeDialog.showModal();
        return;
      }
    }

    const note = els.transactionNoteInput.value.trim();
    const amount = parseAmount(els.transactionAmountInput.value);
    if (!note || amount <= 0) return;

    activeWorkspace.transactions.push({
      id: createId("trx"),
      type: selectedType,
      note,
      amount,
      actorEmail: state.currentEmail,
      periodId: selectedType === "saving" ? null : activeWorkspace.activePeriodId,
      createdAt: new Date().toISOString(),
      privateOwnerEmail: selectedType === "saving" ? state.currentEmail : null,
    });

    els.transactionNoteInput.value = "";
    els.transactionAmountInput.value = "";
    saveState();
    render();
    showToast(
      selectedType === "saving"
        ? "Tabungan privat tercatat dan tidak tampil di chat bersama."
        : `${TYPE_LABELS[selectedType]} tercatat di chat bersama.`
    );
    scrollFeedToBottom();
  });

  els.transactionAmountInput.addEventListener("input", () => {
    const amount = parseAmount(els.transactionAmountInput.value);
    els.transactionAmountInput.value = amount > 0 ? formatPlainNumber(amount) : "";
  });

  els.clearDraftButton.addEventListener("click", () => {
    els.transactionNoteInput.value = "";
    els.transactionAmountInput.value = "";
    els.transactionNoteInput.focus();
  });

  els.toggleSavingsButton.forEach(btn => {
    btn.addEventListener("click", () => {
      showSavings = !showSavings;
      saveState();
      renderTotals();
    });
  });

  els.archiveButton.addEventListener("click", () => {
    els.archiveView.classList.remove("hidden");
    renderArchive();
  });

  if (els.closeArchiveButton) {
    els.closeArchiveButton.addEventListener("click", () => {
      els.archiveView.classList.add("hidden");
    });
  }

  if (els.paydayAlertContainer) {
    els.paydayAlertContainer.addEventListener("click", () => {
      const workspace = getActiveWorkspace();
      if (!workspace) return;
      if (typeof els.resetDialog.showModal === "function") {
        els.resetDialog.showModal();
        return;
      }
      refreshWorkspace(workspace);
    });
  }

  els.confirmRefreshButton.addEventListener("click", () => {
    const workspace = getActiveWorkspace();
    if (workspace) {
      refreshWorkspace(workspace);
    }
    els.resetDialog.close();
  });

  if (els.mobileMenuButton) {
    if (els.openProfileButton) {
    els.openProfileButton.addEventListener("click", () => {
      const user = state.users[state.currentEmail];
      els.profileNameInput.value = user.name || "";
      els.profileRoleInput.value = user.role || "";
      els.profilePaydayInput.value = user.payday || "";
      els.profileWaInput.value = user.wa || "";
      if (user.avatarUrl) {
        els.profileAvatarPreview.style.backgroundImage = `url(${user.avatarUrl})`;
        els.profileAvatarPreview.textContent = "";
      } else {
        els.profileAvatarPreview.style.backgroundImage = "none";
        els.profileAvatarPreview.textContent = initials(user.name || user.email);
      }
      els.profileDialog.showModal();
    });
  }

  if (els.profileAvatarInput) {
    els.profileAvatarInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const size = 128;
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext("2d");
          
          const minSize = Math.min(img.width, img.height);
          const sx = (img.width - minSize) / 2;
          const sy = (img.height - minSize) / 2;
          ctx.drawImage(img, sx, sy, minSize, minSize, 0, 0, size, size);
          
          const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
          els.profileAvatarPreview.style.backgroundImage = `url(${dataUrl})`;
          els.profileAvatarPreview.textContent = "";
          els.profileAvatarPreview.dataset.newAvatar = dataUrl;
        };
        img.src = ev.target.result;
      };
      reader.readAsDataURL(file);
    });
  }

  if (els.profileForm) {
    els.profileForm.addEventListener("submit", (e) => {
      const user = state.users[state.currentEmail];
      user.name = els.profileNameInput.value.trim();
      user.role = els.profileRoleInput.value.trim();
      user.payday = parseInt(els.profilePaydayInput.value, 10) || null;
      user.wa = els.profileWaInput.value.trim();
      if (els.profileAvatarPreview.dataset.newAvatar) {
        user.avatarUrl = els.profileAvatarPreview.dataset.newAvatar;
        delete els.profileAvatarPreview.dataset.newAvatar;
      }
      saveState();
      render();
    });
  }

  els.mobileMenuButton.addEventListener("click", () => {
      els.mainView.classList.add("mobile-sidebar-open");
    });
  }
  
  if (els.closeSidebarButton) {
    els.closeSidebarButton.addEventListener("click", () => {
      els.mainView.classList.remove("mobile-sidebar-open");
    });
  }
}

function render() {
  const isLoggedIn = Boolean(state.currentEmail && state.users[state.currentEmail]);
  els.authView.classList.toggle("hidden", isLoggedIn);
  els.mainView.classList.toggle("hidden", !isLoggedIn);

  if (!isLoggedIn) {
    return;
  }

  ensureActiveWorkspace();
  renderAccount();
  renderWorkspaces();
  renderMembers();
  renderHeader();
  renderTotals();
  renderTypeSwitch();
  renderFeed();
}

function renderAccount() {
  const user = state.users[state.currentEmail];
  els.userName.textContent = user.name;
  els.userEmail.textContent = user.email;
  
  const initialsEl = document.getElementById("userInitials");
  if (user.avatarUrl) {
    initialsEl.style.backgroundImage = `url(${user.avatarUrl})`;
    initialsEl.textContent = "";
  } else {
    initialsEl.style.backgroundImage = "none";
    initialsEl.textContent = initials(user.name || user.email);
  }
}

function renderWorkspaces() {
  const workspaces = getUserWorkspaces();
  els.workspaceSelect.innerHTML = "";

  workspaces.forEach((workspace) => {
    const option = document.createElement("option");
    option.value = workspace.id;
    option.textContent = workspace.name;
    els.workspaceSelect.append(option);
  });

  if (state.activeWorkspaceId) {
    els.workspaceSelect.value = state.activeWorkspaceId;
  }
}

function renderMembers() {
  const workspace = getActiveWorkspace();
  if (!workspace) return;

  els.memberCount.textContent = String(workspace.members.length);
  els.memberList.innerHTML = "";

  workspace.members.forEach((email) => {
    const user = state.users[email];
    const item = document.createElement("div");
    item.className = "member-chip";
    item.style.position = "relative";
    
    let avatarHtml = `<span class="mini-avatar">${escapeHtml(initials(user?.name || email))}</span>`;
    if (user?.avatarUrl) {
      avatarHtml = `<span class="mini-avatar" style="background-image: url(${user.avatarUrl}); background-size: cover; background-position: center;"></span>`;
    }
    
    let waHtml = "";
    if (user?.wa) {
      let waNum = user.wa.replace(/\D/g, "");
      if (waNum.startsWith("0")) waNum = "62" + waNum.substring(1);
      waHtml = `<a href="https://wa.me/${waNum}" target="_blank" class="wa-link" title="Chat WA" style="position: absolute; right: 8px; top: 50%; transform: translateY(-50%); color: #25D366;">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
      </a>`;
    }

    let roleHtml = user?.role ? ` • <i>${escapeHtml(user.role)}</i>` : "";

    item.innerHTML = `
      ${avatarHtml}
      <span>${escapeHtml(user?.name || email)}${roleHtml}<br><small>${escapeHtml(email)}</small></span>
      ${waHtml}
    `;
    els.memberList.append(item);
  });
}

function renderHeader() {
  const workspace = getActiveWorkspace();
  if (!workspace) return;

  const activePeriod = getActivePeriod(workspace);
  els.workspaceTitle.textContent = workspace.name;
  els.periodLabel.textContent = activePeriod
    ? `Periode aktif sejak ${formatDate(activePeriod.startedAt)}`
    : "Periode aktif";
}

function renderTotals() {
  const workspace = getActiveWorkspace();
  if (!workspace) return;

  const totals = calculateTotals(workspace);
  els.incomeTotal.forEach(el => el.textContent = formatSummaryCurrency(totals.income));
  els.expenseTotal.forEach(el => el.textContent = formatSummaryCurrency(totals.expense));
  els.balanceTotal.forEach(el => el.textContent = formatSummaryCurrency(totals.income - totals.expense));
  els.savingTotal.forEach(el => el.textContent = showSavings ? formatSummaryCurrency(totals.saving) : "***");
}

function renderTypeSwitch() {
  els.switchOptions.forEach((button) => {
    button.classList.toggle("active", button.dataset.type === selectedType);
  });

  const placeholder = {
    expense: "Contoh: makan siang, bensin, listrik",
    income: "Contoh: gaji, bonus, hasil jualan",
    saving: "Contoh: tabung motor, dana darurat",
  }[selectedType];

  els.transactionNoteInput.placeholder = placeholder;
}

function checkPaydayAlert(workspace) {
  if (!els.paydayAlertContainer) return;
  const user = state.users[state.currentEmail];
  const payday = user?.payday;
  
  if (!payday) {
    els.paydayAlertContainer.classList.add("hidden");
    return;
  }

  const activePeriod = getActivePeriod(workspace);
  const periodStart = activePeriod ? new Date(activePeriod.startedAt) : null;
  const now = new Date();
  
  let recentPayday = new Date(now.getFullYear(), now.getMonth(), payday);
  if (now.getDate() < payday) {
    recentPayday.setMonth(recentPayday.getMonth() - 1);
  }

  if (periodStart && periodStart < recentPayday) {
    els.paydayAlertContainer.classList.remove("hidden");
  } else {
    els.paydayAlertContainer.classList.add("hidden");
  }
}

function renderFeed() {
  const workspace = getActiveWorkspace();
  if (!workspace) return;

  checkPaydayAlert(workspace);

  els.feedTitle.textContent = "Catatan periode ini";
  els.feedSubtitle.textContent = "Tabungan tidak tampil di chat bersama.";

  const activePeriodId = workspace.activePeriodId;
  const transactions = workspace.transactions
    .filter((transaction) => transaction.type !== "saving")
    .filter((transaction) => transaction.periodId === activePeriodId)
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

  els.chatFeed.innerHTML = "";

  if (!transactions.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "Belum ada catatan.";
    els.chatFeed.append(empty);
    return;
  }

  const fragment = document.createDocumentFragment();
  transactions.forEach((transaction) => {
    fragment.append(createTransactionBubble(transaction));
    fragment.append(createSystemReply(transaction));
  });
  els.chatFeed.append(fragment);
  scrollFeedToBottom();
}

function renderArchive() {
  const workspace = getActiveWorkspace();
  if (!workspace) return;

  const activePeriodId = workspace.activePeriodId;
  const transactions = workspace.transactions
    .filter((transaction) => transaction.type !== "saving")
    .filter((transaction) => transaction.periodId !== activePeriodId)
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

  els.archiveFeed.innerHTML = "";

  if (!transactions.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "Belum ada arsip dari periode sebelumnya.";
    els.archiveFeed.append(empty);
    return;
  }

  const fragment = document.createDocumentFragment();
  transactions.forEach((transaction) => {
    fragment.append(createTransactionBubble(transaction));
    fragment.append(createSystemReply(transaction));
  });
  els.archiveFeed.append(fragment);
  els.archiveFeed.scrollTop = els.archiveFeed.scrollHeight;
}

function createTransactionBubble(transaction) {
  const author = state.users[transaction.actorEmail];
  const message = document.createElement("article");
  const mine = transaction.actorEmail === state.currentEmail;
  let avatarHtml = `<span class="mini-avatar">${escapeHtml(initials(author?.name || transaction.actorEmail))}</span>`;
  if (author?.avatarUrl) {
    avatarHtml = `<span class="mini-avatar" style="background-image: url(${author.avatarUrl}); background-size: cover; background-position: center;"></span>`;
  }

  message.className = `message ${mine ? "mine" : ""}`;
  message.innerHTML = `
    ${avatarHtml}
    <div class="bubble">
      <div class="bubble-header">
        <strong>${escapeHtml(author?.name || transaction.actorEmail)}</strong>
        <span>${formatTime(transaction.createdAt)}</span>
      </div>
      <div>${escapeHtml(transaction.note)}</div>
      <div class="bubble-total">
        <span class="tag ${transaction.type}">${TYPE_LABELS[transaction.type]}</span>
        <span>${formatCurrency(transaction.amount)}</span>
      </div>
    </div>
  `;
  return message;
}

function createSystemReply(transaction) {
  const message = document.createElement("article");
  message.className = "message system";
  const sign = transaction.type === "income" ? "menambah pendapatan" : "menambah pengeluaran";
  message.innerHTML = `
    <div class="bubble">
      Tercatat ${formatCurrency(transaction.amount)} untuk ${escapeHtml(transaction.note)} dan ${sign}.
    </div>
  `;
  return message;
}

function refreshWorkspace(workspace) {
  const oldPeriod = getActivePeriod(workspace);
  if (oldPeriod) {
    oldPeriod.endedAt = new Date().toISOString();
  }

  const newPeriod = {
    id: createId("period"),
    label: `Periode ${workspace.periods.length + 1}`,
    startedAt: new Date().toISOString(),
    endedAt: null,
  };

  workspace.periods.push(newPeriod);
  workspace.activePeriodId = newPeriod.id;
  showArchive = false;
  saveState();
  render();
  showToast("Periode baru dimulai. Tabungan privat tetap tersimpan.");
}

function calculateTotals(workspace) {
  return workspace.transactions.reduce(
    (totals, transaction) => {
      if (transaction.type === "saving" && transaction.privateOwnerEmail === state.currentEmail) {
        totals.saving += transaction.amount;
        return totals;
      }

      if (transaction.periodId !== workspace.activePeriodId) {
        return totals;
      }

      if (transaction.type === "income") {
        totals.income += transaction.amount;
      }

      if (transaction.type === "expense") {
        totals.expense += transaction.amount;
      }

      return totals;
    },
    { income: 0, expense: 0, saving: 0 }
  );
}

function ensureUser(email, name) {
  let modified = false;
  
  if (!state.users[email]) {
    state.users[email] = {
      email,
      name,
      tier: "free",
      createdAt: new Date().toISOString(),
    };
    modified = true;
  } else {
    if (name && state.users[email].name !== name) {
      state.users[email].name = name;
      modified = true;
    }
    if (!state.users[email].tier) {
      state.users[email].tier = "free";
      modified = true;
    }
  }
  // Data will be synced to Firebase when saveState() is called shortly after.
}

async function ensureActiveWorkspaceAsync() {
  if (!state.currentEmail) return;

  const workspaces = getUserWorkspaces();
  const activeIsAvailable = workspaces.some((workspace) => workspace.id === state.activeWorkspaceId);

  // If local list is empty, let's wait a tiny bit for snapshot to arrive (if it exists)
  if (!workspaces.length) {
    await new Promise(r => setTimeout(r, 500));
  }

  const updatedWorkspaces = getUserWorkspaces();
  
  if (!updatedWorkspaces.length) {
    const workspace = createWorkspace("Ruang Bersama", state.currentEmail);
    state.activeWorkspaceId = workspace.id;
    return;
  }

  const newActiveIsAvailable = updatedWorkspaces.some((workspace) => workspace.id === state.activeWorkspaceId);
  if (!newActiveIsAvailable) {
    state.activeWorkspaceId = updatedWorkspaces[0].id;
  }
}

function ensureActiveWorkspace() {
  if (!state.currentEmail) return;

  const workspaces = getUserWorkspaces();
  const activeIsAvailable = workspaces.some((workspace) => workspace.id === state.activeWorkspaceId);

  if (!workspaces.length) {
    return; // Do not auto-create synchronously, rely on async fetch
  }

  if (!activeIsAvailable) {
    state.activeWorkspaceId = workspaces[0].id;
  }
}

function createWorkspace(name, ownerEmail) {
  const firstPeriod = {
    id: createId("period"),
    label: "Periode 1",
    startedAt: new Date().toISOString(),
    endedAt: null,
  };

  const workspace = {
    id: createId("room"),
    name,
    ownerEmail,
    members: [ownerEmail],
    invites: [],
    activePeriodId: firstPeriod.id,
    periods: [firstPeriod],
    transactions: [],
    createdAt: new Date().toISOString(),
  };

  state.workspaces[workspace.id] = workspace;
  return workspace;
}

function migrateInvitesForCurrentUser() {
  if (!state.currentEmail) return;

  Object.values(state.workspaces).forEach((workspace) => {
    const inviteIndex = workspace.invites.indexOf(state.currentEmail);
    if (inviteIndex >= 0) {
      workspace.invites.splice(inviteIndex, 1);
      if (!workspace.members.includes(state.currentEmail)) {
        workspace.members.push(state.currentEmail);
      }
    }
  });
}

function getUserWorkspaces() {
  if (!state.currentEmail) return [];
  return Object.values(state.workspaces).filter((workspace) => {
    return workspace.members.includes(state.currentEmail);
  });
}

function getActiveWorkspace() {
  return state.workspaces[state.activeWorkspaceId] || null;
}

function getActivePeriod(workspace) {
  return workspace.periods.find((period) => period.id === workspace.activePeriodId) || null;
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const local = raw ? JSON.parse(raw) : {};
    return { 
      ...structuredClone(DEFAULT_DATA), 
      currentEmail: local.currentEmail || null,
      activeWorkspaceId: local.activeWorkspaceId || null
    };
  } catch {
    return structuredClone(DEFAULT_DATA);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    currentEmail: state.currentEmail,
    activeWorkspaceId: state.activeWorkspaceId
  }));

  if (state.currentEmail && state.users[state.currentEmail]) {
    setDoc(doc(db, "users", state.currentEmail), state.users[state.currentEmail]).catch(console.error);
  }

  if (state.activeWorkspaceId && state.workspaces[state.activeWorkspaceId]) {
    setDoc(doc(db, "workspaces", state.activeWorkspaceId), state.workspaces[state.activeWorkspaceId]).catch(console.error);
  }
}

function normalizeEmail(value) {
  return value.trim().toLowerCase();
}

function parseAmount(value) {
  const digits = String(value).replace(/[^\d]/g, "");
  return Number(digits || 0);
}

function formatPlainNumber(value) {
  return new Intl.NumberFormat("id-ID").format(value);
}

function formatCurrency(value) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatSummaryCurrency(value) {
  if (value === 0) return "0";
  
  const abs = Math.abs(value);
  if (abs >= 1000000) {
    const inJt = value / 1000000;
    return Number.isInteger(inJt) ? `${inJt}jt` : `${inJt.toFixed(1)}jt`;
  } else if (abs >= 1000) {
    const inK = value / 1000;
    return Number.isInteger(inK) ? `${inK}k` : `${inK.toFixed(1)}k`;
  } else {
    return `${value}`;
  }
}

function formatDate(value) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function formatTime(value) {
  return new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function initials(value) {
  return String(value)
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}

function createId(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

function offsetDate(baseDate, minutes) {
  return new Date(baseDate.getTime() + minutes * 60 * 1000).toISOString();
}

let deferredPrompt;
function setupInstallBanner() {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;
    
    if (!localStorage.getItem("installBannerDismissed")) {
      els.installBanner.classList.remove("hidden");
      setTimeout(() => els.installBanner.classList.add("show"), 100);
    }
  });
}

function startHourlyReminder() {
  // Check every minute
  setInterval(() => {
    if (!state.currentEmail) return;
    
    const now = new Date();
    const hour = now.getHours();
    const minute = now.getMinutes();

    // Only alert between 7 AM and 10 PM (inclusive), exactly at minute 0
    if (hour >= 7 && hour <= 22 && minute === 0) {
      const lastAlert = localStorage.getItem("lastHourlyAlert");
      const currentAlertId = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}-${hour}`;
      
      if (lastAlert !== currentAlertId) {
        localStorage.setItem("lastHourlyAlert", currentAlertId);
        
        // Show local OS notification if allowed
        if ('Notification' in window && window.Notification.permission === "granted") {
          new window.Notification("AiFa - Waktunya Mencatat", {
            body: `Sudah jam ${hour}:00 nih, ada pengeluaran yang perlu dicatat?`,
            icon: "./icon-192.png"
          });
        }
        
        showToast(`Sudah jam ${hour}:00 nih, ada pengeluaran yang perlu dicatat?`);
      }
    }
  }, 60 * 1000);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function scrollFeedToBottom() {
  requestAnimationFrame(() => {
    els.chatFeed.scrollTop = els.chatFeed.scrollHeight;
  });
}

let toastTimer = null;

function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.remove("hidden");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    els.toast.classList.add("hidden");
  }, 2600);
}
