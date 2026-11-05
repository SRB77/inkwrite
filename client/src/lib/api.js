import axios from "axios";
import { neonEnabled, getNeonToken, refreshNeonToken, clearNeonToken } from "./neonAuth";
import { getSocketId } from "./socket";

const TOKEN_KEY = "whiteboard_token";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5050/api",
});

export function getToken() {
  if (neonEnabled) return getNeonToken();
  try {
    return localStorage.getItem(TOKEN_KEY) || "";
  } catch {
    return "";
  }
}

export function setToken(token) {
  if (neonEnabled) return;
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // storage unavailable
  }
}

export function clearToken() {
  if (neonEnabled) return clearNeonToken();
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    // storage unavailable
  }
}

api.interceptors.request.use(async (config) => {
  let token = getToken();
  if (neonEnabled && !token) token = await refreshNeonToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  // Lets the server skip echoing our own mutations back over the socket.
  const socketId = getSocketId();
  if (socketId) config.headers["x-socket-id"] = socketId;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const { config, response } = error;
    if (response?.status === 401) {
      if (neonEnabled && config && !config._retried) {
        config._retried = true;
        const token = await refreshNeonToken();
        if (token) return api(config);
      } else if (!neonEnabled) {
        clearToken();
        if (window.location.pathname !== "/login") window.location.assign("/login");
      }
    }
    const message = response?.data?.error || error.message || "Something went wrong";
    const clean = new Error(message);
    clean.status = response?.status;
    return Promise.reject(clean);
  },
);

const data = (p) => p.then((r) => r.data);
const pick = (key) => (p) => data(p).then((d) => d[key]);
const board = (id) => `/whiteboards/${id}`;

export const authApi = {
  register: (body) => data(api.post("/auth/register", body)),
  login: (body) => data(api.post("/auth/login", body)),
  me: () => pick("user")(api.get("/auth/me")),
};

export const userApi = {
  search: (q) => pick("users")(api.get("/users/search", { params: { q } })),
};

export const boardApi = {
  list: () => pick("boards")(api.get("/whiteboards")),
  create: (body) => pick("board")(api.post("/whiteboards", body)),
  get: (id) => data(api.get(board(id))),
  update: (id, body) => pick("board")(api.patch(board(id), body)),
  remove: (id) => data(api.delete(board(id))),
  addMember: (id, body) => pick("member")(api.post(`${board(id)}/members`, body)),
  removeMember: (id, userId) => data(api.delete(`${board(id)}/members/${userId}`)),
};

export const uploadApi = {
  image: (boardId, blob, filename = "image.png") => {
    const form = new FormData();
    form.append("image", blob, filename);
    return data(api.post(`${board(boardId)}/uploads`, form)).then(
      ({ url, storageKey }) => ({ url, storageKey }),
    );
  },
};

export const elementApi = {
  create: (boardId, body) => pick("element")(api.post(`${board(boardId)}/elements`, body)),
  bulkCreate: (boardId, elements) =>
    pick("elements")(api.post(`${board(boardId)}/elements/bulk`, { elements })),
  update: (boardId, elementId, body) =>
    pick("element")(api.patch(`${board(boardId)}/elements/${elementId}`, body)),
  remove: (boardId, elementId) => data(api.delete(`${board(boardId)}/elements/${elementId}`)),
};

const aiCall = (kind) => (boardId, body) =>
  pick("elements")(api.post(`${board(boardId)}/ai/${kind}`, body));

export const aiApi = {
  brainstorm: aiCall("brainstorm"),
  outline: aiCall("outline"),
  diagram: aiCall("diagram"),
  chart: aiCall("chart"),
  edit: aiCall("edit"),
  summary: (boardId, body) => pick("summary")(api.post(`${board(boardId)}/ai/summary`, body)),
};

export default api;
