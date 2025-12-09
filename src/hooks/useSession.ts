import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface UserSession {
  id: string;
  name: string;
  staffId: string;
}

const SESSION_KEY = "containerTrackerSession";
const SESSION_EXPIRY_KEY = "containerTrackerSessionExpiry";
const SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

export const useSession = () => {
  const [user, setUser] = useState<UserSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const clearSession = useCallback(() => {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(SESSION_EXPIRY_KEY);
    sessionStorage.removeItem("containerTrackerUser");
    setUser(null);
  }, []);

  const validateSession = useCallback(async () => {
    try {
      const sessionData = localStorage.getItem(SESSION_KEY);
      const expiryData = localStorage.getItem(SESSION_EXPIRY_KEY);

      if (!sessionData || !expiryData) {
        clearSession();
        return null;
      }

      const expiry = parseInt(expiryData, 10);
      if (Date.now() > expiry) {
        clearSession();
        return null;
      }

      const session: UserSession = JSON.parse(sessionData);

      // Verify user still exists in database
      const { data: dbUser, error } = await supabase
        .from("users")
        .select("id, name, staff_id")
        .eq("id", session.id)
        .maybeSingle();

      if (error || !dbUser) {
        clearSession();
        return null;
      }

      // Update last_seen_at
      await supabase
        .from("users")
        .update({ last_seen_at: new Date().toISOString() })
        .eq("id", session.id);

      return session;
    } catch {
      clearSession();
      return null;
    }
  }, [clearSession]);

  const createSession = useCallback((userData: UserSession) => {
    const expiry = Date.now() + SESSION_DURATION_MS;
    localStorage.setItem(SESSION_KEY, JSON.stringify(userData));
    localStorage.setItem(SESSION_EXPIRY_KEY, expiry.toString());
    sessionStorage.setItem("containerTrackerUser", userData.name);
    setUser(userData);
  }, []);

  const logout = useCallback(() => {
    clearSession();
  }, [clearSession]);

  useEffect(() => {
    const initSession = async () => {
      setIsLoading(true);
      const session = await validateSession();
      if (session) {
        setUser(session);
      }
      setIsLoading(false);
    };

    initSession();
  }, [validateSession]);

  return {
    user,
    isLoading,
    createSession,
    logout,
    isAuthenticated: !!user,
  };
};
