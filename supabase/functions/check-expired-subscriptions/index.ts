import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // Find all active subscriptions that have expired
    const now = new Date().toISOString();
    const { data: expired, error } = await supabase
      .from("subscriptions")
      .select("id, user_id, plan, expire_date")
      .eq("status", "active")
      .neq("plan", "gratuito")
      .lt("expire_date", now);

    if (error) throw error;

    let count = 0;
    for (const sub of expired ?? []) {
      await supabase.from("subscriptions").update({
        plan: "gratuito",
        status: "active",
        expire_date: null,
        mp_payment_id: null,
      }).eq("id", sub.id);
      count++;
      console.log(`Expired subscription for user ${sub.user_id}, was ${sub.plan}`);
    }

    return new Response(JSON.stringify({ ok: true, expired_count: count }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
