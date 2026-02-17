
# Plano: Correcoes Criticas + Apostila/Video + Pente Fino

## Bug 1: Reset de Questoes Nao Funciona (CRITICO)

**Causa raiz:** A tabela `user_answers` NAO tem politica RLS para DELETE. Quando o `resetSubjectQuestions` chama `.delete()`, a operacao falha silenciosamente porque o banco rejeita a exclusao.

**Solucao:** Criar migracao adicionando:
```text
CREATE POLICY "Users delete own answers"
  ON public.user_answers FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
```

Alem disso, apos o reset no codigo, tambem limpar o `answeredMap` local (estado da sessao de pratica) para que a UI reflita imediatamente.

---

## Bug 2: Questoes da Aula Nao Aparecem

**Analise:** O componente `LessonQuestions` esta presente no codigo (linha 284 do Aulas.tsx), recebendo `selectedTopic` como prop. O componente busca questoes com `topic_id` correspondente. O problema pode ser:
- Questoes no banco sem `topic_id` preenchido (campo nullable)
- O componente retorna `null` quando nao encontra questoes

**Solucao:** Manter o componente, mas tambem adicionar um fallback visual quando nao ha questoes ("Nenhuma questao disponivel para este assunto ainda"). Verificar que as questoes cadastradas via admin tenham `topic_id` configurado.

---

## Feature: Apostila Escrita vs Video Aula (estilo QConcursos)

**Como funciona hoje:** A pagina de aula exibe video E conteudo escrito juntos, sem separacao.

**Nova logica:**
- Se a aula tem APENAS video (`video_url` preenchido, `content` vazio): mostra so o player de video
- Se a aula tem APENAS apostila escrita (`content` preenchido, `video_url` vazio): mostra so o texto
- Se tem AMBOS: mostra tabs seletoras "Video Aula" e "Apostila Escrita" para o usuario escolher

**Na lista de aulas:** Badges indicando o que esta disponivel (icone Video, icone Apostila)

**No Admin:** O formulario ja suporta ambos os campos. Adicionar labels mais claros e badges visuais indicando quais formatos a aula possui. Adicionar toggle/checkboxes para "Tem Apostila Escrita" e "Tem Video Aula" para maior clareza.

---

## Pente Fino Geral

### Questoes.tsx:
- Apos reset, limpar `answeredMap` para a sessao corrente nao manter estado velho
- Garantir que ao voltar para lista de materias apos reset, os contadores estejam zerados

### Aulas.tsx:
- Melhorar o fallback do LessonQuestions (mostrar mensagem quando nao ha questoes)
- Tabs de video/apostila no detalhe da aula

### AdminConteudo.tsx:
- Labels mais claros: "Apostila Escrita (Markdown)" e "Video Aula"
- Badges na lista de aulas indicando quais formatos estao disponiveis (APOSTILA, VIDEO)

### LessonQuestions.tsx:
- Adicionar mensagem quando nao ha questoes para o topico
- Melhorar visual do header para ficar mais convidativo

---

## Detalhes Tecnicos

### Migracao necessaria:
- Adicionar politica DELETE em `user_answers` para usuarios autenticados

### Arquivos a modificar:
1. **`src/pages/Questoes.tsx`** — Limpar `answeredMap` no reset + fix de estado
2. **`src/pages/Aulas.tsx`** — Tabs video/apostila no detalhe da aula + badges na timeline
3. **`src/pages/admin/AdminConteudo.tsx`** — Labels melhorados + badges de formato na lista
4. **`src/components/LessonQuestions.tsx`** — Fallback visual quando sem questoes
