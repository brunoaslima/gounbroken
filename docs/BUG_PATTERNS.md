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
