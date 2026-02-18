// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

/* eslint-disable @typescript-eslint/no-explicit-any */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        const { code, plan } = await req.json();

        if (!code) {
            throw new Error("Código do cupom é obrigatório");
        }

        // Convert code to uppercase for case-insensitive comparison
        const normalizedCode = code.toUpperCase().trim();

        // Fetch coupon from database
        const { data: coupon, error } = await supabase
            .from("coupons")
            .select("*")
            .eq("code", normalizedCode)
            .eq("is_active", true)
            .single();

        if (error || !coupon) {
            return new Response(
                JSON.stringify({ valid: false, message: "Cupom inválido ou não encontrado." }),
                { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

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

        // Check applicable plans (if any specific plans are restricted)
        if (plan && coupon.applicable_plans && coupon.applicable_plans.length > 0) {
            if (!coupon.applicable_plans.includes(plan)) {
                return new Response(
                    JSON.stringify({ valid: false, message: "Este cupom não é válido para o plano selecionado." }),
                    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }
        }

        // Return valid coupon details
        return new Response(
            JSON.stringify({
                valid: true,
                code: coupon.code,
                discount_type: coupon.discount_type,
                discount_value: coupon.discount_value,
                description: coupon.description,
                min_amount: coupon.min_amount,
                message: "Cupom aplicado com sucesso!"
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

    } catch (error: any) {
        return new Response(
            JSON.stringify({ valid: false, message: error.message || "Erro ao validar cupom" }),
            {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" }
            }
        );
    }
});
