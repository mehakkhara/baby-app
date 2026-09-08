import { useEffect, useRef, useState } from 'react'
import { getBabyAgeInMonths } from '../data/tips'
import { MILESTONES, DOMAINS, CHECKPOINTS, checkpointForAge, MILESTONE_NOTE } from '../data/milestones'
import { loadStatuses, setStatus } from '../lib/milestoneProgress'
import { loadCustom, addCustom, removeCustom, customForCheckpoint } from '../lib/customMilestones'
import { ideasFor } from '../data/milestoneIdeas'
import { loadPhotoLinks, attachPhoto, detachPhoto, loadPhotoUrls } from '../lib/milestonePhotos'

export default function MilestonesScreen({ profile }) {
  const { babyName, dateOfBirth } = profile
  const ageInMonths = getBabyAgeInMonths(dateOfBirth)

  const [milestoneCheckpoint, setMilestoneCheckpoint] = useState(null) // null = follow baby's age
  const [statuses, setStatuses] = useState(() => loadStatuses())
  const [custom, setCustom] = useState(() => loadCustom())
  const [addingOwn, setAddingOwn] = useState(false)
  const [draft, setDraft] = useState('')
  const [photoLinks, setPhotoLinks] = useState(() => loadPhotoLinks())
  const [photoUrls, setPhotoUrls] = useState({})
  const pendingPhotoFor = useRef(null)
  const photoInputRef = useRef(null)

  // Resolve linked journal photos into object URLs, and revoke the previous
  // batch whenever the links change so we don't leak on every attach.
  useEffect(() => {
    let cancelled = false
    let mine = {}
    loadPhotoUrls(photoLinks).then(urls => {
      if (cancelled) {
        Object.values(urls).forEach(URL.revokeObjectURL)
        return
      }
      mine = urls
      setPhotoUrls(urls)
    })
    return () => {
      cancelled = true
      Object.values(mine).forEach(URL.revokeObjectURL)
    }
  }, [photoLinks])

  function mark(id, status) {
    setStatuses({ ...setStatus(id, status) })
  }

  function saveOwn(text) {
    const value = (text ?? draft).trim()
    if (!value) return
    setCustom([...addCustom({ text: value, checkpoint: activeCheckpoint })])
    setDraft('')
  }

  function dropOwn(id) {
    setCustom([...removeCustom(id)])
    if (photoLinks[id]) setPhotoLinks({ ...detachPhoto(id) })
  }

  function pickPhotoFor(milestone) {
    pendingPhotoFor.current = milestone
    photoInputRef.current?.click()
  }

  async function handlePhotoChosen(e) {
    const file = e.target.files?.[0]
    const milestone = pendingPhotoFor.current
    e.target.value = ''            // let the same file be picked again later
    pendingPhotoFor.current = null
    if (!file || !milestone) return
    try {
      const next = await attachPhoto(milestone.id, { file, caption: milestone.text })
      setPhotoLinks({ ...next })
    } catch (err) {
      console.error('Milestone photo failed', err)
      alert(err?.name === 'QuotaExceededError'
        ? "There's no room left on this device for another photo."
        : 'Could not save that photo. Please try again.')
    }
  }

  const activeCheckpoint = milestoneCheckpoint ?? checkpointForAge(ageInMonths)
  // The parent's own milestones sit alongside the curated ones and count
  // toward the same tally — they're no less real for not being on the CDC list.
  // The parent's own milestones lead the list — they went out of their way to
  // add them, so they shouldn't sit below a CDC checklist. They count toward
  // the same tally either way.
  const list = [
    ...customForCheckpoint(custom, activeCheckpoint),
    ...(MILESTONES[activeCheckpoint] || []),
  ]
  const ownForCheckpoint = customForCheckpoint(custom, activeCheckpoint)
  const suggestions = ideasFor(activeCheckpoint, ownForCheckpoint)
  const done = list.filter(m => statuses[m.id] === 'done').length
  const idx = CHECKPOINTS.indexOf(activeCheckpoint)
  const isCurrent = activeCheckpoint === checkpointForAge(ageInMonths)
  const navBtn = disabled => ({
    width: '32px', height: '32px', borderRadius: '50%', border: 'none',
    background: disabled ? '#f3f4f6' : 'linear-gradient(135deg, #7C6FF7, #a78bfa)',
    color: disabled ? '#c4c4d4' : '#fff', fontSize: '16px',
    cursor: disabled ? 'not-allowed' : 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  })

  return (
    <div style={{ maxWidth: '480px', margin: '0 auto', padding: '28px 16px 16px', minHeight: '100vh' }}>
      <input
        ref={photoInputRef}
        type="file"
        accept="image/*"
        onChange={handlePhotoChosen}
        style={{ position: 'absolute', width: 1, height: 1, opacity: 0, pointerEvents: 'none' }}
      />
      {/* Header */}
      <div style={{ marginBottom: '16px', paddingLeft: '2px' }}>
        <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '700', color: '#1e1b4b' }}>
          Milestones
        </h1>
        <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#9ca3af', lineHeight: 1.5 }}>
          Check off what {babyName} is doing and watch the progress unfold.
        </p>
      </div>

      {/* Milestone card */}
      <div style={{
        background: '#fff',
        borderRadius: '20px',
        padding: '18px',
        marginBottom: '14px',
        boxShadow: '0 4px 20px rgba(100,100,180,0.07)',
        borderLeft: '4px solid #7C6FF7',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '11px', fontWeight: '700', color: '#7C6FF7', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Around {activeCheckpoint} months
          </span>
          {list.length > 0 && (
            <span style={{ fontSize: '11px', fontWeight: '600', color: done === list.length ? '#15803d' : '#a78bfa' }}>
              {done === list.length ? `All ${list.length} 🎉` : `${done} of ${list.length}`}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '10px 0 14px' }}>
          <button onClick={() => setMilestoneCheckpoint(CHECKPOINTS[Math.max(0, idx - 1)])} disabled={idx === 0} style={navBtn(idx === 0)}>‹</button>
          <div style={{ textAlign: 'center' }}>
            {isCurrent ? (
              <span style={{ fontSize: '13px', color: '#9ca3af', fontWeight: '600' }}>
                Where {babyName} is now
              </span>
            ) : (
              <button
                onClick={() => setMilestoneCheckpoint(null)}
                style={{ background: 'none', border: 'none', fontSize: '13px', color: '#a78bfa', cursor: 'pointer', fontWeight: '600', padding: 0 }}
              >
                Back to {babyName}'s age
              </button>
            )}
          </div>
          <button onClick={() => setMilestoneCheckpoint(CHECKPOINTS[Math.min(CHECKPOINTS.length - 1, idx + 1)])} disabled={idx === CHECKPOINTS.length - 1} style={navBtn(idx === CHECKPOINTS.length - 1)}>›</button>
        </div>

        {addingOwn ? (
          <div style={{ background: '#faf9ff', borderRadius: '12px', padding: '13px', marginBottom: '8px' }}>
            {suggestions.length > 0 && (
              <>
                <span style={{ display: 'block', fontSize: '9px', fontWeight: '700', color: '#DB2777', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
                  Around this age
                </span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '13px' }}>
                  {suggestions.map(idea => (
                    <button
                      key={idea}
                      onClick={() => saveOwn(idea)}
                      style={{
                        border: '1px solid #ede9fe',
                        background: '#fff',
                        color: '#6b5bd6',
                        borderRadius: '18px',
                        padding: '7px 12px',
                        fontSize: '12px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                      }}
                    >
                      + {idea}
                    </button>
                  ))}
                </div>
              </>
            )}

            <label
              htmlFor="own-milestone"
              style={{ display: 'block', fontSize: '9px', fontWeight: '700', color: '#DB2777', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}
            >
              Or write your own
            </label>
            <div style={{ display: 'flex', gap: '7px' }}>
              <input
                id="own-milestone"
                value={draft}
                onChange={e => setDraft(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') saveOwn() }}
                placeholder={`Something ${babyName} did…`}
                maxLength={120}
                autoFocus
                style={{
                  flex: 1, minWidth: 0, padding: '10px', borderRadius: '9px',
                  border: '1.5px solid #ede9fe', fontSize: '13px', fontFamily: 'inherit',
                  outline: 'none', boxSizing: 'border-box', color: '#1e1b4b',
                }}
              />
              <button
                onClick={() => saveOwn()}
                disabled={!draft.trim()}
                style={{
                  padding: '0 15px', borderRadius: '9px', border: 'none',
                  background: draft.trim() ? 'linear-gradient(135deg, #7C6FF7, #a78bfa)' : '#f0f0f5',
                  color: draft.trim() ? '#fff' : '#c4c4d4',
                  fontSize: '12px', fontWeight: '600', fontFamily: 'inherit',
                  cursor: draft.trim() ? 'pointer' : 'not-allowed', flexShrink: 0,
                }}
              >
                Add
              </button>
            </div>

            <button
              onClick={() => { setAddingOwn(false); setDraft('') }}
              style={{
                width: '100%', marginTop: '11px', padding: '7px', borderRadius: '9px',
                border: 'none', background: '#f0f0f5', color: '#9ca3af',
                fontSize: '12px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              Done
            </button>
          </div>
        ) : (
          <button
            onClick={() => setAddingOwn(true)}
            style={{
              width: '100%', padding: '11px', borderRadius: '12px',
              border: '1.5px dashed #ddd6fe', background: 'none',
              color: '#7C6FF7', fontSize: '12.5px', fontWeight: '600',
              cursor: 'pointer', marginBottom: '8px', fontFamily: 'inherit',
            }}
          >
            + Add a milestone
          </button>
        )}

        {list.map(m => {
          const status = statuses[m.id]
          const isDone = status === 'done'
          const isNotYet = status === 'notyet'
          const dom = DOMAINS[m.domain]
          return (
            <div
              key={m.id}
              style={{
                background: isDone ? '#f0fdf4' : '#faf9ff',
                borderRadius: '12px',
                padding: '12px',
                marginBottom: '8px',
                transition: 'all 0.15s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                <span style={{ display: 'inline-block', fontSize: '9px', fontWeight: '700', color: dom.color, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '2px' }}>
                  {dom.label}
                </span>
                {m.custom && (
                  <button
                    onClick={() => { if (confirm('Remove this milestone?')) dropOwn(m.id) }}
                    aria-label="Remove this milestone"
                    style={{ background: 'none', border: 'none', padding: '0 2px', color: '#c4c4d4', fontSize: '15px', lineHeight: 1, cursor: 'pointer' }}
                  >
                    ×
                  </button>
                )}
              </div>
              <p style={{ margin: 0, fontSize: '13px', lineHeight: 1.5, color: '#1e1b4b', fontWeight: isDone ? '600' : '500' }}>
                {m.text}
              </p>
              <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                <button
                  onClick={() => mark(m.id, 'done')}
                  style={{
                    flex: 1,
                    padding: '7px',
                    borderRadius: '9px',
                    border: 'none',
                    background: isDone ? '#dcfce7' : '#f0f0f5',
                    color: isDone ? '#15803d' : '#9ca3af',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  {isDone ? '✓ Yes!' : 'Yes!'}
                </button>
                <button
                  onClick={() => mark(m.id, 'notyet')}
                  style={{
                    flex: 1,
                    padding: '7px',
                    borderRadius: '9px',
                    border: 'none',
                    background: isNotYet ? '#ede9fe' : '#f0f0f5',
                    color: isNotYet ? '#7C6FF7' : '#9ca3af',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  Not yet
                </button>
              </div>
              {photoUrls[m.id] && (
                <div style={{ marginTop: '10px', borderRadius: '10px', overflow: 'hidden', position: 'relative' }}>
                  <img
                    src={photoUrls[m.id]}
                    alt=""
                    style={{ width: '100%', display: 'block', height: '150px', objectFit: 'cover' }}
                  />
                  <button
                    onClick={() => setPhotoLinks({ ...detachPhoto(m.id) })}
                    aria-label="Remove this photo from the milestone"
                    title="Removes it here — the memory stays in your journal"
                    style={{
                      position: 'absolute', top: '6px', right: '6px',
                      width: '24px', height: '24px', borderRadius: '50%', border: 'none',
                      background: 'rgba(0,0,0,0.45)', color: '#fff', fontSize: '13px',
                      lineHeight: 1, cursor: 'pointer', padding: 0,
                    }}
                  >
                    ×
                  </button>
                </div>
              )}

              {!photoUrls[m.id] && (
                <button
                  onClick={() => pickPhotoFor(m)}
                  style={{
                    marginTop: '8px', width: '100%', padding: '7px',
                    borderRadius: '9px', border: '1.5px dashed #e5e0f8',
                    background: 'none', color: '#a78bfa',
                    fontSize: '11.5px', fontWeight: '600', cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  📷 Add a picture
                </button>
              )}

              {isNotYet && m.tip && (
                <div style={{
                  marginTop: '10px',
                  background: '#f5f3ff',
                  borderRadius: '10px',
                  padding: '10px 12px',
                }}>
                  <p style={{ margin: 0, fontSize: '12px', lineHeight: 1.6, color: '#6b5bd6' }}>
                    <strong>💡 Try this:</strong> {m.tip}
                  </p>
                </div>
              )}
            </div>
          )
        })}

        <p style={{ margin: '6px 2px 0', fontSize: '11px', color: '#c4c4d4', lineHeight: 1.5 }}>
          {MILESTONE_NOTE}
        </p>
      </div>
    </div>
  )
}
