export const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
export const toMin = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m }
export const toHHMM = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
export const fmt12 = (t) => { const m = toMin(t); const h = Math.floor(m / 60); return `${String(h % 12 || 12).padStart(2, '0')}:${String(m % 60).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}` }
export const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
export const peso = (n) => '₱' + Number(n).toLocaleString()
export const fullName = (p) => `${p.first_name} ${p.last_name}`.trim()
export const prettyDate = (s) => new Date(s + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
export const longDate = (s) => new Date(s + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
