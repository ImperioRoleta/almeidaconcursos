

# Plano: Reset de Usuario + Gamificacao + Foto de Perfil + Redesign Perfil + Correcoes

## 1. Reset Completo de Usuario (Admin)

Criar uma funcao de banco `admin_reset_user` (security definer) que deleta dados das seguintes tabelas para um usuario alvo, preservando nome, email e assinatura:

- `user_answers` (respostas)
- `user_progress` (progresso de aulas)
- `user_achievements` (conquistas)
- `review_queue` (fila de revisao)
- `study_sessions` (sessoes de estudo)
- `study_trail` (trilha de estudo)
- `study_plans` (planos de estudo)
- `simulation_results` (resultados de simulados)
- `simulations` (simulados)
- `diagnostic_results` (diagnostico)
- `activity_logs` (logs de atividade)
- `essays` (redacoes)
- Reset `profiles.level_id` para 1 e `diagnostic_completed` para false

**No AdminUsuarios.tsx:** Adicionar botao "Resetar Progresso" por usuario, com dialog de confirmacao.

---

## 2. Reset pelo Proprio Aluno (Premium, 1x por mes)

Adicionar tabela ou campo para controlar a data do ultimo reset. Usar a coluna `profiles` com um novo campo `last_reset_at` (timestamp, nullable).

**Migracao:** Adicionar coluna `last_reset_at` em `profiles`.

**No Perfil.tsx:** Botao "Recomecar do Zero" visivel apenas para premium. Verificar se `last_reset_at` e null ou tem mais de 30 dias. Chamar a mesma funcao de reset (versao para o proprio usuario, sem precisar de admin).

Criar funcao `user_self_reset` (security definer) que:
- Verifica se o usuario tem plano premium ativo
- Verifica se `last_reset_at` e null ou > 30 dias atras
- Executa o mesmo delete das tabelas
- Atualiza `last_reset_at` para now()

---

## 3. Melhorar Sistema de Patentes (Levels)

Os requisitos atuais sao muito rigidos:
- Soldado em Formacao: 5h + 30% acerto
- Soldado Operacional: 15h + 50%
- Cabo Academico: 30h + 65%
- Sargento de Elite: 60h + 80%
- Oficial de Merito: 100h + 90%

**Novos valores mais acessiveis:**
- Soldado em Formacao: 1h + 20% acerto
- Soldado Operacional: 5h + 35%
- Cabo Academico: 15h + 50%
- Sargento de Elite: 30h + 65%
- Oficial de Merito: 50h + 75%

Atualizar via INSERT tool (dados, nao schema).

Tambem precisa adicionar logica automatica de promocao: no Dashboard ou Perfil, verificar se o usuario atingiu os requisitos do proximo nivel e atualizar `profiles.level_id`.

---

## 4. Melhorar Conquistas

Algumas conquistas tem thresholds altos. Ajustar:
- `hours_25` de 25 para 15
- `hours_50` de 50 para 30
- `hours_100` de 100 para 50
- `questions_250` de 250 para 150
- `questions_500` de 500 para 300
- `streak_60` de 60 para 30

Atualizar via INSERT tool.

---

## 5. Foto de Perfil

A coluna `avatar_url` ja existe em `profiles`. Precisa de:

**Storage:** Ja existe buckets, criar um bucket `avatars` (publico) com politica de upload para usuarios autenticados.

**Perfil.tsx:** Adicionar area de upload de foto com preview circular. Ao selecionar imagem, faz upload para `avatars/{user_id}.jpg`, obtem URL publica e atualiza `profiles.avatar_url`.

**Sidebar, Ranking, etc:** Substituir o icone generico pelo avatar do usuario quando disponivel.

---

## 6. Redesign da Pagina de Perfil

Redesign completo com:
- Foto de perfil editavel com overlay de camera
- Secao de dados pessoais mais organizada (nome, email, plano, patente)
- Cards de estatisticas com design melhorado e cores vibrantes
- Secao de assinatura com mais detalhes
- Botao "Recomecar do Zero" (premium only)
- Historico recente de atividade
- Layout mais compacto e atraente

---

## 7. Promocao Automatica de Patente

Adicionar logica no Dashboard e/ou Perfil que:
1. Busca stats do usuario (horas e accuracy)
2. Compara com os requisitos do proximo nivel
3. Se atingiu, faz UPDATE em `profiles.level_id`
4. Mostra toast de parabens

---

## Detalhes Tecnicos

### Migracoes necessarias:
1. Adicionar coluna `last_reset_at` em `profiles`
2. Criar funcao `admin_reset_user_data` (security definer)
3. Criar funcao `user_self_reset` (security definer)
4. Criar bucket `avatars` com RLS

### Dados a atualizar (INSERT tool):
- Tabela `levels` - novos thresholds
- Tabela `achievements` - novos thresholds

### Arquivos a modificar:
1. **`src/pages/admin/AdminUsuarios.tsx`** - Botao e dialog de reset
2. **`src/pages/Perfil.tsx`** - Redesign completo + upload de foto + botao reset
3. **`src/pages/Dashboard.tsx`** - Logica de auto-promocao de patente
4. **`src/components/AppSidebar.tsx`** - Mostrar avatar do usuario
5. **`src/pages/Conquistas.tsx`** - Ajustes menores de sincronizacao

### Fluxo de reset (admin):
```text
Admin clica "Resetar" -> Dialog de confirmacao
  -> supabase.rpc("admin_reset_user_data", { admin_id, target_id })
  -> Funcao deleta dados de todas as tabelas
  -> Toast de sucesso -> Refresh lista
```

### Fluxo de reset (aluno):
```text
Aluno clica "Recomecar do Zero" -> Verifica premium + 30 dias
  -> Dialog de confirmacao com aviso
  -> supabase.rpc("user_self_reset")
  -> Funcao verifica elegibilidade + deleta dados
  -> Toast de sucesso -> Refresh perfil
```

