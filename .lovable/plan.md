

# Plano: Questoes na Aula + Redesign de Questoes + Progressao

## 1. Questoes Integradas na Pagina da Aula

Apos o conteudo da aula, antes dos botoes de "Concluir" e "Proxima Aula", sera adicionada uma secao de questoes relacionadas ao assunto (topic_id da aula).

**Funcionamento:**
- Ao abrir a aula, busca questoes da tabela `questions` filtradas pelo `topic_id` da aula
- Exibe as questoes em formato inline, sem sair da pagina
- Questoes ja respondidas pelo usuario aparecem marcadas como "respondida" (checkmark visual)
- O aluno pode responder quantas quiser antes de prosseguir
- Feedback imediato (verde/vermelho) + explicacao apos responder
- Contador de acertos (ex: "3/5 corretas") visivel

**Dados:** A tabela `questions` ja possui `topic_id` (uuid, nullable). As questoes que tiverem topic_id correspondente ao topico da aula serao exibidas.

---

## 2. Redesign Completo da Pagina de Questoes (/questoes)

**Vista de Materias (subject list):**
- Cards com gradientes, icones coloridos, descricao e imagem (mesmo estilo da pagina de Aulas)
- Progresso por materia: total de questoes respondidas vs disponiveis
- Breadcrumb de navegacao (Materias > Materia X)
- Banner de limite diario com design mais elegante

**Vista de Questoes (pratica):**
- Header com progresso visual (progress bar do lote atual)
- Card da questao com design premium: numero da questao, badge de dificuldade
- Opcoes com animacao de hover e feedback visual mais rico
- Indicador lateral de questoes respondidas (dots/mini-timeline)
- Painel lateral ou topo com stats em tempo real (acertos, taxa, tempo)

**Questoes ja respondidas:**
- Ao carregar questoes, buscar `user_answers` do usuario para aquele subject
- Marcar visualmente questoes ja respondidas com icone de check
- Permitir refazer, mas mostrar resultado anterior

---

## 3. Progressao por Materia em Questoes

Semelhante ao que existe em Aulas:
- Na listagem de materias, exibir barra de progresso com total de questoes respondidas vs total disponivel
- Contagem de questoes por materia
- Taxa de acerto por materia (percentual)
- Ao atingir 100%, botao de "Recomecar" (limpar answers daquela materia? Ou apenas mostrar novamente)

**Dados utilizados:**
- `questions` (count por subject_id)
- `user_answers` (count por question.subject_id via join ou pre-fetch)

---

## 4. Estado Persistente de "Respondida"

- Ao carregar um lote de questoes, buscar todas as `user_answers` do usuario para aquelas question_ids
- Exibir indicador visual (badge "Respondida", icone check) em questoes ja feitas
- No mini-mapa de questoes (dots), diferenciar: nao respondida, respondida certa, respondida errada
- Dentro da aula, mesmo comportamento: questoes do topico marcadas como respondidas

---

## Detalhes Tecnicos

### Arquivos a modificar:

1. **`src/pages/Aulas.tsx`** — Na secao "Lesson Detail", adicionar componente de questoes inline apos o conteudo. Buscar questoes pelo `topic_id` do topico selecionado. Incluir logica de resposta e feedback.

2. **`src/pages/Questoes.tsx`** — Redesign completo:
   - Vista de materias com cards gradiente, progress bars, stats por materia
   - Vista de pratica com design avancado, mini-mapa, feedback rico
   - Carregar `user_answers` existentes para marcar questoes respondidas
   - Breadcrumb de navegacao

3. **Nenhuma migracao necessaria** — As tabelas `questions` (com `topic_id`), `question_options` e `user_answers` ja existem e suportam todas as funcionalidades.

### Fluxo de dados para questoes na aula:
```text
Aula selecionada -> topic_id da aula
  -> SELECT * FROM questions WHERE topic_id = <topic_id>
  -> SELECT * FROM user_answers WHERE user_id = <user> AND question_id IN (...)
  -> Renderizar questoes inline com status de respondida
```

### Fluxo de progressao em /questoes:
```text
Pagina carrega -> SELECT subject_id, count(*) FROM questions GROUP BY subject_id
  -> SELECT question_id FROM user_answers WHERE user_id = <user>
  -> Calcular % respondidas por materia
  -> Exibir progress bars nos cards de materia
```

