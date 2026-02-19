// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Authenticate and verify admin role
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: roleData } = await supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").single();
    if (!roleData) {
      return new Response(JSON.stringify({ error: "Sem permissão de administrador" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const { prompt, action, subject_id, topic_id, lesson_id } = body;

    let systemPrompt = "";
    let context_text = "";

    if (lesson_id) {
      const { data: lesson } = await supabase.from("lessons").select("title, content").eq("id", lesson_id).single();
      if (lesson) {
        context_text = `CONTEXTO (AULA SELECIONADA):\nTítulo: ${lesson.title}\nConteúdo: ${lesson.content}\n\n`;
      }
    }
    if (action === "generate_lessons") {
      systemPrompt = `Você é o assistente administrativo da plataforma Elite PMBA. Você gera conteúdo educacional para o concurso Soldado PMBA.
Matérias do edital: Língua Portuguesa, Direito Constitucional, Direito Penal, Direito Administrativo, Legislação PM, Direitos Humanos, Raciocínio Lógico, Informática.
Responda sempre em português brasileiro com conteúdo de alta qualidade e tecnicamente correto.

${context_text}

Você DEVE responder EXCLUSIVAMENTE com um JSON válido no formato abaixo, sem markdown, sem texto extra, apenas o JSON puro:
[
  {
    "title": "Título da Aula",
    "content": "Conteúdo completo e detalhado da aula com explicações, exemplos e conceitos-chave. Use parágrafos bem estruturados. Mínimo 500 palavras por aula."
  }
]
Gere aulas completas, detalhadas e didáticas. Cada aula deve ter conteúdo rico com:
- Introdução ao tema
- Conceitos fundamentais com explicações claras
- Exemplos práticos e casos reais
- Dicas para prova
- Resumo dos pontos principais`;
    } else if (action === "generate_questions") {
      systemPrompt = `Você é um professor especialista em concursos militares. 
Gere uma lista de questões de múltipla escolha baseadas no tema ou conteúdo fornecido.
Retorne APENAS um array JSON no formato:
[
  {
    "statement": "pergunta?",
    "options": [
      {"label": "A", "text": "opção", "is_correct": true},
      {"label": "B", "text": "opção", "is_correct": false},
      {"label": "C", "text": "opção", "is_correct": false},
      {"label": "D", "text": "opção", "is_correct": false},
      {"label": "E", "text": "opção", "is_correct": false}
    ],
    "difficulty": "easy|medium|hard",
    "explanation": "por que esta correta"
  }
]
Use 5 alternativas (A, B, C, D, E) por questão.
${context_text}`;
    }

    // Updated to gemini-flash-latest - confirmed available with quota on v1beta
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${GEMINI_API_KEY}`;

    const response = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: `${systemPrompt}\n\nPROMPT DO USUÁRIO: ${prompt}` }]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 8192,
        }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Gemini Error (${response.status}):`, errorText);
      throw new Error(`Erro na API (${response.status}): ${errorText.slice(0, 100)}`);
    }

    const result = await response.json();
    const content = result.candidates?.[0]?.content?.parts?.[0]?.text || "";



    if (!content) {
      console.error("Gemini returned empty content. Result:", JSON.stringify(result));
      const safetyReason = result.candidates?.[0]?.finishReason;
      throw new Error(`A IA não gerou conteúdo. Motivo: ${safetyReason || "Desconhecido"}. Tente um prompt diferente ou mais curto.`);
    }

    // If action requires saving to DB
    if (action === "generate_lessons" && topic_id) {
      try {
        console.log(`Generating lessons for topic: ${topic_id}. Content length: ${content.length}`);

        let cleanJson = content.trim();
        // Fallback: if it still has markdown blocks despite JSON mode
        const jsonMatch = cleanJson.match(/```json\n?([\s\S]*?)\n?```/) || cleanJson.match(/```\n?([\s\S]*?)\n?```/);
        if (jsonMatch) {
          cleanJson = jsonMatch[1].trim();
        }

        let lessons;
        try {
          lessons = JSON.parse(cleanJson);
        } catch (parseErr) {
          console.error("JSON Parse Error. Content preview:", cleanJson.slice(0, 500) + "...");
          throw new Error(`Erro ao processar JSON: ${parseErr.message}. A resposta pode ter sido cortada ou gerada em formato inválido.`);
        }

        // If it's an object with a 'lessons' property, grab the array
        if (!Array.isArray(lessons) && lessons.lessons && Array.isArray(lessons.lessons)) {
          lessons = lessons.lessons;
        }

        if (!Array.isArray(lessons)) {
          console.log("Lessons is not an array:", typeof lessons);
          throw new Error("A resposta da IA não contém uma lista de aulas.");
        }

        let saved = 0;
        const lessonsToInsert = lessons.map((l: any, i: number) => ({
          title: l.title,
          content: l.content,
          topic_id: topic_id,
          order_index: i + 1,
        }));

        const { error, data } = await supabase.from("lessons").insert(lessonsToInsert).select();

        if (!error) {
          saved = lessonsToInsert.length;
        } else {
          console.error("Error saving lessons:", error);
          throw new Error(`Erro ao salvar no banco: ${error.message}`);
        }

        return new Response(JSON.stringify({ content, saved, total: lessons.length, action: "lessons_saved" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (e) {
        console.error("Admin processing error:", e);
        return new Response(JSON.stringify({ content, error_parse: e instanceof Error ? e.message : "Erro ao processar resposta" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    if (action === "generate_questions" && subject_id) {
      try {
        console.log(`Generating questions for subject: ${subject_id}, topic: ${topic_id}`);
        // With response_mime_type: "application/json", we get pure JSON
        const cleanJson = content.trim();

        let questions = JSON.parse(cleanJson);

        // Handle wrapped object
        if (!Array.isArray(questions) && questions.questions && Array.isArray(questions.questions)) {
          questions = questions.questions;
        }

        if (!Array.isArray(questions)) {
          throw new Error("A resposta da IA não contém uma lista de questões.");
        }

        let saved = 0;
        const questionsToInsert = [];

        for (const q of questions) {
          questionsToInsert.push({
            subject_id: subject_id,
            topic_id: topic_id || null,
            lesson_id: lesson_id || null,
            statement: q.statement,
            difficulty: q.difficulty || "medium",
            explanation: q.explanation || "",
          });
        }

        const { data: insertedQuestions, error: qError } = await supabase.from("questions").insert(questionsToInsert).select();

        if (qError || !insertedQuestions) {
          console.error("Error saving questions:", qError);
          throw new Error(`Erro ao salvar questões: ${qError?.message}`);
        }

        // Insert options for each question
        const optionsToInsert = [];
        for (let i = 0; i < insertedQuestions.length; i++) {
          const aiQ = questions[i];
          const dbQ = insertedQuestions[i];
          for (const opt of aiQ.options) {
            optionsToInsert.push({
              question_id: dbQ.id,
              label: opt.label,
              text: opt.text,
              is_correct: opt.is_correct,
            });
          }
        }

        const { error: optError } = await supabase.from("question_options").insert(optionsToInsert);
        if (optError) {
          console.error("Error saving options:", optError);
          throw new Error(`Erro ao salvar alternativas: ${optError.message}`);
        }

        saved = insertedQuestions.length;

        return new Response(JSON.stringify({ content, saved, total: questions.length, action: "questions_saved" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (e) {
        console.error("Parse error:", e);
        return new Response(JSON.stringify({ content, error_parse: "Erro ao processar resposta da IA: " + (e instanceof Error ? e.message : "formato inválido") }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    return new Response(JSON.stringify({ content }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("admin-ia error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
