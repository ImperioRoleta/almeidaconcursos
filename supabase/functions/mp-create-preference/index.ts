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
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Unauthorized");

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    const { plan, coupon_code } = await req.json();
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

    let planInfo = priceMap[plan];
    let finalPrice = planInfo.price;
    let appliedCouponCode: string | null = null;

    // Validate and apply coupon
    if (coupon_code) {
      const { data: coupon, error: couponErr } = await adminClient
        .from("coupons")
        .select("*")
        .eq("code", coupon_code.toUpperCase().trim())
        .eq("is_active", true)
        .single();

      if (couponErr || !coupon) {
        throw new Error("Cupom inválido ou não encontrado");
      }

      // Check expiration
      if (coupon.valid_until && new Date(coupon.valid_until) < new Date()) {
        throw new Error("Este cupom já expirou");
      }

      // Check max uses
      if (coupon.max_uses && coupon.current_uses >= coupon.max_uses) {
        throw new Error("Este cupom já atingiu o limite de usos");
      }

      // Check applicable plans
      if (coupon.applicable_plans && coupon.applicable_plans.length > 0 && !coupon.applicable_plans.includes(plan)) {
        throw new Error("Este cupom não é válido para este plano");
      }

      // Apply discount
      if (coupon.discount_type === "percentage") {
        finalPrice = finalPrice * (1 - coupon.discount_value / 100);
      } else {
        finalPrice = Math.max(0, finalPrice - coupon.discount_value);
      }
      finalPrice = Math.round(finalPrice * 100) / 100;
      appliedCouponCode = coupon.code;

      // Increment usage
      await adminClient.from("coupons").update({
        current_uses: coupon.current_uses + 1,
      }).eq("id", coupon.id);
    }

    const baseUrl = req.headers.get("origin") || "https://almeidaconcursos.lovable.app";

    // Create payment request record
    const { data: paymentReq, error: insertError } = await supabase.from("payment_requests").insert({
      user_id: user.id,
      plan,
      status: "pending",
      amount: finalPrice,
      admin_notes: appliedCouponCode ? `Cupom aplicado: ${appliedCouponCode}` : null,
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
          title: appliedCouponCode
            ? `${planInfo.title} (Cupom: ${appliedCouponCode})`
            : planInfo.title,
          quantity: 1,
          unit_price: finalPrice,
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
          coupon_code: appliedCouponCode,
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
      final_price: finalPrice,
      coupon_applied: appliedCouponCode,
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
