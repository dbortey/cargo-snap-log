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
    const { action, userId } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (action === "get_requests") {
      // Get all recovery requests using security definer function
      const { data, error } = await supabase.rpc("get_recovery_requests");

      if (error) {
        console.error("Error fetching recovery requests:", error);
        return new Response(
          JSON.stringify({ error: "Failed to fetch recovery requests" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`Found ${data?.length || 0} recovery requests`);

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

      // Mark recovery as complete
      const { data, error } = await supabase.rpc("complete_recovery", {
        user_id: userId,
      });

      if (error) {
        console.error("Error completing recovery:", error);
        return new Response(
          JSON.stringify({ error: "Failed to complete recovery" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log("Recovery completed for user:", userId);

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "get_deletion_requests") {
      const { data, error } = await supabase.rpc("get_deletion_requests");

      if (error) {
        console.error("Error fetching deletion requests:", error);
        return new Response(
          JSON.stringify({ error: "Failed to fetch deletion requests" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`Found ${data?.length || 0} deletion requests`);

      return new Response(
        JSON.stringify({ requests: data || [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "confirm_deletion") {
      const { entryId } = await req.json().catch(() => ({}));
      
      if (!entryId || typeof entryId !== "string") {
        return new Response(
          JSON.stringify({ error: "Invalid entry ID" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data, error } = await supabase.rpc("confirm_entry_deletion", {
        entry_id: entryId,
      });

      if (error) {
        console.error("Error confirming deletion:", error);
        return new Response(
          JSON.stringify({ error: "Failed to delete entry" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log("Entry deleted:", entryId);

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "reject_deletion") {
      const { entryId } = await req.json().catch(() => ({}));
      
      if (!entryId || typeof entryId !== "string") {
        return new Response(
          JSON.stringify({ error: "Invalid entry ID" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data, error } = await supabase.rpc("reject_deletion_request", {
        entry_id: entryId,
      });

      if (error) {
        console.error("Error rejecting deletion:", error);
        return new Response(
          JSON.stringify({ error: "Failed to reject deletion request" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log("Deletion rejected for entry:", entryId);

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
