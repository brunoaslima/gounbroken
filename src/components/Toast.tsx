import { createContext, useCallback, useContext, useEffect, useId, useMemo, useRef, useState } from 'react'

// ── tokens ────────────────────────────────────────────────────────────
const C = {
  bg0:'#0A0A0A', bg1:'#141414', bg2:'#1F1F1F', bg3:'#2A2A2A',
  fg0:'#F5F5F0', fg1:'#A8A8A4', fg2:'#6B6B68',
  border0:'#2A2A2A', border1:'#3D3D3B',
  success:'#D4FF3A', successInk:'#0A0A0A',
  error:'#FF3B30',   errorInk:'#FFFFFF',
  warn:'#FFB800',    warnInk:'#0A0A0A',
  info:'#4DA3FF',    infoInk:'#0A0A0A',
} as const

const FONTS = {
  display:'"Space Grotesk", "Helvetica Neue", Helvetica, Arial, sans-serif',
  mono:'"JetBrains Mono", ui-monospace, "SF Mono", Menlo, monospace',
}

const META = {
  success: { code:'200', label:'SUCCESS', glyph:'✓' },
  error:   { code:'500', label:'ERROR',   glyph:'✕' },
  warn:    { code:'300', label:'WARN',    glyph:'!' },
  info:    { code:'100', label:'INFO',    glyph:'i' },
} as const

// ── types ─────────────────────────────────────────────────────────────
type Variant = 'success' | 'error' | 'warn' | 'info'

export interface ToastInput {
  variant?: Variant
  title: string
  desc?: string
  duration?: number
  action?: { label: string; onClick: () => void }
}

interface ToastItem extends Required<Pick<ToastInput, 'variant' | 'title' | 'duration'>> {
  id: number
  desc?: string
  action?: ToastInput['action']
  ts: Date
}

interface ToastAPI {
  push(t: ToastInput): number
  dismiss(id: number): void
  success(t: ToastInput): number
  error(t: ToastInput): number
  warn(t: ToastInput): number
  info(t: ToastInput): number
}

// ── context ───────────────────────────────────────────────────────────
const ToastContext = createContext<ToastAPI | null>(null)

export function useToast(): ToastAPI {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be inside <ToastProvider>')
  return ctx
}

// ── provider ──────────────────────────────────────────────────────────
export function ToastProvider({
  children,
  position = 'bottom-right',
  max = 3,
}: {
  children: React.ReactNode
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left' | 'bottom-center' | 'top-center'
  max?: number
}) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const idRef = useRef(0)

  const dismiss = useCallback((id: number) => {
    setToasts(ts => ts.filter(t => t.id !== id))
  }, [])

  const push = useCallback((t: ToastInput): number => {
    const id = ++idRef.current
    const item: ToastItem = { id, variant: 'info', duration: 5000, ts: new Date(), ...t }
    setToasts(ts => [item, ...ts].slice(0, max))
    if (item.duration > 0) setTimeout(() => dismiss(id), item.duration)
    return id
  }, [max, dismiss])

  const api = useMemo<ToastAPI>(() => ({
    push, dismiss,
    success: (t) => push({ ...t, variant: 'success' }),
    error:   (t) => push({ ...t, variant: 'error' }),
    warn:    (t) => push({ ...t, variant: 'warn' }),
    info:    (t) => push({ ...t, variant: 'info' }),
  }), [push, dismiss])

  return (
    <ToastContext.Provider value={api}>
      {children}
      <ToastViewport toasts={toasts} dismiss={dismiss} position={position} />
    </ToastContext.Provider>
  )
}

// ── viewport ──────────────────────────────────────────────────────────
function ToastViewport({
  toasts,
  dismiss,
  position,
}: {
  toasts: ToastItem[]
  dismiss: (id: number) => void
  position: string
}) {
  const isBottom = position.startsWith('bottom')
  const isRight  = position.endsWith('right')
  const isCenter = position.endsWith('center')

  const wrap: React.CSSProperties = {
    position: 'fixed',
    [isBottom ? 'bottom' : 'top']: 24,
    display: 'flex',
    flexDirection: isBottom ? 'column-reverse' : 'column',
    gap: 14,
    zIndex: 300,
    pointerEvents: 'none',
    maxWidth: 'calc(100vw - 48px)',
    width: 400,
    ...(isCenter
      ? { left: '50%', transform: 'translateX(-50%)' }
      : isRight
        ? { right: 24 }
        : { left: 24 }),
  }

  return (
    <div style={wrap}>
      {toasts.map(t => (
        <ToastItem key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
      ))}
    </div>
  )
}

// ── helpers ───────────────────────────────────────────────────────────
function fmtTime(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

function Stripes({ ink, opacity = 0.18 }: { ink: string; opacity?: number }) {
  const id = useId()
  return (
    <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
      <defs>
        <pattern id={`hatch-${id}`} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="6" stroke={ink} strokeWidth="2" opacity={opacity} />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#hatch-${id})`} />
    </svg>
  )
}

function TickRow({ ink, n = 20 }: { ink: string; n?: number }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', height: 8, width: '100%' }}>
      {Array.from({ length: n }).map((_, i) => (
        <span key={i} style={{
          width: 1.5, background: ink,
          height: i % 5 === 0 ? '100%' : '50%',
          opacity: i % 5 === 0 ? 0.9 : 0.4,
        }} />
      ))}
    </div>
  )
}

// inject progress keyframes once
if (typeof document !== 'undefined' && !document.getElementById('cf-toast-keyframes')) {
  const s = document.createElement('style')
  s.id = 'cf-toast-keyframes'
  s.textContent = `@keyframes cf-toast-progress { from { transform: scaleX(1); } to { transform: scaleX(0); } }`
  document.head.appendChild(s)
}

// ── single toast ──────────────────────────────────────────────────────
function ToastItem({ toast, onDismiss }: { toast: ToastItem; onDismiss: () => void }) {
  const [enter, setEnter] = useState(false)
  useEffect(() => { requestAnimationFrame(() => setEnter(true)) }, [])

  const v       = toast.variant
  const accent  = C[v]
  const ink     = C[`${v}Ink` as keyof typeof C]
  const meta    = META[v]
  const id6     = String(toast.id).padStart(4, '0')

  return (
    <div style={{
      pointerEvents: 'auto',
      background: C.bg1,
      border: `1px solid ${accent}`,
      color: C.fg0,
      fontFamily: FONTS.display,
      transform: enter ? 'translateX(0)' : 'translateX(28px)',
      opacity: enter ? 1 : 0,
      transition: 'transform 220ms cubic-bezier(0.2,0.8,0.2,1), opacity 220ms ease',
      position: 'relative', overflow: 'hidden',
      boxShadow: `0 0 0 1px ${C.bg0}, 8px 8px 0 -2px ${accent}`,
    }}>

      {/* Header strip */}
      <div style={{
        position: 'relative', background: accent, color: ink,
        padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <Stripes ink={ink} opacity={0.14} />
        <span style={{
          position: 'relative', zIndex: 1,
          background: ink, color: accent,
          fontFamily: FONTS.mono, fontWeight: 800, fontSize: 10,
          letterSpacing: '0.12em', padding: '4px 7px', lineHeight: 1,
        }}>{meta.code}</span>
        <span style={{
          position: 'relative', zIndex: 1,
          fontFamily: FONTS.mono, fontWeight: 800, fontSize: 11,
          letterSpacing: '0.18em', color: ink, lineHeight: 1,
        }}>{meta.label}</span>
        <span style={{ flex: 1 }} />
        <span style={{
          position: 'relative', zIndex: 1,
          fontFamily: FONTS.mono, fontWeight: 700, fontSize: 10,
          letterSpacing: '0.06em', color: ink, opacity: 0.75, lineHeight: 1,
        }}>{fmtTime(toast.ts)}</span>
        <span style={{ position: 'relative', zIndex: 1, width: 1, height: 12, background: ink, opacity: 0.35 }} />
        <span style={{
          position: 'relative', zIndex: 1,
          fontFamily: FONTS.mono, fontWeight: 700, fontSize: 10,
          letterSpacing: '0.06em', color: ink, opacity: 0.75, lineHeight: 1,
        }}>#{id6}</span>
        <button onClick={onDismiss} aria-label="Fechar" style={{
          position: 'relative', zIndex: 1,
          background: 'transparent', border: 0, color: ink, cursor: 'pointer',
          padding: 0, marginLeft: 4, fontFamily: FONTS.mono, fontWeight: 800, fontSize: 13, lineHeight: 1,
        }}>✕</button>
      </div>

      {/* Body */}
      <div style={{ display: 'flex', alignItems: 'stretch' }}>
        {/* Stamp */}
        <div style={{
          width: 64, flexShrink: 0, background: C.bg0,
          borderRight: `1px solid ${C.border0}`,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 0', position: 'relative',
        }}>
          <span style={{ width: 8, height: 1.5, background: accent }} />
          <div style={{
            width: 38, height: 38, border: `1.5px solid ${accent}`, color: accent,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: FONTS.mono, fontWeight: 800, fontSize: 20, lineHeight: 1,
            position: 'relative',
          }}>
            <span style={{ marginTop: v === 'warn' ? -1 : 0 }}>{meta.glyph}</span>
            <span style={{ position: 'absolute', top: -3, left: -3, width: 5, height: 5, borderTop: `1.5px solid ${accent}`, borderLeft: `1.5px solid ${accent}` }} />
            <span style={{ position: 'absolute', bottom: -3, right: -3, width: 5, height: 5, borderBottom: `1.5px solid ${accent}`, borderRight: `1.5px solid ${accent}` }} />
          </div>
          <span style={{ fontFamily: FONTS.mono, fontWeight: 800, fontSize: 9, letterSpacing: '0.1em', color: C.fg2 }}>v01</span>
        </div>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0, padding: '12px 14px 14px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ fontFamily: FONTS.display, fontSize: 15, fontWeight: 700, letterSpacing: '-0.01em', color: C.fg0, lineHeight: 1.25 }}>
            {toast.title}
          </div>
          {toast.desc && (
            <div style={{ fontFamily: FONTS.display, fontSize: 13, color: C.fg1, lineHeight: 1.4 }}>
              {toast.desc}
            </div>
          )}

          <div style={{ marginTop: 8, opacity: 0.6 }}>
            <TickRow ink={accent} n={24} />
          </div>

          {toast.action ? (
            <div style={{ marginTop: 8, display: 'flex', gap: 0, alignItems: 'stretch' }}>
              <button onClick={() => { toast.action!.onClick?.(); onDismiss() }} style={{
                background: accent, border: 0, color: ink,
                padding: '9px 14px', fontFamily: FONTS.mono, fontWeight: 800, fontSize: 11,
                letterSpacing: '0.12em', textTransform: 'uppercase', cursor: 'pointer', borderRadius: 0,
                display: 'inline-flex', alignItems: 'center', gap: 10,
              }}>
                {toast.action.label}
                <span style={{ fontFamily: FONTS.mono, fontWeight: 800 }}>→</span>
              </button>
              <button onClick={onDismiss} style={{
                background: 'transparent', border: `1px solid ${C.border1}`, color: C.fg1,
                padding: '9px 14px', fontFamily: FONTS.mono, fontWeight: 700, fontSize: 11,
                letterSpacing: '0.12em', textTransform: 'uppercase', cursor: 'pointer', borderRadius: 0,
                marginLeft: -1,
              }}>Dispensar</button>
            </div>
          ) : (
            <div style={{ marginTop: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontFamily: FONTS.mono, fontWeight: 700, fontSize: 10, letterSpacing: '0.12em', color: C.fg2 }}>
                GO · UNBROKEN · LOG
              </span>
              <span style={{ fontFamily: FONTS.mono, fontWeight: 700, fontSize: 10, letterSpacing: '0.12em', color: C.fg2 }}>
                AUTO ↻ {Math.round((toast.duration || 0) / 1000)}s
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Progress bar */}
      {toast.duration > 0 && (
        <span style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, background: accent,
          transformOrigin: 'left',
          animation: `cf-toast-progress ${toast.duration}ms linear forwards`,
        }} />
      )}
    </div>
  )
}
