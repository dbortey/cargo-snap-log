import { useState, useEffect, useCallback } from "react";

interface AdminSession {
  id: string;
  email: string;
  name: string;
  role: string;
  sessionToken: string;
}

const ADMIN_SESSION_KEY = "containerTrackerAdminSession";
const ADMIN_SESSION_EXPIRY_KEY = "containerTrackerAdminSessionExpiry";
const SESSION_DURATION_MS = 8 * 60 * 60 * 1000; // 8 hours

export const useAdminSession = () => {
  const [admin, setAdmin] = useState<AdminSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const clearSession = useCallback(() => {
    localStorage.removeItem(ADMIN_SESSION_KEY);
    localStorage.removeItem(ADMIN_SESSION_EXPIRY_KEY);
    setAdmin(null);
  }, []);

  const validateSession = useCallback(() => {
    try {
      const sessionData = localStorage.getItem(ADMIN_SESSION_KEY);
      const expiryData = localStorage.getItem(ADMIN_SESSION_EXPIRY_KEY);

      if (!sessionData || !expiryData) {
        clearSession();
        return null;
      }

      const expiry = parseInt(expiryData, 10);
      if (Date.now() > expiry) {
        clearSession();
        return null;
      }

      const session: AdminSession = JSON.parse(sessionData);
      return session;
    } catch {
      clearSession();
      return null;
    }
  }, [clearSession]);

  const createSession = useCallback((adminData: Omit<AdminSession, "sessionToken"> & { sessionToken: string }) => {
    const expiry = Date.now() + SESSION_DURATION_MS;
    localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(adminData));
    localStorage.setItem(ADMIN_SESSION_EXPIRY_KEY, expiry.toString());
    setAdmin(adminData);
  }, []);

  const logout = useCallback(() => {
    clearSession();
  }, [clearSession]);

  useEffect(() => {
    setIsLoading(true);
    const session = validateSession();
    if (session) {
      setAdmin(session);
    }
    setIsLoading(false);
  }, [validateSession]);

  return {
    admin,
    isLoading,
    createSession,
    logout,
    isAuthenticated: !!admin,
  };
};
