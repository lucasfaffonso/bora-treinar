/* =========================================================
   Local workout page bridge
   - Alinha cards locais com estado em andamento.
   - Conta apenas treinos 100% concluídos.
   - Pagina o histórico local em blocos de 5 registros.
   ========================================================= */

(function (window, document) {
  "use strict";

  const ACTIVE_SESSION_PREFIX = "bora_treinar_active_local_session";
  const CARD_SELECTOR = ".workout-card";
  const SESSION_LINK_SELECTOR = 'a[href*="workout-session.html?id="]';
  const HISTORY_PAGE_SIZE = 5;
  const LIVE_UPDATE_MS = 1000;

  let currentHistoryPage = 1;
  let observer = null;
  let updateScheduled = false;
  let timer = null;

  function shouldRun() {
    return (
      document.body?.dataset?.page === "workouts" &&
      typeof window.isLocalAuthEnabled === "function" &&
      window.isLocalAuthEnabled()
    );
  }

  function init() {
    if (!shouldRun()) return;

    bindHistoryFilters();
    setupObserver();
    renderAll(true);

    if (!timer) {
      timer = window.setInterval(() => {
        renderAll(false);
        updateLiveDurations();
      }, LIVE_UPDATE_MS);
    }
  }

  function setupObserver() {
    if (observer) observer.disconnect();

    observer = new MutationObserver(scheduleRender);
    observer.observe(document.body, { childList: true, subtree: true });
  }

  function scheduleRender() {
    if (updateScheduled) return;

    updateScheduled = true;
    window.requestAnimationFrame(() => {
      updateScheduled = false;
      renderAll(false);
    });
  }

  function renderAll(forceHistoryRender) {
    syncWorkoutCards();
    syncLocalStats();
    renderLocalHistory(forceHistoryRender);
    updateLiveDurations();
  }

  /* =========================================================
     Cards em andamento
     ========================================================= */

  function syncWorkoutCards() {
    const activeWorkoutIds = new Set(getActiveSessions().map((session) => session.workoutId));

    document.querySelectorAll(CARD_SELECTOR).forEach((card) => {
      const workoutId = getWorkoutIdFromCard(card);
      const sessionLink = card.querySelector(SESSION_LINK_SELECTOR);

      if (!workoutId || !sessionLink) return;

      if (activeWorkoutIds.has(workoutId)) {
        markCardAsInProgress(card, sessionLink);
      } else {
        markCardAsAvailable(card, sessionLink);
      }
    });
  }

  function markCardAsInProgress(card, link) {
    const badge = card.querySelector(".badge");

    link.classList.add("is-active-session-action");
    link.setAttribute("data-active-session-action", "true");
    link.setAttribute("aria-label", "Voltar para treino em andamento");
    link.setAttribute("title", "Voltar ao treino");

    if (!/Voltar ao treino/i.test(link.textContent || "")) {
      link.innerHTML = `
        <i class="bi bi-arrow-return-right" aria-hidden="true"></i>
        <span>Voltar ao treino</span>
      `;
    }

    if (badge) {
      badge.classList.remove("badge-info", "badge-warning", "badge-danger");
      badge.classList.add("badge-success");
      badge.textContent = "Em treino";
      badge.setAttribute("title", "Este treino possui uma sessão em andamento.");
    }
  }

  function markCardAsAvailable(card, link) {
    const badge = card.querySelector(".badge");
    const wasActive = link.getAttribute("data-active-session-action") === "true";

    if (wasActive) {
      link.classList.remove("is-active-session-action");
      link.removeAttribute("data-active-session-action");
      link.setAttribute("aria-label", "Iniciar treino");
      link.removeAttribute("title");
      link.innerHTML = `
        <i class="bi bi-play-fill" aria-hidden="true"></i>
        <span>Iniciar</span>
      `;
    }

    if (badge && String(badge.textContent || "").trim() === "Em treino") {
      badge.classList.remove("badge-success", "badge-warning", "badge-danger");
      badge.classList.add("badge-info");
      badge.textContent = "Ativo";
      badge.setAttribute("title", "Este treino está disponível para iniciar.");
    }
  }

  function getWorkoutIdFromCard(card) {
    const datasetId = card.getAttribute("data-workout-id");

    if (datasetId) return String(datasetId);

    const link = card.querySelector(SESSION_LINK_SELECTOR);

    if (!link) return "";

    try {
      return new URL(link.href, window.location.href).searchParams.get("id") || "";
    } catch {
      return "";
    }
  }

  /* =========================================================
     Estatísticas locais
     ========================================================= */

  function syncLocalStats() {
    const storage = window.BoraTreinarStorage;
    const statsCards = document.querySelectorAll(".stats-card");

    if (!storage?.getStoredSessions || statsCards.length < 3) return;

    const completedSessions = storage.getStoredSessions().filter(isFullyCompleted);
    const completedThisWeek = completedSessions.filter((session) => isCurrentWeek(session.finishedAt));

    setStatsCard(statsCards[1], String(completedSessions.length), "Treinos concluídos");
    setStatsCard(statsCards[2], String(completedThisWeek.length), "Concluídos nesta semana");
  }

  function setStatsCard(card, value, description) {
    const valueElement = card?.querySelector(".stats-card-value");
    const descriptionElement = card?.querySelector(".stats-card-description");

    if (valueElement && valueElement.textContent !== value) valueElement.textContent = value;
    if (descriptionElement && descriptionElement.textContent !== description) {
      descriptionElement.textContent = description;
    }
  }

  /* =========================================================
     Histórico local paginado
     ========================================================= */

  function bindHistoryFilters() {
    getHistorySearchInput()?.addEventListener("input", () => {
      currentHistoryPage = 1;
      renderLocalHistory(true);
    });

    getHistoryPeriodSelect()?.addEventListener("change", () => {
      currentHistoryPage = 1;
      renderLocalHistory(true);
    });

    getHistoryClearButton()?.addEventListener("click", () => {
      const searchInput = getHistorySearchInput();
      const periodSelect = getHistoryPeriodSelect();

      if (searchInput) searchInput.value = "";
      if (periodSelect) periodSelect.value = "all";

      syncCustomHistoryPeriodSelect("all");
      currentHistoryPage = 1;
      renderLocalHistory(true);
    });
  }

  function renderLocalHistory(forceRender) {
    const tableBody = getHistoryTableBody();

    if (!tableBody) return;

    const rows = getFilteredHistoryRows();
    const totalPages = Math.max(1, Math.ceil(rows.length / HISTORY_PAGE_SIZE));

    currentHistoryPage = clamp(currentHistoryPage, 1, totalPages);

    const startIndex = (currentHistoryPage - 1) * HISTORY_PAGE_SIZE;
    const pageRows = rows.slice(startIndex, startIndex + HISTORY_PAGE_SIZE);
    const signature = JSON.stringify({
      page: currentHistoryPage,
      query: getHistoryQuery(),
      period: getHistoryPeriodValue(),
      rows: rows.map((row) => row.signature),
    });
    const ownsAllRows = Array.from(tableBody.querySelectorAll("tr")).every((row) => {
      return row.hasAttribute("data-local-history-page-row");
    });

    if (!forceRender && tableBody.dataset.localHistorySignature === signature && ownsAllRows) {
      updateHistorySummary(rows.length, pageRows.length);
      updateHistoryClearButtonState();
      return;
    }

    tableBody.dataset.localHistorySignature = signature;

    if (!rows.length) {
      tableBody.innerHTML = `
        <tr data-local-history-page-row>
          <td colspan="6">Nenhum registro de treino encontrado.</td>
        </tr>
      `;
    } else {
      tableBody.innerHTML = pageRows.map(renderHistoryRow).join("");
      bindDeleteButtons();
    }

    updateHistorySummary(rows.length, pageRows.length);
    renderHistoryPagination(rows.length, totalPages);
    updateHistoryClearButtonState();
  }

  function getFilteredHistoryRows() {
    const query = getHistoryQuery();
    const periodDays = getHistoryPeriodDays();
    const now = Date.now();
    const rows = [...getActiveHistoryRows(), ...getFinishedHistoryRows()];

    return rows.filter((row) => {
      const matchesQuery = !query
        ? true
        : String(row.workoutName || "Treino cadastrado").toLowerCase().includes(query);

      if (!matchesQuery) return false;
      if (!periodDays) return true;

      const referenceTime = new Date(row.referenceDate || 0).getTime();

      if (Number.isNaN(referenceTime)) return false;

      return referenceTime >= now - periodDays * 24 * 60 * 60 * 1000 && referenceTime <= now;
    });
  }

  function getActiveHistoryRows() {
    return getActiveSessions().map((session) => ({
      type: "active",
      id: session.id,
      workoutId: session.workoutId,
      workoutName: session.workoutName,
      referenceDate: session.startedAt,
      durationSeconds: getElapsedSeconds(session.startedAt),
      xp: 0,
      signature: `active:${session.id}:${session.workoutId}:${session.startedAt}`,
    }));
  }

  function getFinishedHistoryRows() {
    const storage = window.BoraTreinarStorage;

    if (!storage?.getStoredSessions) return [];

    return storage
      .getStoredSessions()
      .map((session) => {
        const referenceDate = session.finishedAt || new Date().toISOString();

        return {
          type: "finished",
          id: String(session.id || ""),
          workoutId: String(session.workoutId || ""),
          workoutName: String(session.workoutName || "Treino cadastrado"),
          referenceDate,
          durationSeconds: toPositiveNumber(session.durationSeconds, 0),
          progress: toPositiveNumber(session.progress, 0),
          completedSets: toPositiveNumber(session.completedSets, 0),
          totalSets: toPositiveNumber(session.totalSets, 0),
          xp: toPositiveNumber(session.xp, 0),
          signature: [
            "finished",
            session.id,
            session.finishedAt,
            session.progress,
            session.completedSets,
            session.totalSets,
          ].join(":"),
        };
      })
      .sort((a, b) => new Date(b.referenceDate || 0).getTime() - new Date(a.referenceDate || 0).getTime());
  }

  function renderHistoryRow(row) {
    const status = getHistoryStatus(row);
    const detailHref = `./workout-session-detail.html?id=${encodeURIComponent(row.id)}`;
    const workoutHref = `./workout-session.html?id=${encodeURIComponent(row.workoutId)}`;
    const durationAttrs = row.type === "active"
      ? ` data-local-history-live-duration data-started-at="${escapeHTML(row.referenceDate)}"`
      : "";

    return `
      <tr data-local-history-page-row data-history-row-id="${escapeHTML(row.id)}">
        <td>${escapeHTML(row.workoutName || "Treino cadastrado")}</td>
        <td>${escapeHTML(formatDateTime(row.referenceDate))}</td>
        <td${durationAttrs}>${escapeHTML(formatDuration(row.durationSeconds))}</td>
        <td>
          <span class="badge ${status.badgeClass}" title="${escapeHTML(status.title)}">
            ${escapeHTML(status.label)}
          </span>
        </td>
        <td>${escapeHTML(formatXp(row.xp))}</td>
        <td class="history-actions-cell">
          <div class="history-actions">
            ${row.type === "active" ? renderActiveAction(workoutHref) : renderFinishedActions(detailHref, row.id)}
          </div>
        </td>
      </tr>
    `;
  }

  function renderActiveAction(href) {
    return `
      <a class="btn btn-outline btn-sm is-history-icon-only" href="${href}" aria-label="Voltar ao treino" title="Voltar ao treino">
        <i class="bi bi-arrow-return-right" aria-hidden="true"></i>
      </a>
    `;
  }

  function renderFinishedActions(detailHref, sessionId) {
    return `
      <a class="btn btn-outline btn-sm is-history-icon-only" href="${detailHref}" aria-label="Ver detalhes" title="Ver detalhes">
        <i class="bi bi-eye" aria-hidden="true"></i>
      </a>

      <button class="btn btn-outline btn-sm is-history-icon-only" type="button" data-local-delete-session="${escapeHTML(sessionId)}" aria-label="Remover" title="Remover">
        <i class="bi bi-trash" aria-hidden="true"></i>
      </button>
    `;
  }

  function renderHistoryPagination(totalRows, totalPages) {
    const navigation = getHistoryNavigation();

    if (!navigation) return;

    navigation.classList.add("is-history-pagination");

    if (totalRows <= HISTORY_PAGE_SIZE) {
      navigation.hidden = true;
      navigation.innerHTML = "";
      return;
    }

    navigation.hidden = false;
    navigation.innerHTML = `
      <div class="workout-pagination history-pagination" aria-label="Paginação do histórico">
        <button class="workout-pagination-arrow" type="button" data-local-history-prev aria-label="Página anterior do histórico" ${currentHistoryPage <= 1 ? "disabled" : ""}>
          <i class="bi bi-chevron-left" aria-hidden="true"></i>
        </button>

        <div class="workout-pagination-pages" aria-label="Páginas do histórico">
          ${Array.from({ length: totalPages }, (_, index) => renderHistoryPageButton(index + 1)).join("")}
        </div>

        <button class="workout-pagination-arrow" type="button" data-local-history-next aria-label="Próxima página do histórico" ${currentHistoryPage >= totalPages ? "disabled" : ""}>
          <i class="bi bi-chevron-right" aria-hidden="true"></i>
        </button>
      </div>
    `;

    navigation.querySelector("[data-local-history-prev]")?.addEventListener("click", () => {
      currentHistoryPage = Math.max(1, currentHistoryPage - 1);
      renderLocalHistory(true);
    });

    navigation.querySelector("[data-local-history-next]")?.addEventListener("click", () => {
      currentHistoryPage = Math.min(totalPages, currentHistoryPage + 1);
      renderLocalHistory(true);
    });

    navigation.querySelectorAll("[data-local-history-page]").forEach((button) => {
      button.addEventListener("click", () => {
        currentHistoryPage = Number(button.getAttribute("data-local-history-page")) || 1;
        renderLocalHistory(true);
      });
    });
  }

  function renderHistoryPageButton(page) {
    const isActive = page === currentHistoryPage;

    return `
      <button class="workout-pagination-page${isActive ? " is-active" : ""}" type="button" data-local-history-page="${page}" aria-label="Ir para página ${page} do histórico" ${isActive ? 'aria-current="page"' : ""}>
        ${page}
      </button>
    `;
  }

  function updateHistorySummary(totalRows, visibleRows) {
    const summary = getHistorySummary();

    if (!summary) return;

    if (!totalRows) {
      summary.textContent = hasHistoryFilters()
        ? "Nenhum registro encontrado para os filtros aplicados."
        : "Nenhum registro de treino foi salvo no histórico ainda.";
      return;
    }

    const first = (currentHistoryPage - 1) * HISTORY_PAGE_SIZE + 1;
    const last = first + visibleRows - 1;
    const totalPages = Math.max(1, Math.ceil(totalRows / HISTORY_PAGE_SIZE));

    summary.textContent = `Mostrando ${first} a ${last} de ${totalRows} registros. Página ${currentHistoryPage} de ${totalPages}.`;
  }

  function bindDeleteButtons() {
    const storage = window.BoraTreinarStorage;

    document.querySelectorAll("[data-local-delete-session]").forEach((button) => {
      button.addEventListener("click", async () => {
        const sessionId = button.getAttribute("data-local-delete-session");

        if (!sessionId || !storage?.deleteSession) return;

        let shouldDelete = true;

        if (typeof window.showBtConfirmDialog === "function") {
          shouldDelete = await window.showBtConfirmDialog({
            title: "Remover histórico?",
            message: "Essa ação vai remover o registro desta sessão do histórico.",
            confirmLabel: "Remover histórico",
            cancelLabel: "Cancelar",
            variant: "danger",
            icon: "trash",
          });
        }

        if (!shouldDelete) return;

        storage.deleteSession(sessionId);
        syncLocalStats();
        renderLocalHistory(true);
      });
    });
  }

  function getHistoryStatus(row) {
    if (row.type === "active") {
      return {
        badgeClass: "badge-warning",
        label: "Em andamento",
        title: "Este treino está em execução neste momento.",
      };
    }

    if (isFullyCompleted(row)) {
      return {
        badgeClass: "badge-success",
        label: "Concluído",
        title: "Todas as séries foram concluídas.",
      };
    }

    if (toPositiveNumber(row.completedSets, 0) > 0 || toPositiveNumber(row.progress, 0) > 0) {
      return {
        badgeClass: "badge-warning",
        label: "Parcial",
        title: "O treino foi encerrado com parte das séries concluída.",
      };
    }

    return {
      badgeClass: "badge-danger",
      label: "Não executado",
      title: "O treino foi finalizado sem séries concluídas.",
    };
  }

  /* =========================================================
     Dados e helpers
     ========================================================= */

  function getActiveSessions() {
    const prefix = `${ACTIVE_SESSION_PREFIX}:${getCurrentUserScopeId()}:`;
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
        if (!session?.workoutId) continue;

        seenIds.add(sessionId);
        sessions.push({
          id: sessionId,
          workoutId: String(session.workoutId),
          workoutName: String(session.workoutName || "Treino cadastrado"),
          startedAt: session.startedAtIso || session.startedAt || new Date().toISOString(),
        });
      } catch {
        // Ignora registros locais inválidos.
      }
    }

    return sessions.sort((a, b) => new Date(b.startedAt || 0).getTime() - new Date(a.startedAt || 0).getTime());
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

  function getHistoryTableBody() {
    return document.querySelector("[data-history-table-body]");
  }

  function getHistoryNavigation() {
    return document.querySelector("[data-history-navigation]");
  }

  function getHistorySummary() {
    return document.querySelector("[data-history-summary]");
  }

  function getHistorySearchInput() {
    return document.querySelector("[data-history-search]");
  }

  function getHistoryPeriodSelect() {
    return document.querySelector("[data-history-period]");
  }

  function getHistoryClearButton() {
    return document.querySelector("[data-history-clear]");
  }

  function getHistoryQuery() {
    return String(getHistorySearchInput()?.value || "").trim().toLowerCase();
  }

  function getHistoryPeriodValue() {
    return getHistoryPeriodSelect()?.value || "all";
  }

  function getHistoryPeriodDays() {
    const value = getHistoryPeriodValue();

    return value === "all" ? 0 : Number(value) || 0;
  }

  function hasHistoryFilters() {
    return Boolean(getHistoryQuery()) || getHistoryPeriodValue() !== "all";
  }

  function updateHistoryClearButtonState() {
    const button = getHistoryClearButton();

    if (button) button.disabled = !hasHistoryFilters();
  }

  function syncCustomHistoryPeriodSelect(value) {
    const customSelect = document.querySelector('[data-custom-select-for="historyPeriod"]');

    if (!customSelect) return;

    customSelect.querySelectorAll("[data-value]").forEach((button) => {
      button.classList.toggle("is-selected", button.getAttribute("data-value") === value);
    });

    const selectedLabel = customSelect.querySelector("[data-selected-label]");
    const selectedOption = customSelect.querySelector(`[data-value="${value}"]`);

    if (selectedLabel && selectedOption) selectedLabel.textContent = selectedOption.textContent.trim();
  }

  function updateLiveDurations() {
    document.querySelectorAll("[data-local-history-live-duration]").forEach((cell) => {
      const startedAt = cell.getAttribute("data-started-at");

      cell.textContent = formatDuration(getElapsedSeconds(startedAt));
    });
  }

  function isFullyCompleted(session) {
    const progress = toPositiveNumber(session?.progress, 0);
    const completedSets = toPositiveNumber(session?.completedSets, 0);
    const totalSets = toPositiveNumber(session?.totalSets, 0);

    return progress >= 100 || (totalSets > 0 && completedSets >= totalSets);
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

  function getElapsedSeconds(value) {
    const startedAt = new Date(value).getTime();

    if (!Number.isFinite(startedAt) || startedAt <= 0) return 0;

    return Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
  }

  function formatDuration(value) {
    const safeSeconds = Math.max(0, Math.round(Number(value || 0)));
    const minutes = Math.floor(safeSeconds / 60);
    const seconds = safeSeconds % 60;

    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  function formatDateTime(value) {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "Data não registrada";

    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  }

  function formatXp(value) {
    return `${toPositiveNumber(value, 0)} XP`;
  }

  function toPositiveNumber(value, fallback) {
    const number = Number(value);

    if (!Number.isFinite(number) || number < 0) return fallback;

    return Math.round(number);
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
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})(window, document);
