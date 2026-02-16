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

    // MP sends notification with type and data.id
    if (body.type === "payment" || body.action === "payment.updated" || body.action === "payment.created") {
      const paymentId = body.data?.id;
      if (!paymentId) {
        return new Response(JSON.stringify({ ok: true, msg: "No payment id" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Fetch payment details from MP
      const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: { Authorization: `Bearer ${MP_ACCESS_TOKEN}` },
      });
      const payment = await mpRes.json();
      console.log("Payment details:", JSON.stringify(payment));

      const externalRef = payment.external_reference;
      const status = payment.status; // approved, pending, rejected, etc.

      if (!externalRef) {
        return new Response(JSON.stringify({ ok: true, msg: "No external reference" }), {
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
        // Get the payment request to know user_id and plan
        const { data: payReq } = await supabase.from("payment_requests")
          .select("*").eq("id", externalRef).single();

        if (payReq) {
          const daysToAdd = payReq.plan === "premium_anual" ? 365 : 30;
          
          // Check if user already has active subscription with remaining days
          const { data: existingSub } = await supabase.from("subscriptions")
            .select("*").eq("user_id", payReq.user_id).single();

          let expireDate = new Date();
          if (existingSub?.expire_date && new Date(existingSub.expire_date) > new Date()) {
            // Extend from current expiration
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
        }
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Webhook error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
