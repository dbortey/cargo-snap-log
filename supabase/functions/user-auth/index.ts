import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Rate limiting storage
const loginAttempts = new Map<string, { count: number; resetTime: number }>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 60 * 1000; // 1 minute

function checkRateLimit(identifier: string): boolean {
  const now = Date.now();
  const attempt = loginAttempts.get(identifier);
  
  if (!attempt || now > attempt.resetTime) {
    loginAttempts.set(identifier, { count: 1, resetTime: now + WINDOW_MS });
    return true;
  }
  
  if (attempt.count >= MAX_ATTEMPTS) {
    return false;
  }
  
  attempt.count++;
  return true;
}

function generateSessionToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { action, ...params } = await req.json();
    console.log(`User auth action: ${action}`);

    switch (action) {
      case "login": {
        const { name, code } = params;
        
        if (!name || !code) {
          return new Response(
            JSON.stringify({ error: "Name and code are required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Rate limiting by name
        const rateLimitKey = `login:${name.toLowerCase().trim()}`;
        if (!checkRateLimit(rateLimitKey)) {
          console.log(`Rate limit exceeded for: ${name}`);
          return new Response(
            JSON.stringify({ error: "Too many login attempts. Please wait a minute." }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Verify credentials using RPC
        const { data: users, error: verifyError } = await supabase.rpc("verify_user_login", {
          p_name: name,
          p_code: code,
        });

        if (verifyError || !users || users.length === 0) {
          console.log(`Login failed for: ${name}`);
          return new Response(
            JSON.stringify({ error: "Invalid name or code" }),
            { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const user = users[0];
        
        // Generate session token
        const sessionToken = generateSessionToken();
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

        // Create session in database
        const ipAddress = req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip") || "unknown";
        const userAgent = req.headers.get("user-agent") || "unknown";

        const { error: sessionError } = await supabase.rpc("create_user_session", {
          p_user_id: user.user_id,
          p_session_token: sessionToken,
          p_expires_at: expiresAt.toISOString(),
          p_ip_address: ipAddress,
          p_user_agent: userAgent,
        });

        if (sessionError) {
          console.error("Failed to create session:", sessionError);
          return new Response(
            JSON.stringify({ error: "Failed to create session" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Update last_seen_at
        await supabase.rpc("update_user_last_seen", { p_user_id: user.user_id });

        console.log(`Login successful for: ${name}`);
        return new Response(
          JSON.stringify({
            success: true,
            user: {
              id: user.user_id,
              name: user.user_name,
              staffId: user.user_staff_id,
            },
            sessionToken,
            expiresAt: expiresAt.toISOString(),
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "validate": {
        const { sessionToken } = params;
        
        if (!sessionToken) {
          return new Response(
            JSON.stringify({ valid: false, error: "Session token required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Validate session using RPC
        const { data: sessions, error: validateError } = await supabase.rpc("validate_user_session", {
          p_session_token: sessionToken,
        });

        if (validateError || !sessions || sessions.length === 0) {
          return new Response(
            JSON.stringify({ valid: false }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const session = sessions[0];

        // Update last_seen_at
        await supabase.rpc("update_user_last_seen", { p_user_id: session.user_id });

        return new Response(
          JSON.stringify({
            valid: true,
            user: {
              id: session.user_id,
              name: session.user_name,
              staffId: session.user_staff_id,
            },
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "logout": {
        const { sessionToken } = params;
        
        if (sessionToken) {
          await supabase.rpc("invalidate_user_session", { p_session_token: sessionToken });
        }

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: "Unknown action" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
  } catch (error) {
    console.error("User auth error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
