/* Redireciona ações principais para a sala dedicada da comunidade. */

(() => {
  const CATALOG_KEY = "bora_treinar_user_communities_catalog";
  const REQUESTS_KEY = "bora_treinar_user_community_requests";
  const MEMBERS_KEY_PREFIX = "bora_treinar_user_community_members:";

  document.addEventListener(
    "click",
    (event) => {
      const openButton = event.target.closest("[data-created-community-open]");
      const joinButton = event.target.closest("[data-created-community-join]");
      const actionButton = openButton || joinButton;

      if (!actionButton) return;

      const communityId = openButton
        ? openButton.getAttribute("data-created-community-open")
        : joinButton.getAttribute("data-created-community-join");

      if (!communityId) return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      if (joinButton) {
        joinCommunityLocally(communityId);
      }

      openCommunityRoom(communityId);
    },
    true,
  );

  function openCommunityRoom(communityId) {
    const url = new URL("community-room.html", window.location.href);
    url.searchParams.set("id", communityId);
    window.location.href = url.toString();
  }

  function joinCommunityLocally(communityId) {
    const community = getCatalog().find((item) => item.id === communityId);

    if (!community) return;

    const userScope = getCurrentUserScopeId();
    const memberships = new Set(getMemberships(userScope));
    memberships.add(communityId);

    window.localStorage.setItem(getMembershipKey(userScope), JSON.stringify(Array.from(memberships)));
    updateRequestForCurrentUser(communityId, "APPROVED");
  }

  function updateRequestForCurrentUser(communityId, status) {
    const userScope = getCurrentUserScopeId();
    const requests = getRequests();
    const request = requests.find((item) => {
      return item.communityId === communityId && item.userScope === userScope;
    });

    if (!request) return;

    request.status = status;
    request.updatedAt = new Date().toISOString();
    window.localStorage.setItem(REQUESTS_KEY, JSON.stringify(requests));
  }

  function getCatalog() {
    try {
      const parsed = JSON.parse(window.localStorage.getItem(CATALOG_KEY) || "[]");
      return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
    } catch {
      return [];
    }
  }

  function getRequests() {
    try {
      const parsed = JSON.parse(window.localStorage.getItem(REQUESTS_KEY) || "[]");
      return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
    } catch {
      return [];
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

  function getMembershipKey(userScope) {
    return `${MEMBERS_KEY_PREFIX}${userScope}`;
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

  function getCurrentUserScopeId() {
    const user = getCurrentUser();
    const rawScope = String(user?.id || user?.email || "anonymous").trim().toLowerCase();
    return rawScope.replace(/[^a-z0-9@._-]/g, "_") || "anonymous";
  }
})();
