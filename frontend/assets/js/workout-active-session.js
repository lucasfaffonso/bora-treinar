/* =========================================================
   Active workout session bridge
   Atualiza ações e selo do treino quando existir sessão em andamento.
   ========================================================= */

(function (window, document) {
  "use strict";

  let activeWorkoutIds = new Set();
  let observer = null;
  let updateScheduled = false;
  let clickGuardEnabled = false;

  function initActiveSessionBridge() {
    const page = document.body?.dataset?.page || "";

    if (!["workouts", "workout-detail"].includes(page)) {
      return;
    }

    if (window.isLocalAuthEnabled?.()) {
      return;
    }

    if (typeof window.apiGet !== "function") {
      return;
    }

    setupActiveSessionClickGuard();
    refreshActiveSessions();
    setupObserver();

    window.setTimeout(refreshActiveSessions, 900);
  }

  async function refreshActiveSessions() {
    try {
      const response = await window.apiGet("/workout-sessions", {
        skipAuthHandling: true,
      });
      const sessions = unwrapApiData(response);

      activeWorkoutIds = new Set(
        Array.isArray(sessions)
          ? sessions
              .filter((session) => session?.status === "IN_PROGRESS" && session?.workoutId)
              .map((session) => String(session.workoutId))
          : [],
      );

      updateSessionActions();
    } catch {
      activeWorkoutIds = new Set();
      updateSessionActions();
    }
  }

  function setupObserver() {
    if (observer) return;

    observer = new MutationObserver(scheduleUpdateSessionActions);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  function setupActiveSessionClickGuard() {
    if (clickGuardEnabled) return;

    clickGuardEnabled = true;

    document.addEventListener("click", handleActiveSessionClick, true);
  }

  function handleActiveSessionClick(event) {
    if (event.defaultPrevented || isModifiedClick(event)) {
      return;
    }

    const target = event.target;

    if (!(target instanceof Element)) {
      return;
    }

    const link = target.closest(
      'a[data-active-session-action="true"][href*="workout-session.html?id="]',
    );

    if (!link) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    if (typeof event.stopImmediatePropagation === "function") {
      event.stopImmediatePropagation();
    }

    window.location.assign(link.href);
  }

  function isModifiedClick(event) {
    return (
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    );
  }

  function scheduleUpdateSessionActions() {
    if (updateScheduled) return;

    updateScheduled = true;

    window.requestAnimationFrame(() => {
      updateScheduled = false;
      updateSessionActions();
    });
  }

  function updateSessionActions() {
    const sessionLinks = Array.from(
      document.querySelectorAll('a[href*="workout-session.html?id="]'),
    );

    sessionLinks.forEach((link) => {
      const workoutId = getWorkoutIdFromLink(link);

      if (!workoutId) return;

      if (activeWorkoutIds.has(workoutId)) {
        markAsActiveSessionLink(link);
      } else {
        markAsStartSessionLink(link);
      }
    });
  }

  function getWorkoutIdFromLink(link) {
    try {
      const url = new URL(link.href, window.location.href);

      return url.searchParams.get("id");
    } catch {
      return null;
    }
  }

  function markAsActiveSessionLink(link) {
    const wasActive = link.getAttribute("data-active-session-action") === "true";

    link.classList.add("is-active-session-action");
    link.setAttribute("data-active-session-action", "true");
    link.setAttribute("aria-label", "Voltar para treino em andamento");

    if (!wasActive || !/Voltar ao treino/i.test(link.textContent || "")) {
      link.innerHTML = `
        <i class="bi bi-arrow-return-right" aria-hidden="true"></i>
        <span>Voltar ao treino</span>
      `;
    }

    updateWorkoutBadge(link, {
      label: "Em treino",
      addClass: "badge-success",
      removeClasses: ["badge-info", "badge-warning", "badge-danger"],
      active: true,
    });
  }

  function markAsStartSessionLink(link) {
    const wasActive = link.getAttribute("data-active-session-action") === "true";

    if (wasActive) {
      link.classList.remove("is-active-session-action");
      link.removeAttribute("data-active-session-action");
      link.setAttribute("aria-label", "Iniciar treino");
      link.innerHTML = `
        <i class="bi bi-play-fill" aria-hidden="true"></i>
        <span>Iniciar</span>
      `;
    }

    updateWorkoutBadge(link, {
      label: "Ativo",
      addClass: "badge-info",
      removeClasses: ["badge-success", "badge-warning", "badge-danger"],
      active: false,
    });
  }

  function updateWorkoutBadge(link, { label, addClass, removeClasses, active }) {
    const card = link.closest(".workout-card, .content-card");
    const badge = card?.querySelector(".badge");

    if (!badge) return;

    const currentLabel = badge.textContent.trim();
    const managedLabels = ["Backend", "Ativo", "Sessão ativa", "Em treino"];

    if (!managedLabels.includes(currentLabel)) {
      return;
    }

    badge.classList.remove(...removeClasses);
    badge.classList.add(addClass);
    badge.textContent = label;
    badge.setAttribute(
      "title",
      active
        ? "Este treino possui uma sessão em andamento."
        : "Este treino está disponível para iniciar.",
    );
  }

  function unwrapApiData(response) {
    if (!response) return null;

    if (Object.prototype.hasOwnProperty.call(response, "data")) {
      return response.data;
    }

    return response;
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initActiveSessionBridge);
  } else {
    initActiveSessionBridge();
  }
})(window, document);
