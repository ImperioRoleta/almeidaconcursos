// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

/* eslint-disable @typescript-eslint/no-explicit-any */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const authHeader = req.headers.get("Authorization") ?? "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Extract user from JWT
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    const { action, messages, subject_id, question_id } = await req.json();

    // Fetch student context if authenticated
    let studentContext = "";
    if (user) {
      const userId = user.id;

      const [answersRes, sessionsRes, weakRes, reviewRes, profileRes, subjectsRes] = await Promise.all([
        supabase.from("user_answers").select("is_correct, question_id").eq("user_id", userId).order("answered_at", { ascending: false }).limit(50),
        supabase.from("study_sessions").select("duration_seconds, subject_id, started_at").eq("user_id", userId).order("started_at", { ascending: false }).limit(20),
        supabase.from("diagnostic_results").select("weak_subjects, strong_subjects, score, subject_scores").eq("user_id", userId).order("completed_at", { ascending: false }).limit(1),
        supabase.from("review_queue").select("question_id, repetitions, ease_factor").eq("user_id", userId).limit(30),
        supabase.from("profiles").select("name, level_id, levels(name)").eq("user_id", userId).single(),
        supabase.from("subjects").select("id, name"),
      ]);

      const answers = answersRes.data ?? [];
      const totalAnswers = answers.length;
      const correctAnswers = answers.filter(a => a.is_correct).length;
      const accuracy = totalAnswers > 0 ? Math.round((correctAnswers / totalAnswers) * 100) : 0;

      const sessions = sessionsRes.data ?? [];
      const totalHours = Math.round(sessions.reduce((s, ss) => s + (ss.duration_seconds || 0), 0) / 3600 * 10) / 10;

      const diag = weakRes.data?.[0];
      const weakSubjects = diag?.weak_subjects ?? [];
      const strongSubjects = diag?.strong_subjects ?? [];
      const subjectScores = diag?.subject_scores ?? {};

      const reviewItems = reviewRes.data ?? [];
      const lowEaseQuestions = reviewItems.filter(r => r.ease_factor < 2.0).length;

      const subjects = subjectsRes.data ?? [];
      const subjectMap: Record<string, string> = {};
      subjects.forEach(s => { subjectMap[s.id] = s.name; });

      // Per-subject accuracy from recent answers
      const questionIds = [...new Set(answers.map(a => a.question_id))];
      let subjectAccuracy: Record<string, { correct: number; total: number }> = {};
      if (questionIds.length > 0) {
        const { data: qs } = await supabase.from("questions").select("id, subject_id").in("id", questionIds.slice(0, 50));
        const qSubMap: Record<string, string> = {};
        qs?.forEach(q => { qSubMap[q.id] = q.subject_id; });
        answers.forEach(a => {
          const sid = qSubMap[a.question_id];
          if (!sid) return;
          if (!subjectAccuracy[sid]) subjectAccuracy[sid] = { correct: 0, total: 0 };
          subjectAccuracy[sid].total++;
          if (a.is_correct) subjectAccuracy[sid].correct++;
        });
      }

      const subjectPerf = Object.entries(subjectAccuracy).map(([sid, v]) =>
        `${subjectMap[sid] || sid}: ${Math.round((v.correct / v.total) * 100)}% (${v.total} questões)`
      ).join(", ");

      const levelName = (profileRes.data as any)?.levels?.name || "Recruta";
      const studentName = profileRes.data?.name || "Aluno";

      studentContext = `
CONTEXTO DO ALUNO:
- Nome: ${studentName}
- Nível/Patente: ${levelName}
- Total de horas estudadas: ${totalHours}h
- Precisão geral (últimas 50): ${accuracy}% (${correctAnswers}/${totalAnswers})
- Desempenho por matéria: ${subjectPerf || "Sem dados ainda"}
- Matérias fracas (diagnóstico): ${weakSubjects.join(", ") || "Nenhuma identificada"}
- Matérias fortes (diagnóstico): ${strongSubjects.join(", ") || "Nenhuma identificada"}
- Questões com dificuldade recorrente: ${lowEaseQuestions} questões na fila de revisão com dificuldade alta
- Questões pendentes na revisão espaçada: ${reviewItems.length}
`;
    }

    // Build system prompt based on action
    let systemPrompt = `Você é o Tutor IA da plataforma Elite PMBA, especializado na preparação para o concurso Soldado da Polícia Militar da Bahia.

${studentContext}

Suas capacidades como tutor ativo:
1. DIAGNÓSTICO: Analisar o desempenho do aluno e identificar gaps de conhecimento
2. SUGESTÃO: Recomendar a próxima matéria/aula com base nas fraquezas detectadas
3. EXPLICAÇÃO: Explicar erros de forma clara e didática com exemplos
4. GERAÇÃO: Criar questões personalizadas focadas nas áreas de dificuldade
5. MOTIVAÇÃO: Reconhecer evolução e manter o aluno engajado com linguagem militar

Responda em português brasileiro. Use formatação markdown. Seja direto, objetivo e motivador.`;

    if (action === "suggest_next") {
      systemPrompt += `\n\nO aluno pediu uma SUGESTÃO DO PRÓXIMO PASSO. Com base no contexto acima:
- Identifique a matéria mais crítica (menor acerto ou mais questões erradas)
- Sugira exatamente qual tópico estudar
- Dê uma meta clara (ex: "Resolva 10 questões de Direito Penal - Crimes contra a pessoa")
- Use linguagem militar motivacional (ex: "Soldado, hora de reforçar a defesa!")`;
    } else if (action === "explain_errors") {
      systemPrompt += `\n\nO aluno quer ENTENDER SEUS ERROS. Analise o contexto e:
- Identifique os padrões de erro mais comuns
- Explique por que essas áreas são difíceis
- Dê dicas práticas para superar cada dificuldade
- Sugira estratégias de estudo específicas`;
    } else if (action === "generate_questions") {
      systemPrompt += `\n\nO aluno quer QUESTÕES PERSONALIZADAS. Gere 3-5 questões de múltipla escolha:
- Focadas nas matérias mais fracas do aluno
- Nível de dificuldade adequado ao desempenho atual
- Formato: enunciado + 4 alternativas (A, B, C, D) + gabarito + explicação
- Estilo concurso PMBA`;
    } else if (action === "analyze_performance") {
      systemPrompt += `\n\nFaça uma ANÁLISE COMPLETA do desempenho do aluno:
- Diagnóstico textual detalhado
- Pontos fortes e fracos
- Previsão de evolução se mantiver o ritmo atual
- Plano de ação para os próximos 7 dias
- Índice de prontidão estimado (0-100%)`;
    }

    const aiMessages = [
      { role: "system", content: systemPrompt },
      ...(messages || [{ role: "user", content: action === "suggest_next" ? "Qual meu próximo passo de estudo?" : action === "explain_errors" ? "Explique meus erros recentes" : action === "generate_questions" ? "Gere questões personalizadas para mim" : "Analise meu desempenho completo" }]),
    ];

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: aiMessages,
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns segundos." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Erro no serviço de IA" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("tutor error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
