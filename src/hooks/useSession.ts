import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface UserSession {
  id: string;
  name: string;
  staffId: string;
  sessionToken: string;
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

  const validateSessionOnServer = useCallback(async (sessionToken: string): Promise<UserSession | null> => {
    try {
      const { data, error } = await supabase.functions.invoke("user-auth", {
        body: { action: "validate", sessionToken },
      });

      if (error || !data?.valid) {
        console.log("Server session validation failed:", error?.message || "Invalid session");
        return null;
      }

      return {
        id: data.user.id,
        name: data.user.name,
        staffId: data.user.staffId || "",
        sessionToken,
      };
    } catch (err) {
      console.error("Error validating session on server:", err);
      return null;
    }
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

      // Validate session on server
      const validatedSession = await validateSessionOnServer(session.sessionToken);

      if (!validatedSession) {
        clearSession();
        return null;
      }

      return validatedSession;
    } catch {
      clearSession();
      return null;
    }
  }, [clearSession, validateSessionOnServer]);

  const createSession = useCallback((userData: UserSession) => {
    const expiry = Date.now() + SESSION_DURATION_MS;
    localStorage.setItem(SESSION_KEY, JSON.stringify(userData));
    localStorage.setItem(SESSION_EXPIRY_KEY, expiry.toString());
    sessionStorage.setItem("containerTrackerUser", userData.name);
    setUser(userData);
  }, []);

  const logout = useCallback(async () => {
    // Invalidate session on server
    const sessionData = localStorage.getItem(SESSION_KEY);
    if (sessionData) {
      try {
        const session: UserSession = JSON.parse(sessionData);
        await supabase.functions.invoke("user-auth", {
          body: { action: "logout", sessionToken: session.sessionToken },
        });
      } catch (err) {
        console.error("Error invalidating session on server:", err);
      }
    }
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
