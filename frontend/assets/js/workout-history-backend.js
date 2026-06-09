/* =========================================================
   Workout history backend bridge
   Conecta o histórico da página de treinos aos endpoints reais.
   Mantém paginação visual igual ao GitHub Pages/S3.
   ========================================================= */

(function (window, document) {
  "use strict";

  const HISTORY_PAGE_SIZE = 5;
  const LIVE_DURATION_UPDATE_MS = 1000;
  const HIDDEN_BACKEND_HISTORY_IDS_KEY = "bora_treinar_hidden_backend_history_ids";

  let backendSessions = [];
  let currentHistoryPage = 1;
  let liveDurationInterval = null;

  function initWorkoutHistoryBackend() {
    const page = document.body?.dataset?.page || "";

    if (page !== "workouts") return;
    if (window.isLocalAuthEnabled?.()) return;
    if (typeof window.apiGet !== "function") return;

    setupFilters();
    renderLoading();
    loadBackendHistory();
  }

  async function loadBackendHistory() {
    try {
      const response = await window.apiGet("/workout-sessions");
      backendSessions = normalizeSessionList(unwrapApiData(response));
      const visibleBackendSessions = getVisibleBackendSessions(backendSessions);

      syncLocalSessionCache(backendSessions);
      renderHistory(true);
      updateStatsFromBackendHistory(visibleBackendSessions);
    } catch {
      renderError();
    }
  }

  function renderLoading() {
    const tableBody = getHistoryTableBody();

    if (!tableBody) return;

    tableBody.innerHTML = `
      <tr>
        <td colspan="6">Carregando histórico...</td>
      </tr>
    `;

    updateSummary("Buscando sessões salvas.");
    clearHistoryNavigation();
  }

  function renderHistory(forceFirstPage = false) {
    const tableBody = getHistoryTableBody();

    if (!tableBody) return;

    if (forceFirstPage) {
      currentHistoryPage = 1;
    }

    const visibleBackendSessions = getVisibleBackendSessions(backendSessions);
    const sortedSessions = [...visibleBackendSessions].sort((a, b) => {
      return new Date(b.referenceDate || 0).getTime() - new Date(a.referenceDate || 0).getTime();
    });
    const filteredSessions = filterSessions(sortedSessions);
    const totalPages = Math.max(1, Math.ceil(filteredSessions.length / HISTORY_PAGE_SIZE));

    currentHistoryPage = clamp(currentHistoryPage, 1, totalPages);

    const startIndex = (currentHistoryPage - 1) * HISTORY_PAGE_SIZE;
    const visibleSessions = filteredSessions.slice(startIndex, startIndex + HISTORY_PAGE_SIZE);

    updateNavigation({
      filteredCount: filteredSessions.length,
      visibleCount: visibleSessions.length,
      totalCount: visibleBackendSessions.length,
      totalPages,
    });

    if (!visibleBackendSessions.length) {
      stopLiveDurationUpdates();
      tableBody.innerHTML = `
        <tr>
          <td colspan="6">Nenhuma sessão disponível no histórico.</td>
        </tr>
      `;
      updateSummary("Nenhuma sessão real visível no histórico.");
      return;
    }

    if (!visibleSessions.length) {
      stopLiveDurationUpdates();
      tableBody.innerHTML = `
        <tr>
          <td colspan="6">Nenhuma sessão encontrada para esses filtros.</td>
        </tr>
      `;
      return;
    }

    tableBody.innerHTML = visibleSessions.map(renderSessionRow).join("");
    setupRemoveActions();
    updateLiveDurations();
    setupLiveDurationUpdates();
  }

  function renderSessionRow(session) {
    const detailHref = `./workout-session-detail.html?id=${encodeURIComponent(session.id)}`;
    const workoutHref = `./workout-session.html?id=${encodeURIComponent(session.workoutId)}`;
    const status = getSessionStatus(session);
    const liveDurationAttrs = isSessionInProgress(session)
      ? ` data-live-duration="true" data-started-at="${escapeHTML(session.startedAt)}"`
      : "";

    return `
      <tr>
        <td>${escapeHTML(session.workoutName || "Treino cadastrado")}</td>
        <td>${escapeHTML(formatDateTime(session.referenceDate))}</td>
        <td${liveDurationAttrs}>${escapeHTML(formatDuration(getDisplayDurationSeconds(session)))}</td>
        <td>
          <span class="badge ${status.badgeClass}" title="${escapeHTML(status.title)}">${escapeHTML(status.label)}</span>
        </td>
        <td>${escapeHTML(formatXp(session.xpEarned))}</td>
        <td class="history-actions-cell">
          <div class="history-actions">
            ${isSessionInProgress(session) ? renderReturnAction(workoutHref) : renderFinishedActions(detailHref, session.id)}
          </div>
        </td>
      </tr>
    `;
  }

  function renderReturnAction(href) {
    return `
      <a
        class="btn btn-outline btn-sm is-history-icon-only"
        href="${href}"
        aria-label="Voltar ao treino"
        title="Voltar ao treino"
      >
        <i class="bi bi-arrow-return-right" aria-hidden="true"></i>
      </a>
    `;
  }

  function renderFinishedActions(detailHref, sessionId) {
    return `
      <a
        class="btn btn-outline btn-sm is-history-icon-only"
        href="${detailHref}"
        aria-label="Ver detalhes"
        title="Ver detalhes"
      >
        <i class="bi bi-eye" aria-hidden="true"></i>
      </a>

      <button
        class="btn btn-outline btn-sm is-history-icon-only"
        type="button"
        data-backend-history-remove="${escapeHTML(sessionId)}"
        aria-label="Remover"
        title="Remover"
      >
        <i class="bi bi-trash" aria-hidden="true"></i>
      </button>
    `;
  }

  function setupRemoveActions() {
    document.querySelectorAll("[data-backend-history-remove]").forEach((button) => {
      button.addEventListener("click", () => {
        handleRemoveHistory(button.getAttribute("data-backend-history-remove"));
      });
    });
  }

  async function handleRemoveHistory(sessionId) {
    if (!sessionId) return;

    let shouldRemove = true;

    if (typeof window.showBtConfirmDialog === "function") {
      shouldRemove = await window.showBtConfirmDialog({
        title: "Remover histórico?",
        message: "Essa ação remove este registro desta lista. O registro original continuará salvo.",
        confirmLabel: "Remover histórico",
        cancelLabel: "Cancelar",
        variant: "danger",
        icon: "trash",
      });
    }

    if (!shouldRemove) return;

    hideBackendSession(sessionId);
    deleteLocalSessionCache(sessionId);

    const visibleBackendSessions = getVisibleBackendSessions(backendSessions);

    updateStatsFromBackendHistory(visibleBackendSessions);
    renderHistory();

    if (typeof window.showToast === "function") {
      window.showToast({
        title: "Histórico removido",
        message: "O registro foi removido da visualização deste navegador.",
        type: "success",
      });
    }
  }

  function renderError() {
    const tableBody = getHistoryTableBody();

    if (!tableBody) return;

    stopLiveDurationUpdates();

    tableBody.innerHTML = `
      <tr>
        <td colspan="6">
          Não foi possível carregar o histórico. Tente novamente em alguns instantes.
        </td>
      </tr>
    `;

    updateSummary("Histórico indisponível no momento. Tente novamente.");
    clearHistoryNavigation();
  }

  function updateStatsFromBackendHistory(sessions) {
    const statsCards = document.querySelectorAll(".stats-card");
    const completedSessions = sessions.filter((session) => getSessionProgress(session) >= 100);
    const finishedSessions = sessions.filter((session) => session.status === "FINISHED");
    const sessionsThisWeek = completedSessions.filter((session) => isCurrentWeek(session.finishedAt));
    const totalDuration = finishedSessions.reduce((sum, session) => {
      return sum + Number(getDisplayDurationSeconds(session) || 0);
    }, 0);
    const averageDuration = finishedSessions.length
      ? Math.round(totalDuration / finishedSessions.length)
      : 0;

    setStatsCard(statsCards[1], String(completedSessions.length), "Treinos concluídos");
    setStatsCard(statsCards[2], String(sessionsThisWeek.length), "Concluídos nesta semana");
    setStatsCard(statsCards[3], formatDuration(averageDuration), "Média registrada");
  }

  function setStatsCard(card, value, description) {
    if (!card) return;

    const valueElement = card.querySelector(".stats-card-value");
    const descriptionElement = card.querySelector(".stats-card-description");

    if (valueElement) valueElement.textContent = value;
    if (descriptionElement) descriptionElement.textContent = description;
  }

  function filterSessions(sessions) {
    const query = getHistorySearchInput()?.value.trim().toLowerCase() || "";
    const periodValue = getHistoryPeriodSelect()?.value || "all";
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

      const referenceTime = new Date(session.referenceDate || 0).getTime();

      if (Number.isNaN(referenceTime)) return false;

      const periodStart = now - periodDays * 24 * 60 * 60 * 1000;

      return referenceTime >= periodStart && referenceTime <= now;
    });
  }

  function hasFilters() {
    const query = getHistorySearchInput()?.value.trim() || "";
    const periodValue = getHistoryPeriodSelect()?.value || "all";

    return Boolean(query) || periodValue !== "all";
  }

  function setupFilters() {
    const searchInput = getHistorySearchInput();
    const periodSelect = getHistoryPeriodSelect();
    const clearButton = document.querySelector("[data-history-clear]");

    searchInput?.addEventListener("input", () => {
      currentHistoryPage = 1;
      renderHistory();
    });

    periodSelect?.addEventListener("change", () => {
      currentHistoryPage = 1;
      renderHistory();
    });

    clearButton?.addEventListener("click", () => {
      if (searchInput) searchInput.value = "";
      if (periodSelect) {
        periodSelect.value = "all";
        syncCustomSelect(periodSelect);
      }

      currentHistoryPage = 1;
      renderHistory();
    });
  }

  function updateNavigation({ filteredCount, visibleCount, totalCount, totalPages }) {
    const summary = document.querySelector("[data-history-summary]");
    const navigation = document.querySelector("[data-history-navigation]");
    const clearButton = document.querySelector("[data-history-clear]");

    if (summary) {
      if (!totalCount) {
        summary.textContent = "Nenhuma sessão real visível no histórico.";
      } else if (!filteredCount) {
        summary.textContent = "Nenhum registro encontrado para os filtros aplicados.";
      } else {
        const firstVisibleIndex = (currentHistoryPage - 1) * HISTORY_PAGE_SIZE + 1;
        const lastVisibleIndex = firstVisibleIndex + visibleCount - 1;

        summary.textContent = `Mostrando ${firstVisibleIndex} a ${lastVisibleIndex} de ${filteredCount} registros. Página ${currentHistoryPage} de ${totalPages}.`;
      }
    }

    if (navigation) {
      renderPaginationControls(navigation, filteredCount, totalPages);
    }

    if (clearButton) {
      clearButton.disabled = !hasFilters();
    }
  }

  function renderPaginationControls(navigation, filteredCount, totalPages) {
    navigation.classList.add("is-history-pagination");

    if (filteredCount <= HISTORY_PAGE_SIZE) {
      navigation.hidden = true;
      navigation.innerHTML = "";
      return;
    }

    navigation.hidden = false;
    navigation.innerHTML = `
      <div class="workout-pagination history-pagination" aria-label="Paginação do histórico">
        <button
          class="workout-pagination-arrow"
          type="button"
          data-backend-history-prev
          aria-label="Página anterior do histórico"
          ${currentHistoryPage <= 1 ? "disabled" : ""}
        >
          <i class="bi bi-chevron-left" aria-hidden="true"></i>
        </button>

        <div class="workout-pagination-pages" aria-label="Páginas do histórico">
          ${Array.from({ length: totalPages }, (_, index) => renderPageButton(index + 1)).join("")}
        </div>

        <button
          class="workout-pagination-arrow"
          type="button"
          data-backend-history-next
          aria-label="Próxima página do histórico"
          ${currentHistoryPage >= totalPages ? "disabled" : ""}
        >
          <i class="bi bi-chevron-right" aria-hidden="true"></i>
        </button>
      </div>
    `;

    navigation.querySelector("[data-backend-history-prev]")?.addEventListener("click", () => {
      currentHistoryPage = Math.max(1, currentHistoryPage - 1);
      renderHistory();
    });

    navigation.querySelector("[data-backend-history-next]")?.addEventListener("click", () => {
      currentHistoryPage = Math.min(totalPages, currentHistoryPage + 1);
      renderHistory();
    });

    navigation.querySelectorAll("[data-backend-history-page]").forEach((button) => {
      button.addEventListener("click", () => {
        currentHistoryPage = Number(button.getAttribute("data-backend-history-page")) || 1;
        renderHistory();
      });
    });
  }

  function renderPageButton(page) {
    const isActive = page === currentHistoryPage;

    return `
      <button
        class="workout-pagination-page${isActive ? " is-active" : ""}"
        type="button"
        data-backend-history-page="${page}"
        aria-label="Ir para página ${page} do histórico"
        ${isActive ? 'aria-current="page"' : ""}
      >
        ${page}
      </button>
    `;
  }

  function clearHistoryNavigation() {
    const navigation = document.querySelector("[data-history-navigation]");

    if (!navigation) return;

    navigation.hidden = true;
    navigation.innerHTML = "";
  }

  function updateSummary(message) {
    const summary = document.querySelector("[data-history-summary]");

    if (summary) {
      summary.textContent = message;
    }
  }

  function normalizeSessionList(value) {
    return Array.isArray(value) ? value.map(normalizeSession).filter(Boolean) : [];
  }

  function normalizeSession(session) {
    if (!session || typeof session !== "object" || !session.id) return null;

    const localSession = getLocalSessionById(session.id);
    const finishedAt = session.finishedAt || localSession?.finishedAt || "";
    const startedAt = session.startedAt || localSession?.startedAt || "";
    const status = String(session.status || localSession?.status || "FINISHED").toUpperCase();
    const durationSeconds = Number(session.durationSeconds || localSession?.durationSeconds || 0);
    const completedSets = Number(localSession?.completedSets || session.completedSets || 0);
    const totalSets = Number(localSession?.totalSets || session.totalSets || 0);
    const progress = Number(localSession?.progress || session.progress || extractProgressFromNotes(session.notes) || 0);

    return {
      id: String(session.id),
      workoutId: String(session.workoutId || localSession?.workoutId || ""),
      workoutName: String(session.workoutName || localSession?.workoutName || "Treino cadastrado"),
      startedAt,
      finishedAt,
      referenceDate: finishedAt || startedAt,
      durationSeconds,
      completedSets,
      totalSets,
      progress,
      status,
      xpEarned: Number(session.xpEarned || session.xp || localSession?.xp || 0),
      notes: String(session.notes || localSession?.notes || ""),
    };
  }

  function getLocalSessionById(sessionId) {
    const storage = window.BoraTreinarStorage;

    if (!storage?.getSessionById) return null;

    return storage.getSessionById(String(sessionId));
  }

  function syncLocalSessionCache(sessions) {
    const storage = window.BoraTreinarStorage;

    if (!storage?.saveStoredSessions) return;

    const localSessions = storage.getStoredSessions ? storage.getStoredSessions() : [];
    const localById = new Map(localSessions.map((session) => [String(session.id), session]));
    const mergedSessions = sessions.map((session) => {
      const local = localById.get(String(session.id));

      return {
        ...local,
        ...session,
        xp: session.xpEarned,
        progress: session.progress || local?.progress || 0,
        completedSets: session.completedSets || local?.completedSets || 0,
        totalSets: session.totalSets || local?.totalSets || 0,
        exercises: local?.exercises || [],
      };
    });

    storage.saveStoredSessions(mergedSessions);
  }

  function getVisibleBackendSessions(sessions) {
    const hiddenIds = getHiddenBackendSessionIds();

    return sessions.filter((session) => !hiddenIds.has(String(session.id)));
  }

  function hideBackendSession(sessionId) {
    const hiddenIds = getHiddenBackendSessionIds();

    hiddenIds.add(String(sessionId));
    saveHiddenBackendSessionIds(hiddenIds);
  }

  function getHiddenBackendSessionIds() {
    try {
      const parsed = JSON.parse(window.localStorage.getItem(getHiddenBackendSessionKey()) || "[]");

      return new Set(Array.isArray(parsed) ? parsed.map(String) : []);
    } catch {
      return new Set();
    }
  }

  function saveHiddenBackendSessionIds(hiddenIds) {
    try {
      window.localStorage.setItem(
        getHiddenBackendSessionKey(),
        JSON.stringify(Array.from(hiddenIds).map(String)),
      );
    } catch {
      // Ignora falhas de localStorage para não quebrar a API real.
    }
  }

  function getHiddenBackendSessionKey() {
    return `${HIDDEN_BACKEND_HISTORY_IDS_KEY}:${getCurrentUserScopeId()}`;
  }

  function deleteLocalSessionCache(sessionId) {
    const storage = window.BoraTreinarStorage;

    if (!storage?.deleteSession) return;

    storage.deleteSession(String(sessionId));
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

  function getSessionStatus(session) {
    if (isSessionInProgress(session)) {
      return {
        badgeClass: "badge-warning",
        label: "Em andamento",
        title: "Este treino está em execução neste momento.",
      };
    }

    const progress = getSessionProgress(session);

    if (progress >= 100) {
      return {
        badgeClass: "badge-success",
        label: "Concluído",
        title: "Todas as séries do treino foram concluídas.",
      };
    }

    if (progress > 0) {
      return {
        badgeClass: "badge-warning",
        label: "Parcial",
        title: "O treino foi iniciado, mas nem todas as séries foram concluídas.",
      };
    }

    return {
      badgeClass: "badge-danger",
      label: "Não executado",
      title: "A sessão foi finalizada sem séries concluídas.",
    };
  }

  function getSessionProgress(session) {
    const explicitProgress = Number(session.progress || 0);

    if (Number.isFinite(explicitProgress) && explicitProgress > 0) {
      return Math.min(100, Math.round(explicitProgress));
    }

    const completedSets = Number(session.completedSets || 0);
    const totalSets = Number(session.totalSets || 0);

    if (totalSets > 0) {
      return Math.min(100, Math.round((completedSets / totalSets) * 100));
    }

    return 0;
  }

  function extractProgressFromNotes(notes) {
    const match = String(notes || "").match(/(\d{1,3})%/);

    if (!match) return 0;

    const progress = Number(match[1]);

    return Number.isFinite(progress) ? Math.min(100, progress) : 0;
  }

  function isSessionInProgress(session) {
    return String(session.status || "").toUpperCase() === "IN_PROGRESS";
  }

  function setupLiveDurationUpdates() {
    const hasLiveRows = Boolean(document.querySelector("[data-live-duration]"));

    if (!hasLiveRows) {
      stopLiveDurationUpdates();
      return;
    }

    if (liveDurationInterval) return;

    liveDurationInterval = window.setInterval(updateLiveDurations, LIVE_DURATION_UPDATE_MS);
  }

  function stopLiveDurationUpdates() {
    if (!liveDurationInterval) return;

    window.clearInterval(liveDurationInterval);
    liveDurationInterval = null;
  }

  function updateLiveDurations() {
    document.querySelectorAll("[data-live-duration]").forEach((cell) => {
      const startedAt = cell.getAttribute("data-started-at");
      const seconds = getElapsedSecondsFromDate(startedAt);

      cell.textContent = formatDuration(seconds);
    });
  }

  function getDisplayDurationSeconds(session) {
    if (isSessionInProgress(session)) {
      return getElapsedSecondsFromDate(session.startedAt);
    }

    return Number(session.durationSeconds || 0);
  }

  function getElapsedSecondsFromDate(value) {
    const startedAt = new Date(value).getTime();

    if (!Number.isFinite(startedAt) || startedAt <= 0) {
      return 0;
    }

    return Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
  }

  function isCurrentWeek(value) {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return false;

    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setHours(0, 0, 0, 0);
    weekStart.setDate(now.getDate() - now.getDay());

    return date >= weekStart && date <= now;
  }

  function formatDuration(totalSeconds) {
    const safeSeconds = Math.max(0, Math.round(Number(totalSeconds || 0)));
    const minutes = Math.floor(safeSeconds / 60);
    const seconds = safeSeconds % 60;

    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  function formatXp(value) {
    const xp = Number(value || 0);

    return xp > 0 ? `+${xp} XP` : "0 XP";
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

  function getHistoryTableBody() {
    return document.querySelector("[data-history-table-body]");
  }

  function getHistorySearchInput() {
    return document.querySelector("[data-history-search]");
  }

  function getHistoryPeriodSelect() {
    return document.querySelector("[data-history-period]");
  }

  function syncCustomSelect(nativeSelect) {
    if (!nativeSelect?.id) return;

    const customSelect = document.querySelector(`[data-custom-select-for="${nativeSelect.id}"]`);
    const label = customSelect?.querySelector("[data-selected-label]");
    const options = customSelect?.querySelectorAll("[data-value]");

    if (!customSelect || !label || !options) return;

    const selectedOption = Array.from(options).find((option) => {
      return option.getAttribute("data-value") === nativeSelect.value;
    });

    options.forEach((option) => {
      option.classList.toggle("is-selected", option === selectedOption);
    });

    if (selectedOption) {
      label.textContent = selectedOption.textContent.trim();
    }
  }

  function unwrapApiData(response) {
    if (!response) return null;

    if (Object.prototype.hasOwnProperty.call(response, "data")) {
      return response.data;
    }

    return response;
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
    document.addEventListener("DOMContentLoaded", initWorkoutHistoryBackend);
  } else {
    initWorkoutHistoryBackend();
  }
})(window, document);
