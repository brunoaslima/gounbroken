# CF Scores — Contexto Completo do Produto

> Documento criado para transferência de contexto a outros chats/ferramentas de IA.
> Cobre produto, funcionalidades, proposta de valor, diferenciais, monetização e growth.

---

## 1. O que é o app

**CF Scores** é uma plataforma de performance tracking e scoring para praticantes de CrossFit.

O app permite que atletas registrem seus Personal Records (PRs), acompanhem evolução ao longo do tempo, entendam seu nível de força em movimentos específicos e visualizem um perfil geral de força — tudo calibrado por peso corporal, sexo e padrões de referência internacionais.

Não é um app genérico de treino. É específico para CrossFit, levantamento de peso olímpico e ginástica funcional.

O produto existe no cruzamento entre:
- **Diário de PRs** (registrar e não esquecer)
- **Scoring científico** (comparar com padrões reais por peso corporal)
- **Perfil de força** (entender pontos fortes e fracos)
- **Prescrição de treino** (personal trainer pode criar e prescrever treinos)
- **AI coaching** (futuro: sugestão de treinos e progressões personalizadas)

---

## 2. O problema que resolve

Praticantes de CrossFit têm PRs espalhados em:
- Notas no celular
- Planilhas do Google
- Conversas no WhatsApp
- Apps genéricos que não entendem CrossFit
- Memória (que falha)

Além disso, mesmo quem registra os PRs não consegue responder perguntas simples como:

- *"Meu back squat de 120 kg é bom para o meu peso?"*
- *"Estou ficando mais forte ou só treinando mais?"*
- *"Em qual categoria de força eu sou mais fraco?"*
- *"Meu nível geral de força é iniciante, intermediário ou avançado?"*
- *"O que preciso melhorar para subir de nível?"*

O CF Scores resolve isso transformando números soltos em um **perfil de força visual, contextualizado e motivador**.

---

## 3. Para quem é

### Persona 1 — Atleta recreativo engajado
- Treina CrossFit 3–5x por semana
- Quer saber se está evoluindo
- Não tem referência se o número que levanta é bom
- Quer motivação visual, não planilha

### Persona 2 — Atleta intermediário ou competitivo
- Já treina há anos
- Quer identificar fraquezas específicas
- Compara squat, Olympic lifting, overhead strength
- Quer saber se está perto de nível avançado ou competitivo

### Persona 3 — Personal trainer / coach
- Acompanha alunos individualmente
- Quer prescrever treinos personalizados
- Quer visualizar histórico e evolução dos alunos
- Quer dados para tomar decisões de programação

### Persona 4 — Box owner / administrador
- Quer acompanhar engajamento e evolução dos alunos
- Pode usar rankings internos e desafios
- Interesse em dados agregados da box

---

## 4. Proposta de valor central

> **"Transformar PRs soltos em um perfil de força completo, visual e motivador — específico para CrossFit."**

Não é apenas guardar números. É entender o que eles significam.

---

## 5. Funcionalidades principais

### 5.1 Cadastro e onboarding

Fluxo dividido em dois momentos:

**Passo 1 — Criar conta:**
- Nome, sobrenome, username, e-mail, senha
- Conta criada e persistida imediatamente
- `onboarding_completed = false`

**Passo 2 — Onboarding complementar (5 steps):**
1. Boas-vindas
2. Dados pessoais: sexo biológico, peso corporal, data de nascimento
3. Objetivo: força máxima, hipertrofia, performance, saúde geral
4. Primeiro PR (opcional)
5. Conclusão

Regras importantes:
- Se o usuário sair antes de terminar, ao fazer login novamente volta para o onboarding
- Quando terminar, `onboarding_completed = true`
- Se houver erro após criação da conta, o app não mente dizendo que a conta não foi criada

### 5.2 Personal Records (PRs)

Funcionalidade central do produto.

O usuário registra PRs para movimentos de CrossFit e levantamento de peso.

**Movimentos suportados (exemplos):**
- Back Squat, Front Squat, Overhead Squat
- Strict Press / Shoulder Press, Push Press, Push Jerk, Split Jerk
- Deadlift, Sumo Deadlift, Snatch Grip Deadlift
- Bench Press
- Clean, Squat Clean, Power Clean, Hang Power Clean, Hang Squat Clean
- Snatch, Power Snatch, Hang Power Snatch
- Clean and Jerk
- Thruster, Barbell Thruster
- Shoulder-to-overhead, Ground-to-overhead
- Weighted Pull-up
- Dumbbell Snatch, Dumbbell Clean and Jerk, Dumbbell Front Squat
- Dumbbell Box Step-up, Dumbbell Overhead Lunge
- Turkish Get-up
- Bear Complex

**RM Types:**
O usuário não registra apenas 1RM. Pode registrar 2RM, 3RM, 5RM etc.

Quando o PR não é 1RM, o app usa a **fórmula de Epley** para estimar o 1RM equivalente:
```
E1RM = peso × (1 + reps / 30)
```

Isso é mostrado de forma transparente na interface:
```
Split Jerk
PR registrado: 2RM — 80 kg
E1RM estimado: 85 kg (via Epley)
Classificação baseada no E1RM
```

### 5.3 Scoring de movimentos

O app compara o PR do usuário com **standards de força por movimento, sexo e peso corporal**.

**Metodologia:**
1. Usa tabelas de padrões de referência por movimento
2. Considera o peso corporal do atleta
3. Interpola entre faixas de peso corporal
4. Compara o PR com thresholds por nível
5. Para movimentos derivados, usa fatores de conversão com confiança menor

**Níveis de classificação:**
| Nível técnico | Label amigável |
|---|---|
| Untrained | Em Formação |
| Novice | Iniciante |
| Intermediate | Intermediário |
| Advanced | Avançado |
| Elite | Elite |
| World Class | Classe Mundial |

**Output do scoring para cada PR:**
- Nível atual (com cor e label)
- Score 0–100
- Percentil estimado ("top X% da humanidade")
- Peso necessário para o próximo nível
- Barra de progresso visual

**Regra importante:** se o scoring não estiver disponível para um movimento, o app mostra mensagem explicativa em vez de simplesmente esconder o elemento.

### 5.4 Strength Level (nível geral de força)

Card no dashboard que agrega os PRs em um **nível geral de força** único.

**Como funciona:**
1. Movimentos são agrupados em 5 categorias
2. Cada categoria recebe uma nota média (média dos scores dos movimentos com PR registrado)
3. O score geral é a média das categorias ativas (cada categoria tem peso igual)
4. O score é mapeado para um nível geral

**Categorias:**
| Categoria | Movimentos incluídos |
|---|---|
| Força de Agachamento | Back Squat, Front Squat, Overhead Squat |
| Força de Quadril | Deadlift, Sumo Deadlift, Snatch Grip Deadlift |
| Levantamento Olímpico | Clean, Snatch, Clean and Jerk e variações |
| Força de Ombros | Strict Press, Push Press, Push Jerk, Split Jerk, Shoulder-to-overhead |
| Força Acessória | Bench Press, Thruster, Weighted Pull-up |

**Mapeamento score → nível:**
| Score | Nível |
|---|---|
| 0–20 | Sem Base |
| 21–40 | Novato |
| 41–60 | Intermediário |
| 61–80 | Avançado |
| 81–94 | Elite |
| 95–100 | Classe Mundial |

**Sistema de confiança:**
| PRs | Categorias | Confiança |
|---|---|---|
| < 2 | qualquer | Insuficiente (card oculto) |
| ≥ 2 | 1 categoria | Baixa |
| ≥ 3 | ≥ 2 categorias | Média |
| ≥ 5 | ≥ 3 categorias | Alta |
| ≥ 8 | ≥ 4 categorias | Muito Alta |

**O card mostra:**
- Nível geral (ex: "Intermediário")
- Score e barra de progresso
- Breakdown por categoria com nível individual
- Confiança da estimativa
- Guidance: orientação do que fazer para melhorar

### 5.5 Dashboard / Home

Tela principal do app. Ordem dos elementos:

1. **Header** — saudação personalizada + número da semana
2. **Headline** — ex: "Você está no top 12% da humanidade" (baseado no melhor PR)
3. **Métricas principais** — Volume 7 dias | PRs do mês
4. **Hero PR card** — melhor PR com nível e destaque visual
5. **Lista de PRs** — todos os movimentos com PR, ordenados alfabeticamente, com barra de classificação lateral colorida por nível
6. **Strength Level card** — nível geral de força com breakdown por categoria
7. **Movimentos sem PR** — colapsável, lista exercícios sem registros

### 5.6 Detalhe do movimento

Tela individual para cada movimento. Mostra:

- Nome do movimento
- PR atual com RM type explícito (ex: "2RM")
- E1RM estimado via Epley quando não for 1RM
- Barra de classificação por nível (cores)
- Score e percentil
- Peso para o próximo nível
- Histórico completo de registros (ordenado por data)
- Gráfico de evolução

### 5.7 Criação de treinos

O app tem um módulo de criação de treinos voltado para coaches e personal trainers.

**Tipos de etapas/seções:**
- Aquecimento, Skill, Strength, WOD, AMRAP, For Time, EMOM, Tabata, Rounds, Acessório, Desaquecimento

**Por etapa:**
- Exercícios com sets, reps, carga (kg fixo, range, % do 1RM), duração, descanso, RPE, notas
- Preview do treino em tempo real enquanto cria

**Regra de edição/deleção:**
- Treinos de datas passadas: somente leitura, não editáveis
- Treinos de hoje em diante: podem ser editados ou apagados pelo personal trainer

### 5.8 Personal trainer

A role de personal trainer permite:
- Criar, editar e apagar treinos (apenas futuros)
- Acompanhar alunos vinculados
- Prescrever treinos para alunos
- Ver histórico e PRs dos alunos
- Futuramente: usar AI para gerar programação semanal

### 5.9 Perfil do usuário

Painel lateral (não página separada) com:

**Editáveis:** Nome, peso corporal, altura

**Calculados/automáticos:**
- Idade (calculada pela data de nascimento)
- IMC / BMI (calculado por peso + altura)

**Histórico:** cada alteração de peso gera registro automático no histórico de peso para acompanhar evolução corporal.

### 5.10 AI (futuro)

Funcionalidades planejadas com IA:

1. Gerar treino semanal com base nos PRs e objetivos
2. Sugerir progressões para melhorar movimentos específicos
3. Identificar fraquezas com base no Strength Level
4. Criar planos para objetivos específicos (competição, força, etc.)
5. Explicar o score do usuário em linguagem simples
6. Sugerir foco da semana baseado no perfil de força

Exemplo de output:
> "Seu overhead strength está abaixo do seu squat strength. Esta semana, foque em strict press, push press e técnica de jerk para equilibrar seu perfil."

---

## 6. Stack tecnológica atual

| Camada | Tecnologia |
|---|---|
| Frontend | React 18 + Vite 5 + TypeScript |
| Estilo | Tailwind CSS (design system próprio) |
| Backend / DB | Supabase (PostgreSQL + Auth + RLS) |
| PWA | vite-plugin-pwa + Workbox |
| Deploy | Vercel (preview + production) |
| Testes unitários | Vitest (102 testes) |
| Testes E2E | Playwright (44 testes — Chrome + Safari mobile) |

---

## 7. Design system

**Visual:** Brutalist dark-first. Zero border-radius, sem sombras, sem blur.

**Tipografia:**
- Headlines: Space Grotesk (bold/black)
- Dados/números: JetBrains Mono (tabular-nums)

**Paleta:**
- Background: `#0A0A0A`
- Texto principal: `#F5F5F0`
- Accent / CTA: `#D4FF3A` (lime)
- Muted: `#6B6B68`

**Cores dos níveis de força:**
| Nível | Cor |
|---|---|
| Em Formação | `#3D3D3B` (grafite escuro) |
| Iniciante | `#A8A8A4` (cinza) |
| Intermediário | `#4DA3FF` (azul) |
| Avançado | `#D4FF3A` (lime) |
| Elite | `#FF8A00` (laranja) |
| Classe Mundial | `#FF4444` (vermelho) |

---

## 8. Diferenciais do produto

1. **Específico para CrossFit** — não é app genérico de academia
2. **Scoring calibrado por peso corporal** — não é apenas "kg levantado", usa interpolação por faixa de peso e padrões de referência
3. **Estimativa de 1RM transparente** — mostra que usou Epley para converter 2RM/3RM
4. **Strength Level agregado** — perfil completo de força com categorias (não apenas um número)
5. **Confiança dinâmica** — o app admite quando não tem dados suficientes e pede mais PRs
6. **Guidance personalizado** — diz especificamente o que fazer para melhorar
7. **PWA mobile-first** — funciona como app instalado no celular
8. **Multi-role** — atleta, coach, personal trainer, administrador de box

---

## 9. Oportunidades de monetização

### Free tier
- Registro de PRs (ilimitado)
- Scoring de movimentos
- Strength Level
- Dashboard e histórico
- App como PWA

### Pro / Athlete (individual pago)
- Histórico estendido
- Gráficos de evolução avançados
- AI coaching: sugestão de treino semanal
- Cards compartilháveis para redes sociais
- Comparativo com benchmark de competições (RX, ATHX, etc.)

### Coach / Personal trainer (mensal)
- Gestão de alunos (painel completo)
- Prescrição de treinos
- Ver PRs e evolução dos alunos
- AI para gerar programação semanal personalizada
- Relatórios de evolução

### Box / Team (mensal por assinatura)
- Multi-usuário para a box
- Rankings internos
- Challenges e eventos de PR week
- Dashboard de administrador com dados agregados
- Insights sobre engajamento dos alunos

---

## 10. Estratégias de growth

### Hook inicial (aquisição)
- **"Descubra seu nível real de força no CrossFit"** — usuário entra, cadastra 3 PRs, já tem um resultado
- **"Você sabe todos os seus PRs de cabeça?"** — dor imediata e reconhecível
- Fluxo de cadastro rápido: nome + e-mail + 1 PR → já tem um score

### Loop viral
- **Cards compartilháveis** para Instagram Stories / WhatsApp:
  - *"Novo PR: Back Squat 150 kg — Nível Avançado"*
  - *"Meu Strength Level: Intermediário — 7 PRs em 3 categorias"*
  - *"Top 8% da humanidade no Deadlift"*
- Compartilhamento natural pós-PR na box

### Canal box / academia
- Levar para coaches e boxes locais
- Atletas testam durante semanas de PR ou benchmark WODs
- Coach usa para acompanhar alunos → indica para toda a turma
- Box ambassador program

### Conteúdo educativo (SEO + social)
- *"O que seu Back Squat diz sobre seu CrossFit?"*
- *"Qual deveria ser seu Clean em relação ao Squat?"*
- *"Por que seu Snatch não sobe mesmo com Back Squat forte?"*
- *"Como calcular seu Strength Level real"*
- *"Strict Press fraco? Veja o que está atrasando seu jerk"*

### Comunidade
- Grupos privados (box, amigos, equipe) — sem leaderboard público agressivo no início
- Challenges entre amigos com prazo
- Rankings internos da box

### AI como feature premium
- "Gere seu treino semanal com IA" como diferencial claro para conversão Pro

---

## 11. Posicionamentos possíveis

### Opção A — Performance tracker para CrossFit
*"O app para atletas de CrossFit registrarem PRs, acompanharem evolução e entenderem seu nível de força."*

Simples, direto, claro.

### Opção B — Strength intelligence for functional fitness
*"Transforma seus PRs e treinos em insights reais de performance."*

Mais premium, apela para atletas intermediários/avançados.

### Opção C — Your CrossFit progress, finally visible
*"Chega de PRs espalhados. Veja sua evolução de verdade."*

Foca na dor, tom mais emocional.

### Opção D — From PRs to progress
*"Não é só registrar. É entender o que cada número significa."*

Diferencia de apps que apenas guardam dados.

### Opção E — The performance profile for CrossFit athletes
*"Crie seu perfil de força. Descubra onde você está. Evolua com propósito."*

Posicionamento mais aspiracional, voltado para atletas sérios.

---

## 12. Referências visuais do produto atual

### Tela de login
- Fundo preto `#0A0A0A`
- Logo "CF" em fonte grande bold
- Subtítulo: "PERSONAL · RECORD · LOG"
- Régua decorativa (identidade visual)
- Botões "ENTRAR" e "CRIAR CONTA" com tab navigation
- CTA principal em lime `#D4FF3A`
- Versão `V0.1` no canto

### Dashboard
- Saudação: "Olá, [nome] · Semana [N]"
- Headline dinâmica: "Você está no top X% da humanidade"
- Cards de métricas: Volume 7d | PRs do mês
- Hero PR em card lime com peso grande em JetBrains Mono
- Lista de PRs com barra lateral colorida por nível
- Card de Strength Level com breakdown por categoria

### Detalhe do PR
- Nome do movimento + RM type explícito
- Peso em destaque (tipografia mono grande)
- Barra de progresso colorida pelo nível atual
- E1RM quando calculado via Epley (transparente)
- Histórico de registros

---

## 13. Status atual do produto

- MVP funcional deployado em produção: **https://cf-scores.vercel.app**
- Stack completa implementada (auth, PRs, scoring, Strength Level, treinos, personal trainer)
- 146 testes automatizados (102 unitários + 44 E2E)
- PWA instalável no iOS e Android
- Design system brutalist dark implementado
- Fluxo de onboarding completo (5 steps)
- Scoring para os principais movimentos do CrossFit
- Strength Level com 5 categorias e sistema de confiança

**Próximos passos técnicos planejados:**
- AI coaching (integração com LLM)
- Cards compartilháveis para redes sociais
- Grupos / rankings entre amigos
- Plano premium com features gated

---

## 14. Perguntas estratégicas em aberto

1. O app deve ter vibe mais "CrossFit hardcore" ou "fitness premium minimalista"?
2. O público inicial é atleta recreativo ou coach/personal trainer?
3. O foco do growth inicial é box local, Instagram/TikTok ou indicação entre amigos?
4. O nome deve comunicar força, progresso, score, treino ou comunidade?
5. O produto quer ser mais "Strava para CrossFit" ou "Whoop/Levels para força"?
6. O primeiro canal pago é Athlete Pro ou Coach Pro?
7. Lançar com nome definitivo ou continuar como "CF Scores" até validar?

---

*Documento gerado em maio de 2026. App em desenvolvimento ativo.*
