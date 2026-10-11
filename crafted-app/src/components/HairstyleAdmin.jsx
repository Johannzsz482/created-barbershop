import { useState } from 'react'
import Modal from './Modal'
import HairstyleImage from './HairstyleImage'
import { useCatalog } from '../context/CatalogContext'

// type="button" so the switch never submits the edit form it sits in
const Switch = ({ on, onClick, label }) => <button type="button" className={`switch${on ? ' on' : ''}`} onClick={onClick} aria-label={label} aria-pressed={on}><i /></button>

// Admin -> Services -> Hairstyles. The categories ARE the existing paid services (nothing is duplicated and no hairstyle has a price or duration).
// view: null = the category cards, 'all' = every hairstyle, or a service_id = that category's hairstyles.
export default function HairstyleAdmin() {
  const { services, hairstyles, addHairstyle, saveHairstyle, toggleHairstyle, deleteHairstyle } = useCatalog()
  const [view, setView] = useState(null)
  const [form, setForm] = useState(null)   // { hairstyle_id?, service_id, name, is_active }
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false); const [rowErr, setRowErr] = useState('')

  const inCat = (id) => hairstyles.filter((h) => h.service_id === id)
  const cat = typeof view === 'number' ? services.find((s) => s.service_id === view) : null
  const mode = view === 'all' ? 'all' : cat ? 'cat' : 'cats'   // a category that no longer exists falls back to the category cards
  const rows = mode === 'all' ? services.flatMap((s) => inCat(s.service_id)) : mode === 'cat' ? inCat(cat.service_id) : []
  const catName = (id) => services.find((s) => s.service_id === id)?.service_name || '—'

  const open = (v) => { setView(v); setRowErr('') }
  const closeForm = () => { if (busy) return; setForm(null); setErr('') }
  const submit = async (e) => {
    e.preventDefault()
    const name = (form.name || '').trim()
    if (!name) return setErr('Enter a hairstyle name.')
    if (!form.hairstyle_id && !form.service_id) return setErr('Choose a category.')
    setBusy(true); setErr('')
    const r = form.hairstyle_id ? await saveHairstyle({ ...form, name }) : await addHairstyle(+form.service_id, name)
    setBusy(false)
    if (!r.ok) return setErr(r.error || 'The hairstyle was not saved. Please try again.')
    setForm(null)
  }
  const toggle = async (h) => { setRowErr(''); const r = await toggleHairstyle(h.hairstyle_id); if (!r.ok) setRowErr(r.error || 'The change was not saved. Please try again.') }
  const remove = async (h) => {
    if (!window.confirm(`Delete ${h.name}? This only removes it from the hairstyle list; bookings are not affected.`)) return
    setRowErr(''); const r = await deleteHairstyle(h.hairstyle_id); if (!r.ok) setRowErr(r.error || 'The hairstyle was not deleted. Please try again.')
  }

  return <div className="panel">
    <header><div><h2>Hairstyles</h2><p>{mode === 'cats' ? 'Each category is one of the paid services above. Click one to manage its hairstyles.' : mode === 'all' ? 'Every hairstyle, grouped by category.' : `Hairstyles under ${cat.service_name}. Price and duration come from the service.`}</p></div></header>
    {mode === 'cats' && <div className="hcat-grid">
      <button type="button" className="hcat hcat-all" onClick={() => open('all')}><b>All Hairstyles</b><small>{hairstyles.length} hairstyle{hairstyles.length === 1 ? '' : 's'}</small></button>
      {services.map((s) => { const n = inCat(s.service_id).length
        return <button type="button" key={s.service_id} className="hcat" onClick={() => open(s.service_id)}><b>{s.service_name}</b><small>{n} hairstyle{n === 1 ? '' : 's'}</small></button> })}
    </div>}
    {mode !== 'cats' && <>
      <div className="toolbar"><button type="button" className="mini ghost" onClick={() => open(null)}>&larr; Categories</button>
        {mode === 'cat' && <button type="button" className="mini ghost" onClick={() => open('all')}>All Hairstyles</button>}
        <span className="muted">{mode === 'all' ? 'All Hairstyles' : cat.service_name} · {rows.length} hairstyle{rows.length === 1 ? '' : 's'}</span>
        <button type="button" className="btn btn-gold sm" onClick={() => setForm({ name: '', service_id: mode === 'cat' ? cat.service_id : '', is_active: true })}>+ Add hairstyle</button></div>
      {rowErr && <p role="alert" style={{ margin: '0 0 12px', color: '#e5736b' }}>{rowErr}</p>}
      <div className="table-wrap"><table className="tbl left"><thead><tr><th>Photo</th><th>Hairstyle</th>{mode === 'all' && <th>Category</th>}<th>Active</th><th></th></tr></thead><tbody>
        {rows.map((h) => <tr key={h.hairstyle_id}><td><div className="hcat-thumb"><HairstyleImage style={h} compact /></div></td><td>{h.name}</td>{mode === 'all' && <td>{catName(h.service_id)}</td>}
          <td><Switch on={!!h.is_active} onClick={() => toggle(h)} label={`Toggle ${h.name} active`} /></td>
          <td className="acts"><button type="button" className="mini ghost" onClick={() => setForm({ hairstyle_id: h.hairstyle_id, service_id: h.service_id, name: h.name, is_active: !!h.is_active })}>Edit</button>
            <button type="button" className="mini ghost" onClick={() => remove(h)}>Delete</button></td></tr>)}
      </tbody></table></div>{rows.length === 0 && <p className="muted center">No hairstyles here yet.</p>}
    </>}
    <Modal open={!!form} onClose={closeForm} title={form?.hairstyle_id ? 'Edit hairstyle' : 'Add hairstyle'}>
      {form && <form className="form-grid" onSubmit={submit}>
        <label className="full">Name<input value={form.name} maxLength={100} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
        {form.hairstyle_id
          ? <p className="muted full" style={{ margin: 0 }}>Category: {catName(form.service_id)}</p>
          : mode === 'all' && <label className="full">Category<select value={form.service_id} onChange={(e) => setForm({ ...form, service_id: e.target.value })}><option value="">Select…</option>
              {services.map((s) => <option key={s.service_id} value={s.service_id}>{s.service_name}</option>)}</select></label>}
        {form.hairstyle_id && <div className="full" style={{ display: 'flex', alignItems: 'center', gap: 12 }}><span>Active</span><Switch on={form.is_active} onClick={() => setForm({ ...form, is_active: !form.is_active })} label="Toggle active" /></div>}
        {err && <p className="auth-error full" role="alert">{err}</p>}
        <button className="btn btn-gold full" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button></form>}
    </Modal></div>
}
