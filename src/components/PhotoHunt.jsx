import { useEffect, useRef, useState } from 'react'
import { addEntry, getEntries, compressImage } from '../data/journalStore'
import { getBabyAgeInMonths } from '../data/tips'
import { promptsForAge } from '../data/photoPrompts'
import { loadHunt, recordCapture } from '../lib/photoHunt'

// This month's photo hunt — a 3×3 grid of tiny photo missions. Capturing one
// saves the photo to the journal (prompt as the note) and fills the cell with
// its thumbnail, so the grid doubles as a month-at-a-glance keepsake.
export default function PhotoHunt({ profile, onSaved, onCheckIn, onOpenJournal }) {
  const ageInMonths = getBabyAgeInMonths(profile.dateOfBirth)
  const prompts = promptsForAge(ageInMonths)

  const [captures, setCaptures] = useState(() => loadHunt())
  const [thumbs, setThumbs] = useState({})       // promptId -> object URL
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const pendingPrompt = useRef(null)
  const inputRef = useRef(null)

  // Resolve captured entries to thumbnails; revoke the batch on change.
  useEffect(() => {
    let cancelled = false
    const urls = []
    ;(async () => {
      const wanted = new Map(
        Object.entries(captures).map(([promptId, c]) => [c.entryId, promptId]),
      )
      if (wanted.size === 0) { setThumbs({}); return }
      try {
        const entries = await getEntries()
        const next = {}
        for (const e of entries) {
          const promptId = wanted.get(e.id)
          if (promptId && e.photoBlob) {
            const url = URL.createObjectURL(e.photoBlob)
            urls.push(url)
            next[promptId] = url
          }
        }
        if (cancelled) { urls.forEach(u => URL.revokeObjectURL(u)); return }
        setThumbs(next)
      } catch { /* grid just shows prompts */ }
    })()
    return () => {
      cancelled = true
      urls.forEach(u => URL.revokeObjectURL(u))
    }
  }, [captures])

  function pickFor(prompt) {
    if (captures[prompt.id] || saving) return
    pendingPrompt.current = prompt
    inputRef.current?.click()
  }

  async function handleChosen(e) {
    const file = e.target.files?.[0]
    const prompt = pendingPrompt.current
    e.target.value = ''
    pendingPrompt.current = null
    if (!file || !prompt) return
    setSaving(true)
    setError('')
    try {
      const blob = await compressImage(file)
      const entryId = await addEntry({
        note: `📸 Photo hunt: ${prompt.label}`,
        photoBlob: blob,
        photoType: 'image/jpeg',
      })
      setCaptures({ ...recordCapture(prompt.id, entryId) })
      onSaved?.()
      onCheckIn?.()
    } catch (err) {
      console.error('Photo hunt save failed', err)
      setError(err?.name === 'QuotaExceededError'
        ? "There's no room left on this device for another photo."
        : 'Could not save that photo. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const capturedCount = prompts.filter(p => captures[p.id]).length
  const monthName = new Date().toLocaleDateString(undefined, { month: 'long' })

  return (
    <div style={{
      background: '#fff',
      borderRadius: '20px',
      padding: '18px',
      marginTop: '12px',
      boxShadow: '0 4px 20px rgba(100,100,180,0.07)',
      borderLeft: '4px solid #f472b6',
    }}>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleChosen}
        style={{ position: 'absolute', width: 1, height: 1, opacity: 0, pointerEvents: 'none' }}
      />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '4px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '16px' }}>📷</span>
          <span style={{ fontSize: '11px', fontWeight: '700', color: '#db2777', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            {monthName} photo hunt
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
          <span style={{ fontSize: '11px', fontWeight: '600', color: capturedCount === prompts.length ? '#15803d' : '#f472b6' }}>
            {capturedCount === prompts.length ? `All ${prompts.length} 🎉` : `${capturedCount} of ${prompts.length}`}
          </span>
          {onOpenJournal && (
            <button
              onClick={onOpenJournal}
              style={{
                background: 'none', border: 'none', padding: 0,
                color: '#7C6FF7', fontSize: '12px', fontWeight: '600', cursor: 'pointer',
              }}
            >
              Journal →
            </button>
          )}
        </div>
      </div>
      <p style={{ margin: '0 0 12px', fontSize: '12px', color: '#9ca3af', lineHeight: 1.5 }}>
        Nine little moments to catch this month — each one saves to {profile.babyName}'s journal.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '7px' }}>
        {prompts.map(p => {
          const done = Boolean(captures[p.id])
          const thumb = thumbs[p.id]
          return (
            <button
              key={p.id}
              onClick={() => pickFor(p)}
              disabled={saving}
              aria-label={done ? `${p.label} — captured` : `Capture: ${p.label}`}
              style={{
                position: 'relative',
                aspectRatio: '1',
                borderRadius: '12px',
                border: done ? '1.5px solid #fbcfe8' : '1.5px dashed #ddd6fe',
                background: done ? '#fdf2f8' : '#faf9ff',
                cursor: done ? 'default' : 'pointer',
                overflow: 'hidden',
                padding: '4px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '3px',
                fontFamily: 'inherit',
                transition: 'all 0.25s ease',
              }}
            >
              {thumb ? (
                <>
                  <img src={thumb} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                  <span style={{
                    position: 'absolute', left: 0, right: 0, bottom: 0,
                    padding: '10px 4px 4px',
                    background: 'linear-gradient(to bottom, transparent, rgba(0,0,0,0.55))',
                    color: '#fff', fontSize: '8.5px', fontWeight: 700, lineHeight: 1.2,
                  }}>
                    ✓ {p.label}
                  </span>
                </>
              ) : (
                <>
                  <span style={{ fontSize: '20px' }}>{done ? '📸' : p.emoji}</span>
                  <span style={{ fontSize: '9px', fontWeight: 700, color: done ? '#db2777' : '#9ca3af', lineHeight: 1.2, textAlign: 'center' }}>
                    {p.label}
                  </span>
                </>
              )}
            </button>
          )
        })}
      </div>

      {error && (
        <p style={{
          margin: '10px 0 0', fontSize: '12px', color: '#b91c1c',
          background: '#fef2f2', border: '1px solid #fecaca',
          borderRadius: '10px', padding: '8px 10px',
        }}>
          {error}
        </p>
      )}
      {capturedCount === prompts.length && (
        <p style={{ margin: '10px 0 0', fontSize: '12px', color: '#15803d', fontWeight: 600, textAlign: 'center' }}>
          The whole grid — {monthName} is safely in the memory book 💜
        </p>
      )}
    </div>
  )
}
