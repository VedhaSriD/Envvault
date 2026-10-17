const BASE_URL = (import.meta.env.VITE_API_URL || "http://127.0.0.1:8000").replace(/\/$/, "");
const TOKEN_KEY = "envvault.session";

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

// sessionStorage: cleared when the tab closes. Tradeoff: any script on this
// page could read it, so the app keeps third-party scripts out.
export const session = {
  get() {
    return window.sessionStorage.getItem(TOKEN_KEY);
  },
  set(token) {
    window.sessionStorage.setItem(TOKEN_KEY, token);
  },
  clear() {
    window.sessionStorage.removeItem(TOKEN_KEY);
  },
};

let unauthorizedHandler = null;

export function setUnauthorizedHandler(handler) {
  unauthorizedHandler = handler;
}

function messageFrom(body, status) {
  if (body && typeof body.detail === "string") return body.detail;
  if (body && Array.isArray(body.detail)) {
    return body.detail
      .map((item) => {
        const field = Array.isArray(item.loc)
          ? item.loc.filter((part) => part !== "body").join(".")
          : "";
        return field ? `${field}: ${item.msg}` : item.msg;
      })
      .join("; ");
  }
  return `Request failed (${status})`;
}

async function request(method, path, body) {
  const headers = { Accept: "application/json" };
  const token = session.get();
  if (token) headers.Authorization = `Bearer ${token}`;

  const init = { method, headers };
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    init.body = JSON.stringify(body);
  }

  let response;
  try {
    response = await fetch(`${BASE_URL}${path}`, init);
  } catch {
    throw new ApiError(0, `Cannot reach the Envvault server at ${BASE_URL}. Is it running?`);
  }

  if (response.status === 204) return null;

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 401 && token && unauthorizedHandler) {
      unauthorizedHandler();
    }
    throw new ApiError(response.status, messageFrom(data, response.status));
  }
  return data;
}

export const api = {
  login: (email, password) =>
    request("POST", "/api/auth/login", { email, password }).then((data) => data.access_token),
  me: () => request("GET", "/api/auth/me"),
    health: () => request("GET", "/api/health"),

  listTeams: () => request("GET", "/api/teams"),
  createTeam: (name) => request("POST", "/api/teams", { name }),

  listMembers: (teamId) => request("GET", `/api/teams/${teamId}/members`),
  addMember: (teamId, email, role) => request("POST", `/api/teams/${teamId}/members`, { email, role }),
  removeMember: (teamId, userId) => request("DELETE", `/api/teams/${teamId}/members/${userId}`),

  listSecrets: (teamId) => request("GET", `/api/teams/${teamId}/secrets`),
  deleteSecret: (secretId) => request("DELETE", `/api/secrets/${secretId}`),
  listAccess: (secretId) => request("GET", `/api/secrets/${secretId}/access`),

  listAudit: (teamId, limit = 100) => request("GET", `/api/teams/${teamId}/audit?limit=${limit}`),
};