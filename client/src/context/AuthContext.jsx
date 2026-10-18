import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { authApi, getToken, setToken, clearToken } from "../lib/api";
import { connectSocket, disconnectSocket } from "../lib/socket";
import {
  authClient,
  neonEnabled,
  neonSignIn,
  neonSignUp,
  neonSignOut,
  refreshNeonToken,
  clearNeonToken,
} from "../lib/neonAuth";

const AuthContext = createContext(null);

const TOKEN_REFRESH_MS = 10 * 60 * 1000;

function mapNeonUser(u) {
  if (!u) return null;
  return { id: u.id, name: u.name || u.email, email: u.email, avatar_url: u.image || null };
}

function NeonAuthProvider({ children }) {
  const session = authClient.useSession();
  const neonUser = session.data?.user;
  const user = useMemo(() => mapNeonUser(neonUser), [neonUser]);
  const userId = user?.id;

  useEffect(() => {
    if (userId) refreshNeonToken().then(connectSocket);
    else disconnectSocket();
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    const timer = setInterval(refreshNeonToken, TOKEN_REFRESH_MS);
    return () => clearInterval(timer);
  }, [userId]);

  const login = useCallback(async (email, password) => {
    const res = await neonSignIn(email, password);
    await refreshNeonToken();
    return res;
  }, []);

  const register = useCallback(async (name, email, password) => {
    const res = await neonSignUp(name, email, password);
    await refreshNeonToken();
    return res;
  }, []);

  const logout = useCallback(async () => {
    await neonSignOut();
    clearNeonToken();
    disconnectSocket();
  }, []);

  const value = useMemo(
    () => ({ user, loading: session.isPending, login, register, logout }),
    [user, session.isPending, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function LocalAuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(() => Boolean(getToken()));

  useEffect(() => {
    if (!getToken()) return;
    authApi
      .me()
      .then(setUser)
      .catch(() => clearToken())
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (user) connectSocket();
    else disconnectSocket();
  }, [user]);

  const authenticate = useCallback((res) => {
    setToken(res.token);
    setUser(res.user);
    return res.user;
  }, []);

  const login = useCallback(
    async (email, password) => authenticate(await authApi.login({ email, password })),
    [authenticate],
  );

  const register = useCallback(
    async (name, email, password) => authenticate(await authApi.register({ name, email, password })),
    [authenticate],
  );

  const logout = useCallback(async () => {
    clearToken();
    setUser(null);
    disconnectSocket();
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, register, logout }),
    [user, loading, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const AuthProvider = neonEnabled ? NeonAuthProvider : LocalAuthProvider;

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
