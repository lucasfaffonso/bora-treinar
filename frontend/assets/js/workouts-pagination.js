/* =========================================================
   Workout cards pagination
   Mantém até 4 cards por página para evitar crescimento vertical.
   Também padroniza textos visuais entre modo local e backend.
   ========================================================= */

(function (window, document) {
  "use strict";

  const PAGE_SIZE = 4;
  const CARD_SELECTOR = ".workout-card";
  const LIST_SELECTOR = "[data-workout-list]";
  const ACTIVE_LOCAL_SESSION_PREFIX = "bora_treinar_active_local_session";
  const LIVE_DURATION_UPDATE_MS = 1000;

  let currentPage = 1;
  let listObserver = null;
  let historyObserver = null;
  let renderScheduled = false;
  let localHistoryInterval = null;

  function shouldRun() {
    return document.body?.dataset?.page === "workouts";
  }

  function initWorkoutPagination() {
    if (!shouldRun()) return;

    const list = document.querySelector(LIST_SELECTOR);

    if (!list) return;

    setupObserver(list);
    setupHistoryActionObserver();
    setupLocalActiveHistory();
    scheduleRender(1);
    syncHistoryActionButtons();
  }

  function setupObserver(list) {
    if (listObserver) {
      listObserver.disconnect();
    }

    listObserver = new MutationObserver(() => {
      scheduleRender(1);
      renderLocalActiveHistory();
      syncHistoryActionButtons();
    });

    listObserver.observe(list, {
      childList: true,
    });
  }

  function setupHistoryActionObserver() {
    const tableBody = document.querySelector("[data-history-table-body]");

    if (!tableBody) return;

    if (historyObserver) {
      historyObserver.disconnect();
    }

    historyObserver = new MutationObserver(syncHistoryActionButtons);
    historyObserver.observe(tableBody, {
      childList: true,
      subtree: true,
    });
  }

  function scheduleRender(page = currentPage) {
    if (renderScheduled) return;

    renderScheduled = true;

    window.requestAnimationFrame(() => {
      renderScheduled = false;
      renderPagination(page);
    });
  }

  function renderPagination(requestedPage = currentPage) {
    const list = document.querySelector(LIST_SELECTOR);

    if (!list) return;

    syncWorkoutCardVisuals(list);

    const cards = getWorkoutCards(list);
    const totalPages = Math.max(1, Math.ceil(cards.length / PAGE_SIZE));

    currentPage = clamp(Number(requestedPage) || 1, 1, totalPages);

    cards.forEach((card, index) => {
      const page = Math.floor(index / PAGE_SIZE) + 1;
      const isVisible = page === currentPage;

      card.hidden = !isVisible;
      card.classList.toggle("is-workout-page-hidden", !isVisible);
    });

    renderControls(list, cards.length, totalPages);
    syncHistoryActionButtons();
  }

  function syncWorkoutCardVisuals(list) {
    getWorkoutCards(list).forEach((card) => {
      const description = card.querySelector(".workout-card-description");
      const badge = card.querySelector(".badge");

      if (
        description &&
        String(description.textContent || "").trim() === "Treino cadastrado pelo usuário."
      ) {
        description.textContent = "Treino cadastrado na sua rotina.";
      }

      if (badge && String(badge.textContent || "").trim() === "Cadastrado") {
        badge.textContent = "Ativo";
      }
    });
  }

  function setupLocalActiveHistory() {
    if (!isLocalAuthMode()) return;

    renderLocalActiveHistory();

    if (!localHistoryInterval) {
      localHistoryInterval = window.setInterval(() => {
        renderLocalActiveHistory();
        syncHistoryActionButtons();
      }, LIVE_DURATION_UPDATE_MS);
    }

    document.querySelector("[data-history-search]")?.addEventListener("input", () => {
      renderLocalActiveHistory();
      syncHistoryActionButtons();
    });
    document.querySelector("[data-history-period]")?.addEventListener("change", () => {
      renderLocalActiveHistory();
      syncHistoryActionButtons();
    });
    document.querySelector("[data-history-clear]")?.addEventListener("click", () => {
      window.setTimeout(() => {
        renderLocalActiveHistory();
        syncHistoryActionButtons();
      }, 0);
    });
  }

  function renderLocalActiveHistory() {
    if (!isLocalAuthMode()) return;

    const tableBody = document.querySelector("[data-history-table-body]");

    if (!tableBody) return;

    tableBody.querySelectorAll("[data-local-active-session-row]").forEach((row) => {
      row.remove();
    });

    const activeSessions = getFilteredLocalActiveSessions();

    if (!activeSessions.length) {
      updateLocalHistorySummary(false, 0);
      syncHistoryActionButtons();
      return;
    }

    removeLocalEmptyHistoryRows(tableBody);

    tableBody.insertAdjacentHTML(
      "afterbegin",
      activeSessions.map(renderLocalActiveSessionRow).join(""),
    );

    updateLocalHistorySummary(true, activeSessions.length);
    syncHistoryActionButtons();
  }

  function getFilteredLocalActiveSessions() {
    const sessions = getLocalActiveSessions();
    const query = String(document.querySelector("[data-history-search]")?.value || "")
      .trim()
      .toLowerCase();
    const periodValue = document.querySelector("[data-history-period]")?.value || "all";
    const periodDays = periodValue === "all" ? 0 : Number(periodValue);
    const now = Date.now();

    return sessions.filter((session) => {
      const matchesQuery = !query
        ? true
        : String(session.workoutName || "Treino cadastrado")
            .toLowerCase()
            .includes(query);

      if (!matchesQuery) return false;
      if (!periodDays) return true;

      const startedAt = getSessionStartTime(session);
      const periodStart = now - periodDays * 24 * 60 * 60 * 1000;

      return startedAt >= periodStart && startedAt <= now;
    });
  }

  function getLocalActiveSessions() {
    const prefix = `${ACTIVE_LOCAL_SESSION_PREFIX}:${getCurrentUserScopeId()}:`;
    const sessions = [];
    const seenIds = new Set();

    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);

      if (!key?.startsWith(prefix)) continue;

      try {
        const session = JSON.parse(window.localStorage.getItem(key) || "null");
        const sessionId = String(session?.id || "");

        if (!sessionId || seenIds.has(sessionId)) continue;
        if (String(session?.status || "").toUpperCase() !== "IN_PROGRESS") continue;

        seenIds.add(sessionId);
        sessions.push(normalizeLocalActiveSession(session));
      } catch {
        // Ignora registros locais inválidos.
      }
    }

    return sessions.sort((a, b) => getSessionStartTime(b) - getSessionStartTime(a));
  }

  function normalizeLocalActiveSession(session) {
    const startedAt = session.startedAtIso || session.startedAt || new Date().toISOString();

    return {
      id: String(session.id || ""),
      workoutId: String(session.workoutId || ""),
      workoutName: String(session.workoutName || "Treino cadastrado"),
      startedAt,
      status: "IN_PROGRESS",
      source: "LOCAL",
    };
  }

  function renderLocalActiveSessionRow(session) {
    const workoutHref = `./workout-session.html?id=${encodeURIComponent(session.workoutId)}`;
    const startedAt = getSessionStartDate(session).toISOString();

    return `
      <tr data-local-active-session-row data-session-id="${escapeHTML(session.id)}">
        <td>${escapeHTML(session.workoutName || "Treino cadastrado")}</td>
        <td>${escapeHTML(formatDateTime(startedAt))}</td>
        <td data-local-live-duration="true" data-started-at="${escapeHTML(startedAt)}">
          ${escapeHTML(formatDuration(getElapsedSeconds(startedAt)))}
        </td>
        <td>
          <span class="badge badge-warning" title="Este treino está em execução neste momento.">
            Em andamento
          </span>
        </td>
        <td>0 XP</td>
        <td class="history-actions-cell">
          <div class="history-actions">
            <a
              class="btn btn-outline btn-sm"
              href="${workoutHref}"
              aria-label="Voltar ao treino"
              title="Voltar ao treino"
            >
              <i class="bi bi-arrow-return-right" aria-hidden="true"></i>
            </a>
          </div>
        </td>
      </tr>
    `;
  }

  function removeLocalEmptyHistoryRows(tableBody) {
    Array.from(tableBody.querySelectorAll("tr")).forEach((row) => {
      if (row.querySelector("td[colspan]") && /Nenhuma sessão/i.test(row.textContent || "")) {
        row.remove();
      }
    });
  }

  function updateLocalHistorySummary(hasActiveSessions, activeCount) {
    const summary = document.querySelector("[data-history-summary]");

    if (!summary || !hasActiveSessions) return;

    summary.textContent = `${activeCount} treino${activeCount === 1 ? "" : "s"} em andamento salvo${activeCount === 1 ? "" : "s"} neste navegador.`;
  }

  function syncHistoryActionButtons() {
    document.querySelectorAll(".history-actions .btn").forEach((button) => {
      const icon = button.querySelector("i");
      const label = getHistoryActionLabel(button, icon);

      if (!icon || !label) return;

      button.classList.add("is-history-icon-only");
      button.setAttribute("aria-label", label);
      button.setAttribute("title", label);
      icon.setAttribute("aria-hidden", "true");
      applyHistoryIconButtonLayout(button);

      if (button.textContent.trim()) {
        button.innerHTML = icon.outerHTML;
      }
    });
  }

  function applyHistoryIconButtonLayout(button) {
    button.style.width = "42px";
    button.style.minWidth = "42px";
    button.style.height = "42px";
    button.style.padding = "0";
    button.style.display = "inline-flex";
    button.style.alignItems = "center";
    button.style.justifyContent = "center";
  }

  function getHistoryActionLabel(button, icon) {
    const text = String(button.textContent || "").trim().toLowerCase();

    if (icon?.classList.contains("bi-eye") || text.includes("detalhe")) {
      return "Ver detalhes";
    }

    if (icon?.classList.contains("bi-trash") || text.includes("remover")) {
      return "Remover";
    }

    if (
      icon?.classList.contains("bi-arrow-return-right") ||
      text.includes("voltar ao treino")
    ) {
      return "Voltar ao treino";
    }

    return "";
  }

  function getCurrentUserScopeId() {
    const user = window.Auth?.getCurrentUser?.() || getStoredConfigUser();
    const scope = String(user?.id || user?.email || "anonymous").trim().toLowerCase();

    return scope.replace(/[^a-z0-9@._-]/g, "_") || "anonymous";
  }

  function getStoredConfigUser() {
    try {
      const userKey = window.APP_CONFIG?.STORAGE_KEYS?.USER || "bora_treinar_user";

      return JSON.parse(window.localStorage.getItem(userKey) || "null");
    } catch {
      return null;
    }
  }

  function getSessionStartTime(session) {
    return getSessionStartDate(session).getTime();
  }

  function getSessionStartDate(session) {
    const value = session.startedAtIso || session.startedAt || new Date().toISOString();
    const date = new Date(value);

    if (!Number.isNaN(date.getTime())) {
      return date;
    }

    const numericDate = new Date(Number(value));

    return Number.isNaN(numericDate.getTime()) ? new Date() : numericDate;
  }

  function getElapsedSeconds(value) {
    const startedAt = new Date(value).getTime();

    if (!Number.isFinite(startedAt) || startedAt <= 0) return 0;

    return Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
  }

  function formatDuration(totalSeconds) {
    const safeSeconds = Math.max(0, Math.round(Number(totalSeconds || 0)));
    const minutes = Math.floor(safeSeconds / 60);
    const seconds = safeSeconds % 60;

    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  function formatDateTime(value) {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "Data não registrada";
    }

    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  }

  function isLocalAuthMode() {
    return Boolean(
      typeof window.isLocalAuthEnabled === "function" && window.isLocalAuthEnabled(),
    );
  }

  function renderControls(list, totalItems, totalPages) {
    const controls = ensureControls(list);

    if (!controls) return;

    if (totalItems <= PAGE_SIZE) {
      controls.hidden = true;
      controls.innerHTML = "";
      return;
    }

    controls.hidden = false;
    controls.innerHTML = `
      <button
        class="workout-pagination-arrow"
        type="button"
        data-workout-page-prev
        aria-label="Página anterior de treinos"
        ${currentPage <= 1 ? "disabled" : ""}
      >
        <i class="bi bi-chevron-left" aria-hidden="true"></i>
      </button>

      <div class="workout-pagination-pages" aria-label="Páginas de treinos">
        ${Array.from({ length: totalPages }, (_, index) => createPageButton(index + 1)).join("")}
      </div>

      <button
        class="workout-pagination-arrow"
        type="button"
        data-workout-page-next
        aria-label="Próxima página de treinos"
        ${currentPage >= totalPages ? "disabled" : ""}
      >
        <i class="bi bi-chevron-right" aria-hidden="true"></i>
      </button>
    `;

    controls.querySelector("[data-workout-page-prev]")?.addEventListener("click", () => {
      renderPagination(currentPage - 1);
      scrollListIntoView(list);
    });

    controls.querySelector("[data-workout-page-next]")?.addEventListener("click", () => {
      renderPagination(currentPage + 1);
      scrollListIntoView(list);
    });

    controls.querySelectorAll("[data-workout-page]").forEach((button) => {
      button.addEventListener("click", () => {
        renderPagination(Number(button.getAttribute("data-workout-page")) || 1);
        scrollListIntoView(list);
      });
    });
  }

  function createPageButton(page) {
    const isCurrent = page === currentPage;

    return `
      <button
        class="workout-pagination-page${isCurrent ? " is-active" : ""}"
        type="button"
        data-workout-page="${page}"
        aria-label="Ir para página ${page} de treinos"
        ${isCurrent ? 'aria-current="page"' : ""}
      >
        ${page}
      </button>
    `;
  }

  function ensureControls(list) {
    const section = list.closest(".dashboard-section") || list.parentElement;

    if (!section) return null;

    let controls = section.querySelector("[data-workout-pagination]");

    if (!controls) {
      controls = document.createElement("div");
      controls.className = "workout-pagination";
      controls.setAttribute("data-workout-pagination", "");
      controls.setAttribute("aria-label", "Paginação dos treinos");
      list.after(controls);
    }

    return controls;
  }

  function getWorkoutCards(list) {
    return Array.from(list.querySelectorAll(CARD_SELECTOR));
  }

  function scrollListIntoView(list) {
    if (!list || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    list.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    });
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function escapeHTML(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initWorkoutPagination);
  } else {
    initWorkoutPagination();
  }
})(window, document);
