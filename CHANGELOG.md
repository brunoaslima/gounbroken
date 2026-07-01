# Changelog — Go Unbroken

Todas as mudanças relevantes que vão para produção são documentadas aqui.
Formato de entrada: `Capability → Feature: descrição`
Formato de versão: `## [versão] — AAAA-MM-DD`

---

## [1.2.0] — 2026-07-01

### Competition → Live Leaderboard

- Competition → Leaderboard: rank movement arrows beside team name — lime up / red down, visible for 30s with fade-out on the last 8s
- Competition → Leaderboard: movement baseline persists in sessionStorage (10 min), so arrows appear even when navigating to the leaderboard after submitting a score
- Competition → Leaderboard: rows slide smoothly to their new position on reorder (FLIP animation)
- Competition → Leaderboard: WOD cells show raw result (time/reps/kg) as primary value with podium-colored points tag beside it
- Competition → Leaderboard: TB (tiebreak) tag moved from rank column to beside team name — rank column no longer stretches
- Competition → Leaderboard: crown redesigned as stroke outline icon
- Competition → Leaderboard: auto-refresh interval 60s → 30s
- Competition → Leaderboard: RPC errors shown in the UI instead of a generic empty state

### Platform → Layout (z-index stacking fix)

- Platform → Layout: full-screen pages (JudgePanel, Leaderboard, CompetitionManage, CompetitionDetail) raised above BottomNav — judge CONFIRMAR bar and leaderboard ticker no longer hidden on mobile
- Platform → Layout: fixed bottom CTAs in CompetitionCreate and PersonalWorkout gained explicit z-index
- Platform → Layout: standardized scale — content < BottomNav (30) < full-screen pages/CTAs (50) < modals (90) < timer (100) < toast (300)

### Tools → Timer

- Tools → Timer: done screen shows centered BACK + NEW TIMER buttons side by side

---

## [1.1.0] — 2026-07-01

### Tools → CrossFit Timer

- Tools → Timer: 6 modes — For Time, AMRAP, EMOM, Tabata, Interval, Stopwatch
- Tools → Timer: fullscreen display with 3-2-1 countdown, phase colors, last-10s pulse animation
- Tools → Timer: Web Audio beeps for countdown, phase transitions, and finish
- Tools → Timer: Wake Lock API keeps screen on during active timer
- Tools → Timer: vibration feedback on finish
- Tools → Timer: AMRAP round counter with tap-to-count + ROUND button
- Tools → Timer: editable time fields with +15s/+30s/+1m/+5m quick increments
- Tools → Timer: accessible from Profile → Calculators section

---

## [1.0.0] — 2026-07-01

### Competition → Judge Panel & Leaderboard polish

- Competition → JudgePanel: structured score inputs (MIN/SEC/REPS/KG/ROUNDS) matching the Results tab format
- Competition → JudgePanel: confirm button always visible via `position: fixed` bottom — no longer hidden behind keyboard or tall content
- Competition → JudgePanel: division filter pills with horizontal scroll, matching leaderboard
- Competition → JudgePanel: teams sorted alphabetically; division label shown instead of box name for both pending and submitted teams
- Competition → JudgePanel: live cap validation error shown inline (e.g. time exceeds 08:00 cap)
- Competition → JudgePanel: score inputs allow clearing to zero (empty field instead of stuck at 0)
- Competition → Leaderboard: WOD cells show points as primary value; top-3 positions highlighted with gold/silver/bronze badge
- Competition → Leaderboard: BOX column removed
- Competition → Leaderboard: teams without a result show `—` instead of DNS
- Competition → Leaderboard: live scoreboard — submitted results appear immediately without requiring publish

### Platform → Layout & Scroll fixes

- Platform → Layout: `TabLayout` bounded to `h-dvh overflow-hidden` on all breakpoints — eliminates document-level scroll on mobile
- Platform → Layout: full-screen pages (`JudgePanel`, `Leaderboard`, `CompetitionManage`, `CompetitionDetail`) use `position: fixed; inset: 0` to escape the layout wrapper and manage their own scroll
- Platform → Layout: resolves all cases where last list item was cut off or confirm button was unreachable on mobile

---

## [0.9.9] — 2026-07-01

### Competition → Scoring

- Competition → Leaderboard: leaderboard now works as a live scoreboard — results appear as soon as submitted, without requiring head judge to publish each result
- Competition → Scoring: dynamic N-position scoring per division — 1st place earns N pts (N = approved teams in the division), last earns 1 pt
- Competition → Results: results table in CompetitionManage shows per-division rank and points
- Competition → Results: `get_competition_results` SECURITY DEFINER RPC bypasses RLS for judge/admin fetches

### Competition → Divisions

- Competition → Divisions: new `competition_divisions` table (format × composition × category) with RLS — organizer can create/delete, everyone can read
- Competition → Divisions: `competition_teams` gains `division_id` FK — teams register into a specific division
- Competition → Create: organizer can add divisions (format/composition/category toggles + custom category field) during competition creation
- Competition → Register: `TeamCreate` shows division picker cards when competition has divisions
- Competition → Mixed: `respond_team_invite` validates Mixed division gender composition on accept — only `male`/`female` allowed, generic error to prevent gender inference
- Competition → Leaderboard: division filter pills added (visible when 2+ divisions); ranking is relative to the selected division via updated `get_competition_leaderboard(p_competition_id, p_division_id?)`
- Competition → TeamManage: division badge displayed in team hero section
- Profile → Gender: Male/Female toggle added to ProfilePanel edit mode, saved to `profiles.gender`

---

## [0.9.8] — 2026-06-30

### Platform → Full English localization

- Platform → i18n: All user-visible strings translated from Portuguese to English across the entire app — no i18n library, direct string replacement
- Platform → i18n: UI pages translated: Admin, Personal, PersonalAthlete, PersonalWorkout, MyWorkouts, MovementDetail, Stats, Profile, Onboarding, Buildup, Invite, InviteInbox, JudgePanel, CompetitionDetail, CompetitionManage, CompetitionCreate, CompetitionPublic, TeamManage, TeamCreate, Leaderboard
- Platform → i18n: Components translated: WorkoutCard, MovementPicker, BuildupSheet, WorkoutImportSheet, ProfilePanel, SideNav
- Platform → i18n: Lib modules translated: workoutDisplay (SETS/REST/INTERVAL/day names), strengthLevel (level/category/confidence labels, guidance strings), strengthStandards (tier labels), movementSuggestions (all muscle/mobility/variation/programming content), prReport (PR poster HTML), storiesReport (stories HTML), buildupUtils (warning messages)
- Platform → i18n: Auth: useAuth error messages translated (invalid credentials, user creation failure)
- Platform → i18n: WrappedReport and AthleteReport fully translated (322 + 17 strings)
- Platform → Routing: All athlete routes moved under `/athlete/` prefix (done in prior session)

---

## [0.9.7] — 2026-06-29

### Competition → Link público do leaderboard

- Competition → Leaderboard: rota pública `/competition/:slug` adicionada — sem auth, qualquer pessoa com o link acessa o leaderboard ao vivo
- Competition → Leaderboard: slug gerado server-side na RPC `create_competition` via `gen_random_bytes` (6 chars hex, único garantido com retry loop)
- Competition → Leaderboard: competições existentes receberam slug automático via backfill na migration
- Competition → Compartilhar: links atualizados de `/c/` para `/competition/` em `CompetitionDetail` e `TeamManage`

---

## [0.9.5] — 2026-06-29

### Infra → Domínio próprio

- Infra → Domínio: app migrado de `cf-scores.vercel.app` para `gounbroken.app`
- Infra → Links públicos: URLs de convite de equipe e slug de competição atualizados de `cfscores.app` para `gounbroken.app`
- Infra → Supabase: Site URL e Redirect URLs atualizados para `https://gounbroken.app`

### SEO → Indexação básica

- SEO → `index.html`: `<title>` descritivo, `<meta description>`, tags Open Graph e Twitter Card
- SEO → `robots.txt`: criado com `Allow: *` e referência ao sitemap
- SEO → `sitemap.xml`: criado com páginas públicas (raiz e /competitions)

---

## [0.9.4] — 2026-06-29

### Competition → Leaderboard e resultados

- Competition → CompetitionDetail: botão "VER LEADERBOARD" agora só aparece quando a competição está `in_progress`
- Competition → CompetitionDetail: seção "RESULTADO FINAL" exibida inline quando competição está `finished` — tabela com rank, medalhas (ouro/prata/bronze), posição por WOD e total de pontos; colunas `#` e `EQUIPE` fixas no scroll horizontal
- Competition → CompetitionDetail: WODs em `submitted` ou `draft` são ocultados (grey out) — exibem "WOD N" em vez do nome real, sem score type, cap ou clique — informação protegida até publicação
- Competition → Leaderboard: mobile já suportado — scroll horizontal com sticky columns, coluna BOX oculta em telas pequenas, touch-scroll nativo

### Competition → Edição inline de WOD

- Competition → CompetitionManage: WODs agora editáveis diretamente no painel — nome, descrição, tipo de score, cap e status; disponível em qualquer estado do WOD
- Competition → CompetitionManage: ação "ENCERRAR COMPETIÇÃO" agora exige confirmação inline antes de executar
- Competition → CompetitionManage: ação "DESPUBLICAR" de WOD agora exige confirmação inline
- DB → RPC `update_competition_wod(wod_id, name, description, score_type, score_order, cap)`: nova função SECURITY DEFINER restrita a head_judge e admin, valida score_type/score_order, grava audit log

### UX → Confirmações em ações destrutivas

- PersonalAthlete → Treinos: apagar workout agora exige confirmação em bottom sheet antes de executar
- TeamManage → Equipe: cancelar convite agora exige confirmação inline (SIM/NÃO) antes de executar

### Bugfix → JudgePanel

- Competition → JudgePanel: scores de tempo agora armazenados como segundos positivos (era negativo, causando ranking invertido no leaderboard para WODs `for time`)

### Segurança

- DB → RLS: policy `UPDATE` em `profiles` ganhou cláusula `WITH CHECK (auth.uid() = user_id)` — impedia que usuário alterasse o próprio `user_id` para outro (profile hijacking)
- DB → RLS: policy duplicada em `weight_history` sem `WITH CHECK` removida
- DB → RLS: policy `prescribed_workouts` ganhou `WITH CHECK (trainer_id = auth.uid())` — impedia injeção de `trainer_id` falso
- DB → 10 funções `SECURITY DEFINER` sem `SET search_path = public` corrigidas via `ALTER FUNCTION` (sem recriar): `admin_delete_workout`, `admin_toggle_user_active`, `admin_toggle_user_role`, `admin_update_user_role`, `ai_save_workout`, `get_athlete_recent_feedback`, `get_email_by_username`, `get_my_prescribed_workouts`, `get_my_prs`, `save_workout_feedback`

### QA

- QA → `qa_test@gounbroken.test`: 71 PRs inseridos em 22 movimentos (Back Squat, Deadlift, Snatch, Clean & Jerk, etc.) com progressão temporal realista out/2025–jun/2026
- QA → `qa_test`: histórico de peso (6 meses), perfil completo (`intermediate`, 4x/semana, performance, crossfit+weightlifting)

---

### Compliance → Aceite de Termos

- Compliance → Termos: adicionada tela de aceite de Termos de Uso e Política de Privacidade (`/terms`) com scroll obrigatório até o fim antes de destravarem o checkbox e o botão
- Compliance → Termos: gate inserido em `RequireAuth` (terms antes de onboarding) — usuários sem aceite da versão atual são redirecionados para `/terms`
- Compliance → Termos: colunas `terms_accepted_at` e `terms_version` adicionadas em `profiles` com CHECK constraint restrito às versões válidas
- Compliance → Termos: texto internacionalizado (sem referências ao Brasil/CPF) — cobre GDPR, LGPD, CCPA e legislações similares

### PRs & Insights → Nível de Força

- PRs & Insights → Nível de Força: corrigido bug crítico onde movimentos com nomes sem qualificadores (ex: "Shoulder Press") não eram contabilizados na categoria correta por usar exact-match em vez de normalização — agora usa `normalizeMovement` + `MOVEMENT_MAP` + `BASE_TO_CATEGORY`
- PRs & Insights → Nível de Força: Thruster reclassificado de "Força Acessória" para "Força de Ombros" (taxonomia CrossFit correta)
- PRs & Insights → Nível de Força: Overhead Squat reclassificado de "Força de Agachamento" para "Levantamento Olímpico"
- QA → Testes unitários: 3 testes de regressão adicionados cobrindo os bugs de normalização de nome
- QA → Infra: `normalizeMovement` e `MOVEMENT_MAP` exportados de `strengthStandards.ts` para reuso externo

### Competition → Resultados por WOD

- Competition → WOD detail: clicar num WOD `published` abre bottom sheet com classificação das equipes (posição, nome, box, resultado)
- Competition → WOD detail: top 3 em destaque lime, 1º lugar com fundo e nome em #D4FF3A
- Competition → WOD detail: se nenhum resultado publicado ainda, exibe mensagem "SEM RESULTADOS PUBLICADOS"
- Competition → WODs não publicados (`draft`, `submitted`) mostram label contextual e não são clicáveis
- DB → RPC `get_wod_ranking(wod_id)`: retorna ranking de um WOD com nomes de equipes (SECURITY DEFINER, bypassa RLS)

### Competition → Leaderboard ao vivo

- Competition → Leaderboard: página implementada (era stub "EM BREVE") com tabela brutalist de equipes, strip de WODs, LIVE badge e countdown de 60s
- Competition → Scoring: substituída escala CF Games (array fixo 100-95-92…) por N-down-to-1 dinâmico — 1º lugar recebe N pts, último recebe 1 pt, onde N = total de equipes aprovadas
- Competition → Seed: competição "GO UNBROKEN Open 2025" criada com 15 equipes aprovadas, 5 WODs publicados e 75 resultados para testes (Team Alpha 1º com 70 pts)

---

## [0.9.3] — 2026-06-28

### PRs & Insights → Celebração de novo PR

- PRs → AddScore: ao bater um PR, app navega direto para MovementDetail com bottom sheet de celebração — sem toast, sem passo extra
- PRs → Celebração: número do novo recorde em 52 px lime, nome do movimento, badge de RM; botões "Compartilhar" (abre share sheet) e "Fechar"
- PRs → Compartilhar Stories: elementos escalados para formato real de Instagram Stories — número hero 260 px (era 168 px), movimento 104 px, KG 68 px, gráfico 340 px de altura

### UX → Toasts removidos

- App: removidos todos os toast notifications (success/error/info) de toda a aplicação — sem mais pop-ups de feedback visual

---

## [0.9.2] — 2026-06-28

### PRs & Insights → Compartilhar PR individual (Stories)

- PRs → MovementDetail: botão "Compartilhar" ao lado do Build-up — gera PNG 1080×1920 e abre share sheet nativo via Web Share API; no desktop faz download do PNG
- PRs → Stories: número gigante 168 px em lime, nome do movimento em 68 px, badge de RM, gráfico de progressão, escada de outros RMs, badge de tier

---

## [0.9.1] — 2026-06-28

### PRs & Insights → Pôster de PRs (redesign)

- PRs → PDF: substituído jsPDF por pôster hi-fi 1080×1488 px via `window.print()` — texto selecionável, fontes corretas (Space Grotesk + JetBrains Mono), zero novas dependências
- PRs → PDF: hero card com fundo lime para o recorde de maior score (Back Squat, Deadlift etc.); número gigante 118 px, badge de tier/percentil quando há padrão de força disponível
- PRs → PDF: gráfico de progressão histórica (SVG polyline) no card hero, exibido quando há ≥ 2 registros de 1RM
- PRs → PDF: regra de RM — quando o movimento tem apenas um tipo de RM disponível, exibe o badge inline; quando tem múltiplos, o menor (1RM > 2RM > …) é o destaque principal e os demais aparecem na escada (hero) ou linha "Também" (lista)
- PRs → PDF: badge de rep-max — 1RM em outline (#A8A8A4), principal ≠ 1RM em filled (#1F1F1F)
- PRs → PDF: lista "Outros Recordes" com até 5 movimentos adicionais, cor do índice reflete o tier
- PRs → PDF: escala de força com 6 segmentos de tier e anotação "você → <tier>"
- PRs → PDF: registration corners, régua vertical tracejada, rodapé "REP · BY · REP"

---

## [0.9.0] — 2026-06-26

### PRs & Insights → Exportar PDF

- PRs → Perfil: novo botão "Exportar PRs" na seção Calculadoras, ao lado do Build-up — mesmo padrão visual (barra lime + título + subtítulo)
- PRs → PDF: gerado client-side via jsPDF (dynamic import — chunk separado, não impacta bundle inicial do PWA)
- PRs → PDF: fundo #0A0A0A, header com "RELATÓRIO DE PRs" em lime, nome do atleta e data de geração
- PRs → PDF: lista todos os movimentos com PR em ordem alfabética; se um movimento tem múltiplos RMs (1RM, 3RM, 5RM…), todos aparecem em linhas separadas
- PRs → PDF: paginação automática para volumes grandes de movimentos

### Competition → CompetitionManage: aba persistida na URL

- Competition → CompetitionManage: aba ativa agora é persistida via query param `?tab=JUDGES` (e demais tabs) — refresh na página mantém a aba correta em vez de voltar para "VISÃO GERAL"

---

## [0.8.9] — 2026-06-15

### Competition → Experiência do Judge pós-aceite

- Competition → JudgePanel: WOD selecionado agora exibe a descrição completa do WOD abaixo do nome e score type — judge consegue ler o WOD antes de registrar resultados
- Competition → InviteInbox: cards de judge invite aceito no histórico exibem botão "IR PARA O PAINEL" que navega diretamente para `/competitions/:id/judge`

---

## [0.8.8] — 2026-06-15

### Competition → Caixa de Convites

- Competition → Perfil: novo acesso "Caixa de Convites" no perfil do usuário — navega para `/invites`
- Competition → InviteInbox: página centralizada com todos os convites recebidos (judge + equipe), ordenados por data
- Competition → InviteInbox: seção `PENDENTE` com cards ACEITAR / RECUSAR inline para cada convite
- Competition → InviteInbox: seção `HISTÓRICO` com convites aceitos/recusados anteriores e pill de status final
- Competition → InviteInbox: hero com contador "X NOTIFICAÇÕES · Y PENDENTE" e texto em destaque quando há convites pendentes
- Competition → DB: nova RPC `get_my_invites()` (SECURITY DEFINER) — retorna UNION de judge invites + team invites do usuário logado com join em competitions/competition_teams, ordenados por `created_at DESC`

### Competition → Bugfixes de RLS e contagem

- Competition → useCompetition: captain path agora usa `get_team_members` RPC (SECURITY DEFINER) em vez de query direta — resolve 0/4 na seção "MINHA EQUIPE"
- Competition → useCompetition: member path também usa `get_my_team_in_competition` RPC para buscar o time — bypassa RLS circular entre `competition_teams` ↔ `competition_team_members`
- Competition → get_team_members / get_competition_team_members: excluem membros com `status = 'removed'` e `'rejected'` — resolve contagem inflada (ex.: 10/4 por histórico de convites cancelados)
- Competition → CompetitionManage: membros de equipes agora carregados via `get_competition_team_members` RPC — head judge consegue ver atletas de equipes onde não é capitão/membro
- Competition → DB: nova RPC `get_competition_team_members(p_competition_id)` (SECURITY DEFINER) — retorna todos os membros ativos de todas as equipes de uma competição

### Competition → Aprovação de equipe

- Competition → manage_team: aprovação bloqueada se algum membro ainda tiver convite com `status = 'invited'` — banco retorna erro descritivo com contagem de pendentes
- Competition → CompetitionManage: botão APROVAR desabilitado visualmente quando há convites pendentes; aviso "X CONVITE(S) PENDENTE(S)" aparece na coluna de ações
- Competition → CompetitionManage: linhas de equipe na tab EQUIPES são clicáveis — expandem sub-linha com lista de atletas (nome, @username, status, indicador CAPITAO)

### Competition → MINHA EQUIPE para membros aceitos

- Competition → useCompetition: atletas que aceitaram convite de equipe agora veem seção "MINHA EQUIPE" no CompetitionDetail — antes só aparecia para o capitão
- Competition → DB: nova RPC `get_my_team_in_competition(p_competition_id)` (SECURITY DEFINER) — retorna dados da equipe do usuário logado sem depender do RLS circular
- Competition → DB: nova RPC `get_my_team_invite(p_competition_id)` (SECURITY DEFINER) — detecta convite pendente do usuário sem depender de `teamsData` (fix para atletas sem equipe aprovada)

---

## [0.8.7] — 2026-06-14

### Competition → Aceitar convite de equipe

- Competition → CompetitionDetail: banner "CONVITE · EQUIPE" aparece para o atleta convidado logo após o hero da competição — mostra o nome da equipe com botões ACEITAR / RECUSAR
- Competition → useCompetition: detecta `pendingTeamInvite` (convite com status='invited' para o usuário logado nesta competição) e retorna junto com os outros dados do hook
- Aceitar chama `respond_team_invite(p_member_id, p_accept: true)` → banner some, seção "MINHA EQUIPE" aparece automaticamente
- Recusar chama `respond_team_invite(p_member_id, p_accept: false)` → banner some, atleta pode criar equipe própria se inscrições ainda abertas

---

## [0.8.6] — 2026-06-14

### Bugfix — Nomes dos atletas convidados não apareciam

- Competition → TeamManage: nomes dos atletas convidados agora aparecem corretamente após refresh — a query `.from('profiles')` era bloqueada pelo RLS da tabela; substituída por `get_profiles_public` (RPC SECURITY DEFINER existente, que bypassa RLS)
- Competition → TeamManage: fluxo de `onInvited` simplificado — removido optimistic update complexo com race condition; agora chama `load()` diretamente após convite (DB round-trip ~200ms)
- Competition → TeamManage: removida `silentReloadMembers` que podia sobrescrever estado com dados parciais; `handleCancelInvite` também usa `load()` agora
- DB → `fix_invite_flow_final.sql`: `get_team_members` atualizado para nunca retornar ghost members (user_id=NULL sem email); DELETE agressivo remove todos os ghosts independente de status

---

## [0.8.5] — 2026-06-14

### Bugfix — Fluxo de convite e cancelamento

- Competition → TeamManage: convidado aparece imediatamente na lista após o invite (update otimista) sem precisar recarregar a página; background silent reload confirma o estado do DB
- Competition → TeamManage: botão X aparece nos slots "CONVIDADO" para o capitão cancelar convites pendentes — chama `cancel_team_invite` e remove o membro da lista localmente
- Competition → InviteSheet: autoconvite corrigido — `search_athletes_for_invite` agora exclui o próprio usuário dos resultados de busca
- DB → Migration `cancel_team_invite.sql`: nova RPC `cancel_team_invite(p_member_id UUID)` — só capitão pode cancelar, só funciona em convites com `status='invited'`, marca como `'removed'` (histórico preservado) — aplicar no Supabase dashboard

---

## [0.8.4] — 2026-06-12

### Bugfix — Convite de atletas
- Competition → TeamManage: corrigido RPC de aceitar/recusar convite — era `accept_team_invite`/`decline_team_invite` (inexistentes), agora chama `respond_team_invite(p_member_id, p_accept)` corretamente
- Competition → TeamManage: busca de atletas agora passa `team_id` para excluir membros já presentes na equipe
- DB → `fix_search_athletes_for_invite.sql`: `search_athletes_for_invite` atualizada — exclui o próprio capitão dos resultados e exclui atletas já na equipe (apenas se o caller for capitão dessa equipe, prevenindo enumeração)

---

## [0.8.3] — 2026-06-12

### Bugfix — Inscrição de equipe
- Competition → TeamCreate: removida menção redundante a "capitão" da info box; botão renomeado de "CRIAR E CONVIDAR ATLETAS" para "CRIAR EQUIPE"
- Competition → TeamManage: capitão agora sempre aparece preenchido no slot 1 após criação — se o registro não vier da query (versão antiga da função no DB), é sintetizado a partir de `team.captain_user_id`
- Competition → TeamManage: fetch de profiles agora inclui o capitão mesmo que ele não esteja em `members`
- DB → Migration `fix_create_competition_team_captain.sql`: recria `create_competition_team` garantindo que o capitão é inserido como membro em `competition_team_members` (aplicar no Supabase dashboard)

---

## [0.8.2] — 2026-06-12

### Competições
- Competition → Gerenciar: status `cancelled` adicionado — head judge pode cancelar competição a partir de qualquer estado ativo com confirmação inline
- Competition → Gerenciar: transições de status simplificadas — apenas `draft → open` e `in_progress → finished` são manuais; `open → closed` e `closed → in_progress` são automáticas por data
- Competition → Gerenciar: chips informativos mostram "INSCRIÇÕES FECHAM EM" (estado open) e "EVENTO COMEÇA EM" (estado closed) em vez de botões quando a transição é automática
- Competition → Gerenciar: labels criativas nos pills de status (RASCUNHO, INSCRIÇÕES ABERTAS, LISTA FECHADA, AO VIVO, ENCERRADA, CANCELADA)
- DB → Constraint: `competitions.status` agora aceita `'cancelled'`
- DB → RPC `update_competition_status`: atualizada para aceitar `'cancelled'`
- DB → Função `auto_transition_competition_statuses()`: nova SECURITY DEFINER (service_role only) que faz `open→closed` quando `registration_deadline < now()` e `closed→in_progress` quando `start_date <= CURRENT_DATE`
- Infra → Edge Function `auto-transition-competitions`: nova function Deno que chama `auto_transition_competition_statuses()` via service_role — agendar com cron `0 * * * *` no dashboard

### Testes
- QA → E2E Playwright: infraestrutura de testes para o módulo de competição (`tests/helpers/seed.ts`, `tests/helpers/auth.ts`, `tests/competition.spec.ts`)
- QA → E2E: seed/cleanup com service_role (bypassa RLS) + 6 cenários: lista, painel de gestão, publicar inscrições, criar WOD, verificar status, cancelar com confirmação
- QA → Playwright config: carrega `.env.test.local` automaticamente (template em `.env.test.local.example`)

---

## [0.8.1] — 2026-06-06

### Competições
- Competition → Painel de Juiz: rebuilt completo — WOD chips no topo, clicar no WOD exibe lista de times diretamente (sem tabs), times pendentes com botão REGISTRAR, times submetidos com pill SUBMETIDO e score exibido
- Competition → Painel de Juiz: formulário de score com input grande (56px lime), validação por tipo (MM:SS para time, inteiro para reps, decimal para weight, rounds+reps), campo de observações e botão CONFIRMAR
- Competition → Gerenciar: botão CANCELAR de equipe aprovada agora exige confirmação inline ("CONFIRMAR CANCELAMENTO? / SIM, CANCELAR / VOLTAR") antes de executar
- Competition → Gerenciar: botão PUBLICAR de WOD agora chama `update_wod_status` (muda status do WOD para published) em vez de `publish_wod_results`
- DB → RPC `update_wod_status(wod_id, status)`: nova função SECURITY DEFINER que altera o status de um WOD individual (draft/submitted/published), restrita a head_judge e admin, grava audit log

---

## [0.8.0] — 2026-05-20

### Competições (novo módulo)
- Competition → Lista: página pública de competições com status, datas e link para leaderboard
- Competition → Detalhe: página pública com informações, WODs publicados e CTA de inscrição
- Competition → Criar: formulário restrito a admin para criar nova competição
- Competition → Gerenciar: painel tabbed (Overview, WODs, Equipes, Resultados) para head judge e admin
- Competition → Times: criação de time via RPC `create_competition_team`, convite de membros por e-mail, aceitar/recusar convites
- Competition → Painel de Juiz: seleção de WOD + registro de resultados por time (RPC `submit_competition_result`)
- Competition → Leaderboard: ranking acumulado por pontos (posição por WOD), polling automático de 60 segundos
- DB → 8 tabelas com RLS: `competitions`, `competition_wods`, `competition_teams`, `competition_team_members`, `competition_roles`, `competition_judge_invites`, `competition_results`, `competition_result_audit_log`
- DB → 12 RPCs `SECURITY DEFINER`: criação de time, convites, aprovações, pagamentos, submissão/publicação de resultados, leaderboard
- DB → Score types: time (MM:SS), reps, weight, rounds+reps — ranking ASC para tempo, DESC para os demais
- DB → Audit log automático em overrides e publicações de resultado
- Nav → Competições adicionado ao SideNav (desktop) e BottomNav (mobile, substituindo Stats)

---

## [0.7.5] — 2026-05-20

### Segurança
- Auth → Login: brute force protection — máx 10 tentativas por username e 20 por IP em janela de 15 min (tabela `login_attempts`)
- AI → `suggest-workout`: defesa contra prompt injection em `coach_notes` — blocklist de padrões PT/EN + normalização de leetspeak + cap de 500 chars
- AI → `suggest-workout` e `generate-workout`: erros internos (500) não expõem mais stack traces ou detalhes de infraestrutura ao cliente
- AI → `generate-workout`: validação do array `days` — máximo 7 datas únicas no formato YYYY-MM-DD
- DB → `save_workout_feedback`: defesa contra prompt injection em `student_comment` + cap de 300 chars via helper `is_safe_text`
- DB → 4 funções `SECURITY DEFINER` sem `SET search_path`: corrigidas (`admin_get_ai_usage_stats`, `admin_get_ai_usage_recent`, `admin_get_ai_usage_by_user`, `personal_set_workout_student_note`)
- DB → `ai_usage_log.sql`: migration corrigida para não recriar policy INSERT aberta em re-execuções
- Analytics → PostHog: email removido do `phIdentify` (compliance LGPD)

---

## [0.7.4] — 2026-05-20

### Segurança
- Infra → `ai_usage_log`: política INSERT aberta (`WITH CHECK(true)`) removida — apenas service_role (Edge Functions) pode inserir
- Personal → `get_athlete_recent_feedback`: adicionado guard de autorização — apenas o próprio atleta, seu treinador ou admin/personal pode consultar
- Personal → `save_workout_feedback`: adicionada validação de posse — verifica que o workout pertence ao atleta antes de salvar feedback (previne IDOR)
- AI → Edge Functions `suggest-workout` e `generate-workout`: role check obrigatório (apenas personal/admin/ai) + rate limiting server-side (20/dia e 3/semana)
- Router → rotas `/admin`, `/personal*`, `/report*`, `/wrapped*`: proteção por `RequireRole` no frontend, redireciona para `/` se sem permissão

---

## [0.7.3] — 2026-05-20

### Segurança
- Auth → Login por username: email do usuário agora resolvido server-side via Edge Function `login-by-username` — nunca exposto ao cliente
- Auth → Signup: check de username disponível substituído por `is_username_taken` (retorna boolean) — `get_email_by_username` revogado de anon e authenticated

---

## [0.7.2] — 2026-05-19

### Adicionado
- Training → BuildUp: bloco "Anilhas a pegar" exibido acima dos sets — mostra o total de anilhas únicas necessárias ao longo de todo o buildup (pico máximo por tipo, ambos os lados), sem contar duas vezes anilhas que persistem entre sets
- Training → BuildUp: mesma lógica aplicada ao BuildupSheet (sheet de movimento)

### Alterado
- PRs e Insights → Acesso restrito: botão "Relatório" em Treinos, botões "Ver relatório mensal" e "Ver Wrapped" em Personal/Atleta, e botão "WRAPPED" no relatório agora visíveis somente para usuários com role `ai`

---

## [0.7.1] — 2026-05-18

### Adicionado
- Training → Relatório Mensal: nova página `/report` para o aluno ver seu relatório do mês
- Personal → Relatório do Aluno: coach pode acessar o relatório mensal de qualquer aluno via `/report/:athleteId`
- Relatório inclui: capa magazine, consistência (feito/parcial/não fez), mapa corporal por intensidade (frente+costas), distribuição de foco, calendário mensal, PRs e breakdown de percepção de esforço
- MyWorkouts: botão "Relatório" no topo leva ao relatório mensal do aluno
- PersonalAthlete: botão "Ver relatório mensal" na ficha do aluno

---

## [0.7.0] — 2026-05-15

### Melhorado
- Personal → Sugerir treino: modal completamente redesenhado com seletor de modo segmentado (Treino completo / Etapa única)
- Personal → Sugerir treino: "Etapa única" agora funcional — gera uma única seção (Strength, WOD, Mobility etc.) e adiciona ao treino sem substituir as etapas existentes
- Personal → Sugerir treino: adicionada duração de 30 minutos além de 45 e 60
- Personal → Sugerir treino: intensidade agora exibe descrição curta (RPE + contexto) em vez de só o nome
- Personal → Sugerir treino: campo opcional "Observações do coach" para passar contexto ao gerar a sugestão
- Personal → Sugerir treino: botão CTA renomeado de "Gerar sugestão" para "Criar sugestão" / "Criar etapa"
- Personal → Preview: seções em cards separados com visual distinto, mesmo padrão do WorkoutCard
- Student → Treinos: layout do feedback redesenhado — "Fiz o treino" em destaque full-width, ações secundárias em linha
- Student → Treinos: placeholder do comentário atualizado conforme spec de produto
- Student / Coach → Feedback: coach view agora exibe status, curtiu, intensidade percebida e comentário com chips visuais diferenciados
- WorkoutCard → Hierarquia visual: seções expandidas usam blocos separados com bg e border em vez de divide-y
- Backend → suggest-workout: suporte a `mode` ("full" | "section"), `section_type` e `coach_notes` opcionais
- Backend → suggest-workout: prompt de etapa única reduzido (2048 tokens max) — mais rápido e barato
- Backend → suggest-workout: restrições de equipamento expandidas com referências CrossFit (kg, polegadas, ergs)
- UI → WorkoutImportSheet: removida menção a "IA" da interface — substituída por descrição funcional

---

## [0.6.13] — 2026-05-15

### Adicionado
- Admin → Aba "Claude": painel de uso de IA — carregado sob demanda ao clicar na aba
- Admin → Claude: cards de custo (mês atual, all-time, semana, média por chamada)
- Admin → Claude: breakdown por função — Sugerir treino vs Gerar plano (custo + chamadas + média)
- Admin → Claude: top usuários por custo all-time
- Admin → Claude: log das últimas 50 chamadas com data, função, coach, aluno, tokens in/out e custo
- Backend → Edge Functions: `suggest-workout` e `generate-workout` registram tokens e custo em `ai_usage_log` após cada chamada (fire-and-forget via service role)
- Backend → SQL: tabela `ai_usage_log` com RLS (só admin lê); RPCs `admin_get_ai_usage_stats`, `admin_get_ai_usage_recent`, `admin_get_ai_usage_by_user`
- App → Login: versão atualizada para `0.6.13` via `package.json`

---

## [0.6.12] — 2026-05-15

### Adicionado
- Student → Treinos: feedback de conclusão por treino — aluno pode marcar "Fiz o treino", "Fiz parcialmente" ou "Não fiz" em treinos passados e do dia
- Student → Treinos: sheet de feedback rápido após marcar conclusão — curtiu (Gostei/Neutro/Não gostei), intensidade (Leve/Na medida/Muito pesado) e comentário opcional
- Student → Treinos: status de conclusão visível no card (chip no header) sem precisar expandir
- Student → Treinos: exibe "Observação" do coach no topo do treino expandido (fundo lime sutil), visível apenas quando preenchida
- Personal Trainer → Prescrição: campo "Observação para o aluno" no formulário de criação — preenchido automaticamente pela sugestão de treino, editável pelo coach antes de salvar
- Personal Trainer → Prescrição → Prévia: exibe a observação antes das etapas do treino
- Personal Trainer → Perfil do aluno: histórico de treinos exibe feedback do aluno (status + gostei + intensidade + comentário) em modo leitura
- Backend → Edge Function `suggest-workout`: considera histórico de feedback dos últimos 14 dias ao gerar sugestão (treinos pulados → menos volume; muito pesado → reduz carga; comentários do aluno → ajusta foco)
- Backend → Edge Function `suggest-workout`: retorna `student_note` — frase curta e humana explicando ajustes feitos com base no histórico
- Backend → SQL: tabela `workout_feedback` com RLS (aluno grava próprio, coach lê atletas vinculados); campo `student_note` em `prescribed_workouts`; RPCs `save_workout_feedback`, `get_athlete_recent_feedback`, `personal_set_workout_student_note`

---

## [0.6.11] — 2026-05-15

### Melhorado
- Personal Trainer → Prescrição → Prévia: hierarquia visual das etapas — tipo da etapa em lime small caps, label em branco/55 normal case; linha de formato em branco/35 sutil; nome do exercício sem uppercase; detalhes de carga/reps em branco/60 12px; descanso e notas em itálico branco/35 11px
- Personal Trainer → Prescrição: rascunho do treino persistido em sessionStorage — F5 na tela de criação restaura etapas, foco, tags, notas e data; rascunho limpo automaticamente ao salvar

---

## [0.6.10] — 2026-05-15

### Adicionado
- Personal Trainer → Prescrição: botão "Sugerir treino" na tela de criação de treino — gera uma sessão estruturada sem salvar, populando o builder para o coach revisar e editar antes de enviar
- Personal Trainer → Prescrição: sheet de sugestão com seleção de foco (Full Body, Upper/Lower, Força, CrossFit, Cardio, Skill, Mobilidade), duração (45/60/75/90 min) e intensidade (Leve/Moderada/Intensa)
- Personal Trainer → Prescrição: reutiliza o foco já selecionado na tela se houver apenas um foco ativo
- Personal Trainer → Prescrição: se já houver etapas no builder, pergunta se quer substituir tudo, adicionar abaixo ou cancelar
- Backend → Edge Function `suggest-workout`: chama Claude Haiku com os PRs do aluno, retorna JSON estruturado por etapas sem salvar no banco

---

## [0.6.9] — 2026-05-15

### Adicionado
- Personal Trainer → Prescrição: campo "Reps / Esquema" aceita texto livre — suporta esquemas como "21-15-9" ou "30-20-10" por exercício; na prévia exibe o esquema diretamente sem "REPS"
- Personal Trainer → Prescrição: drag and drop de exercícios dentro da própria etapa — handle ⠿ em cada exercício, reordenação com indicador lime, exercícios não cruzam entre etapas

---

## [0.6.8] — 2026-05-15

### Melhorado
- Personal Trainer → Prescrição: ordem das etapas corrigida para sequência CrossFit — Mobility, Warm-Up, Strength, Skill, Conditioning, WOD, Accessories, Cool Down
- Personal Trainer → Prescrição: sheet "Adicionar exercício" reordenado — resultados da busca ficam acima do campo de pesquisa, que agora fica fixo na base do sheet (próximo ao teclado)
- Personal Trainer → Prescrição: etapas com drag and drop — ícone ⠿ no header; arrastar reordena com borda lime no destino

### Removido
- Training → Builder: componente WorkoutBuilder removido da aplicação — modo manual volta a ser só textarea + preview (igual a antes)

---

## [0.6.7] — 2026-05-12

### Adicionado
- App → Desktop: sidebar de navegação fixa (220px) com wordmark Go/Unbroken, links de navegação com indicador lime, botão "Registrar PR" e avatar do usuário
- App → Desktop: layout responsivo — mobile mantém bottom nav, desktop usa sidebar lateral + conteúdo fluido sem restrição de 430px
- App → Desktop: WorkoutImportSheet vira modal centralizado (600px) no desktop em vez de bottom sheet

### Melhorado
- Navigation → Desktop: sidebar mostra link "Personal" para usuários com role admin/personal
- Navigation → Mobile: BottomNav continua igual, agora oculto no desktop (`md:hidden`)
- Treinos, PRs, Perfil: headers sticky responsivos com `md:max-w-5xl md:mx-auto`; conteúdo com padding lateral ampliado no desktop
- Páginas: `pb-24`/`pb-28` vira `md:pb-8` no desktop (sem bottom nav para compensar)
- AddScore, MovementDetail, Buildup, Admin, Personal: agora incluídos no TabLayout para ter sidebar no desktop

---

## [0.6.6] — 2026-05-12

### Adicionado
- Training → Criar treino manual: modo Builder — interface estruturada para criar treinos por etapas, sem precisar formatar texto manualmente
- Training → Builder: seletor de etapa com ordem CrossFit (Mobility → Warm-Up → Strength → Skill → Conditioning → WOD → Accessory → Cool Down → Personalizada)
- Training → Builder: Mobility aparece primeiro e Warm-Up segundo na sugestão de etapas
- Training → Builder: exercícios visualmente aninhados sob cada seção — hierarquia clara entre header de bloco e conteúdo
- Training → Builder: Enter em um campo cria novo item; Backspace em campo vazio remove o item e volta ao anterior
- Training → Builder: botão "Texto livre" para alternar para o textarea clássico quando necessário
- Training → Criar treino manual: toggle Builder / Texto livre no topo do formulário

---

## [0.6.5] — 2026-05-12

### Adicionado
- Training → Criar treino / Importar treino: texto salvo agora é dividido em múltiplas seções pelos headers de bloco (WARM UP, WOD, STRENGTH, SKILL, METCON, etc.) — cada bloco vira uma etapa separada com label correto, igual ao formato gerado pela IA

### Melhorado
- Training → Lista de treinos: seções sem exercícios estruturados (treinos importados ou manuais) agora exibem o texto com syntax highlighting — linhas de formato em lime bold, nomes de movimentos em branco bold, notas em muted italic — em vez de texto corrido apagado
- Training → Lista de treinos: summary "0 exercícios" não aparece mais quando o treino é texto livre

---

## [0.6.4] — 2026-05-12

### Melhorado
- Training → Importar treino por imagem: detector de bloco reescrito — identifica o início real do treino pelo primeiro header de seção (WARM UP, WOD, STRENGTH, SKILL, METCON, etc.), ignorando metadata anterior como "DETALHES DA AULA", "É WOD", "Workout-of-the-day"
- Training → Importar treino por imagem: detecção de fim do treino por marcadores de metadata pós-WOD (INSCRIÇÕES, BOOKING, HORÁRIO, DETALHES DA AULA, etc.) — conteúdo após esses marcadores é cortado automaticamente
- Training → Importar treino por imagem: normalização de OCR — "3 rest" → "3' rest"; linhas em branco consecutivas colapsadas em uma
- Training → Editor de treino: syntax highlighting melhorado — formato detecta "5R, EACH FOR TIME", esquemas tipo "21-15-9", "For Load", "Time Cap"; exercícios detectam distâncias (500/425m), calorias (12 cal), mais nomes de movimentos (wall ball, kang squat, TTB, double under…); notas detectam rest com apóstrofo ("3' rest")

---

## [0.6.3] — 2026-05-12

### Adicionado
- Training → Importar treino por imagem: visualizador com syntax highlighting — botão "Visualizar" / "Editar" alterna entre textarea livre e preview estilizado
- Training → Criar treino manual: mesmo toggle Visualizar/Editar disponível na criação manual
- Training → Editor de treino: títulos de bloco (WOD, Strength, Aquecimento…) destacados em lime + uppercase; linhas de formato (AMRAP, EMOM, For Time, Rounds…) com keywords em negrito lime; linhas de exercício com números, pesos e repetições realçados; notas/observações em muted itálico

---

## [0.6.2] — 2026-05-12

### Adicionado
- Training → Importar treino por imagem: detecção automática do bloco de treino no texto OCR — identifica linhas com exercícios, séries, pesos e formatos (AMRAP, EMOM, etc.) e separa do ruído
- Training → Importar treino por imagem: botão "Cortar — manter só o treino" na tela de revisão; aplica o corte detectado automaticamente (datas, usernames, frases soltas antes/depois do treino são descartadas)
- Training → Importar treino por imagem: botão "Restaurar texto completo" para desfazer o corte e voltar ao OCR original

---

## [0.6.1] — 2026-05-12

### Corrigido
- Training → Importar treino por imagem: separado em duas opções — "Tirar foto" (câmera) e "Escolher da galeria" (sem `capture`, acessa fotos salvas)
- Training → Importar treino por imagem: pré-processamento da imagem antes do OCR — conversão para escala de cinza, inversão automática quando fundo escuro (brilho médio < 100), e normalização de contraste; melhora significativamente a leitura em screenshots de apps dark-mode
- Training → Importar treino por imagem: label de progresso detalhado por etapa (carregando OCR, idioma, reconhecendo texto)

---

## [0.6.0] — 2026-05-12

### Adicionado
- Training → Criar treino: botão "+" em Treinos agora abre um sheet com duas opções de criação — disponível para todos os usuários
- Training → Criar treino manual: campo de texto editável + seletor de data, salva como treino pessoal
- Training → Importar treino por imagem: upload ou captura de foto com OCR local via Tesseract.js (por+eng), texto extraído aparece em campo editável para revisão antes de salvar
- Training → Importar treino por imagem: barra de progresso durante processamento OCR
- Training → Importar treino por imagem: tratamento de erros (imagem inválida, OCR sem texto, falha no processamento)
- Training → Criar treino: opção "Gerar plano da semana" (IA) mantida no mesmo sheet para usuários com role AI

---

## [0.5.0] — 2026-05-12

### Adicionado
- Training → Build-up: progressão por tabela fixa de percentuais por número de séries (1–10), com saltos maiores no início e menores perto do alvo
- Training → Build-up: modificador de volume — alto volume (muitas séries × reps) desloca percentuais para baixo, conservando energia para o treino principal
- Training → Build-up: modificador por categoria de movimento — olympic/overhead mais conservador; squat/hinge ligeiramente mais agressivo
- PRs e Insights → Build-up: alerta laranja quando o peso alvo implica um 1RM estimado mais de 10% acima do melhor 1RM conhecido pelos PRs cadastrados
- Training → Build-up: exibição do delta `+X kg` em verde abaixo de cada série, mostrando o incremento em relação à série anterior
- Training → Build-up: limite de séries de trabalho ampliado de 8 para 10

### Corrigido
- Training → Build-up: a quantidade de séries informada pelo usuário agora é respeitada exatamente — N séries = N séries visíveis (S1…SN)
- Training → Build-up: a última série é sempre o peso alvo exato (100%), sem séries extras geradas pelo app
- Training → Build-up: a barra vazia é exibida como aquecimento e não conta como série de trabalho
- Training → Build-up: pesos arredondados para o inteiro mais próximo, usando anilhas pequenas (0,5–2,5 kg) quando necessário
- Training → Build-up: anilha de 5 kg e 0,5 kg com cor mais escura (`#52525B`) para melhor distinção visual

---

## [0.4.0] — 2026-05-12

### Adicionado
- Training → Build-up: calculadora de séries de aquecimento automáticas do peso da barra até o peso alvo
- Training → Build-up: seletor de tipo de barra (20 kg azul / 15 kg amarelo)
- Training → Build-up: seletor de reps por série (1–15) e de séries de trabalho (1–8)
- Training → Build-up: visualização SVG da barra com anilhas coloridas em alturas proporcionais ao diâmetro real
- Training → Build-up: cálculo de anilhas por lado com greedy (maior para menor); exibe "somente barra" ou "não montável" conforme o caso
- Training → Build-up: botão "Build-up" na página de detalhe de um movimento (aparece quando há PR registrado)
- Training → Build-up: página standalone `/buildup` acessível via Perfil → Calculadoras
- Training → Build-up: sugestão de peso alvo baseada nos PRs do atleta via fórmula Epley
- Training → Build-up: seção "Calculadoras" no Perfil, visível para todos os usuários

### Corrigido
- Training → Build-up: pesos intermediários arredondados para o múltiplo de 5 kg mais próximo, garantindo montagem com anilhas disponíveis

---

## [0.3.1] — 2026-05-11

### Adicionado
- PRs e Insights → Auth: confirmação de e-mail obrigatória no cadastro
- PRs e Insights → Auth: SMTP customizado via Gmail (`gounbrokenapp@gmail.com`)
- PRs e Insights → Auth: template de e-mail de confirmação com identidade visual Go Unbroken
- PRs e Insights → Auth: redirect URLs configuradas para produção, preview Vercel e localhost

### Corrigido
- PRs e Insights → Auth: `emailRedirectTo: window.location.origin` — link do e-mail volta para o ambiente correto
- PRs e Insights → Auth: removido `min-height:100vh` do template de e-mail que causava scroll no Gmail

---

## [0.3.0] — 2026-05-11

### Adicionado
- PRs e Insights → Onboarding: fluxo v2 com 5 etapas (dados físicos, treino, objetivos, primeiro PR, conclusão)
- PRs e Insights → Perfil: campo de altura e gênero "Prefiro não dizer"
- PRs e Insights → Perfil: tipos de treino multi-select e objetivos reformulados (8 opções)
- PRs e Insights → Perfil: deletar própria conta com confirmação por senha
- Personal Trainer → Admin: deletar usuário no dashboard com confirmação por senha do admin
- PRs e Insights → App: versionamento automático via `package.json` na tela de login

### Melhorado
- PRs e Insights → Auth: layout de login/cadastro centralizado no desktop (max 480px)
- Personal Trainer → Admin: dashboard responsivo para desktop — 4 colunas de stats, grid 2×N, sheet como modal

---

## [0.2.0] — 2026-04-01

### Adicionado
- PRs e Insights → App: rename CF Scores → Go Unbroken (nome, ícones, manifest, meta tags)
- PRs e Insights → App: wordmark "GO / barra lime / UNBROKEN" na tela de login
- PRs e Insights → App: ícones PWA regenerados (192px, 512px, apple-touch-icon)
- PRs e Insights → Auth: template de e-mail de confirmação com identidade visual Go Unbroken
- PRs e Insights → Infra: URL de preview estável `cf-scores-homolog.vercel.app` com script `deploy:preview`

---

## [0.1.0] — 2026-03-01

### Adicionado
- PRs e Insights → App: setup inicial — React 18 + Vite + TypeScript + Tailwind + PWA
- PRs e Insights → Auth: autenticação via Supabase (e-mail + senha)
- PRs e Insights → Movimentos: criar, listar, buscar movimentos
- PRs e Insights → Scores: registrar peso/reps por movimento, lógica de PR automática
- PRs e Insights → Histórico: gráfico de evolução por movimento
- PRs e Insights → Stats: volume, frequência e PRs globais
- PRs e Insights → Perfil: dados físicos e IMC
- PRs e Insights → Onboarding: v1 com dados básicos e primeiro PR
- Personal Trainer → Admin: dashboard com suporte a roles (admin, personal, user)
- Personal Trainer → Área do Personal: prescrições para atletas
- PRs e Insights → Infra: deploy no Vercel (cf-scores.vercel.app)
