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
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const body = await req.json();
    console.log("Webhook received:", JSON.stringify(body));

    if (body.type === "payment" || body.action === "payment.updated" || body.action === "payment.created") {
      const paymentId = body.data?.id;
      if (!paymentId) {
        return new Response(JSON.stringify({ ok: true, msg: "No payment id" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Validate paymentId is a number to prevent injection
      if (typeof paymentId !== "number" && !/^\d+$/.test(String(paymentId))) {
        console.error("Invalid payment ID format:", paymentId);
        return new Response(JSON.stringify({ ok: true, msg: "Invalid payment id format" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Fetch payment details from MP to verify authenticity
      const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: { Authorization: `Bearer ${MP_ACCESS_TOKEN}` },
      });

      if (!mpRes.ok) {
        console.error("MP API returned error for payment:", paymentId, mpRes.status);
        return new Response(JSON.stringify({ ok: true, msg: "Payment not found in MP" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const payment = await mpRes.json();
      console.log("Payment status:", payment.status, "external_reference:", payment.external_reference);

      const externalRef = payment.external_reference;
      const status = payment.status;

      if (!externalRef) {
        return new Response(JSON.stringify({ ok: true, msg: "No external reference" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Validate external_reference is a valid UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(externalRef)) {
        console.error("Invalid external_reference format:", externalRef);
        return new Response(JSON.stringify({ ok: true, msg: "Invalid external reference" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Verify the payment request exists and is still pending (idempotency)
      const { data: existingReq } = await supabase.from("payment_requests")
        .select("id, status, user_id")
        .eq("id", externalRef)
        .single();

      if (!existingReq) {
        console.error("Payment request not found:", externalRef);
        return new Response(JSON.stringify({ ok: true, msg: "Payment request not found" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Skip if already processed (idempotency)
      if (existingReq.status === "approved" || existingReq.status === "rejected") {
        console.log("Payment request already processed:", externalRef, existingReq.status);
        return new Response(JSON.stringify({ ok: true, msg: "Already processed" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Update payment request
      await supabase.from("payment_requests").update({
        mp_payment_id: String(paymentId),
        mp_status: status,
        status: status === "approved" ? "approved" : status === "rejected" ? "rejected" : "pending",
        reviewed_at: status === "approved" || status === "rejected" ? new Date().toISOString() : null,
      }).eq("id", externalRef);

      // If approved, activate subscription
      if (status === "approved") {
        const { data: payReq } = await supabase.from("payment_requests")
          .select("*").eq("id", externalRef).single();

        if (payReq) {
          const daysToAdd = payReq.plan === "premium_anual" ? 365 : 30;

          const { data: existingSub } = await supabase.from("subscriptions")
            .select("*").eq("user_id", payReq.user_id).single();

          let expireDate = new Date();
          if (existingSub?.expire_date && new Date(existingSub.expire_date) > new Date()) {
            expireDate = new Date(existingSub.expire_date);
          }
          expireDate.setDate(expireDate.getDate() + daysToAdd);

          await supabase.from("subscriptions").update({
            plan: payReq.plan,
            status: "active",
            expire_date: expireDate.toISOString(),
            start_date: new Date().toISOString(),
            mp_payment_id: String(paymentId),
          }).eq("user_id", payReq.user_id);

          console.log(`Subscription activated for user ${payReq.user_id}, plan ${payReq.plan}, expires ${expireDate.toISOString()}`);

          // Log the payment confirmation
          try {
            const { data: userData } = await supabase.auth.admin.getUserById(payReq.user_id);
            const userEmail = userData?.user?.email;
            const userName = userData?.user?.user_metadata?.name || "Aluno";
            const planName = payReq.plan === "premium_anual" ? "Premium Anual" : "Premium Mensal";

            if (userEmail) {
              await supabase.from("activity_logs").insert({
                user_id: payReq.user_id,
                action: "payment_confirmed",
                details: {
                  plan: payReq.plan,
                  plan_name: planName,
                  amount: payReq.amount,
                  mp_payment_id: String(paymentId),
                  expire_date: expireDate.toISOString(),
                },
              });
              console.log(`Payment confirmed for ${userEmail}, plan ${planName}`);
            }
          } catch (emailErr) {
            console.error("Email notification error:", emailErr);
          }
        }
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Webhook error:", error);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
