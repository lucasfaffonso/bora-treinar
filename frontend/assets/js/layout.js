/**
 * Bora Treinar — layout.js
 *
 * Fonte única do shell interno do app:
 * - sidebar;
 * - topbar;
 * - navegação ativa;
 * - usuário na UI;
 * - logout;
 * - busca global;
 * - menu responsivo;
 * - transição leve entre páginas internas.
 *
 * Este arquivo não substitui validações do backend.
 * Admin, premium, ownership e membership devem ser protegidos no backend.
 */
(function (window, document) {
  "use strict";

  const APP_CONFIG = window.APP_CONFIG || {};
  const BTAuth = window.BTAuth || window.Auth || {};
  const BTUtils = window.BTUtils || window.Utils || {};

  const MOBILE_BREAKPOINT = 768;
  const PAGE_TRANSITION_DELAY_MS = 90;
  const PREFETCH_LIMIT = 24;

  const INTERNAL_PAGE_TYPES = ["protected", "admin", "premium"];
  const INTERNAL_LAYOUTS = ["app", "internal", "private", "dashboard"];
  const UNAVAILABLE_ROUTE_PATHS = ["admin/admin-dashboard.html"];
  const IMPLEMENTED_NAV_ROUTE_KEYS = [
    "dashboard",
    "workouts",
    "exercises",
    "communities",
    "search",
    "ranking",
    "premium",
    "settings",
  ];

  const NAV_ITEMS = [
    {
      key: "dashboard",
      section: "Menu",
      label: "Inicial",
      icon: "bi-house-door",
      routeKey: "DASHBOARD",
      match: ["dashboard"],
    },
    {
      key: "workouts",
      section: "Menu",
      label: "Treinos",
      icon: "bi-activity",
      routeKey: "WORKOUTS",
      match: [
        "workouts",
        "workout-form",
        "workout-detail",
        "workout-session",
        "workout-timer",
        "workout-session-detail",
      ],
    },
    {
      key: "exercises",
      section: "Menu",
      label: "Exercícios",
      icon: "bi-heart-pulse",
      routeKey: "EXERCISES",
      match: ["exercises"],
    },
    {
      key: "communities",
      section: "Menu",
      label: "Comunidades",
      icon: "bi-people",
      routeKey: "COMMUNITIES",
      match: ["communities", "community-detail"],
    },
    {
      key: "search",
      section: "Menu",
      label: "Pesquisa",
      icon: "bi-search",
      routeKey: "SEARCH",
      match: ["search"],
    },
    {
      key: "ranking",
      section: "Menu",
      label: "Ranking",
      icon: "bi-trophy",
      routeKey: "RANKING",
      match: ["ranking"],
    },
    {
      key: "premium",
      section: "Conta",
      label: "Premium",
      icon: "bi-gem",
      routeKey: "PREMIUM",
      match: ["premium"],
    },
    {
      key: "settings",
      section: "Conta",
      label: "Configurações",
      icon: "bi-gear",
      routeKey: "SETTINGS",
      match: ["settings"],
    },
  ];

  const PAGE_LABELS = {
    dashboard: "Dashboard",
    workouts: "Treinos",
    "workout-form": "Novo treino",
    "workout-detail": "Detalhe do treino",
    "workout-session": "Sessão de treino",
    "workout-timer": "Cronômetro",
    "workout-session-detail": "Detalhe da sessão",
    exercises: "Exercícios",
    communities: "Comunidades",
    "community-detail": "Detalhe da comunidade",
    search: "Pesquisa",
    ranking: "Ranking",
    premium: "Premium",
    profile: "Perfil",
    settings: "Configurações",
  };

  const prefetchedUrls = new Set();

  const state = {
    initialized: false,
    currentUser: null,
    currentPage: null,
    navigating: false,
  };

  function init() {
    injectSidebarCompactStyles();
    injectPageTransitionStyles();

    state.currentUser = getCurrentUser();
    state.currentPage = getCurrentPageKey();

    if (isInternalPage()) {
      renderShell();
      updateStaticShellUserInfo();
      removeUnavailableLinks();
      markActiveNavigation();
      updateDocumentTitle();
    }

    bindGlobalEventsOnce();
    markPageReady();
    state.initialized = true;
  }

  function refresh() {
    state.currentUser = getCurrentUser();
    state.currentPage = getCurrentPageKey();

    if (isInternalPage()) {
      renderShell();
      updateStaticShellUserInfo();
      removeUnavailableLinks();
      markActiveNavigation();
      updateDocumentTitle();
    }

    markPageReady();
  }

  function injectSidebarCompactStyles() {
    if (document.getElementById("bt-sidebar-compact-style")) return;

    const style = document.createElement("style");
    style.id = "bt-sidebar-compact-style";
    style.textContent = `
      @media (min-width: 1201px) {
        body[data-page-type="protected"] .sidebar:not(:hover):not(:focus-within) {
          padding-top: 22px;
          padding-bottom: 22px;
        }

        body[data-page-type="protected"] .sidebar:not(:hover):not(:focus-within) .sidebar-logo {
          margin-bottom: 30px;
        }

        body[data-page-type="protected"] .sidebar:not(:hover):not(:focus-within) .sidebar-nav {
          flex: 0 0 auto;
        }

      }
    `;

    document.head.appendChild(style);
  }

  function injectPageTransitionStyles() {
    if (document.getElementById("bt-page-transition-style")) return;

    const style = document.createElement("style");
    style.id = "bt-page-transition-style";
    style.textContent = `
      body[data-layout="app"] .main-area,
      body[data-layout="internal"] .main-area,
      body[data-layout="private"] .main-area,
      body[data-layout="dashboard"] .main-area {
        will-change: opacity, transform;
      }

      body.bt-page-ready[data-layout="app"] .main-area,
      body.bt-page-ready[data-layout="internal"] .main-area,
      body.bt-page-ready[data-layout="private"] .main-area,
      body.bt-page-ready[data-layout="dashboard"] .main-area {
        opacity: 1;
        transform: translateY(0);
        transition:
          opacity 150ms ease,
          transform 150ms ease;
      }

      body.bt-page-leaving[data-layout="app"] .main-area,
      body.bt-page-leaving[data-layout="internal"] .main-area,
      body.bt-page-leaving[data-layout="private"] .main-area,
      body.bt-page-leaving[data-layout="dashboard"] .main-area {
        opacity: 0.78;
        transform: translateY(4px) scale(0.995);
        transition:
          opacity 90ms ease,
          transform 90ms ease;
      }

      body.bt-page-navigating {
        cursor: progress;
      }

      body.bt-page-navigating a,
      body.bt-page-navigating button {
        cursor: progress;
      }

      @media (prefers-reduced-motion: reduce) {
        body.bt-page-ready[data-layout] .main-area,
        body.bt-page-leaving[data-layout] .main-area {
          opacity: 1;
          transform: none;
          transition: none;
        }
      }
    `;

    document.head.appendChild(style);
  }

  function isInternalPage() {
    const body = document.body;

    if (!body) return false;

    const pageType = normalize(body.dataset.pageType || "");
    const layoutType = normalize(body.dataset.layout || "");

    if (["auth", "guest", "public", "landing"].includes(pageType)) {
      return false;
    }

    if (["auth", "guest", "public", "landing"].includes(layoutType)) {
      return false;
    }

    return (
      INTERNAL_PAGE_TYPES.includes(pageType) ||
      INTERNAL_LAYOUTS.includes(layoutType) ||
      Boolean(getSidebarContainer() || getTopbarContainer())
    );
  }

  function renderShell() {
    renderSidebar(getSidebarContainer());
    renderTopbar(getTopbarContainer());
  }

  function renderSidebar(container) {
    if (!container) return;

    const user = state.currentUser || {};
    const displayName = getUserDisplayName(user);
    const initials = getInitials(displayName);
    const premiumLabel = isPremium(user) ? "Premium" : "Gratuito";

    container.className = "sidebar";
    container.setAttribute("aria-label", "Menu principal");

    container.innerHTML = [
      '<a class="sidebar-logo" href="' +
        escapeAttribute(getRoute("DASHBOARD")) +
        '" aria-label="Ir para o dashboard">',
      '  <span class="sidebar-logo-icon">',
      '    <i class="bi bi-lightning-charge-fill" aria-hidden="true"></i>',
      "  </span>",
      '  <span class="sidebar-logo-text">',
      '    <span class="sidebar-logo-title">Bora Treinar</span>',
      '    <span class="sidebar-logo-subtitle">Fitness social</span>',
      "  </span>",
      "</a>",
      '<button class="sidebar-mobile-close" type="button" data-bt-sidebar-close aria-label="Fechar menu">',
      '  <i class="bi bi-x-lg" aria-hidden="true"></i>',
      "</button>",
      '<nav class="sidebar-nav" aria-label="Navegação interna">',
      renderNavItems(),
      "</nav>",
      '<div class="sidebar-footer">',
      '  <a class="sidebar-user is-profile-link" href="' +
        escapeAttribute(getRoute("PROFILE")) +
        '" aria-label="Abrir perfil">',
      '    <span class="sidebar-user-avatar" data-user-initials>' +
        escapeHTML(initials) +
        "</span>",
      '    <span class="sidebar-user-info">',
      '      <span class="sidebar-user-name" data-user-name>' +
        escapeHTML(displayName) +
        "</span>",
      '      <span class="sidebar-user-role" data-premium-status>' +
        escapeHTML(premiumLabel) +
        "</span>",
      "    </span>",
      "  </a>",
      '  <button class="btn btn-outline w-full" type="button" data-logout title="Sair" aria-label="Sair">',
      '    <i class="bi bi-box-arrow-right" aria-hidden="true"></i>',
      "    <span>Sair</span>",
      "  </button>",
      "</div>",
    ].join("");
  }

  function renderNavItems() {
    let currentSection = "";

    return NAV_ITEMS.map((item) => {
      const section = item.section || "";
      const shouldRenderSection = section && section !== currentSection;
      currentSection = section;

      return [
        shouldRenderSection
          ? '<span class="sidebar-section-title">' +
            escapeHTML(section) +
            "</span>"
          : "",
        renderNavItem(item),
      ].join("");
    }).join("");
  }

  function renderNavItem(item) {
    const active = isNavItemActive(item);
    const activeClass = active ? " active" : "";
    const ariaCurrent = active ? ' aria-current="page"' : "";

    return [
      '<a class="sidebar-link' +
        activeClass +
        '" href="' +
        escapeAttribute(getRoute(item.routeKey)) +
        '" data-bt-nav-item="' +
        escapeAttribute(item.key) +
        '" title="' +
        escapeAttribute(item.label) +
        '" aria-label="' +
        escapeAttribute(item.label) +
        '"' +
        ariaCurrent +
        ">",
      '  <span class="sidebar-link-icon">',
      '    <i class="bi ' +
        escapeAttribute(item.icon) +
        '" aria-hidden="true"></i>',
      "  </span>",
      '  <span class="sidebar-link-text">' +
        escapeHTML(item.label) +
        "</span>",
      "</a>",
    ].join("");
  }

  function renderTopbar(container) {
    if (!container) return;

    const user = state.currentUser || {};
    const displayName = getUserDisplayName(user);
    const pageLabel = getCurrentPageLabel();

    container.className = "topbar";

    container.innerHTML = [
      '<div class="topbar-left">',
      '  <button class="mobile-menu-toggle" type="button" data-bt-sidebar-toggle aria-label="Abrir menu">',
      '    <i class="bi bi-list" aria-hidden="true"></i>',
      "  </button>",
      "  <div>",
      '    <h1 class="topbar-page-title">' + escapeHTML(pageLabel) + "</h1>",
      '    <p class="topbar-page-subtitle">' +
        escapeHTML(getTopbarSubtitle(pageLabel, displayName)) +
        "</p>",
      "  </div>",
      "</div>",
      '<div class="topbar-right">',
      '  <a class="btn btn-outline" href="' +
        escapeAttribute(getRoute("PREMIUM")) +
        '" aria-label="Premium">',
      '    <i class="bi bi-gem" aria-hidden="true"></i>',
      '    <span class="btn-text">Premium</span>',
      "  </a>",
      '  <a class="topbar-button" href="' +
        escapeAttribute(getRoute("PROFILE")) +
        '" aria-label="Abrir perfil">',
      '    <i class="bi bi-person" aria-hidden="true"></i>',
      "  </a>",
      "</div>",
    ].join("");
  }

  function getTopbarSubtitle(pageLabel, displayName) {
    if (state.currentPage === "dashboard") {
      return "Bem-vindo de volta, " + displayName + ".";
    }

    const subtitles = {
      Pesquisa: "Encontre dados salvos neste navegador.",
      Ranking: "Acompanhe seus treinos por XP registrado.",
      Premium: "Veja recursos premium planejados e o status da assinatura.",
      Treinos: "Organize e acompanhe suas rotinas.",
      Exercícios: "Consulte exercícios por grupo muscular e objetivo.",
      Comunidades: "Veja recursos sociais disponíveis no app.",
      Configurações: "Ajuste preferências da sua conta.",
      Perfil: "Veja seus dados e evolução.",
    };

    return subtitles[pageLabel] || "Bora Treinar";
  }

  function bindGlobalEventsOnce() {
    if (bindGlobalEventsOnce.bound) return;
    bindGlobalEventsOnce.bound = true;

    document.addEventListener("click", handleDocumentClick);
    document.addEventListener("submit", handleDocumentSubmit);
    document.addEventListener("keydown", handleKeydown);
    document.addEventListener("pointerover", handlePotentialNavigationPrefetch);
    document.addEventListener("focusin", handlePotentialNavigationPrefetch);
    window.addEventListener("resize", handleResize);
    window.addEventListener("pageshow", handlePageShow);
  }

  function handleDocumentClick(event) {
    const sidebarToggle = event.target.closest("[data-bt-sidebar-toggle]");
    const sidebarClose = event.target.closest("[data-bt-sidebar-close], [data-bt-sidebar-overlay]");
    const logoutButton = event.target.closest("[data-logout], [data-bt-logout]");
    const navItem = event.target.closest("[data-bt-nav-item]");
    const pageLink = event.target.closest("a[href]");

    if (sidebarToggle) {
      event.preventDefault();
      openSidebar();
      return;
    }

    if (sidebarClose) {
      event.preventDefault();
      closeSidebar();
      return;
    }

    if (logoutButton) {
      event.preventDefault();
      logout();
      return;
    }

    if (navItem && isMobileViewport()) {
      closeSidebar();
    }

    if (shouldHandlePageTransition(event, pageLink)) {
      event.preventDefault();
      navigateWithPageTransition(pageLink.href);
    }
  }

  function handleDocumentSubmit(event) {
    const searchForm = event.target.closest("[data-bt-global-search-form]");

    if (!searchForm) return;

    event.preventDefault();

    const input = searchForm.querySelector("input[name='q']");
    const query = input ? input.value.trim() : "";

    if (!query) {
      showToast({
        title: "Pesquisa",
        message: "Digite algo para pesquisar.",
        type: "warning",
      });

      if (input) input.focus();
      return;
    }

    navigateWithPageTransition(appendQueryParam(getRoute("SEARCH"), "q", query));
  }

  function handleKeydown(event) {
    if (event.key === "Escape") {
      closeSidebar();
    }
  }

  function handleResize() {
    if (!isMobileViewport()) {
      closeSidebar();
    }
  }

  function handlePageShow() {
    state.navigating = false;
    document.body.classList.remove("bt-page-leaving", "bt-page-navigating");
    markPageReady();
  }

  function handlePotentialNavigationPrefetch(event) {
    const link = event.target.closest?.("a[href]");

    if (!isPrefetchableInternalLink(link)) return;

    prefetchInternalPage(link.href);
  }

  function shouldHandlePageTransition(event, link) {
    if (!link || state.navigating || !isInternalPage()) return false;
    if (event.defaultPrevented) return false;
    if (event.button !== 0) return false;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return false;
    if (link.target && link.target !== "_self") return false;
    if (link.hasAttribute("download")) return false;
    if (link.closest("[data-no-page-transition]")) return false;
    if (!isSameOriginPageLink(link.href)) return false;

    const targetUrl = new URL(link.href, window.location.href);
    const currentUrl = new URL(window.location.href);
    const samePathAndSearch =
      targetUrl.pathname === currentUrl.pathname && targetUrl.search === currentUrl.search;

    if (samePathAndSearch && targetUrl.hash) return false;
    if (targetUrl.href === currentUrl.href) return false;

    return true;
  }

  function navigateWithPageTransition(href) {
    if (!href || state.navigating) return;

    state.navigating = true;
    closeSidebar();
    document.body.classList.add("bt-page-leaving", "bt-page-navigating");

    const shouldReduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    const delay = shouldReduceMotion ? 0 : PAGE_TRANSITION_DELAY_MS;

    window.setTimeout(() => {
      window.location.href = href;
    }, delay);
  }

  function isPrefetchableInternalLink(link) {
    if (!link || prefetchedUrls.size >= PREFETCH_LIMIT) return false;
    if (!isInternalPage()) return false;
    if (link.target && link.target !== "_self") return false;
    if (link.hasAttribute("download")) return false;
    if (!isSameOriginPageLink(link.href)) return false;

    const url = new URL(link.href, window.location.href);

    if (url.href === window.location.href) return false;

    return !prefetchedUrls.has(url.href);
  }

  function prefetchInternalPage(href) {
    try {
      const url = new URL(href, window.location.href);

      if (prefetchedUrls.has(url.href)) return;

      prefetchedUrls.add(url.href);

      const prefetch = document.createElement("link");
      prefetch.rel = "prefetch";
      prefetch.href = url.href;
      prefetch.as = "document";
      document.head.appendChild(prefetch);
    } catch {
      // Prefetch é apenas melhoria de UX; falhas não devem afetar a navegação.
    }
  }

  function isSameOriginPageLink(href) {
    try {
      const url = new URL(href, window.location.href);

      if (url.origin !== window.location.origin) return false;
      if (["mailto:", "tel:", "javascript:"].includes(url.protocol)) return false;

      return /\.html?$/i.test(url.pathname) || url.pathname.endsWith("/");
    } catch {
      return false;
    }
  }

  function markPageReady() {
    document.body.classList.remove("bt-page-leaving", "bt-page-navigating");

    window.requestAnimationFrame(() => {
      document.body.classList.add("bt-page-ready");
    });
  }

  function openSidebar() {
    const sidebar = getSidebarElement();

    if (!sidebar) return;

    sidebar.classList.add("mobile-open");
    document.body.classList.add("bt-sidebar-open");
    ensureSidebarOverlay();
  }

  function closeSidebar() {
    const sidebar = getSidebarElement();

    if (sidebar) {
      sidebar.classList.remove("mobile-open");
    }

    document.body.classList.remove("bt-sidebar-open");
    removeSidebarOverlay();
  }

  function ensureSidebarOverlay() {
    if (!isMobileViewport()) return;

    if (document.querySelector("[data-bt-sidebar-overlay]")) return;

    const overlay = document.createElement("button");
    overlay.type = "button";
    overlay.className = "bt-sidebar-overlay";
    overlay.setAttribute("data-bt-sidebar-overlay", "");
    overlay.setAttribute("aria-label", "Fechar menu");
    document.body.appendChild(overlay);
  }

  function removeSidebarOverlay() {
    const overlay = document.querySelector("[data-bt-sidebar-overlay]");

    if (overlay) overlay.remove();
  }

  function logout() {
    if (typeof BTAuth.logout === "function") {
      BTAuth.logout();
      return;
    }

    if (typeof BTAuth.logoutUser === "function") {
      BTAuth.logoutUser();
      return;
    }

    clearKnownAuthStorage();
    navigateWithPageTransition(getRoute("LOGIN"));
  }

  function clearKnownAuthStorage() {
    const storageKeys = APP_CONFIG.STORAGE_KEYS || {};

    [
      storageKeys.ACCESS_TOKEN,
      storageKeys.USER,
      "bt_token",
      "bt_refresh_token",
      "bt_user",
      "bora_treinar_access_token",
      "bora_treinar_token",
      "bora_treinar_user",
      "boraTreinarToken",
      "boraTreinarUser",
    ]
      .filter(Boolean)
      .forEach((key) => {
        try {
          localStorage.removeItem(key);
        } catch {
          // Não interrompe logout visual caso o navegador bloqueie localStorage.
        }
      });
  }

  function removeUnavailableLinks() {
    document.querySelectorAll('a[href*="admin/admin-dashboard.html"]').forEach((link) => {
      link.remove();
    });

    hideEmptySidebarSections();
  }

  function hideEmptySidebarSections() {
    document.querySelectorAll(".sidebar-nav").forEach((nav) => {
      const children = Array.from(nav.children);

      children.forEach((child, index) => {
        if (!child.classList.contains("sidebar-section-title")) return;

        const nextSectionIndex = children.findIndex((nextChild, nextIndex) => {
          return nextIndex > index && nextChild.classList.contains("sidebar-section-title");
        });

        const endIndex = nextSectionIndex === -1 ? children.length : nextSectionIndex;
        const hasVisibleLink = children
          .slice(index + 1, endIndex)
          .some((nextChild) => nextChild.matches("a") && !nextChild.hidden);

        child.hidden = !hasVisibleLink;
      });
    });
  }

  function markActiveNavigation() {
    const links = document.querySelectorAll("[data-bt-nav-item]");

    links.forEach((link) => {
      const key = link.getAttribute("data-bt-nav-item");
      const item = NAV_ITEMS.find((navItem) => navItem.key === key);
      const active = item ? isNavItemActive(item) : false;

      link.classList.toggle("active", active);

      if (active) {
        link.setAttribute("aria-current", "page");
      } else {
        link.removeAttribute("aria-current");
      }
    });
  }

  function updateStaticShellUserInfo() {
    const user = state.currentUser || {};
    const displayName = getUserDisplayName(user);
    const initials = getInitials(displayName);
    const premiumLabel = isPremium(user) ? "Premium" : "Gratuito";

    document.querySelectorAll("[data-user-name]").forEach((element) => {
      element.textContent = displayName;
    });

    document.querySelectorAll("[data-user-initials]").forEach((element) => {
      element.textContent = initials;
    });

    document.querySelectorAll("[data-premium-status]").forEach((element) => {
      element.textContent = premiumLabel;
    });
  }

  function updateDocumentTitle() {
    const label = getCurrentPageLabel();

    if (typeof BTUtils.setPageTitle === "function") {
      BTUtils.setPageTitle(label);
      return;
    }

    if (label && !document.title.includes(label)) {
      document.title = label + " | Bora Treinar";
    }
  }

  function getSidebarContainer() {
    return (
      document.querySelector("[data-bt-sidebar]") ||
      document.getElementById("btSidebar") ||
      document.querySelector(".bt-sidebar") ||
      document.querySelector(".sidebar")
    );
  }

  function getTopbarContainer() {
    return (
      document.querySelector("[data-bt-topbar]") ||
      document.getElementById("btTopbar") ||
      document.querySelector(".bt-topbar") ||
      document.querySelector(".topbar")
    );
  }

  function getSidebarElement() {
    return document.querySelector(".sidebar");
  }

  function getCurrentPageKey() {
    const body = document.body;

    if (body?.dataset?.page) {
      return normalize(body.dataset.page);
    }

    const fileName = (window.location.pathname || "")
      .split("/")
      .filter(Boolean)
      .pop() || "index.html";

    return normalize(fileName.replace(/\.html?$/i, ""));
  }

  function getCurrentPageLabel() {
    const bodyTitle = document.body?.dataset?.pageTitle;
    const pageKey = state.currentPage || getCurrentPageKey();

    return bodyTitle || PAGE_LABELS[pageKey] || "Bora Treinar";
  }

  function getCurrentUser() {
    if (typeof BTAuth.getCurrentUser === "function") {
      return BTAuth.getCurrentUser() || null;
    }

    return readUserFromStorage();
  }

  function readUserFromStorage() {
    const storageKeys = APP_CONFIG.STORAGE_KEYS || {};
    const candidates = [
      storageKeys.USER,
      "bt_user",
      "bora_treinar_user",
      "boraTreinarUser",
    ].filter(Boolean);

    for (const key of candidates) {
      try {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        return JSON.parse(raw);
      } catch {
        return null;
      }
    }

    return null;
  }

  function getUserDisplayName(user) {
    if (!user) return "Usuário";

    return (
      user.name ||
      user.fullName ||
      user.displayName ||
      user.username ||
      user.email ||
      "Usuário"
    );
  }

  function getInitials(name) {
    const safeName = String(name || "Usuário").trim();
    const parts = safeName.split(/\s+/).filter(Boolean);

    if (!parts.length) return "U";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  function isPremium(user) {
    if (typeof BTAuth.isPremium === "function") {
      return Boolean(BTAuth.isPremium(user));
    }

    const status = normalize(
      user?.premiumStatus || user?.subscriptionStatus || user?.planStatus,
    );

    return Boolean(
      user &&
        (user.isPremium === true ||
          user.premium === true ||
          user.premiumActive === true ||
          user.hasActiveSubscription === true ||
          status === "active" ||
          status === "ativo"),
    );
  }

  function isNavItemActive(item) {
    const pageKey = state.currentPage || getCurrentPageKey();

    return item.match?.includes(pageKey) || item.key === pageKey;
  }

  function getRoute(routeKey) {
    const routes = APP_CONFIG.ROUTES || {};
    const normalizedKey = toRouteConstant(routeKey);

    if (typeof APP_CONFIG.getRoute === "function") {
      const configuredRoute = APP_CONFIG.getRoute(normalizedKey);
      if (configuredRoute) return configuredRoute;
    }

    if (routes[normalizedKey]) return routes[normalizedKey];

    return routes.DASHBOARD || "dashboard/dashboard.html";
  }

  function toRouteConstant(value) {
    return String(value || "")
      .trim()
      .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
      .replace(/[\s-]+/g, "_")
      .toUpperCase();
  }

  function appendQueryParam(url, key, value) {
    const separator = String(url).includes("?") ? "&" : "?";

    return url + separator + encodeURIComponent(key) + "=" + encodeURIComponent(value);
  }

  function showToast(payload) {
    if (typeof BTUtils.showToast === "function") {
      BTUtils.showToast(payload);
      return;
    }

    if (typeof window.showToast === "function") {
      window.showToast(payload);
    }
  }

  function isMobileViewport() {
    return window.innerWidth <= MOBILE_BREAKPOINT;
  }

  function normalize(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/_/g, "-");
  }

  function escapeHTML(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function escapeAttribute(value) {
    return escapeHTML(value).replaceAll("`", "&#096;");
  }

  window.BoraTreinarLayout = {
    init,
    refresh,
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})(window, document);
