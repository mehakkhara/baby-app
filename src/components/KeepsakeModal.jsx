import { useEffect, useState } from 'react'
import { nameAndAgeAt } from '../lib/babyAge'
import { composeKeepsake, shareKeepsake, KEEPSAKE_THEMES } from '../lib/keepsakeCard'

// Preview + share sheet for a milestone keepsake card. The card recomposes
// on every theme tap (canvas work is ~instant at this size).
export default function KeepsakeModal({ photoUrl, milestoneText, profile, onClose }) {
  const [theme, setTheme] = useState('lavender')
  const [preview, setPreview] = useState(null) // { url, blob }
  const [error, setError] = useState('')
  const [outcome, setOutcome] = useState('')

  const dateLabel = new Date().toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })
  const subtitle = profile?.dateOfBirth
    ? `${nameAndAgeAt(profile.babyName, profile.dateOfBirth, Date.now())} · ${dateLabel}`
    : dateLabel

  useEffect(() => {
    let cancelled = false
    let url = null
    setError('')
    composeKeepsake({ photoUrl, title: milestoneText, subtitle, theme })
      .then(blob => {
        if (cancelled) return
        url = URL.createObjectURL(blob)
        setPreview({ url, blob })
      })
      .catch(() => { if (!cancelled) setError('Could not build the card from this photo.') })
    return () => {
      cancelled = true
      if (url) URL.revokeObjectURL(url)
    }
  }, [photoUrl, milestoneText, subtitle, theme])

  async function handleShare() {
    if (!preview) return
    const result = await shareKeepsake(preview.blob, milestoneText)
    if (result === 'shared') setOutcome('Shared 💜')
    if (result === 'downloaded') setOutcome('Saved — check your downloads 💜')
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(30,27,75,0.45)',
        zIndex: 150,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '480px',
          maxHeight: '90vh',
          background: '#faf9ff',
          borderRadius: '24px 24px 0 0',
          padding: '20px 18px calc(20px + env(safe-area-inset-bottom))',
          overflowY: 'auto',
          boxShadow: '0 -8px 40px rgba(100,100,180,0.25)',
          animation: 'fadeIn 0.2s ease',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#1e1b4b' }}>
            🎞 Keepsake card
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              border: 'none', background: '#ece9f6', borderRadius: '50%',
              width: '30px', height: '30px', fontSize: '16px', cursor: 'pointer',
              color: '#6b7280', lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        {error ? (
          <p style={{
            fontSize: '13px', color: '#b91c1c', background: '#fef2f2',
            border: '1px solid #fecaca', borderRadius: '10px', padding: '10px 12px',
          }}>
            {error}
          </p>
        ) : (
          <div style={{ borderRadius: '16px', overflow: 'hidden', marginBottom: '14px', background: '#e8e5f5', aspectRatio: '4 / 5' }}>
            {preview && (
              <img src={preview.url} alt="Keepsake card preview" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            )}
          </div>
        )}

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginBottom: '14px' }}>
          {KEEPSAKE_THEMES.map(t => (
            <button
              key={t.id}
              onClick={() => setTheme(t.id)}
              aria-label={`${t.label} theme`}
              style={{
                width: '32px', height: '32px', borderRadius: '50%',
                border: theme === t.id ? '2.5px solid #1e1b4b' : '2.5px solid transparent',
                background: t.swatch, cursor: 'pointer', padding: 0,
              }}
            />
          ))}
        </div>

        <button
          onClick={handleShare}
          disabled={!preview}
          style={{
            width: '100%', padding: '13px', borderRadius: '12px', border: 'none',
            background: preview ? 'linear-gradient(135deg, #7C6FF7, #a78bfa)' : '#c4b5fd',
            color: '#fff', fontSize: '14px', fontWeight: '600',
            cursor: preview ? 'pointer' : 'wait',
          }}
        >
          Share the moment
        </button>
        {outcome && (
          <p style={{ margin: '10px 0 0', fontSize: '12.5px', color: '#15803d', fontWeight: 600, textAlign: 'center' }}>
            {outcome}
          </p>
        )}
      </div>
    </div>
  )
}
