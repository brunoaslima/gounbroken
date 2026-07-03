import { useEffect, useState } from 'react'
import { loadExerciseCatalog, getLoadedCatalog, type ExerciseCatalog } from '@/lib/exerciseCatalog'

// Pré-carrega o chunk do catálogo quando o builder monta, para o sheet abrir já populado.
export function useExerciseCatalog(): ExerciseCatalog | null {
  const [catalog, setCatalog] = useState<ExerciseCatalog | null>(getLoadedCatalog())

  useEffect(() => {
    if (catalog) return
    let alive = true
    loadExerciseCatalog().then(c => { if (alive) setCatalog(c) })
    return () => { alive = false }
  }, [catalog])

  return catalog
}
