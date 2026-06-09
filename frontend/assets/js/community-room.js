/* =========================================================
   Community room
   - Página local da comunidade com conversa e administração.
   - Usa o mesmo armazenamento local do criador de comunidades.
   - Não cria endpoints e não altera o backend.
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {
  const root = document.querySelector("[data-community-room-root]");

  if (!root) return;

  const CATALOG_KEY = "bora_treinar_user_communities_catalog";
  const REQUESTS_KEY = "bora_treinar_user_community_requests";
  const MEMBERS_KEY_PREFIX = "bora_treinar_user_community_members:";
  const MESSAGES_KEY_PREFIX = "bora_treinar_user_community_messages:";
  const communityId = new URLSearchParams(window.location.search).get("id") || "";

  const state = {
    deleteArmed: false,
    expelArmedScope: "",
  };

  render();

  root.addEventListener("click", (event) => {
    const copyInviteButton = event.target.closest("[data-room-copy-invite]");
    const deletePrepareButton = event.target.closest("[data-room-delete-prepare]");
    const deleteCancelButton = event.target.closest("[data-room-delete-cancel]");
    const deleteConfirmButton = event.target.closest("[data-room-delete-confirm]");
    const expelPrepareButton = event.target.closest("[data-room-expel-prepare]");
    const expelCancelButton = event.target.closest("[data-room-expel-cancel]");
    const expelConfirmButton = event.target.closest("[data-room-expel-confirm]");

    if (copyInviteButton) {
      event.preventDefault();
      copyCommunityInvite();
      return;
    }

    if (deletePrepareButton) {
      event.preventDefault();
      state.deleteArmed = true;
      renderAdminPanel();
      return;
    }

    if (deleteCancelButton) {
      event.preventDefault();
      state.deleteArmed = false;
      renderAdminPanel();
      return;
    }

    if (deleteConfirmButton) {
      event.preventDefault();
      deleteCommunity();
      return;
    }

    if (expelPrepareButton) {
      event.preventDefault();
      state.expelArmedScope = expelPrepareButton.getAttribute("data-room-expel-prepare") || "";
      renderMembersPanel();
      return;
    }

    if (expelCancelButton) {
      event.preventDefault();
      state.expelArmedScope = "";
      renderMembersPanel();
      return;
    }

    if (expelConfirmButton) {
      event.preventDefault();
      expelMember(expelConfirmButton.getAttribute("data-room-expel-confirm") || "");
    }
  });

  root.addEventListener("submit", (event) => {
    const form = event.target.closest("[data-room-chat-form]");

    if (!form) return;

    event.preventDefault();
    sendMessage(form);
  });

  function render() {
    const community = getCommunity();

    if (!community) {
      renderUnavailable("Comunidade não encontrada", "Volte para Comunidades e escolha um grupo existente.");
      return;
    }

    if (!canAccessCommunity(community)) {
      renderUnavailable("Acesso indisponível", "Entre na comunidade para acessar a conversa do grupo.");
      return;
    }

    root.innerHTML = `
      <section class="community-room-shell">
        <header class="community-room-header">
          <div>
            <a class="community-room-back" href="communities.html">
              <i class="bi bi-arrow-left" aria-hidden="true"></i>
              Voltar para comunidades
            </a>
            <span class="badge ${isOwner(community) ? "badge-info" : "badge-success"}">
              ${isOwner(community) ? "Administrador" : "Participante"}
            </span>
            <h1>${escapeHTML(community.name)}</h1>
            ${String(community.description || "").trim()
              ? `<p>${escapeHTML(community.description)}</p>`
              : ""}
          </div>
          <div class="community-room-actions">
            <button class="btn btn-outline" type="button" data-room-copy-invite>
              <i class="bi bi-link-45deg" aria-hidden="true"></i>
              Copiar convite
            </button>
          </div>
        </header>

        <div class="community-room-meta" aria-label="Resumo da comunidade">
          <span><i class="bi bi-tag" aria-hidden="true"></i>${escapeHTML(community.category || "Sem categoria")}</span>
          <span><i class="bi ${community.access === "private" ? "bi-lock" : "bi-globe2"}" aria-hidden="true"></i>${escapeHTML(getAccessLabel(community))}</span>
          <span><i class="bi bi-people" aria-hidden="true"></i>${getMembers(community).length} participante(s)</span>
        </div>

        <div class="community-room-grid">
          <section class="community-room-chat-card">
            <div class="community-room-section-title">
              <div>
                <h2>Conversa</h2>
              </div>
            </div>
            <div class="community-room-chat-list" data-room-chat-list>
              ${renderMessages()}
            </div>
            <form class="community-room-chat-form" data-room-chat-form>
              <input class="input" name="message" type="text" maxlength="300" autocomplete="off" placeholder="Escreva uma mensagem" required />
              <button class="btn btn-primary" type="submit">
                <i class="bi bi-send" aria-hidden="true"></i>
                Enviar
              </button>
            </form>
          </section>

          <aside class="community-room-side">
            <section class="community-room-panel" data-room-members-panel>
              ${renderMembersPanelHTML()}
            </section>

            <section class="community-room-panel" data-room-admin-panel>
              ${renderAdminPanelHTML()}
            </section>
          </aside>
        </div>
      </section>
    `;

    scrollChatToBottom();
  }

  function renderUnavailable(title, description) {
    root.innerHTML = `
      <section class="community-room-unavailable">
        <span class="badge badge-info">Comunidade</span>
        <h1>${escapeHTML(title)}</h1>
        <p>${escapeHTML(description)}</p>
        <a class="btn btn-primary" href="communities.html">
          <i class="bi bi-arrow-left" aria-hidden="true"></i>
          Voltar para comunidades
        </a>
      </section>
    `;
  }

  function renderMembersPanel() {
    const panel = root.querySelector("[data-room-members-panel]");

    if (panel) {
      panel.innerHTML = renderMembersPanelHTML();
    }
  }

  function renderAdminPanel() {
    const panel = root.querySelector("[data-room-admin-panel]");

    if (panel) {
      panel.innerHTML = renderAdminPanelHTML();
    }
  }

  function renderMembersPanelHTML() {
    const community = getCommunity();
    const members = community ? getMembers(community) : [];
    const owner = community ? isOwner(community) : false;

    return `
      <div class="community-room-section-title compact">
        <div>
          <h2>Participantes</h2>
        </div>
      </div>
      <div class="community-room-members">
        ${members.map((member) => renderMember(member, owner)).join("")}
      </div>
    `;
  }

  function renderMember(member, owner) {
    const isCurrentUser = member.scope === getCurrentUserScopeId();
    const canExpel = owner && !member.isOwner && !isCurrentUser;
    const isArmed = state.expelArmedScope === member.scope;

    return `
      <article class="community-room-member">
        <div>
          <span class="community-room-avatar">${escapeHTML(getInitials(member.name))}</span>
          <div>
            <strong>${escapeHTML(member.name)}</strong>
            <small>${member.isOwner ? "Administrador" : isCurrentUser ? "Você" : "Participante"}</small>
          </div>
        </div>
        ${canExpel
          ? isArmed
            ? `<div class="community-room-member-actions">
                <button class="btn btn-outline" type="button" data-room-expel-cancel>Cancelar</button>
                <button class="btn btn-outline btn-danger-soft" type="button" data-room-expel-confirm="${escapeAttribute(member.scope)}">Expulsar</button>
              </div>`
            : `<button class="btn btn-outline btn-danger-soft community-room-icon-btn" type="button" data-room-expel-prepare="${escapeAttribute(member.scope)}" title="Expulsar membro" aria-label="Expulsar membro">
                <i class="bi bi-person-x" aria-hidden="true"></i>
              </button>`
          : ""}
      </article>
    `;
  }

  function renderAdminPanelHTML() {
    const community = getCommunity();

    if (!community || !isOwner(community)) {
      return `
        <div class="community-room-section-title compact">
          <div>
            <h2>Administração</h2>
          </div>
        </div>
      `;
    }

    return `
      <div class="community-room-section-title compact">
        <div>
          <h2>Administração</h2>
        </div>
      </div>
      <div class="community-room-admin-actions">
        <button class="btn btn-outline w-full" type="button" data-room-copy-invite>
          <i class="bi bi-link-45deg" aria-hidden="true"></i>
          Copiar convite
        </button>
        ${state.deleteArmed
          ? `<div class="community-room-danger-box">
              <strong>Excluir comunidade?</strong>
              <p>Essa ação remove o grupo, mensagens e participantes.</p>
              <div>
                <button class="btn btn-outline" type="button" data-room-delete-cancel>Cancelar</button>
                <button class="btn btn-outline btn-danger-soft" type="button" data-room-delete-confirm>Excluir</button>
              </div>
            </div>`
          : `<button class="btn btn-outline btn-danger-soft w-full" type="button" data-room-delete-prepare>
              <i class="bi bi-trash" aria-hidden="true"></i>
              Excluir comunidade
            </button>`}
      </div>
    `;
  }

  function renderMessages() {
    const messages = getCommunityMessages(communityId);

    if (!messages.length) {
      return `
        <div class="community-room-chat-empty">
          <i class="bi bi-chat-dots" aria-hidden="true"></i>
          <strong>Nenhuma mensagem ainda.</strong>
        </div>
      `;
    }

    return messages.map((message) => {
      const isMine = message.userScope === getCurrentUserScopeId();

      return `
        <article class="community-room-message${isMine ? " is-mine" : ""}">
          <div>
            <strong>${escapeHTML(message.userName || "Usuário")}</strong>
            <span>${formatDateTime(message.createdAt)}</span>
          </div>
          <p>${escapeHTML(message.body)}</p>
        </article>
      `;
    }).join("");
  }

  function scrollChatToBottom() {
    const list = root.querySelector("[data-room-chat-list]");

    if (!list) return;

    window.requestAnimationFrame(() => {
      list.scrollTop = list.scrollHeight;
    });
  }

  function sendMessage(form) {
    const community = getCommunity();

    if (!community || !canAccessCommunity(community)) return;

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

    const list = root.querySelector("[data-room-chat-list]");
    if (list) {
      list.innerHTML = renderMessages();
      scrollChatToBottom();
    }
  }

  function expelMember(memberScope) {
    const community = getCommunity();

    if (!community || !isOwner(community) || memberScope === community.ownerScope) return;

    removeMembership(community.id, memberScope);
    saveRequests(getRequests().map((request) => {
      if (request.communityId === community.id && request.userScope === memberScope) {
        return {
          ...request,
          status: "REMOVED",
          updatedAt: new Date().toISOString(),
        };
      }

      return request;
    }));

    state.expelArmedScope = "";
    renderMembersPanel();
    showToastMessage("Membro removido", "O participante foi removido da comunidade.", "success");
  }

  function deleteCommunity() {
    const community = getCommunity();

    if (!community || !isOwner(community)) return;

    saveCatalog(getCatalog().filter((item) => item.id !== community.id));
    saveRequests(getRequests().filter((request) => request.communityId !== community.id));
    removeCommunityFromAllMemberships(community.id);
    window.localStorage.removeItem(`${MESSAGES_KEY_PREFIX}${community.id}`);

    showToastMessage("Comunidade excluída", "Sua comunidade foi removida.", "success");
    window.setTimeout(() => {
      window.location.href = "communities.html";
    }, 350);
  }

  function copyCommunityInvite() {
    const community = getCommunity();

    if (!community) return;

    const url = new URL(window.location.href);
    url.pathname = url.pathname.replace(/community-room\.html$/, "communities.html");
    url.search = "";
    url.searchParams.set("communityInvite", community.inviteCode);

    copyText(url.toString()).then(() => {
      showToastMessage("Convite copiado", "Envie o link para convidar participantes.", "success");
    });
  }

  function getCommunity() {
    if (!communityId) return null;
    return getCatalog().find((community) => String(community.id) === String(communityId)) || null;
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

  function canAccessCommunity(community) {
    return isOwner(community) || getMemberships(getCurrentUserScopeId()).includes(community.id);
  }

  function isOwner(community) {
    return community.ownerScope === getCurrentUserScopeId();
  }

  function getMembers(community) {
    const members = new Map();
    members.set(community.ownerScope, {
      scope: community.ownerScope,
      name: community.ownerName || "Administrador",
      isOwner: true,
    });

    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);

      if (!key || !key.startsWith(MEMBERS_KEY_PREFIX)) continue;

      const scope = key.replace(MEMBERS_KEY_PREFIX, "");
      const memberships = getMemberships(scope);

      if (memberships.includes(community.id) && !members.has(scope)) {
        const request = getRequests().find((item) => {
          return item.communityId === community.id && item.userScope === scope;
        });

        members.set(scope, {
          scope,
          name: request?.userName || (scope === getCurrentUserScopeId() ? getCurrentUserName() : "Participante"),
          isOwner: false,
        });
      }
    }

    return Array.from(members.values());
  }

  function getMemberships(userScope) {
    try {
      const parsed = JSON.parse(window.localStorage.getItem(`${MEMBERS_KEY_PREFIX}${userScope}`) || "[]");
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      return [];
    }
  }

  function removeMembership(communityIdValue, userScope) {
    const key = `${MEMBERS_KEY_PREFIX}${userScope}`;
    const memberships = getMemberships(userScope).filter((id) => id !== communityIdValue);
    window.localStorage.setItem(key, JSON.stringify(memberships));
  }

  function removeCommunityFromAllMemberships(communityIdValue) {
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);

      if (!key || !key.startsWith(MEMBERS_KEY_PREFIX)) continue;

      try {
        const memberships = JSON.parse(window.localStorage.getItem(key) || "[]");

        if (!Array.isArray(memberships)) continue;

        window.localStorage.setItem(
          key,
          JSON.stringify(memberships.filter((id) => id !== communityIdValue)),
        );
      } catch {
        // Ignora registros inválidos.
      }
    }
  }

  function getCommunityMessages(id) {
    try {
      const parsed = JSON.parse(window.localStorage.getItem(`${MESSAGES_KEY_PREFIX}${id}`) || "[]");
      return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
    } catch {
      return [];
    }
  }

  function saveCommunityMessages(id, messages) {
    window.localStorage.setItem(`${MESSAGES_KEY_PREFIX}${id}`, JSON.stringify(messages));
  }

  function getAccessLabel(community) {
    if (community.access === "public") return "Pública";
    return community.visible ? "Privada visível" : "Privada por convite";
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

  function getInitials(name) {
    const parts = String(name || "U").trim().split(/\s+/).filter(Boolean);
    return parts.slice(0, 2).map((part) => part.charAt(0).toUpperCase()).join("") || "U";
  }

  function createId(prefix) {
    if (typeof window.crypto?.randomUUID === "function") {
      return `${prefix}-${window.crypto.randomUUID()}`;
    }

    return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
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
