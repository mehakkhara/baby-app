// Photo-hunt month state — which prompts she's captured this calendar month,
// each linked to the journal entry it created. localStorage, one key per
// month (photoHunt:YYYY-MM), so past months' grids stay retrievable and a new
// month starts fresh automatically.

export function currentMonthKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function storageKey(monthKey) {
  return `photoHunt:${monthKey}`
}

// { [promptId]: { entryId, ts } }
export function loadHunt(monthKey = currentMonthKey()) {
  try {
    return JSON.parse(localStorage.getItem(storageKey(monthKey)) || '{}')
  } catch {
    return {}
  }
}

export function recordCapture(promptId, entryId, monthKey = currentMonthKey()) {
  const state = loadHunt(monthKey)
  state[promptId] = { entryId, ts: Date.now() }
  try {
    localStorage.setItem(storageKey(monthKey), JSON.stringify(state))
  } catch {
    /* quota — the journal entry still exists, only the grid link is lost */
  }
  return state
}
