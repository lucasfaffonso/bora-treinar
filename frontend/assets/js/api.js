/* =========================================================
   API client
   ========================================================= */

/**
 * Cliente central de API do frontend.
 *
 * Regras importantes:
 * - Não salvar senha.
 * - Não imprimir token no console.
 * - Não colocar JWT_SECRET no frontend.
 * - Não colocar chave de IA no frontend.
 * - Não duplicar fetch em cada página.
 */

/* =========================================================
   API ERROR
   ========================================================= */

class ApiError extends Error {
  constructor({
    message = "Erro inesperado.",
    status = 500,
    data = null,
    errors = [],
    path = "",
  } = {}) {
    super(message);

    this.name = "ApiError";
    this.status = status;
    this.data = data;
    this.errors = errors;
    this.path = path;
  }
}

/* =========================================================
   TOKEN HELPERS
   ========================================================= */

function getApiToken() {
  return getStorageItem(APP_CONFIG.STORAGE_KEYS.ACCESS_TOKEN);
}

function clearApiAuthData() {
  removeStorageItem(APP_CONFIG.STORAGE_KEYS.ACCESS_TOKEN);
  removeStorageItem(APP_CONFIG.STORAGE_KEYS.USER);
}

/* =========================================================
   HEADERS
   ========================================================= */

function buildHeaders(customHeaders = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...customHeaders,
  };

  const token = getApiToken();

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

/* =========================================================
   RESPONSE PARSER
   ========================================================= */

async function parseResponseBody(response) {
  const contentType = response.headers.get("content-type");

  if (!contentType || !contentType.includes("application/json")) {
    return null;
  }

  try {
    return await response.json();
  } catch {
    return null;
  }
}

function extractApiMessage(body, fallbackMessage) {
  if (!body) return fallbackMessage;

  return (
    body.message ||
    body.error ||
    body.detail ||
    body.title ||
    fallbackMessage
  );
}

function extractApiErrors(body) {
  if (!body) return [];

  if (Array.isArray(body.errors)) {
    return body.errors;
  }

  if (body.errors && typeof body.errors === "object") {
    return Object.entries(body.errors).map(([field, message]) => ({
      field,
      message,
    }));
  }

  return [];
}

/* =========================================================
   ERROR HANDLING
   ========================================================= */

function getDefaultErrorMessage(status) {
  const messages = {
    400: "Dados inválidos. Verifique as informações enviadas.",
    401: "Sua sessão expirou. Faça login novamente.",
    403: "Você não tem permissão para executar esta ação.",
    404: "Recurso não encontrado.",
    409: "Conflito de dados. Verifique as informações.",
    422: "Não foi possível concluir esta ação.",
    500: "Erro interno no servidor.",
    502: "Serviço externo retornou uma resposta inválida.",
    503: "Serviço temporariamente indisponível.",
  };

  return messages[status] || "Erro inesperado. Tente novamente.";
}

function handleUnauthorized() {
  clearApiAuthData();

  const currentPath = window.location.pathname;
  const isAuthPage =
    currentPath.includes("/auth/login") ||
    currentPath.includes("/auth/register");

  if (!isAuthPage) {
    redirectTo(APP_CONFIG.ROUTES.LOGIN);
  }
}

function shouldTreatForbiddenAsUnauthenticated() {
  return !getApiToken();
}

function handleApiErrorStatus(status, message) {
  if (status === 401) {
    handleUnauthorized();
    return;
  }

  if (status === 403) {
    if (shouldTreatForbiddenAsUnauthenticated()) {
      handleUnauthorized();
      return;
    }

    showToast({
      title: "Acesso negado",
      message,
      type: "danger",
    });
    return;
  }

  if (status === 422) {
    showToast({
      title: "Ação não permitida",
      message,
      type: "warning",
    });
  }
}

/* =========================================================
   MAIN API REQUEST
   ========================================================= */

async function apiRequest(endpoint, options = {}) {
  const {
    method = "GET",
    body = null,
    headers = {},
    query = null,
    skipAuthHandling = false,
  } = options;

  const queryString = query ? buildQueryString(query) : "";
  const url = `${buildApiUrl(endpoint)}${queryString}`;

  const requestOptions = {
    method,
    headers: buildHeaders(headers),
  };

  if (body !== null && body !== undefined) {
    requestOptions.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, requestOptions);
    const responseBody = await parseResponseBody(response);

    if (!response.ok) {
      const message = extractApiMessage(
        responseBody,
        getDefaultErrorMessage(response.status)
      );

      const apiError = new ApiError({
        message,
        status: response.status,
        data: responseBody?.data || null,
        errors: extractApiErrors(responseBody),
        path: responseBody?.path || endpoint,
      });

      if (!skipAuthHandling) {
        handleApiErrorStatus(apiError.status, apiError.message);
      }

      throw apiError;
    }

    if (response.status === 204) {
      return null;
    }

    return responseBody;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    throw new ApiError({
      message:
        "Não foi possível conectar ao servidor. Verifique sua conexão ou tente novamente.",
      status: 0,
      data: null,
      errors: [],
      path: endpoint,
    });
  }
}

/* =========================================================
   SHORTCUT METHODS
   ========================================================= */

function apiGet(endpoint, options = {}) {
  return apiRequest(endpoint, {
    ...options,
    method: "GET",
  });
}

function apiPost(endpoint, body = {}, options = {}) {
  return apiRequest(endpoint, {
    ...options,
    method: "POST",
    body,
  });
}

function apiPut(endpoint, body = {}, options = {}) {
  return apiRequest(endpoint, {
    ...options,
    method: "PUT",
    body,
  });
}

function apiPatch(endpoint, body = {}, options = {}) {
  return apiRequest(endpoint, {
    ...options,
    method: "PATCH",
    body,
  });
}

function apiDelete(endpoint, options = {}) {
  return apiRequest(endpoint, {
    ...options,
    method: "DELETE",
  });
}

/* =========================================================
   PAGINATION HELPERS
   ========================================================= */

function buildPaginationQuery({
  page = APP_CONFIG.PAGINATION.DEFAULT_PAGE,
  size = APP_CONFIG.PAGINATION.DEFAULT_SIZE,
  sort = null,
  filters = {},
} = {}) {
  const safeSize = Math.min(Number(size), APP_CONFIG.PAGINATION.MAX_SIZE);

  return {
    page,
    size: safeSize,
    sort,
    ...filters,
  };
}

/* =========================================================
   RESPONSE HELPERS
   ========================================================= */

function unwrapApiData(response) {
  if (!response) return null;

  if (Object.prototype.hasOwnProperty.call(response, "data")) {
    return response.data;
  }

  return response;
}

function unwrapApiMessage(response, fallback = "") {
  return response?.message || fallback;
}

/* =========================================================
   COMMON API CALLS
   ========================================================= */

async function getMe() {
  const response = await apiGet("/users/me");

  return unwrapApiData(response);
}

async function getPremiumStatus() {
  const response = await apiGet("/premium/status");

  return unwrapApiData(response);
}

async function getDashboardSummary() {
  const response = await apiGet("/dashboard/summary");

  return unwrapApiData(response);
}

async function getWorkouts(query = {}) {
  const response = await apiGet("/workouts", {
    query,
  });

  return unwrapApiData(response);
}

async function getExercises(query = {}) {
  const response = await apiGet("/exercises", {
    query,
  });

  return unwrapApiData(response);
}

async function getCommunities(query = {}) {
  const response = await apiGet("/communities", {
    query,
  });

  return unwrapApiData(response);
}
