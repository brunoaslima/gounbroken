-- Bug: um CREATE OR REPLACE FUNCTION personal_save_workout com assinatura
-- diferente (sem p_replace_workout_id) não substituiu a versão canônica —
-- criou um SEGUNDO overload (docs/BUG_PATTERNS.md #9). PostgREST não faz
-- resolução inteligente de overload por parâmetros nomeados: com dois
-- candidatos possíveis pra uma chamada de 5 parâmetros, ele falha com
-- "Could not choose the best candidate function", sem chegar a executar
-- nada. Qualquer chamada que não passasse p_replace_workout_id (o fluxo de
-- auto-registro do atleta sem PT, via WorkoutImportSheet.tsx) quebrava
-- silenciosamente — o catch do frontend engolia o erro (ver fix separado).
DROP FUNCTION IF EXISTS personal_save_workout(UUID, DATE, TEXT[], TEXT, JSONB);
