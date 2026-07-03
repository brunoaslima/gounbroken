import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

export default function CompetitionJoin() {
  const { code } = useParams<{ code: string }>()
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const redeemingRef = useRef(false)

  useEffect(() => {
    if (authLoading || !user || !code || redeemingRef.current) return
    redeemingRef.current = true
    supabase
      .rpc('redeem_competition_invite', { p_code: code })
      .then(({ data, error: rpcErr }) => {
        if (rpcErr) {
          setError('CONVITE INVÁLIDO · CONFIRA O LINK COM O ORGANIZADOR')
          return
        }
        navigate(`/athlete/competitions/${data as string}`, { replace: true })
      })
  }, [authLoading, user, code, navigate])

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center px-6" style={{ gap: 24 }}>
      <div className="flex items-center" style={{ gap: 9, fontWeight: 700, fontSize: 17, color: '#F5F5F0', fontFamily: "'Space Grotesk', sans-serif" }}>
        GO<span style={{ width: 18, height: 5, background: '#D4FF3A', display: 'inline-block' }} />UNBROKEN
      </div>

      {authLoading || (user && !error) ? (
        <>
          <div className="w-6 h-6 border-2 animate-spin" style={{ borderColor: '#D4FF3A', borderTopColor: 'transparent' }} />
          <span className="font-mono font-bold uppercase tracking-[0.14em] text-[10px] text-[#6B6B68]">
            Validando convite...
          </span>
        </>
      ) : error ? (
        <>
          <span
            className="font-mono font-bold uppercase text-[10px] text-[#FF3B30] text-center"
            style={{ letterSpacing: '0.14em', border: '1px solid #FF3B30', padding: '12px 16px', maxWidth: 340 }}
          >
            {error}
          </span>
          <button
            onClick={() => navigate('/athlete/competitions')}
            className="font-mono font-black uppercase text-[11px] text-[#F5F5F0]"
            style={{ letterSpacing: '0.14em', background: 'transparent', border: '1px solid #2A2A2A', padding: '12px 24px', cursor: 'pointer' }}
          >
            VER COMPETIÇÕES
          </button>
        </>
      ) : (
        <>
          <div className="flex flex-col items-center text-center" style={{ gap: 10, maxWidth: 340 }}>
            <span className="font-mono font-bold uppercase tracking-[0.2em] text-[10px] text-[#FF8A00]">
              COMPETIÇÃO PRIVADA
            </span>
            <p className="font-sans text-[15px] text-[#A8A8A4]" style={{ lineHeight: 1.6, margin: 0 }}>
              Você recebeu um convite para uma competição privada. Faça login para acessar e se inscrever.
            </p>
            <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-[#3D3D3B]">
              Depois de entrar, toque no link do convite novamente
            </span>
          </div>
          <button
            onClick={() => navigate('/login')}
            className="font-mono font-black uppercase text-[12px] text-[#0A0A0A] bg-[#D4FF3A]"
            style={{ letterSpacing: '0.16em', border: 'none', padding: '14px 32px', cursor: 'pointer' }}
          >
            FAZER LOGIN →
          </button>
        </>
      )}
    </div>
  )
}
