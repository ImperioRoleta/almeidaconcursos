

# Elite PMBA — Plataforma Educacional Premium

## Visão Geral
Plataforma educacional completa para preparação ao concurso SD PMBA, com tema dark premium, dados isolados por usuário, backend real com Supabase (Lovable Cloud), e IA integrada via Lovable AI (Gemini).

---

## 1. Infraestrutura e Autenticação
- **Lovable Cloud** com PostgreSQL (Supabase) como backend
- Autenticação via Supabase Auth (email/senha, sem confirmação de email)
- Sistema de roles (`admin`, `user`) em tabela separada com função `has_role` (security definer)
- Admin automático: `almeidatheus487@gmail.com` criado via migration com role admin
- RLS em todas as tabelas — cada usuário só acessa seus próprios dados
- Proteção de rotas no frontend por role

## 2. Identidade Visual — Dark Premium
- Tema dark com a paleta especificada (#0A0A0A, #0F62FE, #D4AF37, etc.)
- Fontes: Poppins (títulos), Inter (corpo), JetBrains Mono (métricas)
- Sidebar fixa com navegação contextual (aluno vs admin)
- Cards com profundidade, animações suaves, hierarquia visual clara
- Responsivo mobile-first

## 3. Modelo de Dados (PostgreSQL via Supabase)
Tabelas principais com chaves estrangeiras reais:
- `profiles` (nome, avatar, nivel_id)
- `user_roles` (role admin/user)
- `subscriptions` (plano, status, validade)
- `levels` (Recruta → Oficial de Mérito)
- `subjects` (matérias)
- `topics` (assuntos por matéria)
- `lessons` (aulas por assunto)
- `questions` + `question_options`
- `user_answers` (respostas individuais)
- `user_progress` (progresso por aula/assunto)
- `study_sessions` (início, fim, duração real em segundos)
- `simulations` + `simulation_results`
- `activity_logs`

Todas com RLS filtrando por `auth.uid()`.

## 4. Área do Aluno
- **Dashboard** com métricas reais: horas estudadas, taxa de acerto, nível PM, progresso por disciplina
- **Gráficos** (Recharts): evolução semanal, acertos por disciplina, tempo de estudo
- **Aulas**: navegação Matéria → Assunto → Aula, marcar como concluída
- **Questões**: responder, ver correção e explicação, histórico individual
- **Simulados**: gerar simulado, cronômetro, correção automática, resultado persistente
- **Cronômetro de estudo**: sessão real com início/pausa/fim, persistido no banco
- **Perfil**: dados pessoais, nível, estatísticas

## 5. Sistema de Níveis PM
Hierarquia automática baseada em acertos + horas + consistência:
- Recruta → Soldado em Formação → Soldado Operacional → Cabo Acadêmico → Sargento de Elite → Oficial de Mérito
- Promoção calculada automaticamente ao completar atividades

## 6. IA do Aluno (Lovable AI — Gemini)
Via Edge Function com streaming:
- Explicar conteúdos do edital
- Resolver e explicar questões
- Resumir aulas
- Criar plano de estudo personalizado
- Chat contextual educacional

## 7. Painel Administrativo
- **Dashboard admin**: total de alunos, atividade recente, conteúdos criados
- **Gestão de usuários**: listar, editar, bloquear, alterar plano, ver desempenho
- **Gestão acadêmica**: CRUD completo de matérias, assuntos e aulas
- **Banco de questões**: CRUD com organização hierárquica
- **Gestão de assinaturas**: atribuir/alterar planos (gratuito, premium mensal, premium anual)

## 8. IA Administrativa (Lovable AI — Gemini)
Via Edge Function dedicada:
- Gerar aulas completas estruturadas por matéria/assunto
- Gerar questões com alternativas e explicação
- Gerar simulados completos
- Preview antes de publicar
- Salvar automaticamente no banco

## 9. Conteúdo Inicial
Gerado automaticamente na primeira execução via IA ou seed data:
- Disciplinas do edital SD PMBA (Português, Direito Penal, Constitucional, Administrativo, etc.)
- ~20 aulas iniciais distribuídas pelas disciplinas
- ~80 questões com alternativas e explicações

## 10. Sistema de Assinaturas (Sem Pagamento)
- Planos: Gratuito, Premium Mensal, Premium Anual
- Controlado manualmente pelo admin
- Acesso a recursos condicionado ao plano ativo
- Tabela com status, datas de início e expiração

## 11. Páginas e Navegação

**Visitante:** Landing page → Cadastro → Login

**Aluno:** Dashboard → Aulas → Questões → Simulados → IA Chat → Perfil

**Admin:** Dashboard Admin → Usuários → Conteúdo (Matérias/Assuntos/Aulas) → Questões → IA Admin → Assinaturas

---

## Ordem de Implementação
1. Lovable Cloud + banco de dados + autenticação + admin seed
2. Tema dark premium + layout com sidebar
3. Landing page + cadastro + login
4. Dashboard do aluno + cronômetro de estudo
5. Sistema educacional (matérias, assuntos, aulas)
6. Banco de questões + respostas
7. Sistema de níveis PM
8. Simulados
9. IA do aluno (Edge Function + chat)
10. Painel admin completo
11. IA administrativa
12. Conteúdo inicial (seed)
13. Sistema de assinaturas

