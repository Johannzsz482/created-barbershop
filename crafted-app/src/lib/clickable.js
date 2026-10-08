// Makes a card behave like a button (mouse + keyboard) without changing its markup.
// Pass nothing to leave the card non-interactive.
export const clickable = (fn) => fn ? {
  role: 'button', tabIndex: 0, 'data-clickable': true, onClick: fn,
  onKeyDown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fn() } },
} : {}

export const scrollToId = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
