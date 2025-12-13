import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

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

  const validateSessionOnServer = useCallback(async (sessionToken: string): Promise<AdminSession | null> => {
    try {
      const { data, error } = await supabase.functions.invoke("admin-auth", {
        body: { action: "validate", sessionToken },
      });

      if (error || !data?.valid) {
        console.log("Server session validation failed:", error?.message || "Invalid session");
        return null;
      }

      return {
        id: data.admin.id,
        email: data.admin.email,
        name: data.admin.name,
        role: data.admin.role,
        sessionToken,
      };
    } catch (err) {
      console.error("Error validating session on server:", err);
      return null;
    }
  }, []);

  const validateSession = useCallback(async () => {
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

  const createSession = useCallback((adminData: Omit<AdminSession, "sessionToken"> & { sessionToken: string }) => {
    const expiry = Date.now() + SESSION_DURATION_MS;
    localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(adminData));
    localStorage.setItem(ADMIN_SESSION_EXPIRY_KEY, expiry.toString());
    setAdmin(adminData);
  }, []);

  const logout = useCallback(async () => {
    // Invalidate session on server
    const sessionData = localStorage.getItem(ADMIN_SESSION_KEY);
    if (sessionData) {
      try {
        const session: AdminSession = JSON.parse(sessionData);
        await supabase.functions.invoke("admin-auth", {
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
        setAdmin(session);
      }
      setIsLoading(false);
    };
    
    initSession();
  }, [validateSession]);

  return {
    admin,
    isLoading,
    createSession,
    logout,
    isAuthenticated: !!admin,
  };
};
