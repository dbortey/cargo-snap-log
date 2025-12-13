import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, userId, entryId, sessionToken } = await req.json();

    // All actions require a valid session token
    if (!sessionToken || typeof sessionToken !== "string") {
      console.warn("Missing session token in admin-recovery request");
      return new Response(
        JSON.stringify({ error: "Unauthorized: No session token provided" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get client IP for logging
    const clientIP = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || 
                     req.headers.get("x-real-ip") || 
                     "unknown";

    if (action === "get_requests") {
      // Get all recovery requests - function validates session internally
      const { data, error } = await supabase.rpc("get_recovery_requests", {
        p_session_token: sessionToken,
      });

      if (error) {
        console.error("Error fetching recovery requests:", error);
        if (error.message.includes("Unauthorized")) {
          return new Response(
            JSON.stringify({ error: "Unauthorized: Invalid or expired session" }),
            { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        return new Response(
          JSON.stringify({ error: "Failed to fetch recovery requests" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`Admin fetched ${data?.length || 0} recovery requests from IP: ${clientIP}`);

      return new Response(
        JSON.stringify({ requests: data || [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "complete_recovery") {
      if (!userId || typeof userId !== "string") {
        return new Response(
          JSON.stringify({ error: "Invalid user ID" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Mark recovery as complete - function validates session internally
      const { data, error } = await supabase.rpc("complete_recovery", {
        p_session_token: sessionToken,
        p_user_id: userId,
      });

      if (error) {
        console.error("Error completing recovery:", error);
        if (error.message.includes("Unauthorized")) {
          return new Response(
            JSON.stringify({ error: "Unauthorized: Invalid or expired session" }),
            { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        return new Response(
          JSON.stringify({ error: "Failed to complete recovery" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`Admin completed recovery for user: ${userId} from IP: ${clientIP}`);

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "get_deletion_requests") {
      const { data, error } = await supabase.rpc("get_deletion_requests", {
        p_session_token: sessionToken,
      });

      if (error) {
        console.error("Error fetching deletion requests:", error);
        if (error.message.includes("Unauthorized")) {
          return new Response(
            JSON.stringify({ error: "Unauthorized: Invalid or expired session" }),
            { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        return new Response(
          JSON.stringify({ error: "Failed to fetch deletion requests" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`Admin fetched ${data?.length || 0} deletion requests from IP: ${clientIP}`);

      return new Response(
        JSON.stringify({ requests: data || [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "confirm_deletion") {
      if (!entryId || typeof entryId !== "string") {
        return new Response(
          JSON.stringify({ error: "Invalid entry ID" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data, error } = await supabase.rpc("confirm_entry_deletion", {
        p_session_token: sessionToken,
        p_entry_id: entryId,
      });

      if (error) {
        console.error("Error confirming deletion:", error);
        if (error.message.includes("Unauthorized")) {
          return new Response(
            JSON.stringify({ error: "Unauthorized: Invalid or expired session" }),
            { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        return new Response(
          JSON.stringify({ error: "Failed to delete entry" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`Admin confirmed deletion for entry: ${entryId} from IP: ${clientIP}`);

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "reject_deletion") {
      if (!entryId || typeof entryId !== "string") {
        return new Response(
          JSON.stringify({ error: "Invalid entry ID" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data, error } = await supabase.rpc("reject_deletion_request", {
        p_session_token: sessionToken,
        p_entry_id: entryId,
      });

      if (error) {
        console.error("Error rejecting deletion:", error);
        if (error.message.includes("Unauthorized")) {
          return new Response(
            JSON.stringify({ error: "Unauthorized: Invalid or expired session" }),
            { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        return new Response(
          JSON.stringify({ error: "Failed to reject deletion request" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`Admin rejected deletion for entry: ${entryId} from IP: ${clientIP}`);

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in admin-recovery:", error);
    return new Response(
      JSON.stringify({ error: "An unexpected error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
