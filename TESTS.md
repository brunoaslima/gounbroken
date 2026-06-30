# Testes Automatizados — CF Scores

Documentação de todos os testes existentes, o que cobrem e como executar.

---

## Como rodar

```bash
# Testes unitários (Vitest) — função a função, sem browser
npm test

# Testes unitários em modo watch (re-executa ao salvar)
npm run test:watch

# Testes E2E (Playwright) — browser real, mobile-chrome + mobile-safari
npm run test:e2e

# Rodar tudo de uma vez
npm run test:all
```

---

## Visão geral

| Suite | Ferramenta | Arquivos | Total de testes |
|---|---|---|---|
| Unitários | Vitest | `src/__tests__/*.test.ts` | 102 |
| E2E | Playwright | `tests/*.spec.ts` | 44 (22 chrome + 22 safari) |
| **Total** | | | **146** |

---

## Testes Unitários (Vitest)

Rodam em ambiente Node puro — sem browser, sem DOM. Cobrem funções puras extraídas para `src/lib/`.

---

### `src/__tests__/utils.test.ts`

Funções utilitárias de `src/lib/utils.ts`.

#### `suggestEmail` — sugestão de correção de typo em e-mail

| # | Caso | O que valida |
|---|---|---|
| 1 | E-mail já correto (`gmail.com`, `hotmail.com`, `icloud.com`) | Retorna `null` — sem sugestão desnecessária |
| 2 | `gmial.com` | Sugere `gmail.com` |
| 3 | `hotmali.com` | Sugere `hotmail.com` |
| 4 | `outlok.com` | Sugere `outlook.com` |
| 5 | Domínio corporativo (muito diferente) | Retorna `null` — não inventa sugestão |
| 6 | Sem `@` no e-mail | Retorna `null` sem erro |
| 7 | String vazia | Retorna `null` sem erro |
| 8 | Parte local com maiúsculas (`Bruno.Lima@gmial.com`) | Preserva exatamente a parte local |

#### `formatDate` — formata data ISO para exibição longa em pt-BR

| # | Caso | O que valida |
|---|---|---|
| 9 | Data ISO `2024-01-15` | Resultado contém dia (`15`) e ano (`2024`) |
| 10 | Datas válidas diversas | Não lança exceção |

#### `formatDateShort` — formata data ISO sem o ano

| # | Caso | O que valida |
|---|---|---|
| 11 | Data ISO `2024-03-20` | Contém o dia, não contém o ano |

---

### `src/__tests__/scoreUtils.test.ts`

Funções de cálculo de PR em `src/lib/scoreUtils.ts`.

#### `epley1RM` — estima o 1RM pela fórmula de Epley

| # | Caso | O que valida |
|---|---|---|
| 1 | 1 rep | Retorna o próprio peso (sem multiplicação) |
| 2 | 80kg × 5 reps | Resultado correto: 93.5kg |
| 3 | Qualquer entrada válida | Resultado é múltiplo de 0.5kg |
| 4 | `reps <= 0` | Retorna `null` |
| 5 | `peso <= 0` | Retorna `null` |
| 6 | 2–10 reps com 100kg | 1RM estimado sempre ≥ peso original |

#### `isNewPR` — decide se um novo registro supera o PR atual

| # | Caso | O que valida |
|---|---|---|
| 7 | PR anterior `null` (primeiro registro) | Retorna `true` |
| 8 | Novo peso maior que o PR | Retorna `true` |
| 9 | Novo peso igual ao PR | Retorna `false` (empate não é PR) |
| 10 | Novo peso menor que o PR | Retorna `false` |

---

### `src/__tests__/workoutDisplay.test.ts`

Funções de formatação de treinos em `src/lib/workoutDisplay.ts`.

#### `buildFormatLine` — linha de formato do treino (AMRAP, FOR TIME, etc.)

| # | Caso | O que valida |
|---|---|---|
| 1 | Sem `format_type` / campo ausente | Retorna `null` |
| 2 | `AMRAP` sem tempo | `"AMRAP"` |
| 3 | `AMRAP` com 12 minutos | `"AMRAP · 12:00"` |
| 4 | `FOR_TIME` simples | `"FOR TIME"` |
| 5 | `FOR_TIME` com rounds e time cap | `"FOR TIME · 3 ROUNDS · CAP 20:00"` |
| 6 | `EMOM` com 10 minutos | `"EMOM · 10:00"` |
| 7 | `TABATA` sem configuração | Contém `"TABATA"` e `"20s/10s"` (defaults) |
| 8 | `TABATA` com rounds e tempos customizados | `"TABATA · 8 SÉRIES · 20s/10s"` |
| 9 | `UNBROKEN` | `"UNBROKEN"` |
| 10 | `ROUNDS` com rounds e descanso | `"ROUNDS · 5× · 90s descanso"` |
| 11 | Tipo desconhecido | Retorna `null` |

#### `buildPrescription` — linhas de prescrição por exercício

| # | Caso | O que valida |
|---|---|---|
| 12 | Sem nenhum dado | Array vazio |
| 13 | Sets + reps | `"4 × 6 REPS"` |
| 14 | Só sets | `"3 SÉRIES"` |
| 15 | Só reps | `"10 REPS"` |
| 16 | Duração < 60s | Contém `"45s"` |
| 17 | Duração exata em minutos | Contém `"2:00"` |
| 18 | Carga simples em kg | `"@ 100KG"` |
| 19 | Carga em range de kg | `"@ 80–100KG"` |
| 20 | Carga em % do 1RM | `"@ 75% DO 1RM"` |
| 21 | Carga em range % do 1RM | `"@ 70%–80% DO 1RM"` |
| 22 | RPE | Contém `"RPE 8/10"` |
| 23 | Descanso ≥ 60s (1min30) | `"*DESCANSO 1:30 ENTRE SÉRIES"` |
| 24 | Descanso < 60s (45s) | `"*DESCANSO 45s ENTRE SÉRIES"` |

#### `dayLabel` e `formatDateBR` — utilitários de data

| # | Caso | O que valida |
|---|---|---|
| 25 | `2024-01-01` (segunda) | `"Segunda"` |
| 26 | `2024-01-07` (domingo) | `"Domingo"` |
| 27 | `2024-01-06` (sábado) | `"Sábado"` |
| 28 | `2024-03-15` | `"15/03/2024"` |
| 29 | `2000-01-01` | `"01/01/2000"` |

---

### `src/__tests__/strengthStandards.test.ts`

Lógica de classificação de força em `src/lib/strengthStandards.ts`.

#### `analyzeStrength` — retorna nível e score para um exercício + peso + atleta

| # | Caso | O que valida |
|---|---|---|
| 1 | Movimento sem padrão cadastrado | Retorna `null` |
| 2 | Back Squat masculino 120kg/80kg | Retorna resultado com `weightKg`, `level` e `score` entre 0–100 |
| 3 | Pesos crescentes (60kg vs 160kg) | Score aumenta proporcionalmente |
| 4 | Deadlift masculino | `level` é um dos 6 valores válidos |
| 5 | Peso absurdo (≥ elite) | `kgToNextLevel` é `null` no topo |
| 6 | Back Squat 160kg/80kg | `bodyWeightRatio` ≈ 2.0 (calculado corretamente) |

#### `TIER_LABELS` e `TIER_COLORS` — constantes de classificação

| # | Caso | O que valida |
|---|---|---|
| 7 | Todos os 6 tiers | Cada um tem uma label definida |
| 8 | Todos os 6 tiers | Cada cor é um hex válido (`#RRGGBB`) |

#### Regressão: movimentos com parênteses ou hifens somem do dashboard

> **Bug corrigido**: `normalizeMovement()` não removia parênteses nem convertia hifens em espaços, fazendo com que `analyzeStrength()` retornasse `null` e o movimento fosse filtrado do dashboard.

**`hasStrengthStandard` — todos os movimentos do preset são reconhecidos**

| # | Movimento | Problema anterior | O que valida |
|---|---|---|---|
| 9 | `Shoulder Press (Strict)` | `(Strict)` não era removido | Retorna `true` |
| 10 | `Split Jerk (Behind the Neck)` | `(Behind the Neck)` não era removido | Retorna `true` |
| 11 | `Shoulder-to-overhead` | Hífen não virava espaço | Retorna `true` |
| 12 | `Ground-to-overhead` | Hífen não virava espaço | Retorna `true` |
| 13 | `Weighted Pull-up` | Hífen não virava espaço | Retorna `true` |
| 14 | `Dumbbell Box Step-up` | Hífen não virava espaço | Retorna `true` |

**`analyzeStrength` — movimentos com parênteses retornam análise válida (não null)**

| # | Movimento | O que valida |
|---|---|---|
| 15 | `Shoulder Press (Strict)` 80kg/80kg | Resultado não-nulo, score ≥ 0 |
| 16 | `Split Jerk (Behind the Neck)` 100kg/80kg | Resultado não-nulo |
| 17 | `Shoulder-to-overhead` 80kg/80kg | Resultado não-nulo |
| 18 | `Ground-to-overhead` 100kg/80kg | Resultado não-nulo |

---

## Testes E2E (Playwright)

Rodam em dois browsers simultaneamente: **Pixel 7** (mobile-chrome) e **iPhone 14** (mobile-safari).
Requerem o servidor local rodando em `http://localhost:5173` (o Playwright sobe automaticamente).

---

### `tests/auth.spec.ts`

#### Grupo: RequireAuth — rotas protegidas

Valida que usuários não autenticados são bloqueados e redirecionados para `/login`.

| # | Rota acessada | O que valida |
|---|---|---|
| 1 | `/` (Home) | Redireciona para `/login` |
| 2 | `/stats` | Redireciona para `/login` |
| 3 | `/profile` | Redireciona para `/login` |
| 4 | `/add` | Redireciona para `/login` |
| 5 | `/personal` | Redireciona para `/login` |
| 6 | `/pagina-que-nao-existe` | Rota 404 → redireciona para `/login` |

#### Grupo: Página de Login — estrutura e interações básicas

| # | Caso | O que valida |
|---|---|---|
| 7 | Abas da tela de login | Botões "Entrar" e "Criar conta" visíveis |
| 8 | Submit sem preencher campos | Permanece em `/login` (HTML `required` bloqueia) |
| 9 | Aba "Criar conta" | Exibe campos Nome, Sobrenome, username, e-mail |
| 10 | Botão olho (mostrar/ocultar senha) | Alterna `type="password"` ↔ `type="text"` |

#### Grupo: Validação do formulário de cadastro

| # | Caso | O que valida |
|---|---|---|
| 11 | Senha com menos de 6 caracteres | Exibe erro "Mínimo 6 caracteres" |
| 12 | Senhas diferentes nos dois campos | Exibe erro "As senhas não coincidem" |
| 13 | Username com espaço e `!` | Exibe erro sobre caracteres inválidos / letras minúsculas |
| 14 | E-mail com typo `gmial.com` | Exibe sugestão "Quis dizer … gmail.com" |
| 15 | Clicar "Corrigir" na sugestão de e-mail | Campo atualiza para `user@gmail.com` |
| 16 | E-mail já cadastrado (layout check) | Botão "Continuar" está visível (estrutura ok) |
| 17 | Estrutura geral da aba cadastro | Botão "Continuar" presente na tela |

---

### `tests/black-screen.spec.ts`

Detecta tela preta antes de qualquer deploy. Roda nos dois browsers (Chrome + Safari mobile).

| # | Caso | O que valida |
|---|---|---|
| 1 | Console ao carregar `/` | Nenhum erro fatal: env vars ausentes, ChunkLoadError, módulo não encontrado |
| 2 | `#root` após carregar | Tem filhos — React montou. Se estiver vazio, o app nunca renderizou |
| 3 | Conteúdo visível | `body.innerText` não está vazio — há texto na tela |
| 4 | Assets JS/CSS | Todos os arquivos em `/assets/` retornam HTTP 200 (sem 404 de SW desatualizado) |
| 5 | `/login` renderiza | Campos de e-mail e botão "Entrar" visíveis — app funcional de ponta a ponta |

---

### `tests/onboarding.spec.ts`

#### Grupo: Rota /onboarding sem autenticação

| # | Caso | O que valida |
|---|---|---|
| 1 | Acesso direto a `/onboarding` sem sessão | Redireciona para `/login` |

> **Testes do fluxo completo de onboarding** estão escritos mas comentados (`/* ... */`).
> Para ativá-los, configure as variáveis de ambiente `TEST_EMAIL` e `TEST_PASSWORD`
> com credenciais de uma conta de teste que tenha `onboarding_completed = false`.

---

## O que ainda não está coberto

| Área | Motivo | Como cobrir futuramente |
|---|---|---|
| Fluxo completo de onboarding (5 steps) | Precisa de conta real com `onboarding_completed = false` | Ativar bloco comentado em `onboarding.spec.ts` com env vars |
| Login com credenciais válidas | Precisa de conta de teste | E2E com `TEST_EMAIL` / `TEST_PASSWORD` |
| Adicionar score + detecção de PR | Precisa de sessão autenticada | E2E autenticado ou mock de sessão |
| Hooks (`useAuth`, `useProfile`, etc.) | Dependem do Supabase (efeitos colaterais) | Vitest com mock de `@supabase/supabase-js` |
| Componentes React (Toast, WorkoutCard, etc.) | Ambiente `jsdom` não está ativado | Instalar `@vitest/environment-jsdom`, mudar env no `vite.config.ts` |
