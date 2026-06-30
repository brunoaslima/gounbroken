import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL  = process.env.VITE_SUPABASE_URL!
const SERVICE_KEY   = process.env.TEST_SERVICE_ROLE_KEY!
const QA_USER_ID    = process.env.TEST_QA_USER_ID!

const TEST_MOVEMENT_NAME = '[TEST] Back Squat QA'

function db() {
  return createClient(SUPABASE_URL, SERVICE_KEY)
}

export async function seedQAMovement(): Promise<string> {
  const client = db()

  // Remove movimento de teste anterior (se existir)
  await client.from('movements').delete().eq('user_id', QA_USER_ID).like('name', '[TEST]%')

  // Cria movimento fresco
  const { data, error } = await client
    .from('movements')
    .insert({ user_id: QA_USER_ID, name: TEST_MOVEMENT_NAME })
    .select('id')
    .single()

  if (error || !data) throw new Error(`seedQAMovement: ${error?.message}`)
  return data.id
}

export async function cleanQATrainingData() {
  const client = db()

  // Busca IDs dos movimentos de teste do QA
  const { data: movs } = await client
    .from('movements')
    .select('id')
    .eq('user_id', QA_USER_ID)
    .like('name', '[TEST]%')

  if (movs && movs.length > 0) {
    const ids = movs.map(m => m.id)
    await client.from('scores').delete().in('movement_id', ids)
    await client.from('movements').delete().in('id', ids)
  }
}

export async function seedQAScore(movementId: string, weightKg: number, reps: number): Promise<string> {
  const client = db()

  const { data, error } = await client
    .from('scores')
    .insert({
      user_id:     QA_USER_ID,
      movement_id: movementId,
      reps,
      weight_kg:   weightKg,
      recorded_at: new Date().toISOString().split('T')[0],
    })
    .select('id')
    .single()

  if (error || !data) throw new Error(`seedQAScore: ${error?.message}`)
  return data.id
}
