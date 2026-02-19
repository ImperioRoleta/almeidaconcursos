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

        // Try to get token from platform_settings (Admin Panel) first
        const { data: dbSetting } = await adminClient
            .from("platform_settings")
            .select("value")
            .eq("key", "mp_access_token")
            .single();

        let MP_ACCESS_TOKEN = dbSetting?.value;

        // Fallback to Env Var if not found in DB
        if (!MP_ACCESS_TOKEN) {
            MP_ACCESS_TOKEN = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN");
        }

        if (!MP_ACCESS_TOKEN) throw new Error("MERCADOPAGO_ACCESS_TOKEN not configured in Admin Panel or Secrets");

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

        // Create payment request
        const { data: paymentReq, error: insertError } = await adminClient.from("payment_requests").insert({
            user_id: userId,
            plan,
            status: "pending",
            amount: finalPrice,
            admin_notes: appliedCouponCode ? `Cupom aplicado: ${appliedCouponCode} (PIX)` : null,
        }).select().single();

        if (insertError) throw new Error("Failed to create payment request: " + insertError.message);

        // If price is 0, auto-grant (same logic as create-preference)
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
                payment_request_id: paymentReq.id
            }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        console.log("Creating MP Pix with amount:", finalPrice);

        // Create Mercado Pago Payment (Direct Pix)
        // https://www.mercadopago.com.br/developers/pt/reference/payments/_payments/post
        const paymentBody = {
            transaction_amount: finalPrice,
            payment_method_id: "pix",
            payer: {
                email: userEmail,
                first_name: claimsData.claims.user_metadata?.full_name || "Cliente",
            },
            external_reference: paymentReq.id,
            notification_url: `${SUPABASE_URL}/functions/v1/mp-webhook`,
            description: `Assinatura ${planName} - Almeida Concursos`,
            metadata: {
                user_id: userId,
                plan,
                payment_request_id: paymentReq.id,
                days: days,
                coupon_code: appliedCouponCode,
            },
        };

        const mpResponse = await fetch("https://api.mercadopago.com/v1/payments", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-Idempotency-Key": paymentReq.id,
                Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
            },
            body: JSON.stringify(paymentBody),
        });

        const mpData = await mpResponse.json();
        if (!mpResponse.ok) {
            console.error("Mercado Pago Pix Error Body:", JSON.stringify(mpData));
            throw new Error(`Mercado Pago error: ${mpData.message || JSON.stringify(mpData)}`);
        }

        const pointOfInteraction = mpData.point_of_interaction;
        const qrCode = pointOfInteraction?.transaction_data?.qr_code;
        const qrCodeBase64 = pointOfInteraction?.transaction_data?.qr_code_base64;
        const ticketUrl = pointOfInteraction?.transaction_data?.ticket_url;

        return new Response(JSON.stringify({
            payment_id: mpData.id,
            qr_code: qrCode,
            qr_code_base64: qrCodeBase64,
            ticket_url: ticketUrl,
            final_price: finalPrice,
            payment_request_id: paymentReq.id,
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
