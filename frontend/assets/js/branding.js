/* =========================================================
   Bora Treinar - Branding
   - Favicon global
   - Título da página
   - URL amigável visual para páginas estáticas
   ========================================================= */

(function (window, document) {
  "use strict";

  const APP_NAME = "Bora Treinar";

  const FRIENDLY_PATHS = {
    "/index.html": "/",
    "/pages/auth/login.html": "/entrar",
    "/pages/auth/register.html": "/cadastro",

    "/pages/dashboard/dashboard.html": "/inicio",

    "/pages/workouts/workouts.html": "/treinos",
    "/pages/workouts/workout-form.html": "/treinos/novo",
    "/pages/workouts/workout-detail.html": "/treinos/detalhes",
    "/pages/workouts/workout-session.html": "/treinos/sessao",
    "/pages/workouts/workout-timer.html": "/treinos/timer",

    "/pages/exercises/exercises.html": "/exercicios",
    "/pages/communities/communities.html": "/comunidades",
    "/pages/premium/premium.html": "/premium",
    "/pages/profile/profile.html": "/perfil",
    "/pages/settings/settings.html": "/configuracoes",
  };

  const PAGE_TITLES = {
    "/": "Início",
    "/entrar": "Entrar",
    "/cadastro": "Cadastro",
    "/inicio": "Inicial",
    "/treinos": "Treinos",
    "/treinos/novo": "Novo treino",
    "/treinos/detalhes": "Detalhes do treino",
    "/treinos/sessao": "Sessão de treino",
    "/treinos/timer": "Timer",
    "/exercicios": "Exercícios",
    "/comunidades": "Comunidades",
    "/premium": "Premium",
    "/perfil": "Perfil",
    "/configuracoes": "Configurações",
  };

  function initBranding() {
    applyFavicon();
    applyPageTitle();
    applyLandingIconAlignment();
  }

  function applyFavicon() {
    const faviconHref = getAssetPath("assets/img/favicon.svg");

    upsertLink({
      rel: "icon",
      type: "image/svg+xml",
      href: faviconHref,
    });

    upsertLink({
      rel: "shortcut icon",
      href: faviconHref,
    });

    upsertLink({
      rel: "apple-touch-icon",
      href: faviconHref,
    });

    let themeColor = document.querySelector("meta[name='theme-color']");

    if (!themeColor) {
      themeColor = document.createElement("meta");
      themeColor.setAttribute("name", "theme-color");
      document.head.appendChild(themeColor);
    }

    themeColor.setAttribute("content", "#070A14");
  }

  function applyPageTitle() {
    const label =
      document.body?.dataset.pageTitle ||
      getTitleFromCurrentPath() ||
      getTitleFromDocument() ||
      APP_NAME;

    document.title = label === APP_NAME ? APP_NAME : `${label} | ${APP_NAME}`;
  }

  function applyLandingIconAlignment() {
    if (!document.body?.classList.contains("landing-page")) {
      return;
    }

    if (document.getElementById("bt-landing-icon-alignment")) {
      return;
    }

    const style = document.createElement("style");
    style.id = "bt-landing-icon-alignment";
    style.textContent = `
      .landing-logo-icon i,
      .landing-feature-pill i,
      .preview-app-logo i,
      .preview-user-avatar i,
      .preview-stat-icon i,
      .landing-desktop-benefit > i {
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        line-height: 1 !important;
        text-align: center !important;
      }

      .landing-logo-icon i,
      .preview-app-logo i,
      .preview-user-avatar i,
      .preview-stat-icon i {
        width: 100% !important;
        height: 100% !important;
      }

      .landing-feature-pill i {
        width: 1em !important;
        height: 1em !important;
      }

      .preview-stat-icon {
        flex: 0 0 32px !important;
        align-self: center !important;
        justify-self: center !important;
        line-height: 1 !important;
      }

      .landing-logo-icon i::before,
      .landing-feature-pill i::before,
      .preview-app-logo i::before,
      .preview-user-avatar i::before,
      .preview-stat-icon i::before,
      .landing-desktop-benefit > i::before {
        display: block !important;
        line-height: 1 !important;
      }

      @media (max-width: 480px) {
        .preview-stat-icon {
          flex-basis: 28px !important;
        }
      }

      @media (max-width: 420px) and (max-height: 700px) {
        .preview-stat-icon {
          flex-basis: 28px !important;
        }
      }
    `;

    document.head.appendChild(style);
  }

  function applyFriendlyUrl() {
    if (!window.history || !window.history.replaceState) {
      return;
    }

    const currentPath = window.location.pathname;
    const frontendBase = getFrontendBase(currentPath);
    const physicalPath = currentPath.replace(frontendBase, "") || "/index.html";
    const normalizedPhysicalPath = normalizePhysicalPath(physicalPath);
    const friendlyPath = FRIENDLY_PATHS[normalizedPhysicalPath];

    if (!friendlyPath) {
      return;
    }

    const currentSearch = window.location.search || "";
    const currentHash = window.location.hash || "";
    const prettyUrl = `${frontendBase}${friendlyPath}${currentSearch}${currentHash}`;

    if (
      prettyUrl !== `${window.location.pathname}${currentSearch}${currentHash}`
    ) {
      window.history.replaceState(
        {
          ...window.history.state,
          btPhysicalPath: currentPath,
          btFriendlyPath: prettyUrl,
        },
        "",
        prettyUrl,
      );
    }
  }

  function getFrontendBase(pathname) {
    if (pathname.includes("/frontend/")) {
      return pathname.slice(
        0,
        pathname.indexOf("/frontend/") + "/frontend".length,
      );
    }

    return "";
  }

  function normalizePhysicalPath(pathname) {
    let path = pathname || "/index.html";

    if (path === "/" || path === "") {
      return "/index.html";
    }

    path = path.replace(/\/+/g, "/");

    if (!path.startsWith("/")) {
      path = `/${path}`;
    }

    return path;
  }

  function getTitleFromCurrentPath() {
    const currentPath = window.location.pathname;
    const frontendBase = getFrontendBase(currentPath);
    const physicalPath = normalizePhysicalPath(
      currentPath.replace(frontendBase, ""),
    );

    const friendlyPath = FRIENDLY_PATHS[physicalPath];

    if (friendlyPath && PAGE_TITLES[friendlyPath]) {
      return PAGE_TITLES[friendlyPath];
    }

    return "";
  }

  function getTitleFromDocument() {
    const currentTitle = String(document.title || "").trim();

    if (!currentTitle) {
      return "";
    }

    return currentTitle.replace(/\s*\|\s*Bora Treinar\s*$/i, "");
  }

  function getAssetPath(relativePath) {
    const currentPath = window.location.pathname;
    const frontendBase = getFrontendBase(currentPath);

    if (frontendBase) {
      return `${frontendBase}/${relativePath}`;
    }

    const depth = currentPath
      .split("/")
      .filter(Boolean)
      .filter((part) => !part.endsWith(".html")).length;

    if (depth <= 0) {
      return relativePath;
    }

    return `${"../".repeat(depth)}${relativePath}`;
  }

  function upsertLink({ rel, href, type }) {
    let link = document.querySelector(`link[rel="${rel}"]`);

    if (!link) {
      link = document.createElement("link");
      link.setAttribute("rel", rel);
      document.head.appendChild(link);
    }

    if (type) {
      link.setAttribute("type", type);
    }

    link.setAttribute("href", href);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initBranding);
  } else {
    initBranding();
  }

  window.BoraTreinarBranding = {
    init: initBranding,
  };
})(window, document);
