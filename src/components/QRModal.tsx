import { useEffect, useRef } from 'react'
import QRCode from 'qrcode'

interface Props {
  url: string
  title: string
  onClose: () => void
}

export default function QRModal({ url, title, onClose }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!canvasRef.current) return
    QRCode.toCanvas(canvasRef.current, `https://${url}`, {
      width: 480,
      margin: 2,
      color: { dark: '#0A0A0A', light: '#F5F5F0' },
    })
  }, [url])

  function handlePrint() {
    window.print()
  }

  return (
    <div
      className="qr-modal-overlay fixed inset-0 flex items-center justify-center z-50"
      style={{ background: 'rgba(0,0,0,0.85)' }}
      onClick={onClose}
    >
      <div
        id="qr-print-target"
        className="qr-modal-content flex flex-col items-center"
        style={{
          background: '#111111',
          border: '1px solid #2A2A2A',
          padding: '40px 40px 32px',
          maxWidth: 560,
          width: '90vw',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="w-full flex items-start justify-between mb-6">
          <div>
            <span
              className="font-mono font-black uppercase block"
              style={{ fontSize: 9, letterSpacing: '0.16em', color: '#6B6B68', marginBottom: 4 }}
            >
              PUBLIC LEADERBOARD
            </span>
            <span
              className="font-sans font-bold block"
              style={{ fontSize: 18, color: '#F5F5F0', lineHeight: 1.2 }}
            >
              {title}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="qr-hide-on-print"
            style={{ color: '#6B6B68', background: 'none', border: 'none', padding: 0, lineHeight: 1 }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* QR canvas */}
        <div style={{ border: '4px solid #F5F5F0', lineHeight: 0 }}>
          <canvas ref={canvasRef} style={{ display: 'block' }} />
        </div>

        {/* URL below QR */}
        <span
          className="font-mono mt-4 text-center"
          style={{ fontSize: 11, letterSpacing: '0.06em', color: '#6B6B68', wordBreak: 'break-all' }}
        >
          {url}
        </span>

        {/* Wordmark */}
        <div className="flex items-center gap-0 mt-5">
          <span className="font-sans font-black" style={{ fontSize: 13, color: '#F5F5F0', letterSpacing: '-0.02em' }}>GO</span>
          <span style={{ width: 28, height: 3, background: '#D4FF3A', margin: '0 5px' }} />
          <span className="font-sans font-black" style={{ fontSize: 13, color: '#F5F5F0', letterSpacing: '-0.02em' }}>UNBROKEN</span>
        </div>

        {/* Print button */}
        <button
          type="button"
          onClick={handlePrint}
          className="qr-hide-on-print w-full font-mono font-black uppercase mt-6"
          style={{
            fontSize: 11,
            letterSpacing: '0.14em',
            padding: '14px 20px',
            background: '#D4FF3A',
            color: '#0A0A0A',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          PRINT — A4
        </button>
      </div>
    </div>
  )
}
