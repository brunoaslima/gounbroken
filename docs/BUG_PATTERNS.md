# Padrões de bug recorrentes — checklist obrigatório

> Consultar ANTES de implementar qualquer mudança em RPC, schema, ou remoção/rename
> de campo. Cada padrão abaixo já se repetiu 2+ vezes nesta base de código. Quando
> um bug novo se encaixar num padrão existente, adicionar a ocorrência na lista;
> quando for um padrão genuinamente novo, criar uma seção nova.
>
> Regra de ouro: se você (Claude) está prestes a fazer algo que já está catalogado
> aqui como "como evitar", pare e aplique a checagem antes de escrever o código —
> não depois.

---

## 1. Campo genérico da competição usado em vez do valor derivado da divisão

**O padrão:** `competitions.team_min_size` / `team_max_size` são campos legados,
criados antes do sistema de divisões existir. Toda vez que uma função (RPC ou
frontend) precisa saber "quantas pessoas esse time deveria ter", existe a
tentação de ler esses campos genéricos — só que o valor certo depende do
**formato da divisão do time** (`individual`=1, `pair`=2, `team3`=3, `team4`=4),
não da competição inteira.

**Por que se repete:** o valor genérico *existe* e *funciona sintaticamente* (a
query roda sem erro), só está semanticamente errado. Não há erro de compilação
nem de runtime — só comportamento incorreto silencioso. É o tipo de bug que passa
despercebido em teste manual rápido porque "parece que funcionou".

**Onde já mordeu (4 ocorrências, mesma causa raiz, achadas em momentos
separados):**
- `TeamManage.tsx` (`maxSize`) — exibição de vagas errada (mostrava 4 vagas pra
  time `pair`, que só tem 2)
- `respond_team_invite` — auto-avanço de status comparava aceitos contra
  `team_min_size` (competição) em vez do tamanho real da divisão
- `manage_team('approve')` — **nem chegava a comparar nada**, aprovava time
  incompleto sem checagem alguma
- `invite_team_member` — limite de convite usava `team_max_size` (competição),
  deixando capitão de `pair` convidar um 3º/4º membro

**Como evitar:**
- Antes de usar `team_min_size`/`team_max_size` em qualquer lugar novo, perguntar:
  "esse time tem `division_id`? Se sim, o valor correto vem do formato da
  divisão, não desses campos."
- Existe a função `division_required_size(division_id)` no banco
  (`fix-division-size-gate.sql`) — **usar ela**, não reimplementar o `CASE`
  format→size de novo em SQL nem em TS. Se o mapa mudar um dia, muda num lugar só.
- No frontend, o mapa `FORMAT_SIZE` já existe em mais de um arquivo
  (`CompetitionManage.tsx`, `TeamManage.tsx`) — considerar extrair pra
  `src/lib/` como fonte única, em vez de continuar copiando.
- **Antes de dar por terminado um fix desse tipo, rodar `grep -rn
  "team_min_size\|team_max_size"` no repo inteiro** e conferir CADA ocorrência,
  não só a que motivou o fix.

---

## 2. Extensão do Postgres chamada sem qualificar o schema

**O padrão:** funções `SECURITY DEFINER` com `SET search_path = public`
(hardening correto contra search-path hijacking) quebram silenciosamente ao
chamar funções de extensão (`gen_random_bytes`, etc.) sem qualificar o schema,
porque no Supabase essas extensões instalam em `extensions`, não em `public`.

**Por que se repete:** o erro só aparece na **primeira invocação real via RPC**
(`function gen_random_bytes(integer) does not exist`) — se toda criação de dado
de teste até então passou por SQL direto (migrations/seeds via
`scripts/db-push.sh`, que roda como superuser com search_path mais permissivo),
o bug fica invisível indefinidamente.

**Onde já mordeu:** `create_competition`, `update_competition_privacy` (as duas
únicas funções do projeto que chamavam `gen_random_bytes`).

**Como evitar:**
- Qualquer função `SET search_path = public` que precise de `gen_random_bytes`,
  `gen_random_uuid()`, `digest()`, `crypt()`, etc. — qualificar explicitamente
  (`extensions.gen_random_bytes(...)`), nunca confiar no search_path default.
- **Testar toda RPC nova chamando ela de verdade** (via `supabase.rpc(...)` no
  app, não só validando que a `CREATE FUNCTION` rodou sem erro de sintaxe) antes
  de considerar o trabalho concluído. `db-push.sh` bem-sucedido só prova que o
  SQL é válido, não que a função funciona quando chamada pelo app.

---

## 3. Remover valor de enum sem varrer o repo inteiro

**O padrão:** ao remover um valor de um `union type` TypeScript (ex:
`TeamStatus`), o TypeScript só pega os lugares que usam `Record<UnionEstrito,
X>` — mapas frouxos (`Record<string, X>`) aceitam qualquer chave e **não geram
erro de compilação** quando sobra uma referência morta a um valor que não existe
mais.

**Por que se repete:** `tsc --noEmit` passar limpo dá falsa sensação de "migrei
tudo". Só um `grep` bruto no texto pega o que o compilador não pega.

**Onde já mordeu:** remoção de `pending_payment` — `CompetitionDetail.tsx` usava
`Record<StatusKey, ...>` (typed, pegou o erro), mas `TeamManage.tsx` e
`CompetitionManage.tsx` usavam `Record<string, ...>` (não pegou nada,
precisou de grep manual em 5 arquivos pra achar tudo: labels, cores, filtros,
KPIs, condições de exibição de botão).

**Como evitar:**
- Depois de `tsc --noEmit` limpo, **sempre** rodar `grep -rn "<valor_removido>"
  src/` como segunda verificação — não confiar só no compilador quando o tipo
  em algum lugar pode estar frouxo.
- Ao criar um `Record<string, X>` novo pra mapear um enum do banco, preferir
  `Record<UnionType, X>` quando o union já existe em `types.ts` — isso transforma
  remoções futuras de silenciosas em erro de compilação.

---

## 4. Fluxo de "apagar + recriar" em duas chamadas separadas (sem transação)

**O padrão:** editar um recurso via "apaga o antigo, insere o novo" feito como
duas chamadas RPC separadas do cliente, sem transação cobrindo as duas. Se a
segunda falhar (ou o usuário clicar salvar de novo numa tela desatualizada
apontando pro registro já apagado), o dado se perde sem substituto.

**Onde já mordeu:** edição de treino (`PersonalWorkout.tsx`) chamava
`admin_delete_workout` e depois `personal_save_workout` como duas RPCs
distintas — funcionava na maioria das vezes, mas double-submit numa página
desatualizada gerava "Workout not found" e potencial perda de dado.

**Como evitar:**
- Sempre que o fluxo for "substituir X por Y", implementar como **uma função
  SQL só**, que faz delete+insert dentro da mesma invocação (transação implícita
  do Postgres cobre tudo automaticamente). Nunca depender do cliente chamar duas
  RPCs em sequência esperando que "provavelmente" vai dar certo.
- Se o registro a substituir já não existir (double-submit), a função deve
  **seguir em frente e criar o novo** em vez de lançar exceção — trata como
  idempotente, não como erro.

---

## 5. Checagem de permissão pelo papel errado (role global vs. dono do recurso)

**O padrão:** uma RPC que deveria autorizar "o dono deste recurso específico"
checa, em vez disso, um papel global (`is_global_admin()`), bloqueando qualquer
usuário legítimo que não seja também admin.

**Onde já mordeu:** `admin_delete_workout` exigia role `admin` global, mas era
chamada no fluxo de edição de qualquer `personal` (coach) editando o **próprio**
treino — qualquer coach sem role admin tomava "Unauthorized" silenciosamente
(só `console.error`, sem feedback na tela) toda vez que tentava salvar uma
edição.

**Como evitar:**
- Antes de gatear uma ação em `is_global_admin()`, perguntar: "essa ação é
  sobre um recurso que pertence a alguém específico (trainer_id, created_by,
  captain_user_id)?" Se sim, o dono também deve poder agir sobre o próprio
  recurso — `dono = auth.uid() OR is_global_admin()`, não só admin.
- Nomes de função tipo `admin_*` são um cheiro: se a função é chamada por um
  fluxo comum de usuário (não uma tela exclusiva de admin), o nome já é sinal de
  que o gate provavelmente está errado.

---

## 6. Texto livre do usuário desviado silenciosamente para outro campo

**O padrão:** um campo de input aceita texto livre na UI, mas a lógica de save
só persiste o valor no campo "de verdade" se bater um formato esperado (ex:
regex de número puro) — qualquer outra coisa é desviada pra um campo secundário
(notas), sem o usuário perceber, e sem voltar pro campo original ao reabrir pra
editar.

**Onde já mordeu:** campo "Reps / Scheme" — digitar `60m` fazia o valor ir pra
`notes` em vez de `reps`, então nunca aparecia como o destaque principal do
exercício, e reabrir pra editar mostrava o campo vazio (o texto ficava "preso"
nas notas, desconectado). Parecia que a edição nunca salvava.

**Como evitar:**
- Se um campo de UI aceita texto livre, o campo de banco correspondente deve
  guardar **exatamente o que foi digitado** (coluna texto), mesmo que também
  exista uma versão numérica derivada pra cálculo (ver `reps_label` vs `reps`
  em `workout_exercises` — o texto cru sempre visível, o número é só
  best-effort pra relatório).
- Nunca implementar "se não bater o formato X, guarda em outro campo" sem
  também garantir que reabrir pra editar restaura o valor original no campo
  original.

---

## 7. `position: fixed` / `sticky bottom-0` sem z-index, escondido atrás do BottomNav

**O padrão:** toda tela nova com CTA fixo no rodapé precisa lembrar de cravar
`z-index` manualmente pra ficar acima do `BottomNav` (`z-30`, fixo, mobile). É
fácil esquecer — e foi esquecido repetidamente.

**Onde já mordeu (8 arquivos, corrigidos em momentos diferentes antes da
correção sistêmica):** JudgePanel, Leaderboard, CompetitionManage,
CompetitionDetail, CompetitionCreate, PersonalWorkout, TeamCreate, TeamManage.

**Como evitar:**
- **Usar sempre `src/components/StickyFooter.tsx`** pra qualquer CTA fixo/sticky
  no rodapé de página. Nunca escrever `sticky bottom-0`/`fixed bottom-0` na mão
  de novo — o componente já nasce com z-index correto por construção.
- Se uma tela precisar de um comportamento que o componente não cobre (ex:
  `md:relative` no desktop, caso do `CompetitionCreate.tsx`), documentar o
  motivo de não usar o componente ali, não silenciosamente reimplementar do
  zero.

---

## 8. Erro engolido só no `console.error`, sem feedback na tela

**O padrão:** `catch (err) { console.error(err) }` sem atualizar nenhum estado
de UI — o usuário vê o botão "não fazer nada" e não tem como saber que algo
falhou, tornando bugs reais indistinguíveis de "talvez não seja bug".

**Onde já mordeu:** `PersonalWorkout.handleSave` — mascarou o bug de permissão
do item 5 por múltiplas sessões, porque o erro real (`Unauthorized`) nunca
chegava na tela.

**Como evitar:**
- Todo `try/catch` em volta de uma chamada RPC que o usuário disparou
  diretamente (clique de botão) precisa de um `setError(...)` correspondente
  exibido na UI. `console.error` sozinho não é tratamento de erro, é debug.

---

## 9. `CREATE OR REPLACE FUNCTION` com assinatura diferente não substitui — cria overload

**O padrão:** trocar os parâmetros de uma função Postgres (ex: adicionar/remover
um argumento) via `CREATE OR REPLACE FUNCTION` só substitui de verdade quando a
assinatura (tipos dos parâmetros) é idêntica. Se mudar, o Postgres cria uma
**segunda função** com o mesmo nome — a antiga continua existindo e sendo
chamável. Isso já causou dois problemas distintos: PostgREST fica ambíguo sobre
qual overload usar (a chamada do frontend falha ou resolve pra versão errada),
e a versão antiga pode ter lógica de permissão mais fraca e continuar acessível.

**Onde já mordeu:** `submit_competition_result` — trocar a assinatura sem
`DROP FUNCTION` da versão antiga deixou as duas coexistindo, quebrando a
resolução do RPC pelo PostgREST (`drop-old-submit-result-overload.sql`).

**Como evitar:**
- Toda vez que uma migration mudar os PARÂMETROS de uma função existente
  (não só o corpo), abrir com `DROP FUNCTION IF EXISTS nome(assinatura_antiga)`
  antes do `CREATE OR REPLACE` — nunca assumir que o replace vai limpar sozinho.
- Depois de aplicar, consultar `SELECT proname, pg_get_function_arguments(oid)
  FROM pg_proc WHERE proname = '...'` pra confirmar que só existe UMA versão
  (ou, se for overload intencional, que ambas têm o mesmo nível de segurança).

---

## 10. CORS aberto (`Access-Control-Allow-Origin: "*"`) em Edge Function

**O padrão:** Edge Functions novas frequentemente nascem com CORS wildcard
(copiado de exemplo/boilerplate), permitindo que QUALQUER site faça requisição
pro endpoint usando as credenciais do usuário logado no navegador dele.

**Onde já mordeu:** `generate-workout`, `suggest-workout` (`cf01bbb`).

**Como evitar:**
- Toda Edge Function nova: `Access-Control-Allow-Origin` deve apontar pro
  domínio real do app (`https://gounbroken.app`), nunca `*` — mesmo em
  endpoints que "parecem" não ter dado sensível.

---

## 11. Edge Function disparada por cron sem autenticação própria

**O padrão:** funções que só deveriam ser chamadas por um job agendado (pg_cron,
scheduler externo) ficam com endpoint público sem checar nenhum segredo — quem
descobrir a URL consegue disparar manualmente, inclusive em loop.

**Onde já mordeu:** `auto-transition-competitions` (`cf01bbb`) — não tinha
nenhuma checagem, qualquer requisição HTTP disparava a transição de status de
competições.

**Como evitar:**
- Toda Edge Function acionada por cron precisa validar um header de segredo
  compartilhado (`x-cron-secret` comparado contra `Deno.env.get('CRON_SECRET')`)
  antes de fazer qualquer coisa — endpoint HTTP público nunca é "só o cron vai
  chamar" por padrão.

---

## 12. IDOR — confiar em id/fk vindo do cliente sem checar relação com o caller

**O padrão:** uma RPC ou Edge Function recebe um id (de atleta, convite, time)
como parâmetro e usa ele diretamente numa query, sem verificar se o `auth.uid()`
que está chamando tem relação legítima com aquele id — qualquer usuário
autenticado consegue agir sobre/ler dado de qualquer outro só adivinhando ou
enumerando UUIDs.

**Onde já mordeu:**
- `suggest-workout`: `athlete_id` era aceito sem checar se o caller é o próprio
  atleta ou o `trainer_athletes` dele (`cf01bbb`) — qualquer personal conseguia
  gerar sugestão de IA pra atleta de outro coach.
- `accept_judge_invite`: aceitava convite por `p_invite_id` sem verificar se o
  `invited_user_id`/`invited_email` batia com o caller (`1f92e96`) — qualquer
  usuário logado podia aceitar QUALQUER convite de juiz adivinhando o UUID.

**Como evitar:**
- Toda RPC que recebe um id de outra entidade (não o próprio `auth.uid()`)
  precisa, antes de fazer qualquer leitura/escrita com ele, confirmar a relação:
  "esse id pertence ao caller?", "o caller tem role/vínculo que autoriza agir
  sobre esse id?". Ver o padrão já usado em `respond_team_invite` (checagem de
  `invited_email`/`user_id` contra `auth.uid()`) como referência do jeito certo.

---

## 13. Prompt injection — texto livre do usuário direto no prompt de IA

**O padrão:** campos de texto livre (comentário do aluno, parâmetros de
intensidade/foco) concatenados sem validação dentro do prompt mandado pra IA —
abre espaço pro usuário injetar instruções que a IA obedece como se fossem do
sistema.

**Onde já mordeu:** `suggest-workout` — `intensity`/`focus` sem whitelist
(`cf01bbb`), `student_comment` sem sanitização indo direto pro prompt
(`88be246`).

**Como evitar:**
- Parâmetros que deveriam ser um conjunto fechado de opções (enum) — validar
  contra uma whitelist explícita antes de usar, nunca aceitar string livre.
- Texto genuinamente livre (comentário, notas) que precisa entrar no prompt —
  sanitizar removendo caracteres fora de um allowlist (letras, números,
  pontuação básica) e truncar tamanho antes de interpolar.

---

## 14. Valor "parece seguro" interpolado sem validação própria em HTML/style

**O padrão:** uma função de escape genérica (`esc()`) cobre texto dentro de
tags, mas valores que vão em **atributos de estilo** (cor hex, por exemplo) não
passam pelo mesmo escape — e um valor malicioso ali quebra o atributo e injeta
HTML/CSS arbitrário.

**Onde já mordeu:** `storiesReport.ts` — `tierColor` interpolado direto em
`style="border: 2px solid ${d.tierColor}"` sem validar que era mesmo um hex
válido (`0d59c0d`).

**Como evitar:**
- Todo valor que vai para um atributo `style`/`href`/`src` (não texto de nó)
  precisa da própria validação de formato (regex de hex pra cor, allowlist de
  protocolo pra URL) — `esc()` de texto não cobre esse caso.

---

## 15. Parâmetro de RPC sem teto — scan caro / DoS

**O padrão:** parâmetros tipo `p_days`, `p_limit` que controlam quanto dado uma
query varre/retorna, sem `LEAST(...)` ou `CHECK` limitando o valor máximo —
qualquer caller pode pedir um intervalo/quantidade absurda e forçar um scan
caro.

**Onde já mordeu:** `get_athlete_recent_feedback(p_days)`,
`admin_get_ai_usage_recent(p_limit)` (`1b30085`).

**Como evitar:**
- Todo parâmetro numérico de RPC que afeta o tamanho da query (dias, limite,
  offset) — clampar com `LEAST(p_valor, teto_razoável)` logo no início da
  função, antes de qualquer uso.
- Mesma família de problema, manifestação diferente: tabela que só cresce
  (`login_attempts`, logs, tentativas) sem rotina de purge — crescimento
  ilimitado até virar problema de performance/custo. Toda tabela de
  registro de eventos de alta frequência precisa de um `pg_cron` de purge
  desde a criação, não como fix reativo (ver `fix_login_attempts_purge.sql`,
  purge horário de registros com mais de 24h).

---

## 16. `SECURITY DEFINER` retornando dado sensível sem escopar pro caller

**O padrão:** uma função `SECURITY DEFINER` (bypassa RLS por design) que
retorna um campo sensível (email, etc.) baseado num parâmetro de busca livre
(username) vira um oráculo de enumeração — qualquer autenticado consegue
descobrir o email de qualquer usuário só tentando usernames.

**Onde já mordeu:** `get_email_by_username` — removida inteiramente, substituída
por fluxo que não expõe o email (`8259107`).

**Como evitar:**
- Antes de criar uma função `SECURITY DEFINER` que retorna PII, perguntar: "o
  caller tem algum jeito de forçar esse retorno pra QUALQUER usuário, não só
  pra si mesmo?" Se sim, ou a função precisa escopar pelo `auth.uid()` do
  caller, ou o dado sensível não deveria ser retornado nesse formato (usar um
  fluxo indireto, como Edge Function que manda email sem revelar se existe).

---

## 17. Registro tipo convite sem expiração

**O padrão:** convites (time, juiz) ficam com status `pending`/`invited` pra
sempre se ninguém expirar — uma janela de aceite que nunca fecha é superfície
de ataque permanente (alguém pode aceitar um convite de meses atrás que já não
faz sentido).

**Onde já mordeu:** `competition_team_members` não tinha `expires_at`
(`0ce0a46`) — juiz já tinha (7 dias), time não.

**Como evitar:**
- Toda tabela de convite/solicitação pendente precisa de `expires_at` com
  default (7 dias é o padrão já usado no projeto) desde a criação da tabela —
  não como fix reativo depois.

---

## 18. Scroll horizontal com botões dentro não arrasta no iOS Safari

**O padrão:** uma faixa de chips/pills clicáveis dentro de um container de
scroll horizontal parece funcionar no desktop mas não arrasta por touch no
iOS Safari — precisou de 4 tentativas em commits separados até fechar de vez
(`4c3bcd8` → `4c43b83` → `dbae911` → `7265ebe`).

**A combinação que funciona, todas juntas:**
- `overflowX: 'scroll'` no container — **não** `overflow-x-auto`/`overflow: hidden`
  (iOS trata `scroll` e `auto` de forma diferente pra iniciar o gesto de arrastar).
- `WebkitOverflowScrolling: 'touch'` pro momentum scroll nativo.
- `touchAction: 'pan-x'` **tanto no container quanto em cada botão filho** — só
  no container não basta, o botão intercepta o toque primeiro.
- `scrollbarWidth: 'none'`, `msOverflowStyle: 'none'` pra esconder a barra sem
  quebrar o scroll.

**Como evitar:**
- Qualquer faixa horizontal nova de chips/pills clicáveis: aplicar essa
  combinação completa desde o primeiro commit, não descobrir peça por peça
  testando em device real depois.

---

## 19. Nome de parâmetro do `supabase.rpc()` diverge da assinatura da função

**O padrão:** o frontend chama `supabase.rpc('minha_funcao', { p_algo: valor })`
com um nome de parâmetro que não bate com o nome real na assinatura SQL da
função (`p_algo` no client vs `p_outro_nome` na função). PostgREST resolve
RPCs por assinatura nomeada — se nenhum overload bate com o conjunto exato de
nomes de parâmetro enviados, a chamada falha com `Could not find the function
public.minha_funcao(...) in the schema cache`, mesmo que uma função com esse
nome exista e o número/tipo de argumentos esteja certo.

**Por que se repete:** o TypeScript não valida o payload de `supabase.rpc()`
contra a assinatura real do Postgres — é só um objeto solto. Um rename de
parâmetro na função SQL (ou um typo no client escrito de cabeça, sem copiar
do `CREATE FUNCTION`) não gera erro de compilação nem quebra em `tsc`; só
aparece em runtime, quando o usuário aciona aquele fluxo específico.

**Onde já mordeu:** `override_competition_result` — a função usa
`p_score_numeric`, o client chamava com `p_value`. Toda correção de
resultado em `CompetitionManage.tsx` falhava com erro de schema cache,
sem nenhum aviso em tempo de build.

**Como evitar:**
- Ao escrever ou revisar uma chamada `supabase.rpc(nome, params)`, abrir o
  `CREATE OR REPLACE FUNCTION` correspondente e conferir os nomes de
  parâmetro um a um — não confiar em memória do nome usado em outra RPC
  parecida.
- Se o erro for exatamente "Could not find the function ... in the schema
  cache", checar primeiro divergência de nome de parâmetro antes de suspeitar
  de cache do PostgREST desatualizado (que é bem mais raro na prática).

---

## Processo — antes de considerar um fix "pronto"

1. `grep -rn` pelo campo/valor antigo no repo INTEIRO, não só nos arquivos que
   motivaram a mudança.
2. Se a mudança envolve uma RPC nova ou alterada, **chamar ela de verdade** pelo
   fluxo do app (não só validar que `db-push.sh` rodou sem erro de sintaxe).
3. Se existe um mapa/valor derivado já usado em outro lugar do código (ex:
   `FORMAT_SIZE`), reusar — não reimplementar o mesmo `CASE`/lookup de novo.
4. Se a mudança é "substituir X por Y", checar se está em uma transação só, não
   em múltiplas chamadas client-side em sequência.
5. Todo erro de RPC disparado por ação do usuário precisa de feedback visível,
   nunca só `console.error`.
6. Se a migration mudou a ASSINATURA (parâmetros) de uma função existente,
   confirmar com `SELECT proname, pg_get_function_arguments(oid) FROM pg_proc
   WHERE proname = '...'` que só sobrou uma versão — `CREATE OR REPLACE` não
   apaga overload de assinatura diferente sozinho.
7. Se criou/editou Edge Function: CORS aponta pro domínio real (nunca `*`)? Se
   é disparada por cron, tem checagem de segredo? Se recebe um id de outra
   entidade (athlete_id, invite_id), verifica que o caller tem relação
   legítima com esse id antes de usar?
8. Se algum valor do usuário (texto livre ou "parece controlado" como cor/hex)
   vai para um prompt de IA ou um atributo HTML/style — tem validação/allowlist
   própria, não só o escape de texto genérico?
9. Todo parâmetro numérico de RPC que controla tamanho de scan (dias, limite,
   offset) está clampado com `LEAST(...)`? Toda tabela de log/tentativa de alta
   frequência tem rotina de purge?
