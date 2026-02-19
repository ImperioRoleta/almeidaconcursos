-- Inserção das Matérias e Assuntos (Preparação Soldado PMBA)

-- Limpar dados existentes (opcional, remova se não quiser limpar)
-- TRUNCATE subjects, topics RESTART IDENTITY CASCADE;

-- 1. Língua Portuguesa
WITH sub AS (INSERT INTO subjects (name) VALUES ('Língua Portuguesa') RETURNING id)
INSERT INTO topics (name, subject_id, order_index) SELECT t, sub.id, i FROM sub, unnest(ARRAY[
  'Compreensão e Interpretação de Texto', 'Ortografia Oficial', 'Acentuação Gráfica',
  'Classes de Palavras (Morfologia)', 'Sintaxe da Oração e do Período', 'Pontuação',
  'Concordância Nominal e Verbal', 'Regência Nominal e Verbal', 'Crase', 'Significação das Palavras'
]) WITH ORDINALITY AS t(t, i);

-- 2. História do Brasil
WITH sub AS (INSERT INTO subjects (name) VALUES ('História do Brasil') RETURNING id)
INSERT INTO topics (name, subject_id, order_index) SELECT t, sub.id, i FROM sub, unnest(ARRAY[
  'Organização Administrativa e Econômica da Colônia', 'Independência do Brasil',
  'O Primeiro e o Segundo Reinado', 'Brasil República', 'Era Vargas',
  'Ditadura Militar', 'História da Bahia: Revolta dos Búzios', 'Independência da Bahia'
]) WITH ORDINALITY AS t(t, i);

-- 3. Geografia do Brasil
WITH sub AS (INSERT INTO subjects (name) VALUES ('Geografia do Brasil') RETURNING id)
INSERT INTO topics (name, subject_id, order_index) SELECT t, sub.id, i FROM sub, unnest(ARRAY[
  'O Espaço Brasileiro: Relevo, Clima, Vegetação', 'Hidrografia e Questões Ambientais',
  'A Questão da Terra e Agrotóxicos', 'Dinâmica da População Brasileira',
  'Urbanização e Industrialização', 'Geografia da Bahia: Aspectos Físicos e Econômicos'
]) WITH ORDINALITY AS t(t, i);

-- 4. Matemática
WITH sub AS (INSERT INTO subjects (name) VALUES ('Matemática') RETURNING id)
INSERT INTO topics (name, subject_id, order_index) SELECT t, sub.id, i FROM sub, unnest(ARRAY[
  'Conjuntos Numéricos', 'Razão e Proporção', 'Regra de Três Simples e Composta',
  'Porcentagem', 'Juros Simples e Compostos', 'Funções de 1º e 2º Grau',
  'Geometria Plana e Espacial', 'Análise Combinatória e Probabilidade'
]) WITH ORDINALITY AS t(t, i);

-- 5. Atualidades
WITH sub AS (INSERT INTO subjects (name) VALUES ('Atualidades') RETURNING id)
INSERT INTO topics (name, subject_id, order_index) SELECT t, sub.id, i FROM sub, unnest(ARRAY[
  'Política e Economia no Brasil Contemporâneo', 'Meio Ambiente e Desenvolvimento Sustentável',
  'Ciência, Tecnologia e Inovação', 'Segurança Pública e Direitos Sociais',
  'Globalização e Conflitos Internacionais'
]) WITH ORDINALITY AS t(t, i);

-- 6. Informática
WITH sub AS (INSERT INTO subjects (name) VALUES ('Informática') RETURNING id)
INSERT INTO topics (name, subject_id, order_index) SELECT t, sub.id, i FROM sub, unnest(ARRAY[
  'Sistema Operacional Windows 10/11', 'Microsoft Word: Edição de Textos',
  'Microsoft Excel: Planilhas e Fórmulas', 'Conceitos de Internet e Navegadores',
  'Segurança da Informação e Vírus', 'Nuvem e Redes Sociais'
]) WITH ORDINALITY AS t(t, i);

-- 7. Direito Constitucional
WITH sub AS (INSERT INTO subjects (name) VALUES ('Direito Constitucional') RETURNING id)
INSERT INTO topics (name, subject_id, order_index) SELECT t, sub.id, i FROM sub, unnest(ARRAY[
  'Direitos e Garantias Fundamentais (Art. 5º a 17)', 'Organização do Estado',
  'Organização dos Poderes', 'Defesa do Estado e das Instituições Democráticas',
  'Segurança Pública (Art. 144)'
]) WITH ORDINALITY AS t(t, i);

-- 8. Direitos Humanos
WITH sub AS (INSERT INTO subjects (name) VALUES ('Direitos Humanos') RETURNING id)
INSERT INTO topics (name, subject_id, order_index) SELECT t, sub.id, i FROM sub, unnest(ARRAY[
  'Teoria Geral dos Direitos Humanos', 'Declaração Universal dos Direitos Humanos',
  'Pacto de San José da Costa Rica (CADH)', 'Direitos Humanos na Constituição Federal',
  'Grupos Vulneráveis e Minorias'
]) WITH ORDINALITY AS t(t, i);

-- 9. Direito Administrativo
WITH sub AS (INSERT INTO subjects (name) VALUES ('Direito Administrativo') RETURNING id)
INSERT INTO topics (name, subject_id, order_index) SELECT t, sub.id, i FROM sub, unnest(ARRAY[
  'Princípios Básicos da Administração Pública', 'Organização Administrativa',
  'Atos Administrativos', 'Poderes Administrativos', 'Servidores Públicos',
  'Responsabilidade Civil do Estado'
]) WITH ORDINALITY AS t(t, i);

-- 10. Direito Penal
WITH sub AS (INSERT INTO subjects (name) VALUES ('Direito Penal') RETURNING id)
INSERT INTO topics (name, subject_id, order_index) SELECT t, sub.id, i FROM sub, unnest(ARRAY[
  'Princípios do Direito Penal', 'Aplicação da Lei Penal', 'Teoria do Crime',
  'Crimes contra a Pessoa', 'Crimes contra o Patrimônio', 'Crimes contra a Administração Pública'
]) WITH ORDINALITY AS t(t, i);

-- 11. Igualdade Racial e de Gênero
WITH sub AS (INSERT INTO subjects (name) VALUES ('Igualdade Racial e de Gênero') RETURNING id)
INSERT INTO topics (name, subject_id, order_index) SELECT t, sub.id, i FROM sub, unnest(ARRAY[
  'Constituição Federal: Combate ao Racismo', 'Estatuto da Igualdade Racial (Lei 12.288/10)',
  'Crime de Racismo (Lei 7.716/89)', 'Lei Maria da Penha (Lei 11.340/06)',
  'Políticas Afirmativas no Brasil'
]) WITH ORDINALITY AS t(t, i);

-- 12. Direito Penal Militar
WITH sub AS (INSERT INTO subjects (name) VALUES ('Direito Penal Militar') RETURNING id)
INSERT INTO topics (name, subject_id, order_index) SELECT t, sub.id, i FROM sub, unnest(ARRAY[
  'Aplicação da Lei Penal Militar', 'Crime Militar', 'Crimes contra a Autoridade Militar',
  'Crimes contra o Serviço Militar e o Dever Militar', 'Penas e Medidas de Segurança'
]) WITH ORDINALITY AS t(t, i);
