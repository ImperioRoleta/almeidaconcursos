
# Plano de Melhorias: Design de Aulas, Conquistas, Premium e Correções Gerais

## 1. Correcar Conquistas de Redacao (Bug Critico)

**Problema identificado:** A pagina de Conquistas (`Conquistas.tsx`) nao carrega dados de redacoes e nao reconhece a categoria `essays`. Especificamente:
- Falta buscar dados da tabela `essays` para contar redacoes e notas
- A funcao `getProgress` nao trata chaves `essay_*` / `first_essay` / `essay_score_*`
- O auto-unlock ignora conquistas de redacao
- Faltam labels e cores para a categoria `essays` nos mapas `categoryLabels` e `categoryColors`

**Solucao:**
- Adicionar query de `essays` no `useEffect` do Conquistas
- Mapear `essays` no `categoryLabels` (ex: "Redacoes") e `categoryColors`
- Tratar `first_essay`, `essay_5`, `essay_10` por contagem total de redacoes
- Tratar `essay_score_800` e `essay_score_1000` pela nota maxima do usuario
- Adicionar stats de redacao ao painel de estatisticas do topo

---

## 2. Correcao: Politica de DELETE no user_progress (Bug)

**Problema:** O botao "Recomeccar" nas materias nao funciona porque a tabela `user_progress` nao tem politica RLS para DELETE. A operacao falha silenciosamente.

**Solucao:** Criar migracao adicionando:
```text
CREATE POLICY "Users delete own progress" ON public.user_progress
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
```

---

## 3. Redesign da Pagina de Aulas

**Melhorias visuais em todas as camadas:**

### Materias (lista principal)
- Cards maiores com gradientes sutis e icone/emoji da materia
- Barra de progresso com animacao e cores diferenciadas por nivel de conclusao
- Layout em grid responsivo mais elegante com hover effects
- Contagem de assuntos dentro de cada materia

### Assuntos (dentro da materia)
- Cards com numeracao sequencial e descricao
- Breadcrumb visual para navegacao (Materias > Materia X > Assuntos)
- Indicador de progresso por assunto (aulas concluidas/total)

### Lista de Aulas (dentro do assunto)
- Design de timeline vertical conectando as aulas
- Circulos numerados com status visual (concluida/pendente/premium)
- Badges mais elegantes (VIDEO, PREMIUM, NOVA)
- Thumbnail de imagem quando disponivel

### Detalhe da Aula
- Header mais imersivo com imagem de capa em destaque
- Barra de navegacao fixa com progresso da materia

---

## 4. Restricoes Premium Ampliadas

**Novas restricoes para gratuitos:**
- **Redacoes:** Limitar a 1 redacao por mes para gratuitos (ilimitado para premium)
- **Ranking:** Acesso completo apenas para premium (gratuito ve apenas top 3)
- **Questoes:** Limitar a 10 questoes/dia para gratuitos
- **Revisoes:** Gate premium completo
- **Aulas:** Apos as 3 primeiras aulas gratuitas, bloquear como premium

**Implementacao:**
- Adicionar verificacao `useSubscription` nas paginas afetadas
- Mostrar contadores de uso diario/mensal com mensagens incentivando upgrade
- Usar `PremiumGate` inline para conteudos parcialmente bloqueados

---

## 5. Pente Fino - Correcoes Gerais

- **Correcao de essay via edge function:** Ja foi corrigida na mensagem anterior com fallback de modelos. Verificar se esta deployada corretamente.
- **upsert em user_progress:** Verificar se o `onConflict` funciona (precisa de unique constraint em `user_id, lesson_id`)
- **Consistencia de navegacao:** Garantir breadcrumbs em todas as sub-paginas de Aulas

---

## Detalhes Tecnicos

### Migracao de banco necessaria:
- Adicionar politica DELETE em `user_progress`
- Adicionar unique constraint `(user_id, lesson_id)` em `user_progress` se nao existir

### Arquivos a modificar:
- `src/pages/Conquistas.tsx` - Fix essay achievements + category labels
- `src/pages/Aulas.tsx` - Redesign completo com visual avancado
- `src/pages/Redacoes.tsx` - Adicionar gate premium (limite gratuito)
- `src/pages/Questoes.tsx` - Adicionar limite diario para gratuitos
- `src/pages/Ranking.tsx` - Gate parcial para gratuitos
- `src/pages/Revisoes.tsx` - Gate premium
- `src/components/PremiumGate.tsx` - Adicionar variante de limite (ex: "3/10 questoes hoje")
