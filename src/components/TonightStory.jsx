import { useMemo } from 'react'
import PaintingCanvas from './PaintingCanvas'
import { getBabyAgeInMonths } from '../data/tips'
import { pickTonight } from '../data/stories'
import { getReadIds, todayKey } from '../lib/storyProgress'

const SERIF = "Georgia, 'Iowan Old Style', 'Palatino Linotype', Palatino, serif"

// Evening hero for the Home screen: tonight's story, front and center at the
// hour it's actually used. Same pick as the Stories tab (same seed), so the
// two screens always agree on what "tonight's story" is. Tapping it switches
// to the Stories tab rather than opening the reader directly — the shelf is
// part of the ritual.
export default function TonightStory({ profile, onOpenStories }) {
  const ageInMonths = getBabyAgeInMonths(profile.dateOfBirth)
  const babyName = (profile.babyName || '').trim() || 'your baby'

  const tonight = useMemo(
    () => pickTonight(ageInMonths, {
      seed: `${todayKey()}:${profile.babyName || ''}`,
      readIds: getReadIds(),
    }),
    [ageInMonths, profile.babyName],
  )

  if (!tonight) return null

  return (
    <button
      onClick={onOpenStories}
      style={{
        width: '100%',
        display: 'block',
        padding: 0,
        border: 'none',
        borderRadius: '20px',
        overflow: 'hidden',
        cursor: 'pointer',
        backgroundColor: '#10131f',
        boxShadow: '0 4px 20px rgba(26,26,46,0.25)',
        marginBottom: '14px',
        textAlign: 'left',
      }}
    >
      <div style={{ position: 'relative', height: '150px' }}>
        <PaintingCanvas id={tonight.pages[0].art} />
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(to bottom, rgba(16,19,31,0) 25%, rgba(16,19,31,0.94) 100%)',
        }} />
        <div style={{ position: 'absolute', left: '18px', right: '18px', bottom: '12px' }}>
          <div style={{
            fontSize: '10px',
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: '#e8b13d',
            fontWeight: 700,
            marginBottom: '4px',
          }}>
            🌙 Tonight's story
          </div>
          <div style={{ fontFamily: SERIF, fontSize: '20px', lineHeight: 1.2, color: '#f3e6c8' }}>
            {tonight.title}
          </div>
          <div style={{ fontSize: '11px', color: '#a79fd6', marginTop: '4px' }}>
            Ready when {babyName} is · tap to read
          </div>
        </div>
      </div>
    </button>
  )
}
