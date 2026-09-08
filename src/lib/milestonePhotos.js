// Photos attached to milestones.
//
// A milestone photo is a journal memory — the same picture, reached two ways.
// Storing a second copy would double the space and let the two drift apart, so
// the image goes through journalStore like any other memory and we keep only
// the link here: { milestoneId: journalEntryId }.
//
// Works for curated CDC milestones and the parent's own alike, since both have
// stable ids.

import { getEntries, addEntry } from '../data/journalStore'

const KEY = 'milestonePhotos'

export function loadPhotoLinks() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '{}')
    return raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {}
  } catch {
    return {}
  }
}

function persist(map) {
  try {
    localStorage.setItem(KEY, JSON.stringify(map))
  } catch {
    // Quota — the photo is safe in the journal, only the link is lost.
  }
  return map
}

/**
 * Save a picture against a milestone. Creates the journal entry, captioned with
 * the milestone text so it reads properly in the memory book on its own.
 * Returns the updated link map.
 */
export async function attachPhoto(milestoneId, { file, caption }) {
  const entryId = await addEntry({
    note: (caption || '').trim(),
    photoBlob: file,
    photoType: file?.type || 'image/jpeg',
  })
  const map = loadPhotoLinks()
  map[milestoneId] = entryId
  return persist(map)
}

/**
 * Unlink a photo from a milestone. Deliberately does NOT delete the journal
 * entry — the parent saved that memory, and removing a badge from a checklist
 * is not consent to destroy the picture. The Journal is where deletion lives.
 */
export function detachPhoto(milestoneId) {
  const map = loadPhotoLinks()
  delete map[milestoneId]
  return persist(map)
}

/**
 * Object URLs for every linked photo, as { milestoneId: url }.
 * Caller owns the URLs and must revoke them — see the cleanup in
 * MilestonesScreen. Links pointing at deleted journal entries are skipped.
 */
export async function loadPhotoUrls(links) {
  const wanted = new Set(Object.values(links))
  if (!wanted.size) return {}

  const entries = await getEntries()
  const byId = new Map(entries.filter(e => wanted.has(e.id)).map(e => [e.id, e]))

  const urls = {}
  for (const [milestoneId, entryId] of Object.entries(links)) {
    const entry = byId.get(entryId)
    if (entry?.photoBlob) urls[milestoneId] = URL.createObjectURL(entry.photoBlob)
  }
  return urls
}
