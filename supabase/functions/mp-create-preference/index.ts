// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

/* eslint-disable @typescript-eslint/no-explicit-any */
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

    // Auth validation using getClaims
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      throw new Error("Unauthorized: Missing token");
    }

    const token = authHeader.replace("Bearer ", "");
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      console.error("Claims error:", claimsError);
      throw new Error("Unauthorized: Invalid token");
    }

    const userId = claimsData.claims.sub as string;
    const userEmail = claimsData.claims.email as string;

    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { plan, coupon_code } = await req.json();
    if (!plan) throw new Error("Plan not provided");

    // Fetch plan from database
    const { data: planData, error: planError } = await supabase
      .from("plans")
      .select("*")
      .eq("slug", plan)
      .single();

    if (planError || !planData) {
      throw new Error(`Plano inválido ou não encontrado: ${plan}`);
    }

    if (!planData.is_active || planData.is_blocked) {
      throw new Error("Este plano não está disponível no momento");
    }

    let finalPrice = Number(planData.price);
    const planName = planData.name;

    // Determine duration in days based on billing period
    let days = 30;
    if (planData.billing_period === "annual") days = 365;
    else if (planData.billing_period === "one_time") days = 3650; // 10 years considered lifetime
    else if (planData.billing_period === "weekly") days = 7;

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

      if (coupon.valid_until && new Date(coupon.valid_until) < new Date()) {
        throw new Error("Este cupom já expirou");
      }

      if (coupon.max_uses && coupon.current_uses >= coupon.max_uses) {
        throw new Error("Este cupom já atingiu o limite de usos");
      }

      if (coupon.applicable_plans && coupon.applicable_plans.length > 0 && !coupon.applicable_plans.includes(plan)) {
        throw new Error("Este cupom não é válido para este plano");
      }

      if (coupon.min_amount && finalPrice < coupon.min_amount) {
        throw new Error(`Este cupom requer um valor mínimo de R$ ${coupon.min_amount}`);
      }

      if (coupon.discount_type === "percentage") {
        finalPrice = finalPrice * (1 - coupon.discount_value / 100);
      } else {
        finalPrice = Math.max(0, finalPrice - coupon.discount_value);
      }
      finalPrice = Math.round(finalPrice * 100) / 100;
      appliedCouponCode = coupon.code;

      // Increment usage count
      await adminClient.from("coupons").update({
        current_uses: coupon.current_uses + 1,
      }).eq("id", coupon.id);
    }

    // Identify base url
    let baseUrl = req.headers.get("origin");
    if (!baseUrl || baseUrl === "null") {
      baseUrl = "https://almeidaconcursos.lovable.app";
    }
    // Remove trailing slash if present
    if (baseUrl.endsWith("/")) {
      baseUrl = baseUrl.slice(0, -1);
    }

    console.log("Creating MP Preference with Base URL:", baseUrl);

    // Create payment request
    const { data: paymentReq, error: insertError } = await adminClient.from("payment_requests").insert({
      user_id: userId,
      plan,
      status: "pending",
      amount: finalPrice,
      admin_notes: appliedCouponCode ? `Cupom aplicado: ${appliedCouponCode}` : null,
    }).select().single();

    if (insertError) throw new Error("Failed to create payment request: " + insertError.message);

    // If price is 0 (100% discount), we could skip MP entirely or handle differently.
    // For now, Mercado Pago requires unit_price > 0.
    if (finalPrice <= 0) {
      if (finalPrice <= 0) {
        // Auto-grant logic
        const { error: grantError } = await adminClient.from("subscriptions").upsert({
          user_id: userId,
          plan,
          status: "active",
          expire_date: new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()
        });

        if (grantError) throw new Error("Erro ao ativar assinatura gratuita: " + grantError.message);

        // Update payment request to approved
        await adminClient.from("payment_requests").update({
          status: "approved",
          updated_at: new Date().toISOString()
        }).eq("id", paymentReq.id);

        return new Response(JSON.stringify({
          message: "Assinatura ativada com sucesso!",
          auto_approved: true,
          init_point: `${baseUrl}/assinatura?status=approved` // Redirect to success
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    console.log("Creating MP Preference with Base URL:", baseUrl);

    const backUrls = {
      success: `${baseUrl}/assinatura?status=approved`,
      failure: `${baseUrl}/assinatura?status=rejected`,
      pending: `${baseUrl}/assinatura?status=pending`,
    };

    console.log("Back URLs:", JSON.stringify(backUrls));

    // Create Mercado Pago preference
    const isLocalhost = baseUrl.includes("localhost") || baseUrl.includes("127.0.0.1");

    const preferenceBody = {
      items: [{
        title: appliedCouponCode ? `${planName} (Cupom: ${appliedCouponCode})` : planName,
        quantity: 1,
        unit_price: finalPrice,
        currency_id: "BRL",
      }],
      payer: { email: userEmail },
      back_urls: backUrls,
      auto_return: isLocalhost ? undefined : "approved",
      external_reference: paymentReq.id,
      notification_url: `${SUPABASE_URL}/functions/v1/mp-webhook`,
      metadata: {
        user_id: userId,
        plan,
        payment_request_id: paymentReq.id,
        days: days,
        coupon_code: appliedCouponCode,
      },
    };

    const mpResponse = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
      },
      body: JSON.stringify(preferenceBody),
    });

    const mpData = await mpResponse.json();
    if (!mpResponse.ok) {
      console.error("Mercado Pago Error Body:", JSON.stringify(mpData));
      console.error("Sent Body:", JSON.stringify(preferenceBody));
      throw new Error(`Mercado Pago error: ${mpData.message || JSON.stringify(mpData)}`);
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
