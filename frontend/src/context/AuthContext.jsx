import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, session, setUnauthorizedHandler } from "../lib/api.js";
import { useToast } from "../components/Toast.jsx";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const toast = useToast();
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setUser(null);
      toast("Your session expired. Please sign in again.", "warn");
    });
    return () => setUnauthorizedHandler(null);
  }, [toast]);

  useEffect(() => {
    let active = true;

    async function restore() {
      if (!session.get()) {
        setReady(true);
        return;
      }
      try {
        const me = await api.me();
        if (active) setUser(me);
      } catch {
        session.clear();
      } finally {
        if (active) setReady(true);
      }
    }

    restore();
    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (email, password) => {
    const token = await api.login(email, password);
    session.set(token);
    const me = await api.me();
    setUser(me);
    return me;
  }, []);

  const logout = useCallback(() => {
    session.clear();
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, ready, login, logout }), [user, ready, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}