/* =========================================================
   Frontend config
   ========================================================= */

/**
 * Configurações globais do frontend.
 *
 * Importante:
 * - Nunca coloque JWT_SECRET aqui.
 * - Nunca coloque senha do banco aqui.
 * - Nunca coloque chave de IA aqui.
 * - Nunca coloque chave de pagamento aqui.
 * - Frontend pode ter URL pública da API, mas nunca secrets.
 */

const GITHUB_PAGES_REPOSITORY_NAME = "bora-treinar";
const IS_GITHUB_PAGES_HOST = window.location.hostname.endsWith(".github.io");
const IS_S3_WEBSITE_HOST = isS3WebsiteHost(window.location.hostname);
const IS_STATIC_PUBLIC_HOST = IS_GITHUB_PAGES_HOST || IS_S3_WEBSITE_HOST;

function isS3WebsiteHost(hostname) {
  const normalizedHostname = String(hostname || "").toLowerCase();

  return (
    normalizedHostname.includes(".s3-website-") &&
    normalizedHostname.endsWith(".amazonaws.com")
  );
}

function detectFrontendBasePath() {
  const pathname = window.location.pathname || "/";
  const hostname = window.location.hostname || "";

  if (pathname.includes("/frontend/")) {
    return "/frontend";
  }

  if (hostname.endsWith(".github.io")) {
    const firstPathSegment = pathname.split("/").filter(Boolean)[0];

    if (firstPathSegment === GITHUB_PAGES_REPOSITORY_NAME) {
      return `/${GITHUB_PAGES_REPOSITORY_NAME}`;
    }
  }

  return "";
}

const APP_FRONTEND_BASE_PATH = detectFrontendBasePath();

const APP_CONFIG = {
  APP_NAME: "Bora Treinar",
  APP_VERSION: "local",

  API_BASE_URL: "http://localhost:8080/api/v1",

  ROUTES: {
    INDEX: `${APP_FRONTEND_BASE_PATH}/index.html`,
    LOGIN: `${APP_FRONTEND_BASE_PATH}/pages/auth/login.html`,
    REGISTER: `${APP_FRONTEND_BASE_PATH}/pages/auth/register.html`,
    DASHBOARD: `${APP_FRONTEND_BASE_PATH}/pages/dashboard/dashboard.html`,
    WORKOUTS: `${APP_FRONTEND_BASE_PATH}/pages/workouts/workouts.html`,
    WORKOUT_FORM: `${APP_FRONTEND_BASE_PATH}/pages/workouts/workout-form.html`,
    WORKOUT_DETAIL: `${APP_FRONTEND_BASE_PATH}/pages/workouts/workout-detail.html`,
    WORKOUT_SESSION: `${APP_FRONTEND_BASE_PATH}/pages/workouts/workout-session.html`,
    WORKOUT_TIMER: `${APP_FRONTEND_BASE_PATH}/pages/workouts/workout-timer.html`,
    WORKOUT_SESSION_DETAIL: `${APP_FRONTEND_BASE_PATH}/pages/workouts/workout-session-detail.html`,
    EXERCISES: `${APP_FRONTEND_BASE_PATH}/pages/exercises/exercises.html`,
    COMMUNITIES: `${APP_FRONTEND_BASE_PATH}/pages/communities/communities.html`,
    COMMUNITY_DETAIL: `${APP_FRONTEND_BASE_PATH}/pages/communities/community-detail.html`,
    SEARCH: `${APP_FRONTEND_BASE_PATH}/pages/search.html`,
    RANKING: `${APP_FRONTEND_BASE_PATH}/pages/ranking.html`,
    PREMIUM: `${APP_FRONTEND_BASE_PATH}/pages/premium/premium.html`,
    PROFILE: `${APP_FRONTEND_BASE_PATH}/pages/profile/profile.html`,
    SETTINGS: `${APP_FRONTEND_BASE_PATH}/pages/settings/settings.html`,
    ADMIN_DASHBOARD: `${APP_FRONTEND_BASE_PATH}/pages/admin/admin-dashboard.html`,
    ERROR_403: `${APP_FRONTEND_BASE_PATH}/pages/errors/403.html`,
    ERROR_404: `${APP_FRONTEND_BASE_PATH}/pages/errors/404.html`,
    ERROR_500: `${APP_FRONTEND_BASE_PATH}/pages/errors/500.html`,
  },

  PRETTY_ROUTES: {
    INDEX: "/",
    LOGIN: "/entrar",
    REGISTER: "/cadastro",
    DASHBOARD: "/inicio",
    WORKOUTS: "/treinos",
    WORKOUT_FORM: "/treinos/novo",
    WORKOUT_DETAIL: "/treinos/detalhe",
    WORKOUT_SESSION: "/treinos/sessao",
    WORKOUT_TIMER: "/treinos/foco",
    WORKOUT_SESSION_DETAIL: "/treinos/sessao/detalhe",
    EXERCISES: "/exercicios",
    COMMUNITIES: "/comunidades",
    COMMUNITY_DETAIL: "/comunidades/detalhe",
    SEARCH: "/pesquisa",
    RANKING: "/ranking",
    PREMIUM: "/premium",
    PROFILE: "/perfil",
    SETTINGS: "/configuracoes",
    ADMIN_DASHBOARD: "/admin",
    ERROR_403: "/403",
    ERROR_404: "/404",
    ERROR_500: "/500",
  },

  IMPLEMENTED_FRONTEND_ROUTE_KEYS: [
    "INDEX",
    "LOGIN",
    "REGISTER",
    "DASHBOARD",
    "WORKOUTS",
    "WORKOUT_FORM",
    "WORKOUT_DETAIL",
    "WORKOUT_SESSION",
    "WORKOUT_TIMER",
    "WORKOUT_SESSION_DETAIL",
    "EXERCISES",
    "COMMUNITIES",
    "SEARCH",
    "RANKING",
    "PREMIUM",
    "PROFILE",
    "SETTINGS",
    "ERROR_403",
    "ERROR_404",
    "ERROR_500",
  ],

  STORAGE_KEYS: {
    ACCESS_TOKEN: "bora_treinar_access_token",
    USER: "bora_treinar_user",
    THEME: "bora_treinar_theme",
  },

  UI: {
    DEFAULT_PAGE_TITLE: "Bora Treinar",
    TOAST_DURATION: 3500,
    LOADING_DELAY: 250,
  },

  PAGINATION: {
    DEFAULT_PAGE: 0,
    DEFAULT_SIZE: 10,
    MAX_SIZE: 50,
  },

  FEATURES: {
    USE_LOCAL_AUTH: IS_STATIC_PUBLIC_HOST,
    ENABLE_AI_WORKOUT: true,
    ENABLE_PREMIUM: true,
    ENABLE_ADMIN_MENU: false,
    STATIC_DEMO_MODE: IS_STATIC_PUBLIC_HOST,
  },

  ROLES: {
    USER: "USER",
    PERSONAL: "PERSONAL",
    NUTRITIONIST: "NUTRITIONIST",
    ADMIN: "ADMIN",
  },

  SUBSCRIPTION_STATUS: {
    FREE: "FREE",
    ACTIVE: "ACTIVE",
    CANCELLED: "CANCELLED",
    EXPIRED: "EXPIRED",
    PENDING: "PENDING",
  },
};

APP_CONFIG.FILE_ROUTES = { ...APP_CONFIG.ROUTES };

function buildApiUrl(endpoint) {
  if (!endpoint) {
    return APP_CONFIG.API_BASE_URL;
  }

  const normalizedEndpoint = endpoint.startsWith("/")
    ? endpoint
    : `/${endpoint}`;

  return `${APP_CONFIG.API_BASE_URL}${normalizedEndpoint}`;
}

function getRoute(routeName) {
  const normalizedRouteName = toRouteConstant(routeName);

  return (
    APP_CONFIG.ROUTES[routeName] ||
    APP_CONFIG.ROUTES[normalizedRouteName] ||
    APP_CONFIG.ROUTES.INDEX
  );
}

function getPrettyRoute(routeName) {
  const normalizedRouteName = toRouteConstant(routeName);

  return (
    APP_CONFIG.PRETTY_ROUTES[routeName] ||
    APP_CONFIG.PRETTY_ROUTES[normalizedRouteName] ||
    null
  );
}

function toRouteConstant(routeName) {
  return String(routeName || "")
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[-\s]+/g, "_")
    .toUpperCase();
}

function isGitHubPagesHost() {
  return IS_GITHUB_PAGES_HOST;
}

function isS3StaticWebsiteHost() {
  return IS_S3_WEBSITE_HOST;
}

function isStaticPublicHost() {
  return IS_STATIC_PUBLIC_HOST;
}

function isStaticDemoMode() {
  return APP_CONFIG.FEATURES.STATIC_DEMO_MODE === true;
}

function shouldUsePrettyRoutes() {
  const hostname = window.location.hostname;
  const localHosts = ["", "localhost", "127.0.0.1", "0.0.0.0"];

  return (
    APP_FRONTEND_BASE_PATH === "" &&
    window.location.protocol !== "file:" &&
    !localHosts.includes(hostname) &&
    !isGitHubPagesHost() &&
    !isS3StaticWebsiteHost()
  );
}

function normalizeRoutePath(pathname) {
  const normalizedPath = String(pathname || "/")
    .replace(/\/+$/, "")
    .replace(/\.html$/, "");

  return normalizedPath || "/";
}

function redirectLegacyRouteToPrettyRoute() {
  if (!shouldUsePrettyRoutes()) {
    return;
  }

  const currentPath = normalizeRoutePath(window.location.pathname);
  const fileRoutes = APP_CONFIG.FILE_ROUTES || APP_CONFIG.ROUTES;

  Object.entries(fileRoutes).some(([routeKey, fileRoute]) => {
    const filePath = normalizeRoutePath(new URL(fileRoute, window.location.origin).pathname);
    const prettyRoute = getPrettyRoute(routeKey);

    if (!prettyRoute || currentPath !== filePath) {
      return false;
    }

    const targetUrl = `${prettyRoute}${window.location.search}${window.location.hash}`;

    if (targetUrl !== `${window.location.pathname}${window.location.search}${window.location.hash}`) {
      window.location.replace(targetUrl);
    }

    return true;
  });
}

function applyPrettyRoutes() {
  if (!shouldUsePrettyRoutes()) {
    return;
  }

  Object.entries(APP_CONFIG.PRETTY_ROUTES).forEach(([routeKey, prettyRoute]) => {
    if (APP_CONFIG.ROUTES[routeKey]) {
      APP_CONFIG.ROUTES[routeKey] = prettyRoute;
    }
  });
}

function isLocalAuthEnabled() {
  return APP_CONFIG.FEATURES.USE_LOCAL_AUTH === true;
}

function getSavedTheme() {
  try {
    return localStorage.getItem(APP_CONFIG.STORAGE_KEYS.THEME) || "dark";
  } catch (error) {
    return "dark";
  }
}

function applyStoredTheme() {
  const shouldUseDarkTheme = getSavedTheme() === "dark";

  document.documentElement.classList.toggle("dark-mode", shouldUseDarkTheme);

  if (document.body) {
    document.body.classList.toggle("dark-mode", shouldUseDarkTheme);
  }
}

function getThemeStylesheetHref() {
  return `${APP_FRONTEND_BASE_PATH}/assets/css/theme.css`;
}

function getThemeStylesheetHrefs() {
  return [
    getThemeStylesheetHref(),
    `${APP_FRONTEND_BASE_PATH}/assets/css/workout-form-carousel.css`,
    `${APP_FRONTEND_BASE_PATH}/assets/css/toast-dark.css`,
    `${APP_FRONTEND_BASE_PATH}/assets/css/workout-session-dark.css`,
    `${APP_FRONTEND_BASE_PATH}/assets/css/workouts-mvp-fixes.css`,
  ];
}

function loadThemeStylesheet() {
  getThemeStylesheetHrefs().forEach((href, index) => {
    const linkId = `bt-theme-stylesheet-${index}`;

    if (document.getElementById(linkId)) {
      return;
    }

    const link = document.createElement("link");
    link.id = linkId;
    link.rel = "stylesheet";
    link.href = href;

    document.head.appendChild(link);
  });
}

function getWorkoutBackendBridgeHref() {
  return `${APP_FRONTEND_BASE_PATH}/assets/js/workout-backend.js`;
}

function getWorkoutActiveSessionHref() {
  return `${APP_FRONTEND_BASE_PATH}/assets/js/workout-active-session.js`;
}

function getWorkoutHistoryBackendHref() {
  return `${APP_FRONTEND_BASE_PATH}/assets/js/workout-history-backend.js`;
}

function getWorkoutLocalActiveCardHref() {
  return `${APP_FRONTEND_BASE_PATH}/assets/js/workouts-local-active-card.js`;
}

function shouldLoadWorkoutBackendBridge() {
  const page = document.body?.dataset?.page || "";

  if (isLocalAuthEnabled()) {
    return false;
  }

  return ["workouts", "workout-form", "workout-detail"].includes(page);
}

function shouldLoadWorkoutActiveSessionBridge() {
  const page = document.body?.dataset?.page || "";

  if (isLocalAuthEnabled()) {
    return false;
  }

  return ["workouts", "workout-detail"].includes(page);
}

function shouldLoadWorkoutHistoryBackendBridge() {
  const page = document.body?.dataset?.page || "";

  if (isLocalAuthEnabled()) {
    return false;
  }

  return page === "workouts";
}

function shouldLoadWorkoutLocalActiveCardBridge() {
  const page = document.body?.dataset?.page || "";

  if (!isLocalAuthEnabled()) {
    return false;
  }

  return page === "workouts";
}

function loadScriptOnce(id, src) {
  if (document.getElementById(id)) {
    return;
  }

  const script = document.createElement("script");
  script.id = id;
  script.src = src;

  document.body.appendChild(script);
}

function loadWorkoutBackendBridge() {
  if (!shouldLoadWorkoutBackendBridge()) {
    return;
  }

  loadScriptOnce("bt-workout-backend-bridge", getWorkoutBackendBridgeHref());
}

function loadWorkoutActiveSessionBridge() {
  if (!shouldLoadWorkoutActiveSessionBridge()) {
    return;
  }

  loadScriptOnce("bt-workout-active-session", getWorkoutActiveSessionHref());
}

function loadWorkoutHistoryBackendBridge() {
  if (!shouldLoadWorkoutHistoryBackendBridge()) {
    return;
  }

  loadScriptOnce("bt-workout-history-backend", getWorkoutHistoryBackendHref());
}

function loadWorkoutLocalActiveCardBridge() {
  if (!shouldLoadWorkoutLocalActiveCardBridge()) {
    return;
  }

  loadScriptOnce("bt-workouts-local-active-card", getWorkoutLocalActiveCardHref());
}

redirectLegacyRouteToPrettyRoute();
applyPrettyRoutes();

APP_CONFIG.getRoute = getRoute;
APP_CONFIG.getPrettyRoute = getPrettyRoute;
APP_CONFIG.isGitHubPagesHost = isGitHubPagesHost;
APP_CONFIG.isS3StaticWebsiteHost = isS3StaticWebsiteHost;
APP_CONFIG.isStaticPublicHost = isStaticPublicHost;
APP_CONFIG.isLocalAuthEnabled = isLocalAuthEnabled;
APP_CONFIG.isStaticDemoMode = isStaticDemoMode;
APP_CONFIG.shouldUsePrettyRoutes = shouldUsePrettyRoutes;
APP_CONFIG.getSavedTheme = getSavedTheme;
APP_CONFIG.applyStoredTheme = applyStoredTheme;
APP_CONFIG.getThemeStylesheetHref = getThemeStylesheetHref;
APP_CONFIG.getThemeStylesheetHrefs = getThemeStylesheetHrefs;
APP_CONFIG.loadThemeStylesheet = loadThemeStylesheet;
APP_CONFIG.getWorkoutBackendBridgeHref = getWorkoutBackendBridgeHref;
APP_CONFIG.getWorkoutActiveSessionHref = getWorkoutActiveSessionHref;
APP_CONFIG.getWorkoutHistoryBackendHref = getWorkoutHistoryBackendHref;
APP_CONFIG.getWorkoutLocalActiveCardHref = getWorkoutLocalActiveCardHref;
APP_CONFIG.loadWorkoutBackendBridge = loadWorkoutBackendBridge;
APP_CONFIG.loadWorkoutActiveSessionBridge = loadWorkoutActiveSessionBridge;
APP_CONFIG.loadWorkoutHistoryBackendBridge = loadWorkoutHistoryBackendBridge;
APP_CONFIG.loadWorkoutLocalActiveCardBridge = loadWorkoutLocalActiveCardBridge;

window.APP_CONFIG = APP_CONFIG;
window.buildApiUrl = buildApiUrl;
window.getRoute = getRoute;
window.getPrettyRoute = getPrettyRoute;
window.isGitHubPagesHost = isGitHubPagesHost;
window.isS3StaticWebsiteHost = isS3StaticWebsiteHost;
window.isStaticPublicHost = isStaticPublicHost;
window.isLocalAuthEnabled = isLocalAuthEnabled;
window.isStaticDemoMode = isStaticDemoMode;
window.shouldUsePrettyRoutes = shouldUsePrettyRoutes;
window.getSavedTheme = getSavedTheme;
window.applyStoredTheme = applyStoredTheme;
window.getThemeStylesheetHref = getThemeStylesheetHref;
window.getThemeStylesheetHrefs = getThemeStylesheetHrefs;
window.loadThemeStylesheet = loadThemeStylesheet;
window.getWorkoutBackendBridgeHref = getWorkoutBackendBridgeHref;
window.getWorkoutActiveSessionHref = getWorkoutActiveSessionHref;
window.getWorkoutHistoryBackendHref = getWorkoutHistoryBackendHref;
window.getWorkoutLocalActiveCardHref = getWorkoutLocalActiveCardHref;
window.loadWorkoutBackendBridge = loadWorkoutBackendBridge;
window.loadWorkoutActiveSessionBridge = loadWorkoutActiveSessionBridge;
window.loadWorkoutHistoryBackendBridge = loadWorkoutHistoryBackendBridge;
window.loadWorkoutLocalActiveCardBridge = loadWorkoutLocalActiveCardBridge;

loadThemeStylesheet();
applyStoredTheme();

document.addEventListener("DOMContentLoaded", () => {
  applyStoredTheme();
  loadWorkoutBackendBridge();
  loadWorkoutActiveSessionBridge();
  loadWorkoutHistoryBackendBridge();
  loadWorkoutLocalActiveCardBridge();
});
