# Go Unbroken — Estratégia de Produto

> Documento interno de referência. Atualizar quando uma capability mudar de status
> ou uma decisão de posicionamento for revista.

---

## Posicionamento

**Go Unbroken é a plataforma completa do atleta de fitness funcional.**

O atleta registra PRs, enxerga a própria evolução (percentil normalizado por peso,
idade e sexo), treina com programação de coach ou sugestão de IA, e compete em
eventos com leaderboard ao vivo.

Não somos "um app de leaderboard". O leaderboard é o **momento de glória** de uma
jornada que começa no primeiro PR registrado. A narrativa do produto — e de todo
material de marketing — é a jornada: **LOG → TRAIN → COMPETE**.

## Audiências

| Audiência | Papel no produto | Papel no crescimento |
|---|---|---|
| **Atleta individual** | Core. Registra PRs, treina, acompanha evolução | Retenção — uso diário |
| **Coach / Personal** | Programa treinos para N atletas em um dashboard | Multiplicador — traz atletas em lote (B2B2C) |
| **Organizador de evento / Box** | Cria competições, gerencia divisões, judge panel | Aquisição em rajada — evento traz o box inteiro |

## Capabilities e status

1. **PRs e Insights** ✅ — scores, movement detail, stats, strength levels/percentil, wrapped report
2. **Training** ✅ — my workouts, buildup calculator, CrossFit timer (6 modos)
3. **Personal Trainer** ✅ — dashboard de atletas, prescrição de treinos, sugestões via IA
4. **Competition** ✅ — criação de eventos, divisões (formato × composição × categoria), teams, judge panel em tempo real, leaderboard ao vivo com página pública (`/competition/:slug`)
5. **Social / Community** ⏳ — pendente (próxima capability)

## Loops de produto

- **Hook diário (retenção):** registrar PR → ver insight/percentil na hora. O tier
  ("top 18%") é o mecanismo de dopamina do uso individual.
- **Multiplicador (B2B2C):** coach adota a plataforma → convida os atletas dele →
  cada atleta vira usuário individual com o hook diário.
- **Viral (aquisição em rajada):** box organiza competição → leaderboard público é
  projetado no telão e compartilhado → todo participante e espectador conhece o
  produto num momento de alta emoção → cadastros.

Os três loops se alimentam: o atleta adquirido pela competição vira usuário diário;
o usuário diário pede pro coach usar a plataforma; o coach organiza a próxima
competição do box.

## Prioridades sugeridas (backlog estratégico)

Ordem sugerida, não compromisso:

1. **Social / Community** — única capability pendente; fecha o ciclo dos loops
   (atleta segue atleta, feed de PRs, comparação entre amigos do box)
2. **Realtime no leaderboard** — substituir polling de 30s por Supabase Realtime
   quando eventos passarem de ~centenas de espectadores simultâneos
3. **UX de instalação PWA no iOS** — onboarding "adicione à tela de início";
   conferir apple-touch-icon e splash screens
4. **SMTP customizado** — Resend + DNS para emails saírem de noreply@gounbroken.app
   (pendência conhecida)

## Diretriz para a landing page

A landing conta a jornada completa com os três pilares em peso igual e o PR como
porta de entrada. O leaderboard aparece como payoff do pilar COMPETE — demonstração
viva, não tese da página. Hero: "Log it. Train it. Prove it."
