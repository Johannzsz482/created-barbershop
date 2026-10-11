export function composeNotes(hairstyleName, notes) {
  const existingNotes = String(notes ?? '').trim()

  if (!hairstyleName) return existingNotes

  const remainingNotes = existingNotes
    .replace(/^Hairstyle:\s*[^.\r\n]+\.?\s*/i, '')
    .trim()

  return [`Hairstyle: ${hairstyleName}.`, remainingNotes]
    .filter(Boolean)
    .join(' ')
}
