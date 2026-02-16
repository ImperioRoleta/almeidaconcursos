import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const MP_ACCESS_TOKEN = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN");
    if (!MP_ACCESS_TOKEN) throw new Error("MERCADOPAGO_ACCESS_TOKEN not configured");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Unauthorized");

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    const { plan } = await req.json();
    if (!plan || !["premium_mensal", "premium_anual"].includes(plan)) {
      throw new Error("Invalid plan");
    }

    // Get prices from platform_settings
    const { data: settings } = await supabase.from("platform_settings").select("key, value");
    const settingsMap: Record<string, string> = {};
    settings?.forEach((s: any) => { settingsMap[s.key] = s.value; });

    const priceMap: Record<string, { price: number; title: string; days: number }> = {
      premium_mensal: {
        price: parseFloat(settingsMap.plan_price_mensal?.replace(",", ".") || "39.90"),
        title: "Premium Mensal - Almeida Concursos",
        days: 30,
      },
      premium_anual: {
        price: parseFloat(settingsMap.plan_price_anual_total?.replace(",", ".") || "358.80"),
        title: "Premium Anual - Almeida Concursos",
        days: 365,
      },
    };

    const planInfo = priceMap[plan];
    const baseUrl = req.headers.get("origin") || "https://almeidaconcursos.lovable.app";

    // Create payment request record
    const { data: paymentReq, error: insertError } = await supabase.from("payment_requests").insert({
      user_id: user.id,
      plan,
      status: "pending",
      amount: planInfo.price,
    }).select().single();

    if (insertError) throw new Error("Failed to create payment request: " + insertError.message);

    // Create Mercado Pago preference
    const mpResponse = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({
        items: [{
          title: planInfo.title,
          quantity: 1,
          unit_price: planInfo.price,
          currency_id: "BRL",
        }],
        payer: { email: user.email },
        back_urls: {
          success: `${baseUrl}/assinatura?status=approved`,
          failure: `${baseUrl}/assinatura?status=rejected`,
          pending: `${baseUrl}/assinatura?status=pending`,
        },
        auto_return: "approved",
        external_reference: paymentReq.id,
        notification_url: `${SUPABASE_URL}/functions/v1/mp-webhook`,
        metadata: {
          user_id: user.id,
          plan,
          payment_request_id: paymentReq.id,
          days: planInfo.days,
        },
      }),
    });

    const mpData = await mpResponse.json();
    if (!mpResponse.ok) {
      throw new Error(`Mercado Pago error: ${JSON.stringify(mpData)}`);
    }

    return new Response(JSON.stringify({
      init_point: mpData.init_point,
      sandbox_init_point: mpData.sandbox_init_point,
      preference_id: mpData.id,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
