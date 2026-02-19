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
        const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

        const { code, plan } = await req.json();

        if (!code) {
            return new Response(
                JSON.stringify({ valid: false, message: "Código do cupom é obrigatório." }),
                { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const normalizedCode = code.toUpperCase().trim();
        console.log(`Validando cupom: ${normalizedCode} para plano: ${plan || "todos"}`);

        // Fetch coupon
        const { data: coupon, error: dbError } = await supabase
            .from("coupons")
            .select("*")
            .eq("code", normalizedCode)
            .eq("is_active", true)
            .maybeSingle();

        if (dbError) {
            console.error("DB error:", dbError);
            return new Response(
                JSON.stringify({ valid: false, message: "Erro ao consultar banco de dados." }),
                { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        if (!coupon) {
            return new Response(
                JSON.stringify({ valid: false, message: "Cupom inválido ou não encontrado." }),
                { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        console.log("Coupon found:", coupon.code);

        // Check expiration
        if (coupon.valid_until && new Date(coupon.valid_until) < new Date()) {
            return new Response(
                JSON.stringify({ valid: false, message: "Este cupom expirou." }),
                { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Check usage limits
        if (coupon.max_uses !== null && coupon.current_uses >= coupon.max_uses) {
            return new Response(
                JSON.stringify({ valid: false, message: "Este cupom atingiu o limite de usos." }),
                { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Check applicable plans
        if (plan && coupon.applicable_plans && coupon.applicable_plans.length > 0) {
            if (!coupon.applicable_plans.includes(plan)) {
                return new Response(
                    JSON.stringify({ valid: false, message: "Cupom não válido para o plano selecionado." }),
                    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }
        }

        console.log("Coupon valid!");

        return new Response(
            JSON.stringify({
                valid: true,
                code: coupon.code,
                discount_type: coupon.discount_type,
                discount_value: coupon.discount_value,
                description: coupon.description,
                applicable_plans: coupon.applicable_plans || [],
                min_amount: coupon.min_amount || 0,
                message: "Cupom aplicado com sucesso!"
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

    } catch (error: any) {
        console.error("Error in check-coupon:", error);
        return new Response(
            JSON.stringify({ valid: false, message: error.message || "Erro interno" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
