/* =========================================================
   Community creation flow
   - Fluxo visual/local para criação, busca, convite e solicitações.
   - Não cria endpoints e não altera o backend.
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {
  const root = document.querySelector("[data-community-builder-root]");

  if (!root) return;

  const CATALOG_KEY = "bora_treinar_user_communities_catalog";
  const REQUESTS_KEY = "bora_treinar_user_community_requests";
  const MEMBERS_KEY_PREFIX = "bora_treinar_user_community_members:";
  const MESSAGES_KEY_PREFIX = "bora_treinar_user_community_messages:";
  const FREE_COMMUNITY_LIMIT = 1;

  const state = {
    search: "",
    discoveryFilter: "all",
    activeCommunityId: "",
    inviteCode: new URLSearchParams(window.location.search).get("communityInvite") || "",
  };

  render();
  bindRootEvents();

  function bindRootEvents() {
    root.addEventListener("click", (event) => {
      const createToggle = event.target.closest("[data-community-create-toggle]");
      const copyInvite = event.target.closest("[data-created-community-copy]");
      const deleteButton = event.target.closest("[data-created-community-delete]");
      const openButton = event.target.closest("[data-created-community-open]");
      const closePageButton = event.target.closest("[data-community-page-close]");
      const joinButton = event.target.closest("[data-created-community-join]");
      const requestButton = event.target.closest("[data-created-community-request]");
      const cancelRequestButton = event.target.closest("[data-community-request-cancel]");
      const approveButton = event.target.closest("[data-community-request-approve]");
      const declineButton = event.target.closest("[data-community-request-decline]");
      const clearInviteButton = event.target.closest("[data-community-invite-clear]");
      const selectButton = event.target.closest("[data-community-select-button]");
      const selectOption = event.target.closest("[data-community-select-option]");
      const filterButton = event.target.closest("[data-created-community-filter]");

      if (selectButton) {
        event.preventDefault();
        toggleStyledSelect(selectButton);
        return;
      }

      if (selectOption) {
        event.preventDefault();
        chooseStyledSelectOption(selectOption);
        return;
      }

      closeStyledSelects();

      if (filterButton) {
        event.preventDefault();
        state.discoveryFilter = filterButton.getAttribute("data-created-community-filter") || "all";
        renderCommunityLists();
        return;
      }

      if (createToggle) {
        event.preventDefault();
        toggleCreatePanel();
        return;
      }

      if (copyInvite) {
        event.preventDefault();
        copyCommunityInvite(copyInvite.getAttribute("data-created-community-copy"));
        return;
      }

      if (deleteButton) {
        event.preventDefault();
        deleteCreatedCommunity(deleteButton.getAttribute("data-created-community-delete"));
        return;
      }

      if (openButton) {
        event.preventDefault();
        openCommunityPage(openButton.getAttribute("data-created-community-open"));
        return;
      }

      if (closePageButton) {
        event.preventDefault();
        closeCommunityPage();
        return;
      }

      if (joinButton) {
        event.preventDefault();
        joinCreatedCommunity(joinButton.getAttribute("data-created-community-join"));
        return;
      }

      if (requestButton) {
        event.preventDefault();
        requestCommunityAccess(requestButton.getAttribute("data-created-community-request"));
        return;
      }

      if (cancelRequestButton) {
        event.preventDefault();
        cancelCommunityRequest(cancelRequestButton.getAttribute("data-community-request-cancel"));
        return;
      }

      if (approveButton) {
        event.preventDefault();
        updateRequestStatus(approveButton.getAttribute("data-community-request-approve"), "APPROVED");
        return;
      }

      if (declineButton) {
        event.preventDefault();
        updateRequestStatus(declineButton.getAttribute("data-community-request-decline"), "DECLINED");
        return;
      }

      if (clearInviteButton) {
        event.preventDefault();
        clearInviteFromUrl();
      }
    });

    root.addEventListener("input", (event) => {
      const searchInput = event.target.closest("[data-created-community-search]");

      if (searchInput) {
        state.search = searchInput.value.trim().toLowerCase();
        renderCommunityLists();
      }
    });

    root.addEventListener("change", (event) => {
      const accessField = event.target.closest("[data-community-access-field]");

      if (accessField) {
        syncVisibilityField();
      }
    });

    root.addEventListener("submit", (event) => {
      const form = event.target.closest("[data-community-create-form]");
      const chatForm = event.target.closest("[data-community-chat-form]");

      if (form) {
        event.preventDefault();
        createCommunity(form);
        return;
      }

      if (chatForm) {
        event.preventDefault();
        sendCommunityMessage(chatForm);
      }
    });
  }

  function render() {
    root.innerHTML = `
      <section class="content-card community-builder-card">
        <div class="community-builder-header">
          <div>
            <span class="badge badge-info">Criar comunidade</span>
            <h2>Minhas comunidades</h2>
            <p>
              Crie grupos para treinar com amigos, gerenciar convites e acompanhar
              solicitações de entrada.
            </p>
          </div>
          <button class="btn btn-primary community-create-icon-button" type="button" data-community-create-toggle title="Criar comunidade" aria-label="Criar comunidade">
            <i class="bi bi-plus-lg" aria-hidden="true"></i>
          </button>
        </div>

        <div class="community-create-panel" data-community-create-panel hidden>
          ${renderCreateForm()}
        </div>

        <div data-community-invite-result></div>
        <div data-community-page></div>

        <div class="community-builder-grid">
          <article class="community-builder-column">
            <div class="community-builder-list-header">
              <div>
                <h3>Suas comunidades</h3>
                <p>Acesse grupos que você criou ou participa.</p>
              </div>
            </div>
            <div class="created-community-list" data-created-community-owned-list></div>
          </article>

          <article class="community-builder-column">
            <div class="community-builder-list-header">
              <div>
                <h3>Descobrir comunidades</h3>
                <p>Busque grupos públicos ou privados visíveis criados por outras pessoas.</p>
              </div>
            </div>
            <label class="community-search-field">
              <i class="bi bi-search" aria-hidden="true"></i>
              <input type="search" placeholder="Buscar comunidade" data-created-community-search />
            </label>
            <div class="community-discovery-filters" data-created-community-filters></div>
            <div class="created-community-list" data-created-community-discovery-list></div>
            <div class="community-sent-requests" data-community-sent-requests></div>
          </article>
        </div>
      </section>
    `;

    renderCommunityLists();
    renderInviteResult();
    renderCommunityPage();
  }

  function renderCreateForm() {
    const premium = isPremiumUser();
    const createdByUser = getCatalog().filter(isOwnedByCurrentUser);
    const reachedFreeLimit = !premium && createdByUser.length >= FREE_COMMUNITY_LIMIT;

    if (reachedFreeLimit) {
      return `
        <div class="community-create-form community-create-limit-card">
          <div class="community-create-form-header">
            <div>
              <h3>Limite do plano gratuito</h3>
              <p>
                Você já criou sua comunidade gratuita. Para criar mais grupos,
                use os recursos Premium quando estiverem disponíveis.
              </p>
            </div>
            <span class="badge badge-info">Free</span>
          </div>
          <div class="community-plan-alert">
            <i class="bi bi-info-circle" aria-hidden="true"></i>
            <span>Você ainda pode copiar convites, aprovar solicitações e participar de outros grupos.</span>
          </div>
          <div class="community-create-actions">
            <button class="btn btn-outline" type="button" data-community-create-toggle>Fechar</button>
          </div>
        </div>
      `;
    }

    return `
      <form class="community-create-form" data-community-create-form>
        <div class="community-create-form-header">
          <div>
            <h3>Nova comunidade</h3>
            <p>
              ${premium
                ? "Crie comunidades públicas, privadas visíveis ou privadas por convite."
                : "No plano gratuito, você pode criar 1 comunidade. Grupos privados invisíveis ficam no Premium."}
            </p>
          </div>
          <span class="badge badge-info">${premium ? "Premium" : "Free"}</span>
        </div>

        <div class="community-create-grid">
          <div class="input-group">
            <label for="communityName">Nome da comunidade</label>
            <input class="input" id="communityName" name="name" type="text" maxlength="48" required placeholder="Ex.: Treino com amigos" />
          </div>

          <div class="input-group community-select-group">
            <label for="communityCategory">Categoria</label>
            <select class="input native-select-hidden" id="communityCategory" name="category">
              <option value="Constância">Constância</option>
              <option value="Força">Força</option>
              <option value="Hipertrofia">Hipertrofia</option>
              <option value="Iniciantes">Iniciantes</option>
              <option value="Amigos">Amigos</option>
            </select>
            ${renderStyledSelect("communityCategory", [
              ["Constância", "Constância"],
              ["Força", "Força"],
              ["Hipertrofia", "Hipertrofia"],
              ["Iniciantes", "Iniciantes"],
              ["Amigos", "Amigos"],
            ])}
          </div>

          <div class="input-group community-create-wide">
            <label for="communityDescription">Descrição</label>
            <textarea class="input" id="communityDescription" name="description" maxlength="160" rows="3" required placeholder="Explique o objetivo do grupo"></textarea>
          </div>

          <div class="input-group community-select-group">
            <label for="communityAccess">Tipo</label>
            <select class="input native-select-hidden" id="communityAccess" name="access" data-community-access-field>
              <option value="public">Pública</option>
              <option value="private">Privada</option>
            </select>
            ${renderStyledSelect("communityAccess", [
              ["public", "Pública"],
              ["private", "Privada"],
            ])}
          </div>

          <label class="community-visibility-option" data-community-private-visibility-row hidden>
            <span class="community-switch-control">
              <input type="checkbox" name="visible" checked />
              <span aria-hidden="true"></span>
            </span>
            <span>
              <strong>Aparecer na busca</strong>
              <small>Desmarcar deixa o grupo acessível apenas por convite.</small>
            </span>
          </label>
        </div>

        <div class="community-create-actions">
          <button class="btn btn-primary" type="submit">
            <i class="bi bi-check-circle" aria-hidden="true"></i>
            Salvar comunidade
          </button>
          <button class="btn btn-outline" type="button" data-community-create-toggle>
            Cancelar
          </button>
        </div>
      </form>
    `;
  }

  function renderStyledSelect(selectId, options) {
    const [initialValue, initialLabel] = options[0];

    return `
      <div class="bt-select community-bt-select" data-community-select="${escapeAttribute(selectId)}">
        <button class="bt-select-button" type="button" data-community-select-button="${escapeAttribute(selectId)}">
          <span data-community-select-label="${escapeAttribute(selectId)}">${escapeHTML(initialLabel)}</span>
          <i class="bi bi-chevron-down" aria-hidden="true"></i>
        </button>
        <div class="bt-select-menu">
          ${options.map(([value, label]) => `
            <button class="${value === initialValue ? "is-selected" : ""}" type="button" data-community-select-option="${escapeAttribute(selectId)}" data-value="${escapeAttribute(value)}">
              ${escapeHTML(label)}
            </button>
          `).join("")}
        </div>
      </div>
    `;
  }

  function renderCommunityLists() {
    const ownedList = root.querySelector("[data-created-community-owned-list]");
    const discoveryList = root.querySelector("[data-created-community-discovery-list]");
    const filtersContainer = root.querySelector("[data-created-community-filters]");
    const sentRequestsContainer = root.querySelector("[data-community-sent-requests]");
    const catalog = getCatalog();
    const currentScope = getCurrentUserScopeId();
    const userCommunities = catalog.filter((community) => {
      return community.ownerScope === currentScope || isMemberOfCommunity(community.id);
    });
    const discoverable = catalog.filter((community) => {
      if (community.ownerScope === currentScope) return false;
      if (isMemberOfCommunity(community.id)) return false;
      if (community.access === "public") return true;
      return community.access === "private" && community.visible === true;
    });

    if (ownedList) {
      ownedList.innerHTML = userCommunities.length
        ? userCommunities.map(renderUserCommunityCard).join("") + renderOwnerRequests(userCommunities.filter(isOwnedByCurrentUser))
        : renderEmptyState("Nenhuma comunidade ainda.", "Crie uma comunidade ou entre em um grupo para acompanhar por aqui.");
    }

    if (filtersContainer) {
      filtersContainer.innerHTML = renderDiscoveryFilters(discoverable);
    }

    if (discoveryList) {
      const filtered = discoverable.filter(matchesSearch).filter(matchesDiscoveryFilter);
      discoveryList.innerHTML = filtered.length
        ? filtered.map(renderDiscoverCommunityCard).join("")
        : renderEmptyState("Nenhuma comunidade encontrada.", getEmptyDiscoveryMessage());
    }

    if (sentRequestsContainer) {
      sentRequestsContainer.innerHTML = renderSentRequests(catalog);
    }

    updateJoinedCounter();
    renderCommunityPage();
  }

  function renderDiscoveryFilters(discoverable) {
    const counts = {
      all: discoverable.length,
      public: discoverable.filter((community) => community.access === "public").length,
      private: discoverable.filter((community) => community.access === "private").length,
    };

    return [
      ["all", "Todas", counts.all],
      ["public", "Públicas", counts.public],
      ["private", "Privadas", counts.private],
    ].map(([value, label, count]) => `
      <button class="community-filter-chip${state.discoveryFilter === value ? " is-active" : ""}" type="button" data-created-community-filter="${escapeAttribute(value)}">
        <span>${escapeHTML(label)}</span>
        <strong>${count}</strong>
      </button>
    `).join("");
  }

  function renderUserCommunityCard(community) {
    const owned = isOwnedByCurrentUser(community);
    const pendingRequests = owned ? getPendingRequestsForCommunity(community.id).length : 0;

    return `
      <article class="created-community-card${owned ? " is-owned" : " is-joined"}" data-created-community-card="${escapeAttribute(community.id)}">
        <div class="created-community-card-header">
          <span class="created-community-icon"><i class="bi bi-people" aria-hidden="true"></i></span>
          <span class="badge ${owned ? "badge-info" : "badge-success"}">${owned ? escapeHTML(getAccessLabel(community)) : "Participando"}</span>
        </div>
        <h4>${escapeHTML(community.name)}</h4>
        <p>${escapeHTML(community.description)}</p>
        <div class="created-community-meta">
          <span><i class="bi bi-tag" aria-hidden="true"></i>${escapeHTML(community.category)}</span>
          <span><i class="bi bi-person" aria-hidden="true"></i>${getMemberCount(community.id)} membro(s)</span>
          ${pendingRequests > 0 ? `<span><i class="bi bi-bell" aria-hidden="true"></i>${pendingRequests} solicitação(ões)</span>` : ""}
        </div>
        <div class="created-community-actions">
          <button class="btn btn-primary" type="button" data-created-community-open="${escapeAttribute(community.id)}">
            <i class="bi bi-box-arrow-in-right" aria-hidden="true"></i>
            Abrir
          </button>
          ${owned ? `
            <button class="btn btn-outline" type="button" data-created-community-copy="${escapeAttribute(community.id)}">
              <i class="bi bi-link-45deg" aria-hidden="true"></i>
              Copiar convite
            </button>
            <button class="btn btn-outline btn-danger-soft community-icon-action" type="button" data-created-community-delete="${escapeAttribute(community.id)}" title="Excluir comunidade" aria-label="Excluir comunidade">
              <i class="bi bi-trash" aria-hidden="true"></i>
            </button>
          ` : ""}
        </div>
      </article>
    `;
  }

  function renderDiscoverCommunityCard(community) {
    const request = getRequestForCurrentUser(community.id);
    const isPrivate = community.access === "private";
    const status = getDiscoveryStatus(community, request);

    return `
      <article class="created-community-card" data-created-community-card="${escapeAttribute(community.id)}">
        <div class="created-community-card-header">
          <span class="created-community-icon"><i class="bi ${isPrivate ? "bi-lock" : "bi-globe2"}" aria-hidden="true"></i></span>
          <span class="badge ${status.badgeClass}">${escapeHTML(status.label)}</span>
        </div>
        <h4>${escapeHTML(community.name)}</h4>
        <p>${escapeHTML(community.description)}</p>
        <div class="created-community-meta">
          <span><i class="bi bi-tag" aria-hidden="true"></i>${escapeHTML(community.category)}</span>
          <span><i class="bi bi-person" aria-hidden="true"></i>${getMemberCount(community.id)} membro(s)</span>
          <span><i class="bi ${isPrivate ? "bi-person-plus" : "bi-door-open"}" aria-hidden="true"></i>${isPrivate ? "Entrada por aprovação" : "Entrada livre"}</span>
        </div>
        <div class="created-community-actions">
          ${renderDiscoveryAction(community, request)}
        </div>
      </article>
    `;
  }

  function renderDiscoveryAction(community, request) {
    if (request?.status === "PENDING") {
      return `
        <span class="created-community-status is-pending"><i class="bi bi-hourglass-split" aria-hidden="true"></i> Aguardando aprovação</span>
        <button class="btn btn-outline" type="button" data-community-request-cancel="${escapeAttribute(request.id)}">Cancelar</button>
      `;
    }

    if (request?.status === "DECLINED") {
      return `
        <span class="created-community-status is-declined"><i class="bi bi-x-circle" aria-hidden="true"></i> Solicitação recusada</span>
        <button class="btn btn-outline" type="button" data-created-community-request="${escapeAttribute(community.id)}">Solicitar novamente</button>
      `;
    }

    if (community.access === "public") {
      return `<button class="btn btn-primary" type="button" data-created-community-join="${escapeAttribute(community.id)}">Entrar</button>`;
    }

    return `<button class="btn btn-outline" type="button" data-created-community-request="${escapeAttribute(community.id)}">Solicitar entrada</button>`;
  }

  function renderOwnerRequests(ownedCommunities) {
    const communityIds = new Set(ownedCommunities.map((community) => community.id));
    const pendingRequests = getRequests().filter((request) => {
      return request.status === "PENDING" && communityIds.has(request.communityId);
    });

    if (!pendingRequests.length) return "";

    return `
      <div class="community-request-box">
        <div class="community-request-title-row">
          <h4>Solicitações recebidas</h4>
          <span>${pendingRequests.length}</span>
        </div>
        ${pendingRequests.map((request) => {
          const community = ownedCommunities.find((item) => item.id === request.communityId);

          return `
            <div class="community-request-row">
              <div>
                <strong>${escapeHTML(request.userName || "Usuário")}</strong>
                <span>quer entrar em ${escapeHTML(community?.name || "sua comunidade")}</span>
              </div>
              <div class="community-request-actions">
                <button class="btn btn-primary" type="button" data-community-request-approve="${escapeAttribute(request.id)}">Aprovar</button>
                <button class="btn btn-outline" type="button" data-community-request-decline="${escapeAttribute(request.id)}">Recusar</button>
              </div>
            </div>
          `;
        }).join("")}
      </div>
    `;
  }

  function renderSentRequests(catalog) {
    const currentScope = getCurrentUserScopeId();
    const sentRequests = getRequests().filter((request) => {
      const community = catalog.find((item) => item.id === request.communityId);
      return request.userScope === currentScope && community && community.ownerScope !== currentScope && request.status === "PENDING";
    });

    if (!sentRequests.length) return "";

    return `
      <div class="community-request-box community-sent-request-box">
        <div class="community-request-title-row">
          <h4>Solicitações enviadas</h4>
          <span>${sentRequests.length}</span>
        </div>
        ${sentRequests.map((request) => {
          const community = catalog.find((item) => item.id === request.communityId);

          return `
            <div class="community-request-row">
              <div>
                <strong>${escapeHTML(community?.name || "Comunidade")}</strong>
                <span>Aguardando aprovação do criador.</span>
              </div>
              <div class="community-request-actions">
                <button class="btn btn-outline" type="button" data-community-request-cancel="${escapeAttribute(request.id)}">Cancelar</button>
              </div>
            </div>
          `;
        }).join("")}
      </div>
    `;
  }

  function renderCommunityPage() {
    const container = root.querySelector("[data-community-page]");

    if (!container) return;

    const community = state.activeCommunityId ? getCommunityById(state.activeCommunityId) : null;

    if (!community || !canAccessCommunityPage(community)) {
      state.activeCommunityId = "";
      container.innerHTML = "";
      return;
    }

    const owned = isOwnedByCurrentUser(community);
    const members = getCommunityMemberNames(community);
    const messages = getCommunityMessages(community.id);

    container.innerHTML = `
      <article class="community-page-card" data-community-open-page="${escapeAttribute(community.id)}">
        <div class="community-page-header">
          <div>
            <span class="badge ${owned ? "badge-info" : "badge-success"}">${owned ? "Criada por você" : "Participando"}</span>
            <h3>${escapeHTML(community.name)}</h3>
            <p>${escapeHTML(community.description)}</p>
          </div>
          <button class="btn btn-outline" type="button" data-community-page-close>
            <i class="bi bi-arrow-left" aria-hidden="true"></i>
            Voltar
          </button>
        </div>

        <div class="community-page-meta">
          <span><i class="bi bi-tag" aria-hidden="true"></i>${escapeHTML(community.category)}</span>
          <span><i class="bi bi-people" aria-hidden="true"></i>${members.length} participante(s)</span>
          <span><i class="bi ${community.access === "private" ? "bi-lock" : "bi-globe2"}" aria-hidden="true"></i>${escapeHTML(getAccessLabel(community))}</span>
        </div>

        <div class="community-page-grid">
          <section class="community-chat-panel">
            <div class="community-panel-title">
              <div>
                <h4>Chat da comunidade</h4>
                <p>Converse com os participantes do grupo.</p>
              </div>
            </div>
            <div class="community-chat-list" data-community-chat-list>
              ${messages.length ? messages.map(renderChatMessage).join("") : renderChatEmptyState()}
            </div>
            <form class="community-chat-form" data-community-chat-form>
              <input class="input" name="message" type="text" maxlength="300" autocomplete="off" placeholder="Escreva uma mensagem" required />
              <button class="btn btn-primary" type="submit">
                <i class="bi bi-send" aria-hidden="true"></i>
                Enviar
              </button>
            </form>
          </section>

          <aside class="community-members-panel">
            <div class="community-panel-title">
              <div>
                <h4>Participantes</h4>
                <p>Pessoas dentro deste grupo.</p>
              </div>
            </div>
            <div class="community-member-list">
              ${members.map((member) => `
                <span>
                  <i class="bi bi-person-circle" aria-hidden="true"></i>
                  ${escapeHTML(member)}
                </span>
              `).join("")}
            </div>
            ${owned ? `
              <button class="btn btn-outline w-full" type="button" data-created-community-copy="${escapeAttribute(community.id)}">
                <i class="bi bi-link-45deg" aria-hidden="true"></i>
                Copiar convite
              </button>
            ` : ""}
          </aside>
        </div>
      </article>
    `;
  }

  function renderChatMessage(message) {
    const isMine = message.userScope === getCurrentUserScopeId();

    return `
      <div class="community-chat-message${isMine ? " is-mine" : ""}">
        <div>
          <strong>${escapeHTML(message.userName || "Usuário")}</strong>
          <span>${formatDateTime(message.createdAt)}</span>
        </div>
        <p>${escapeHTML(message.body)}</p>
      </div>
    `;
  }

  function renderChatEmptyState() {
    return `
      <div class="community-chat-empty">
        <i class="bi bi-chat-dots" aria-hidden="true"></i>
        <strong>Nenhuma mensagem ainda.</strong>
        <p>Envie a primeira mensagem para movimentar o grupo.</p>
      </div>
    `;
  }

  function renderInviteResult() {
    const container = root.querySelector("[data-community-invite-result]");

    if (!container || !state.inviteCode) return;

    const community = getCatalog().find((item) => item.inviteCode === state.inviteCode);

    if (!community) {
      container.innerHTML = "";
      return;
    }

    const alreadyJoined = isMemberOfCommunity(community.id);

    container.innerHTML = `
      <div class="community-invite-banner">
        <div>
          <span class="badge badge-info">Convite</span>
          <h3>${escapeHTML(community.name)}</h3>
          <p>${alreadyJoined ? "Você já participa desta comunidade." : "Você recebeu um convite para entrar nesta comunidade."}</p>
        </div>
        <div class="community-invite-actions">
          ${alreadyJoined
            ? `<button class="btn btn-primary" type="button" data-created-community-open="${escapeAttribute(community.id)}">Abrir comunidade</button>`
            : `<button class="btn btn-primary" type="button" data-created-community-join="${escapeAttribute(community.id)}">Entrar pelo convite</button>`}
          <button class="btn btn-outline" type="button" data-community-invite-clear>Fechar</button>
        </div>
      </div>
    `;
  }

  function renderEmptyState(title, description) {
    return `
      <div class="created-community-empty">
        <i class="bi bi-people" aria-hidden="true"></i>
        <strong>${escapeHTML(title)}</strong>
        <p>${escapeHTML(description)}</p>
      </div>
    `;
  }

  function createCommunity(form) {
    const premium = isPremiumUser();
    const catalog = getCatalog();
    const createdByUser = catalog.filter(isOwnedByCurrentUser);

    if (!premium && createdByUser.length >= FREE_COMMUNITY_LIMIT) {
      showToastMessage("Limite do plano gratuito", "Você já criou sua comunidade gratuita.", "warning");
      return;
    }

    const formData = new FormData(form);
    const name = String(formData.get("name") || "").trim();
    const description = String(formData.get("description") || "").trim();
    const category = String(formData.get("category") || "Constância").trim();
    const access = String(formData.get("access") || "public");
    const visible = access === "public" ? true : formData.get("visible") === "on";

    if (!name || !description) {
      showToastMessage("Preencha os dados", "Informe nome e descrição da comunidade.", "warning");
      return;
    }

    if (!premium && access === "private" && !visible) {
      showToastMessage("Recurso Premium", "Comunidades privadas por convite ficam disponíveis no Premium.", "warning");
      return;
    }

    const community = {
      id: createId("community"),
      name,
      description,
      category,
      access,
      visible,
      ownerScope: getCurrentUserScopeId(),
      ownerName: getCurrentUserName(),
      inviteCode: createInviteCode(),
      createdAt: new Date().toISOString(),
      source: "USER_CREATED",
    };

    saveCatalog([...catalog, community]);
    addMembership(community.id, getCurrentUserScopeId());
    form.reset();
    hideCreatePanel();
    renderCommunityLists();
    showToastMessage("Comunidade criada", "Sua comunidade foi criada com sucesso.", "success");
  }

  function deleteCreatedCommunity(communityId) {
    const community = getCommunityById(communityId);

    if (!community || !isOwnedByCurrentUser(community)) return;

    saveCatalog(getCatalog().filter((item) => item.id !== communityId));
    saveRequests(getRequests().filter((request) => request.communityId !== communityId));
    removeCommunityFromAllMemberships(communityId);
    removeCommunityMessages(communityId);

    if (state.activeCommunityId === communityId) {
      state.activeCommunityId = "";
    }

    if (state.inviteCode === community.inviteCode) {
      clearInviteFromUrl();
    }

    hideCreatePanel();
    renderCommunityLists();
    renderInviteResult();
    showToastMessage("Comunidade excluída", "Sua comunidade foi removida.", "success");
  }

  function joinCreatedCommunity(communityId) {
    const community = getCommunityById(communityId);

    if (!community) return;

    addMembership(community.id, getCurrentUserScopeId());
    updateRequestForCurrentUser(community.id, "APPROVED");
    state.activeCommunityId = community.id;
    renderCommunityLists();
    renderInviteResult();
    showToastMessage("Você entrou na comunidade", "O grupo foi adicionado às suas comunidades.", "success");
  }

  function requestCommunityAccess(communityId) {
    const community = getCommunityById(communityId);

    if (!community || hasPendingRequest(communityId)) return;

    const requests = getRequests().filter((request) => {
      return !(request.communityId === communityId && request.userScope === getCurrentUserScopeId());
    });

    requests.push({
      id: createId("request"),
      communityId,
      userScope: getCurrentUserScopeId(),
      userName: getCurrentUserName(),
      status: "PENDING",
      createdAt: new Date().toISOString(),
    });

    saveRequests(requests);
    renderCommunityLists();
    showToastMessage("Solicitação enviada", "O criador da comunidade poderá aprovar sua entrada.", "success");
  }

  function cancelCommunityRequest(requestId) {
    const request = getRequests().find((item) => item.id === requestId);

    if (!request || request.userScope !== getCurrentUserScopeId()) return;

    saveRequests(getRequests().filter((item) => item.id !== requestId));
    renderCommunityLists();
    showToastMessage("Solicitação cancelada", "A solicitação foi removida.", "success");
  }

  function updateRequestStatus(requestId, status) {
    const requests = getRequests();
    const request = requests.find((item) => item.id === requestId);

    if (!request) return;

    request.status = status;
    request.updatedAt = new Date().toISOString();
    saveRequests(requests);

    if (status === "APPROVED") {
      addMembership(request.communityId, request.userScope);
    }

    renderCommunityLists();
    showToastMessage(
      status === "APPROVED" ? "Solicitação aprovada" : "Solicitação recusada",
      status === "APPROVED" ? "O usuário entrou na comunidade." : "A solicitação foi recusada.",
      "success",
    );
  }

  function updateRequestForCurrentUser(communityId, status) {
    const requests = getRequests();
    const request = requests.find((item) => {
      return item.communityId === communityId && item.userScope === getCurrentUserScopeId();
    });

    if (!request) return;

    request.status = status;
    request.updatedAt = new Date().toISOString();
    saveRequests(requests);
  }

  function openCommunityPage(communityId) {
    const community = getCommunityById(communityId);

    if (!community || !canAccessCommunityPage(community)) return;

    state.activeCommunityId = communityId;
    renderCommunityPage();
    root.querySelector("[data-community-page]")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function closeCommunityPage() {
    state.activeCommunityId = "";
    renderCommunityPage();
  }

  function canAccessCommunityPage(community) {
    return isOwnedByCurrentUser(community) || isMemberOfCommunity(community.id);
  }

  function sendCommunityMessage(form) {
    const community = getCommunityById(state.activeCommunityId);

    if (!community || !canAccessCommunityPage(community)) {
      showToastMessage("Acesso indisponível", "Entre na comunidade para enviar mensagens.", "warning");
      return;
    }

    const input = form.querySelector("input[name='message']");
    const body = String(input?.value || "").trim();

    if (!body) return;

    const messages = getCommunityMessages(community.id);
    messages.push({
      id: createId("message"),
      communityId: community.id,
      userScope: getCurrentUserScopeId(),
      userName: getCurrentUserName(),
      body,
      createdAt: new Date().toISOString(),
    });

    saveCommunityMessages(community.id, messages);
    form.reset();
    renderCommunityPage();
  }

  function copyCommunityInvite(communityId) {
    const community = getCommunityById(communityId);

    if (!community) return;

    const inviteUrl = getInviteUrl(community.inviteCode);

    copyText(inviteUrl).then(() => {
      showToastMessage("Convite copiado", "Envie o link para quem você quer convidar.", "success");
    });
  }

  function toggleCreatePanel() {
    const panel = root.querySelector("[data-community-create-panel]");

    if (!panel) return;

    panel.hidden = !panel.hidden;

    if (!panel.hidden) {
      panel.innerHTML = renderCreateForm();
      syncVisibilityField();
      panel.querySelector("input[name='name']")?.focus();
    }
  }

  function hideCreatePanel() {
    const panel = root.querySelector("[data-community-create-panel]");

    if (panel) {
      panel.hidden = true;
    }
  }

  function toggleStyledSelect(button) {
    const selectId = button.getAttribute("data-community-select-button");
    const select = root.querySelector(`[data-community-select="${cssEscape(selectId)}"]`);
    const willOpen = !select?.classList.contains("is-open");

    closeStyledSelects();

    if (select && willOpen) {
      select.classList.add("is-open");
    }
  }

  function chooseStyledSelectOption(option) {
    const selectId = option.getAttribute("data-community-select-option");
    const value = option.getAttribute("data-value") || "";
    const nativeSelect = root.querySelector(`#${cssEscape(selectId)}`);
    const label = root.querySelector(`[data-community-select-label="${cssEscape(selectId)}"]`);
    const customSelect = root.querySelector(`[data-community-select="${cssEscape(selectId)}"]`);

    if (!nativeSelect || !customSelect) return;

    nativeSelect.value = value;

    if (label) {
      label.textContent = option.textContent.trim();
    }

    customSelect.querySelectorAll("[data-community-select-option]").forEach((button) => {
      button.classList.toggle("is-selected", button === option);
    });

    customSelect.classList.remove("is-open");

    if (nativeSelect.matches("[data-community-access-field]")) {
      syncVisibilityField();
    }
  }

  function closeStyledSelects() {
    root.querySelectorAll(".community-bt-select.is-open").forEach((select) => {
      select.classList.remove("is-open");
    });
  }

  function syncVisibilityField() {
    const form = root.querySelector("[data-community-create-form]");
    const accessField = form?.querySelector("[data-community-access-field]");
    const row = form?.querySelector("[data-community-private-visibility-row]");

    if (!accessField || !row) return;

    row.hidden = accessField.value !== "private";
  }

  function matchesSearch(community) {
    if (!state.search) return true;

    return [community.name, community.description, community.category, getAccessLabel(community)]
      .join(" ")
      .toLowerCase()
      .includes(state.search);
  }

  function matchesDiscoveryFilter(community) {
    if (state.discoveryFilter === "public") return community.access === "public";
    if (state.discoveryFilter === "private") return community.access === "private";
    return true;
  }

  function getEmptyDiscoveryMessage() {
    if (state.discoveryFilter === "public") return "Nenhuma comunidade pública encontrada.";
    if (state.discoveryFilter === "private") return "Nenhuma comunidade privada visível encontrada.";
    return "Crie uma comunidade ou tente buscar por outro nome.";
  }

  function getDiscoveryStatus(community, request) {
    if (request?.status === "PENDING") {
      return { label: "Solicitada", badgeClass: "badge-warning" };
    }

    if (request?.status === "DECLINED") {
      return { label: "Recusada", badgeClass: "badge-danger" };
    }

    return { label: getAccessLabel(community), badgeClass: "badge-info" };
  }

  function getCatalog() {
    try {
      const parsed = JSON.parse(window.localStorage.getItem(CATALOG_KEY) || "[]");

      return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
    } catch {
      return [];
    }
  }

  function saveCatalog(catalog) {
    window.localStorage.setItem(CATALOG_KEY, JSON.stringify(catalog));
  }

  function getRequests() {
    try {
      const parsed = JSON.parse(window.localStorage.getItem(REQUESTS_KEY) || "[]");

      return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
    } catch {
      return [];
    }
  }

  function saveRequests(requests) {
    window.localStorage.setItem(REQUESTS_KEY, JSON.stringify(requests));
  }

  function getCommunityById(communityId) {
    return getCatalog().find((community) => community.id === communityId) || null;
  }

  function isOwnedByCurrentUser(community) {
    return community.ownerScope === getCurrentUserScopeId();
  }

  function getPendingRequestsForCommunity(communityId) {
    return getRequests().filter((request) => request.communityId === communityId && request.status === "PENDING");
  }

  function getRequestForCurrentUser(communityId) {
    return getRequests().find((request) => {
      return request.communityId === communityId && request.userScope === getCurrentUserScopeId();
    }) || null;
  }

  function hasPendingRequest(communityId) {
    return getRequests().some((request) => {
      return request.communityId === communityId &&
        request.userScope === getCurrentUserScopeId() &&
        request.status === "PENDING";
    });
  }

  function addMembership(communityId, userScope) {
    const key = getMembershipKey(userScope);
    const memberships = getMemberships(userScope);

    if (!memberships.includes(communityId)) {
      memberships.push(communityId);
      window.localStorage.setItem(key, JSON.stringify(memberships));
    }
  }

  function removeCommunityFromAllMemberships(communityId) {
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);

      if (!key || !key.startsWith(MEMBERS_KEY_PREFIX)) continue;

      try {
        const memberships = JSON.parse(window.localStorage.getItem(key) || "[]");

        if (!Array.isArray(memberships)) continue;

        window.localStorage.setItem(
          key,
          JSON.stringify(memberships.filter((id) => id !== communityId)),
        );
      } catch {
        // Ignora registros inválidos sem quebrar a tela.
      }
    }
  }

  function getMemberships(userScope) {
    try {
      const parsed = JSON.parse(window.localStorage.getItem(getMembershipKey(userScope)) || "[]");

      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      return [];
    }
  }

  function isMemberOfCommunity(communityId) {
    return getMemberships(getCurrentUserScopeId()).includes(communityId);
  }

  function getMembershipKey(userScope) {
    return `${MEMBERS_KEY_PREFIX}${userScope}`;
  }

  function getMemberCount(communityId) {
    const scopes = new Set();

    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);

      if (!key || !key.startsWith(MEMBERS_KEY_PREFIX)) continue;

      try {
        const memberships = JSON.parse(window.localStorage.getItem(key) || "[]");

        if (Array.isArray(memberships) && memberships.includes(communityId)) {
          scopes.add(key.replace(MEMBERS_KEY_PREFIX, ""));
        }
      } catch {
        // Ignora registros inválidos sem quebrar a tela.
      }
    }

    return scopes.size;
  }

  function getCommunityMemberNames(community) {
    const names = new Map();
    names.set(community.ownerScope, community.ownerName || "Criador");

    getRequests().forEach((request) => {
      if (request.communityId === community.id && request.status === "APPROVED") {
        names.set(request.userScope, request.userName || "Participante");
      }
    });

    if (isMemberOfCommunity(community.id)) {
      names.set(getCurrentUserScopeId(), getCurrentUserName());
    }

    return Array.from(names.values()).filter(Boolean);
  }

  function updateJoinedCounter() {
    const counter = document.querySelector("[data-communities-joined]");

    if (!counter) return;

    const staticJoined = Array.from(document.querySelectorAll("[data-community-card]")).filter((card) => {
      const badgeText = String(card.querySelector(".badge")?.textContent || "").toLowerCase();
      return card.classList.contains("is-joined") || badgeText.includes("participando");
    }).length;
    const createdJoined = getCatalog().filter((community) => isMemberOfCommunity(community.id)).length;

    counter.textContent = String(staticJoined + createdJoined);
  }

  function getCommunityMessages(communityId) {
    try {
      const parsed = JSON.parse(window.localStorage.getItem(getCommunityMessagesKey(communityId)) || "[]");

      return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
    } catch {
      return [];
    }
  }

  function saveCommunityMessages(communityId, messages) {
    window.localStorage.setItem(getCommunityMessagesKey(communityId), JSON.stringify(messages));
  }

  function removeCommunityMessages(communityId) {
    window.localStorage.removeItem(getCommunityMessagesKey(communityId));
  }

  function getCommunityMessagesKey(communityId) {
    return `${MESSAGES_KEY_PREFIX}${communityId}`;
  }

  function getAccessLabel(community) {
    if (community.access === "public") return "Pública";
    return community.visible ? "Privada visível" : "Privada por convite";
  }

  function getInviteUrl(inviteCode) {
    const url = new URL(window.location.href);
    url.searchParams.set("communityInvite", inviteCode);
    url.hash = "";
    return url.toString();
  }

  function clearInviteFromUrl() {
    state.inviteCode = "";
    const url = new URL(window.location.href);
    url.searchParams.delete("communityInvite");
    window.history.replaceState({}, document.title, url.toString());
    renderInviteResult();
  }

  function isPremiumUser() {
    const user = getCurrentUser();
    const status = String(user?.premiumStatus || user?.subscriptionStatus || "").toLowerCase();

    return Boolean(
      user?.premium === true ||
        user?.premiumActive === true ||
        user?.isPremium === true ||
        status === "active" ||
        status === "ativo",
    );
  }

  function getCurrentUser() {
    if (typeof window.Auth?.getCurrentUser === "function") {
      return window.Auth.getCurrentUser() || {};
    }

    if (typeof window.getCurrentUser === "function") {
      return window.getCurrentUser() || {};
    }

    try {
      const userKey = window.APP_CONFIG?.STORAGE_KEYS?.USER || "bora_treinar_user";
      return JSON.parse(window.localStorage.getItem(userKey) || "{}");
    } catch {
      return {};
    }
  }

  function getCurrentUserName() {
    const user = getCurrentUser();

    return user?.name || user?.fullName || user?.displayName || user?.email || "Usuário";
  }

  function getCurrentUserScopeId() {
    const user = getCurrentUser();
    const rawScope = String(user?.id || user?.email || "anonymous").trim().toLowerCase();

    return rawScope.replace(/[^a-z0-9@._-]/g, "_") || "anonymous";
  }

  function createId(prefix) {
    if (typeof window.crypto?.randomUUID === "function") {
      return `${prefix}-${window.crypto.randomUUID()}`;
    }

    return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function createInviteCode() {
    return createId("invite").replace(/[^a-zA-Z0-9]/g, "").slice(0, 24);
  }

  function formatDateTime(value) {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "agora";

    return date.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  async function copyText(text) {
    if (window.navigator?.clipboard?.writeText) {
      await window.navigator.clipboard.writeText(text);
      return;
    }

    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
  }

  function showToastMessage(title, message, type) {
    if (typeof window.showToast === "function") {
      window.showToast({ title, message, type });
    }
  }

  function cssEscape(value) {
    if (typeof window.CSS?.escape === "function") {
      return window.CSS.escape(String(value || ""));
    }

    return String(value || "").replace(/[^a-zA-Z0-9_-]/g, "\\$&");
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
});
