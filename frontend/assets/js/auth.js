/* =========================================================
   Auth
   ========================================================= */

/**
 * Responsável por autenticação no frontend.
 *
 * Regras importantes:
 * - Não salvar senha em produção.
 * - Não salvar passwordHash real no frontend.
 * - Não imprimir token no console.
 * - Não colocar JWT_SECRET no frontend.
 * - Frontend ajuda na experiência, mas backend é a autoridade final.
 */

const LOCAL_ACCOUNTS_KEY = "bora_treinar_local_accounts";
const INVALID_CREDENTIALS_MESSAGE = "Email ou senha inválidos.";

/* =========================================================
   TOKEN
   ========================================================= */

function getAccessToken() {
  return getStorageItem(APP_CONFIG.STORAGE_KEYS.ACCESS_TOKEN);
}

function setAccessToken(token) {
  if (!token) return;

  setStorageItem(APP_CONFIG.STORAGE_KEYS.ACCESS_TOKEN, token);
}

function clearAccessToken() {
  removeStorageItem(APP_CONFIG.STORAGE_KEYS.ACCESS_TOKEN);
}

/* =========================================================
   USER STORAGE
   ========================================================= */

function sanitizeUser(user) {
  if (!user) return null;

  const subscriptionStatus =
    user.subscriptionStatus || user.subscription_status || APP_CONFIG.SUBSCRIPTION_STATUS.FREE;
  const isPremiumAccount = subscriptionStatus === APP_CONFIG.SUBSCRIPTION_STATUS.ACTIVE;

  return {
    id: user.id ?? null,
    name: user.name ?? user.fullName ?? "Usuário",
    email: user.email ?? "",
    role: user.role ?? APP_CONFIG.ROLES.USER,
    roles: Array.isArray(user.roles) ? user.roles : [],
    subscriptionStatus,
    emailVerified: Boolean(user.emailVerified ?? user.email_verified),
    premium: Boolean(user.premium ?? isPremiumAccount),
    premiumActive: Boolean(user.premiumActive ?? user.premium ?? isPremiumAccount),
    avatarUrl: user.avatarUrl ?? null,
    xp: user.xp ?? 0,
    streak: user.streak ?? 0,
  };
}

function setStoredUser(user) {
  const safeUser = sanitizeUser(user);

  if (!safeUser) return;

  setStorageJSON(APP_CONFIG.STORAGE_KEYS.USER, safeUser);
}

function getStoredUser() {
  return getStorageJSON(APP_CONFIG.STORAGE_KEYS.USER);
}

function clearStoredUser() {
  removeStorageItem(APP_CONFIG.STORAGE_KEYS.USER);
}

function clearLegacyAuthData() {
  [
    "bt_token",
    "bt_refresh_token",
    "bt_user",
    "bora_treinar_token",
    "boraTreinarToken",
    "boraTreinarUser",
  ].forEach((key) => {
    removeStorageItem(key);
  });
}

function clearAuthData() {
  clearAccessToken();
  clearStoredUser();
  clearLegacyAuthData();
}

/* =========================================================
   AUTH STATUS
   ========================================================= */

function isAuthenticated() {
  return Boolean(getAccessToken());
}

function getCurrentUser() {
  return getStoredUser();
}

function getCurrentUserRole() {
  const user = getCurrentUser();

  return user?.role || APP_CONFIG.ROLES.USER;
}

function getCurrentUserRoles() {
  const user = getCurrentUser();

  const roles = [];

  if (user?.role) {
    roles.push(user.role);
  }

  if (Array.isArray(user?.roles)) {
    roles.push(...user.roles);
  }

  return [...new Set(roles)];
}

function hasRole(role) {
  return getCurrentUserRoles().includes(role);
}

function isAdmin() {
  return hasRole(APP_CONFIG.ROLES.ADMIN);
}

function isPremium() {
  const user = getCurrentUser();

  return Boolean(user?.premiumActive || user?.premium);
}

/* =========================================================
   LOCAL AUTH FALLBACK
   ========================================================= */

function createLocalToken() {
  return `local-token-${Date.now()}`;
}

function normalizeLocalEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function createLocalUser(email = "", name = "") {
  const normalizedEmail = normalizeLocalEmail(email);
  const emailName = normalizedEmail.split("@")[0] || "";
  const displayName = String(name || "").trim() || formatNameFromEmail(emailName) || "Usuário";

  return {
    id: normalizedEmail || `local-user-${Date.now()}`,
    name: displayName,
    email: normalizedEmail,
    role: APP_CONFIG.ROLES.USER,
    roles: [APP_CONFIG.ROLES.USER],
    subscriptionStatus: APP_CONFIG.SUBSCRIPTION_STATUS.FREE,
    emailVerified: false,
    premium: false,
    premiumActive: false,
    avatarUrl: null,
    xp: 0,
    streak: 0,
  };
}

function getLocalAccounts() {
  const accounts = getStorageJSON(LOCAL_ACCOUNTS_KEY);

  return accounts && typeof accounts === "object" && !Array.isArray(accounts)
    ? accounts
    : {};
}

function saveLocalAccounts(accounts) {
  setStorageJSON(LOCAL_ACCOUNTS_KEY, accounts || {});
}

function getLocalAccountByEmail(email) {
  const accounts = getLocalAccounts();
  const normalizedEmail = normalizeLocalEmail(email);

  return accounts[normalizedEmail] || null;
}

function saveLocalAccount({ name, email, password }) {
  const normalizedEmail = normalizeLocalEmail(email);
  const accounts = getLocalAccounts();

  if (accounts[normalizedEmail]) {
    throw new Error("Já existe uma conta local com este email neste navegador.");
  }

  const user = createLocalUser(normalizedEmail, name);

  accounts[normalizedEmail] = {
    user,
    password,
    createdAt: new Date().toISOString(),
  };

  saveLocalAccounts(accounts);

  return user;
}

function formatNameFromEmail(value) {
  return String(value || "")
    .replaceAll(/[._-]+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean)
    .map((part) => {
      return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
    })
    .join(" ");
}

function shouldUseLocalAuth() {
  return Boolean(APP_CONFIG?.FEATURES?.USE_LOCAL_AUTH);
}

function normalizeAuthResponse(response) {
  const data = response?.data || response;
  const token =
    data?.accessToken || data?.token || data?.jwt || data?.access_token || null;
  const user = data?.user || data?.profile || null;

  return {
    accessToken: token,
    user: sanitizeUser(user),
  };
}

function persistAuthResponse(response) {
  const authResponse = normalizeAuthResponse(response);

  if (!authResponse.accessToken) {
    throw new Error("Autenticação realizada, mas nenhum token foi retornado.");
  }

  setAccessToken(authResponse.accessToken);

  if (authResponse.user) {
    setStoredUser(authResponse.user);
  }

  return authResponse;
}

/* =========================================================
   LOGIN
   ========================================================= */

async function loginUser({ email, password }) {
  if (isEmpty(email)) {
    throw new Error("Informe seu email.");
  }

  if (!isValidEmail(email)) {
    throw new Error("Informe um email válido.");
  }

  if (isEmpty(password)) {
    throw new Error("Informe sua senha.");
  }

  if (shouldUseLocalAuth()) {
    await wait(400);

    const account = getLocalAccountByEmail(email);

    if (!account || account.password !== password) {
      throw new Error(INVALID_CREDENTIALS_MESSAGE);
    }

    const localToken = createLocalToken();
    const localUser = sanitizeUser(account.user);

    setAccessToken(localToken);
    setStoredUser(localUser);

    return {
      accessToken: localToken,
      user: localUser,
    };
  }

  const response = await apiRequest("/auth/login", {
    method: "POST",
    body: {
      email,
      password,
    },
    skipAuthHandling: true,
  });

  return persistAuthResponse(response);
}

/* =========================================================
   REGISTER
   ========================================================= */

async function registerUser({ name, email, password, confirmPassword }) {
  if (isEmpty(name)) {
    throw new Error("Informe seu nome.");
  }

  if (isEmpty(email)) {
    throw new Error("Informe seu email.");
  }

  if (!isValidEmail(email)) {
    throw new Error("Informe um email válido.");
  }

  if (isEmpty(password)) {
    throw new Error("Informe sua senha.");
  }

  if (!isValidPassword(password)) {
    throw new Error("A senha deve ter pelo menos 8 caracteres.");
  }

  if (password !== confirmPassword) {
    throw new Error("A confirmação de senha não confere.");
  }

  if (shouldUseLocalAuth()) {
    await wait(500);

    const localUser = saveLocalAccount({ name, email, password });
    const localToken = createLocalToken();

    setAccessToken(localToken);
    setStoredUser(localUser);

    return {
      accessToken: localToken,
      user: localUser,
    };
  }

  const response = await apiRequest("/auth/register", {
    method: "POST",
    body: {
      name,
      email,
      password,
    },
    skipAuthHandling: true,
  });

  return persistAuthResponse(response);
}

/* =========================================================
   LOGOUT
   ========================================================= */

function logoutUser() {
  clearAuthData();

  redirectTo(APP_CONFIG.ROUTES.LOGIN);
}

/* =========================================================
   LOAD CURRENT USER
   ========================================================= */

async function loadCurrentUser() {
  if (!isAuthenticated()) {
    return null;
  }

  if (shouldUseLocalAuth()) {
    const storedUser = getStoredUser();

    if (!storedUser?.email) {
      clearAuthData();
      return null;
    }

    const account = getLocalAccountByEmail(storedUser.email);

    if (!account) {
      clearAuthData();
      return null;
    }

    return sanitizeUser(account.user || storedUser);
  }

  try {
    const response = await apiRequest("/users/me", {
      method: "GET",
    });

    const user = response?.data || response;

    if (!user) {
      clearAuthData();
      return null;
    }

    setStoredUser(user);

    return sanitizeUser(user);
  } catch (error) {
    clearAuthData();

    if (error?.status === 401) {
      redirectTo(APP_CONFIG.ROUTES.LOGIN);
    }

    throw error;
  }
}

/* =========================================================
   AUTH GUARDS
   ========================================================= */

function requireAuth() {
  if (!isAuthenticated()) {
    clearAuthData();
    redirectTo(APP_CONFIG.ROUTES.LOGIN);
    return false;
  }

  return true;
}

async function requireValidSession() {
  if (!requireAuth()) {
    return false;
  }

  try {
    const user = await loadCurrentUser();

    if (!user) {
      clearAuthData();
      redirectTo(APP_CONFIG.ROUTES.LOGIN);
      return false;
    }

    return true;
  } catch {
    clearAuthData();
    redirectTo(APP_CONFIG.ROUTES.LOGIN);
    return false;
  }
}

function requireGuest() {
  if (isAuthenticated()) {
    redirectTo(APP_CONFIG.ROUTES.DASHBOARD);
    return false;
  }

  return true;
}

function requireAdmin() {
  if (!requireAuth()) {
    return false;
  }

  if (!isAdmin()) {
    renderAccessDeniedPage("Acesso restrito a administradores.");
    return false;
  }

  return true;
}

function requirePremium() {
  if (!requireAuth()) {
    return false;
  }

  if (!isPremium()) {
    renderPremiumRequiredPage();
    return false;
  }

  return true;
}

/* =========================================================
   ACCESS DENIED / PREMIUM REQUIRED
   ========================================================= */

function renderAccessDeniedPage(
  message = "Você não tem permissão para acessar esta página.",
) {
  const content = qs(".page-content") || qs("main") || document.body;

  content.innerHTML = `
    <div class="error-state">
      <strong>Acesso negado</strong>
      <p>${escapeHTML(message)}</p>
      <a class="btn btn-primary mt-md" href="${APP_CONFIG.ROUTES.DASHBOARD}">
        Voltar para o dashboard
      </a>
    </div>
  `;
}

function renderPremiumRequiredPage() {
  const content = qs(".page-content") || qs("main") || document.body;

  content.innerHTML = `
    <div class="premium-locked">
      <div>
        <div class="premium-locked-title">Recurso Premium</div>
        <p class="premium-locked-description">
          Este recurso está disponível apenas para usuários premium.
        </p>
      </div>
      <a class="btn btn-primary" href="${APP_CONFIG.ROUTES.PREMIUM}">
        Conhecer Premium
      </a>
    </div>
  `;
}

/* =========================================================
   PAGE HELPERS
   ========================================================= */

function updateUserUI() {
  const user = getCurrentUser();

  const name = user?.name || "Usuário";
  const role = user?.role || APP_CONFIG.ROLES.USER;
  const initials = getInitials(name);

  qsa("[data-user-name]").forEach((element) => {
    setText(element, name);
  });

  qsa("[data-user-role]").forEach((element) => {
    setText(element, role);
  });

  qsa("[data-user-initials]").forEach((element) => {
    setText(element, initials);
  });

  qsa("[data-premium-status]").forEach((element) => {
    setText(element, isPremium() ? "Premium" : "Gratuito");
  });

  qsa("[data-admin-only]").forEach((element) => {
    if (isAdmin()) {
      showElement(element);
    } else {
      hideElement(element);
    }
  });
}

function setupLogoutButtons() {
  qsa("[data-logout]").forEach((button) => {
    on(button, "click", (event) => {
      event.preventDefault();
      logoutUser();
    });
  });
}

function setupAuthPage() {
  requireGuest();
}

function revealProtectedPage() {
  document.body.classList.add("auth-ready");
}

async function setupProtectedPage() {
  const hasValidSession = await requireValidSession();

  if (!hasValidSession) {
    return;
  }

  updateUserUI();
  setupLogoutButtons();
  revealProtectedPage();
}

/* =========================================================
   PUBLIC API
   ========================================================= */

const AuthPublicApi = {
  clearAuthData,
  getAccessToken,
  getCurrentUser,
  getCurrentUserRole,
  getCurrentUserRoles,
  hasRole,
  isAdmin,
  isAuthenticated,
  isPremium,
  loadCurrentUser,
  login: loginUser,
  loginUser,
  logout: logoutUser,
  logoutUser,
  registerUser,
  requireAdmin,
  requireAuth,
  requireGuest,
  requirePremium,
  requireValidSession,
  setupProtectedPage,
};

window.Auth = AuthPublicApi;
window.BTAuth = AuthPublicApi;

/* =========================================================
   AUTO INIT
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {
  setupLogoutButtons();

  const pageType = document.body.dataset.pageType;

  if (pageType === "auth") {
    setupAuthPage();
  }

  if (pageType === "protected") {
    setupProtectedPage();
  }

  if (pageType === "admin") {
    setupProtectedPage().then(() => {
      requireAdmin();
    });
  }

  if (pageType === "premium") {
    setupProtectedPage().then(() => {
      requirePremium();
    });
  }
});
