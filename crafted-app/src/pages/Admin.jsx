import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import Page from '../components/Page'
import Modal from '../components/Modal'
import StatusBadge from '../components/StatusBadge'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'
import { useCatalog } from '../context/CatalogContext'
import { useSlots } from '../lib/useSlots'
import { api, refresh, useStore } from '../api'
import { DAYS, fmt12, peso, longDate, fullName, toMin, toHHMM, iso } from '../lib/time'
import { clickable } from '../lib/clickable'
import { bookedPrice } from '../lib/revenue'
import { badgeText, pendingCount } from '../lib/pending'
import RevenuePanel from '../components/RevenuePanel'
import TopBarbers from '../components/TopBarbers'
import ContactMessages from '../components/ContactMessages'
import { useContactMessages } from '../lib/useContactMessages'
import BarberPhotoPicker from '../components/BarberPhotoPicker'
import ServiceImage, { serviceImageSources } from '../components/ServiceImage'
import PhotoCropper from '../components/PhotoCropper'
import ReturningCustomers from '../components/ReturningCustomers'

const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const PHOTO_MAX_MB = 5   // the backend enforces the same limits
const STATUSES = ['Pending', 'Confirmed', 'In Progress', 'Completed', 'Cancelled']
const TABS = ['Overview', 'Appointments', 'Users', 'Barbers', 'Services', 'Schedules', 'Messages', 'Activity']
const WEEK = [...DAYS.slice(1), 'Sunday']
// Specialty choices come from the live barbers catalog (useCatalog) inside the Barbers panel below.
const bind = (form, setForm) => (k) => ({ value: form[k] ?? '', onChange: (e) => setForm({ ...form, [k]: e.target.value }) })

const Switch = ({ on, onClick, label }) => <button className={`switch${on ? ' on' : ''}`} onClick={onClick} aria-label={label} aria-pressed={on}><i /></button>
const Search = (p) => <input className="search" placeholder="Search…" {...p} />

const RANGES = ['Today', 'This Week', 'This Month', 'All Time']
// Is a booking date (YYYY-MM-DD) inside the chosen range? Weeks run Monday to Sunday.
function inRange(date, range) {
  if (range === 'All Time') return true
  const now = new Date(); const today = iso(now)
  if (range === 'Today') return date === today
  if (range === 'This Month') return date.slice(0, 7) === today.slice(0, 7)
  const mon = new Date(now); mon.setDate(now.getDate() - ((now.getDay() + 6) % 7))
  const sun = new Date(mon); sun.setDate(mon.getDate() + 6)
  return date >= iso(mon) && date <= iso(sun)
}

function Overview({ d, go }) {
  const [range, setRange] = useState('All Time')
  const appts = d.appointments.filter((a) => inRange(a.appointment_date, range))
  const live = appts.filter((a) => a.status !== 'Cancelled')
  const revenue = appts.filter((a) => a.status === 'Completed').reduce((n, a) => n + bookedPrice(a, d.svc(a.service_id)), 0)
  const count = (rows, key) => Object.entries(rows.reduce((m, a) => ({ ...m, [a[key]]: (m[a[key]] || 0) + 1 }), {})).sort((a, b) => b[1] - a[1]).slice(0, 5)
  const byStatus = STATUSES.map((s) => [s, appts.filter((a) => a.status === s).length])
  const max = Math.max(1, ...byStatus.map((x) => x[1]))
  const cards = [
    ['Total bookings', appts.length, 'Appointments'], ['Revenue (completed)', peso(revenue)], ['Pending', appts.filter((a) => a.status === 'Pending').length, 'Appointments'],
    ['Active barbers', d.cat.barbers.filter((b) => b.is_active).length, 'Barbers'], ['Customers', d.users.filter((u) => u.role === 'Customer').length, 'Users'],
    ['Active services', d.cat.services.filter((s) => s.is_active).length, 'Services'],
  ]
  return <>
    <div className="toolbar"><select value={range} onChange={(e) => setRange(e.target.value)} aria-label="Date range">{RANGES.map((r) => <option key={r}>{r}</option>)}</select></div>
    <div className="stat-box six">{cards.map(([l, n, to], i) => <motion.div key={l} className="stat" {...clickable(to && (() => go(to)))} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}><h3>{l}</h3><b>{n}</b></motion.div>)}</div>
    <RevenuePanel appointments={d.appointments} svc={d.svc} uName={d.uName} bar={d.bar} />
    <div className="two-col">
      <div className="panel"><header><h2>Bookings by status</h2></header>
        {byStatus.map(([s, n]) => <div className="bar-row" key={s}><span>{s}</span><div><motion.i className={`s-${s.toLowerCase().replace(' ', '-')}`} initial={{ width: 0 }} animate={{ width: `${(n / max) * 100}%` }} transition={{ duration: 0.7 }} /></div><b>{n}</b></div>)}
      </div>
      <div className="panel"><header><h2>Top barbers</h2></header>
        <TopBarbers appts={appts} bar={d.bar} svc={d.svc} />
        <header style={{ marginTop: 24 }}><h2>Top services</h2></header>
        {count(live, 'service_id').map(([id, n]) => <div className="line" key={id}><span>{d.svc(+id)?.service_name}</span><b>{n}</b></div>)}
      </div>
    </div>
    <ReturningCustomers appointments={d.appointments} users={d.users} />
    <div className="panel"><header><h2>Recent activity</h2></header>
      {[...d.logs].reverse().slice(0, 6).map((l) => <div className="line" key={l.log_id}><span>#{l.appointment_id}: {l.old_status || 'New'} → <b>{l.new_status}</b> by {d.uName(l.changed_by)}</span><small>{l.changed_at}</small></div>)}
    </div>
  </>
}

const EDITABLE = ['Pending', 'Confirmed']

// Add / edit form for one appointment. Time slots come from the same backend check that customers use.
function ApptForm({ d, init, onClose }) {
  const { barbers, services, barberServices } = d.cat
  const editing = !!init.appointment_id
  const locked = editing && !EDITABLE.includes(init.status)   // finished or cancelled: only notes can change
  const [f, setF] = useState({ ...init, time: init.start_time ? toMin(init.start_time) : null })
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false)
  const svc = d.svc(+f.service_id)
  const offered = (bid) => barberServices.some((x) => x.barber_id === bid && x.service_id === +f.service_id)
  const { slots, loading, error, closedReason } = useSlots({ barberId: +f.barber_id || 0, serviceId: +f.service_id || 0, date: f.appointment_date, excludeId: init.appointment_id })
  const set = (k, v) => setF({ ...f, [k]: v, ...(k === 'time' ? {} : k === 'notes' || k === 'user_id' ? {} : { time: null }) })
  const submit = async (e) => {
    e.preventDefault()
    if (!f.user_id || !f.service_id || !f.barber_id || !f.appointment_date || f.time === null) return setErr('Choose a customer, service, barber, date and time.')
    setBusy(true); setErr('')
    const r = await d.adminSave({ ...f, user_id: +f.user_id, barber_id: +f.barber_id, service_id: +f.service_id, start_time: toHHMM(f.time) })
    setBusy(false)
    if (r.ok) onClose(); else setErr(r.error)
  }
  return <form className="form-grid" onSubmit={submit}>
    <label className="full">Customer<select value={f.user_id || ''} disabled={editing} onChange={(e) => set('user_id', e.target.value)}><option value="">Select…</option>
      {d.users.filter((u) => u.role === 'Customer' || u.users_id === f.user_id).map((u) => <option key={u.users_id} value={u.users_id}>{u.first_name} {u.last_name} (@{u.username})</option>)}</select></label>
    <label>Service<select value={f.service_id || ''} disabled={locked} onChange={(e) => setF({ ...f, service_id: e.target.value, barber_id: '', time: null })}><option value="">Select…</option>
      {d.cat.services.filter((s) => s.is_active || s.service_id === f.service_id).map((s) => <option key={s.service_id} value={s.service_id}>{s.service_name} · {peso(s.price)}</option>)}</select></label>
    <label>Barber<select value={f.barber_id || ''} disabled={locked || !f.service_id} onChange={(e) => set('barber_id', e.target.value)}><option value="">Select…</option>
      {barbers.filter((b) => (b.is_active && offered(b.barber_id)) || b.barber_id === f.barber_id).map((b) => <option key={b.barber_id} value={b.barber_id}>{fullName(b)}</option>)}</select></label>
    <label className="full">Date<input type="date" value={f.appointment_date || ''} disabled={locked} onChange={(e) => set('appointment_date', e.target.value)} /></label>
    <div className="full"><p className="slot-title" style={{ marginTop: 0 }}>{f.appointment_date && svc && f.barber_id ? 'Time' : 'Pick a service, barber and date to see times.'}</p>
      <div className="slots">
        {!locked && slots.map((s) => <button type="button" key={s.t} disabled={s.booked || s.past} className={`slot${f.time === s.t ? ' on' : ''}${s.booked ? ' booked' : ''}`} onClick={() => set('time', s.t)}>{fmt12(toHHMM(s.t))}{s.booked && <small>BOOKED</small>}</button>)}
        {locked && <p className="muted">{fmt12(init.start_time)}–{fmt12(init.end_time)} (can't be moved while {init.status})</p>}
        {!locked && f.appointment_date && f.barber_id && f.service_id && loading && <p className="muted">Loading time slots…</p>}
        {!locked && error && <p className="muted">{error}</p>}
        {!locked && !loading && !error && f.appointment_date && f.barber_id && f.service_id && slots.length === 0 && <p className="muted">{closedReason === 'ON_LEAVE' ? 'This barber is on leave that day.' : 'No time slots on this day.'}</p>}
      </div></div>
    <label className="full">Notes<textarea value={f.notes || ''} onChange={(e) => set('notes', e.target.value)} /></label>
    {err && <p className="auth-error full">{err}</p>}
    <button className="btn btn-gold full" type="submit" disabled={busy}>{editing ? 'Save changes' : 'Create appointment'}</button>
  </form>
}

function Appts({ d }) {
  const [f, setF] = useState('All'); const [q, setQ] = useState(''); const [form, setForm] = useState(null)
  const rows = [...d.appointments].reverse().filter((a) => (f === 'All' || a.status === f) && `${d.uName(a.user_id)} ${d.bar(a.barber_id)?.first_name} ${d.svc(a.service_id)?.service_name}`.toLowerCase().includes(q.toLowerCase()))
  const pending = pendingCount(d.appointments)
  const remove = (a) => window.confirm(`Delete appointment #${a.appointment_id} for ${d.uName(a.user_id)}? This also removes its history and cannot be undone. (Use the status menu to cancel instead.)`) && d.adminDelete(a.appointment_id)
  return <div className="panel"><div className="toolbar"><Search value={q} onChange={(e) => setQ(e.target.value)} />
    <select value={f} onChange={(e) => setF(e.target.value)}>{['All', ...STATUSES, 'Declined'].map((s) => <option key={s}>{s}</option>)}</select>
    {(pending > 0 || f === 'Pending') && <button type="button" className="mini ghost" onClick={() => setF(f === 'Pending' ? 'All' : 'Pending')}>{f === 'Pending' ? 'Show all' : 'Show pending'}{pending > 0 && <span className="notif-badge">{badgeText(pending)}</span>}</button>}
    <button className="btn btn-gold sm" onClick={() => setForm({ user_id: '', barber_id: '', service_id: '', appointment_date: '', notes: '' })}>+ New appointment</button></div>
    <div className="table-wrap"><table className="tbl left"><thead><tr><th>#</th><th>Customer</th><th>Barber</th><th>Service</th><th>When</th><th>Price</th><th>Status</th><th></th></tr></thead><tbody>
      {rows.map((a) => <tr key={a.appointment_id}><td>{a.appointment_id}</td><td>{d.uName(a.user_id)}</td><td>{d.bar(a.barber_id) && fullName(d.bar(a.barber_id))}</td><td>{d.svc(a.service_id)?.service_name}</td>
        <td>{longDate(a.appointment_date)}<br /><small>{fmt12(a.start_time)}–{fmt12(a.end_time)}</small></td><td>{peso(d.svc(a.service_id)?.price || 0)}</td>
        <td><select className={`s-${a.status.toLowerCase().replace(' ', '-')}`} value={a.status} onChange={(e) => d.setStatus(a.appointment_id, e.target.value, d.user.users_id)}>{[...STATUSES, 'Declined'].map((s) => <option key={s}>{s}</option>)}</select></td>
        <td className="acts"><button className="mini ghost" onClick={() => setForm({ ...a })}>Edit</button><button className="mini ghost" onClick={() => remove(a)}>Delete</button></td></tr>)}
    </tbody></table></div>{rows.length === 0 && <p className="muted center">No appointments match.</p>}
    <Modal open={!!form} onClose={() => setForm(null)} title={form?.appointment_id ? `Edit appointment #${form.appointment_id}` : 'New appointment'}>
      {form && <ApptForm d={d} init={form} onClose={() => setForm(null)} />}
    </Modal></div>
}

function Users({ d }) {
  const [q, setQ] = useState('')
  const { users: allUsers } = useStore()   // includes inactive accounts so they can be re-activated
  const rows = allUsers.filter((u) => `${u.first_name} ${u.last_name} ${u.username} ${u.email}`.toLowerCase().includes(q.toLowerCase()))
  return <div className="panel users-panel"><div className="toolbar"><Search value={q} onChange={(e) => setQ(e.target.value)} /><span className="muted">{rows.length} users</span></div>
    <div className="table-wrap"><table className="tbl left users-tbl"><thead><tr><th>ID</th><th>Name</th><th>Username</th><th>Email</th><th>Phone</th><th>Role</th><th>Status</th><th>Joined</th><th>Bookings</th><th></th></tr></thead><tbody>
      {rows.map((u) => <tr key={u.users_id}><td>{u.users_id}</td><td>{u.first_name} {u.last_name}</td><td>{u.username}</td><td>{u.email}</td><td>{u.phone || '—'}</td><td><span className={`badge r-${u.role.toLowerCase()}`}>{u.role}</span></td>
        <td><span className={`badge ${u.is_active ? 's-completed' : 's-cancelled'}`}>{u.is_active ? 'Active' : 'Inactive'}</span></td><td>{longDate(u.created_at)}</td><td>{d.appointments.filter((a) => a.user_id === u.users_id).length}</td>
        <td className="acts"><button className="mini ghost" disabled={u.users_id === d.user.users_id} title={u.users_id === d.user.users_id ? "You can't deactivate your own account" : ''}
          onClick={() => (u.is_active ? window.confirm(`Deactivate ${u.first_name} ${u.last_name}? They will no longer be able to sign in.`) : true) && d.cat.toggleUser(u.users_id)}>{u.is_active ? 'Deactivate' : 'Activate'}</button></td></tr>)}
    </tbody></table></div></div>
}

function Barbers({ d }) {
  const { barbers, services, barberServices, saveBarber, toggleBarber } = d.cat
  const [edit, setEdit] = useState(null); const [pick, setPick] = useState(null); const [ids, setIds] = useState([])
  const [svcErr, setSvcErr] = useState(''); const [svcSaving, setSvcSaving] = useState(false)
  const f = bind(edit || {}, setEdit)
  const openServices = (b) => { setPick(b); setSvcErr(''); setIds(barberServices.filter((x) => x.barber_id === b.barber_id).map((x) => x.service_id)) }
  const closeServices = () => { if (!svcSaving) setPick(null) }   // stays open while the save is running
  // Stay open until the server confirms. On failure (for example 409: appointments still use a service that was unticked) the ticks are kept so they can be corrected and saved again.
  const saveServices = async () => {
    if (svcSaving) return
    setSvcSaving(true); setSvcErr('')
    const r = await api(`/admin/barbers/${pick.barber_id}/services`, 'PUT', { serviceIds: ids })
    if (r.ok) await refresh()
    setSvcSaving(false)
    if (!r.ok) return setSvcErr(r.error || 'The services were not saved. Please try again.')
    setPick(null)
  }
  return <div className="panel"><div className="toolbar"><span className="muted">{barbers.length} barbers</span><button className="btn btn-gold sm" onClick={() => setEdit({ first_name: '', last_name: '', specialty: '', bio: '' })}>+ Add barber</button></div>
    <div className="table-wrap"><table className="tbl left"><thead><tr><th>Barber</th><th>Specialty</th><th>Login account</th><th>Services</th><th>Active</th><th></th></tr></thead><tbody>
      {barbers.map((b) => { const n = barberServices.filter((x) => x.barber_id === b.barber_id).length
        return <tr key={b.barber_id}><td>{fullName(b)}</td><td>{b.specialty}</td><td className={b.user_id ? '' : 'warn'}>{d.users.find((u) => u.users_id === b.user_id) ? `@${d.users.find((u) => u.users_id === b.user_id).username}` : 'Not linked'}</td><td className={n ? '' : 'warn'}>{n || 'None assigned'}</td><td><Switch on={b.is_active} onClick={() => toggleBarber(b.barber_id)} label="Toggle active" /></td>
          <td className="acts"><button className="mini" onClick={() => openServices(b)}>Services</button><button className="mini ghost" onClick={() => setEdit({ ...b })}>Edit</button></td></tr> })}
    </tbody></table></div>
    <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.barber_id ? 'Edit barber' : 'Add barber'}>
      {edit && <form className="form-grid" onSubmit={(e) => { e.preventDefault(); if (!edit.first_name.trim()) return; saveBarber({ ...edit, user_id: edit.user_id ? +edit.user_id : null, photo_url: edit.photo_url || null }); setEdit(null) }}>
        <label>First name<input {...f('first_name')} /></label><label>Last name<input {...f('last_name')} /></label>
        <label className="full">Login account<select value={edit.user_id ?? ''} onChange={(e) => setEdit({ ...edit, user_id: e.target.value })}><option value="">Not linked</option>
          {d.users.filter((u) => u.role === 'Barber' && (u.users_id === edit.user_id || !barbers.some((x) => x.user_id === u.users_id))).map((u) => <option key={u.users_id} value={u.users_id}>{u.first_name} {u.last_name} (@{u.username})</option>)}</select></label>
        <label className="full">Specialty<select {...f('specialty')}><option value="">Select a specialty</option>
          {[...new Set([...barbers.map((b) => b.specialty), edit.specialty].filter(Boolean))].map((sp) => <option key={sp} value={sp}>{sp}</option>)}</select></label><label className="full">Bio<textarea {...f('bio')} /></label>
        <div className="full"><BarberPhotoPicker value={edit.photo_url} onChange={(v) => setEdit({ ...edit, photo_url: v })} /></div>
        <button className="btn btn-gold full" type="submit">Save</button></form>}
    </Modal>
    <Modal open={!!pick} onClose={closeServices} title={pick ? `Services · ${pick.first_name}` : ''}>
      <div className="check-list">{services.map((s) => <label key={s.service_id}><input type="checkbox" checked={ids.includes(s.service_id)} disabled={svcSaving} onChange={() => { setSvcErr(''); setIds((v) => (v.includes(s.service_id) ? v.filter((x) => x !== s.service_id) : [...v, s.service_id])) }} />{s.service_name}<small>{peso(s.price)}</small></label>)}</div>
      {svcErr && <p role="alert" style={{ margin: '0 0 12px', color: '#e5736b' }}>{svcErr}</p>}
      <button className="btn btn-gold wide" disabled={svcSaving} onClick={saveServices}>{svcSaving ? 'Saving…' : 'Save services'}</button>
    </Modal></div>
}

function Services({ d }) {
  const { services, barberServices, saveService, addServiceWithPhoto, editServiceWithPhoto, toggleService, deleteService } = d.cat
  const [edit, setEdit] = useState(null); const f = bind(edit || {}, setEdit)
  // Photo for a new service, or a replacement photo for an existing one (nothing is saved until Save is pressed)
  const [photo, setPhoto] = useState(null); const [preview, setPreview] = useState('')   // preview = temporary address, used only to show the picked image
  const [photoErr, setPhotoErr] = useState(''); const [saveErr, setSaveErr] = useState(''); const [saving, setSaving] = useState(false)
  // Photo editor: pend = a photo open in the cropper (nothing is kept until Apply); orig = the photo the applied crop came from, so it can be adjusted again
  const [pend, setPend] = useState(null); const [orig, setOrig] = useState(null); const [loadingCur, setLoadingCur] = useState(false)
  const urls = useRef([])   // temporary addresses made for this form, all released when it closes
  const mk = (blob) => { const u = URL.createObjectURL(blob); urls.current.push(u); return u }
  const release = () => { urls.current.forEach((u) => URL.revokeObjectURL(u)); urls.current = [] }
  useEffect(() => release, [])
  const closeForm = () => { setEdit(null); setPhoto(null); setPreview(''); setPend(null); setOrig(null); release(); setPhotoErr(''); setSaveErr('') }
  const onPick = (e) => {
    const picked = e.target.files?.[0]; e.target.value = ''
    if (!picked) return
    if (!PHOTO_TYPES.includes(picked.type)) return setPhotoErr('Choose a JPG, PNG or WEBP image.')
    if (picked.size > PHOTO_MAX_MB * 1024 * 1024) return setPhotoErr(`That image is larger than ${PHOTO_MAX_MB} MB.`)
    setPhotoErr(''); setSaveErr(''); setPend({ url: mk(picked), view: null })   // opens the cropper; the photo is only kept once Apply is pressed
  }
  const applyCrop = (file, view) => { setPhoto(file); setPreview(mk(file)); setOrig({ url: pend.url, view }); setPend(null) }
  const cancelCrop = () => setPend(null)   // leaves whatever photo was there before exactly as it was
  const cancelPhoto = () => { setPhoto(null); setPreview(''); setOrig(null); setPhotoErr(''); setSaveErr('') }   // back to the photo the service already has
  const adjustApplied = () => orig && setPend({ url: orig.url, view: orig.view })
  const adjustCurrent = async () => {   // open the service's saved photo in the cropper (the saved photo itself is not touched)
    setPhotoErr(''); setLoadingCur(true)
    for (const src of serviceImageSources(edit.service_name, edit.image_url)) {
      try { const r = await fetch(src); if (!r.ok) continue; const b = await r.blob(); if (!b.type.startsWith('image/')) continue; setLoadingCur(false); return setPend({ url: mk(b), view: null }) } catch { /* try the next one */ }
    }
    setLoadingCur(false); setPhotoErr('The current photo could not be opened for editing. Choose a file instead.')
  }
  const used = (id) => d.appointments.some((a) => a.service_id === id && ['Pending', 'Confirmed', 'In Progress'].includes(a.status))
  const save = async (e) => { e.preventDefault(); const price = +edit.price, mins = +edit.duration_minutes
    if (pend || !edit.service_name.trim() || !(price > 0) || !(mins > 0)) return
    if (photo) {   // a new photo (new service, or replacing the current one): stay open and show the problem if the upload or save fails
      setSaving(true); setSaveErr('')
      const r = await (edit.service_id ? editServiceWithPhoto : addServiceWithPhoto)({ ...edit, price, duration_minutes: mins }, photo)
      setSaving(false)
      if (!r.ok) return setSaveErr(r.error || 'The service was not saved. Please try again.')
      return closeForm()
    }
    saveService({ ...edit, price, duration_minutes: mins }); closeForm() }
  return <div className="panel"><div className="toolbar"><span className="muted">{services.length} services</span><button className="btn btn-gold sm" onClick={() => setEdit({ service_name: '', description: '', price: '', duration_minutes: '' })}>+ Add service</button></div>
    <div className="table-wrap"><table className="tbl left"><thead><tr><th>Service</th><th>Price</th><th>Mins</th><th>Barbers</th><th>Active</th><th></th></tr></thead><tbody>
      {services.map((s) => { const n = barberServices.filter((x) => x.service_id === s.service_id).length
        return <tr key={s.service_id}><td>{s.service_name}</td><td>{peso(s.price)}</td><td>{s.duration_minutes}</td><td className={n ? '' : 'warn'}>{n || 'No barber'}</td>
          <td><Switch on={s.is_active} onClick={() => toggleService(s.service_id)} label="Toggle active" /></td>
          <td className="acts"><button className="mini ghost" onClick={() => setEdit({ ...s })}>Edit</button>
            <button className="mini ghost" disabled={used(s.service_id)} title={used(s.service_id) ? 'Has bookings — deactivate instead' : 'Delete'} onClick={() => window.confirm(`Delete ${s.service_name}?`) && deleteService(s.service_id)}>Delete</button>
            <small style={{ alignSelf: 'center', visibility: used(s.service_id) ? 'visible' : 'hidden' }}>Booked</small></td></tr> })}
    </tbody></table></div>
    <Modal open={!!edit} onClose={closeForm} title={edit?.service_id ? 'Edit service' : 'Add service'}>
      {edit && <form className="form-grid" onSubmit={save}><label className="full">Name<input {...f('service_name')} /></label><label className="full">Description<textarea {...f('description')} /></label>
        <label>Price (₱)<input type="number" min="1" {...f('price')} /></label><label>Duration (mins)<input type="number" min="5" step="5" {...f('duration_minutes')} /></label>
        {edit.service_id && !preview && !pend && <div className="full"><ServiceImage className="svc-photo-preview" name={edit.service_name} imageUrl={edit.image_url} alt="Current photo" />
          <button className="link-danger" type="button" disabled={loadingCur || saving} onClick={adjustCurrent}>{loadingCur ? 'Opening…' : 'Adjust current photo'}</button></div>}
        <label className="full">{edit.service_id ? 'Replace photo (optional)' : 'Photo (optional)'}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={onPick} /></label>
        <p className="muted full" style={{ margin: 0 }}>JPG, PNG or WEBP, up to {PHOTO_MAX_MB} MB.</p>
        {pend && <PhotoCropper key={pend.url} src={pend.url} initialView={pend.view} onApply={applyCrop} onCancel={cancelCrop} />}
        {preview && !pend && <div className="full"><img className="svc-photo-preview" src={preview} alt="Selected photo preview" />
          {edit.service_id && <p className="muted" style={{ margin: '6px 0 0' }}>New photo (not saved yet)</p>}
          <div className="photo-edit-actions"><button className="link-danger" type="button" disabled={saving} onClick={adjustApplied}>Adjust photo</button>
            {edit.service_id && <button className="link-danger" type="button" disabled={saving} onClick={cancelPhoto}>Cancel new photo</button>}</div></div>}
        {photoErr && <p className="full" role="alert" style={{ margin: 0, color: '#e5736b' }}>{photoErr}</p>}
        {saveErr && <p className="full" role="alert" style={{ margin: 0, color: '#e5736b' }}>{saveErr}</p>}
        {pend && <p className="muted full" style={{ margin: 0 }}>Apply or Cancel the photo edit before saving.</p>}
        <button className="btn btn-gold full" type="submit" disabled={saving || !!pend}>{saving ? 'Saving…' : 'Save'}</button></form>}
    </Modal></div>
}

function Schedules({ d }) {
  const { barbers, schedules, addSchedule, editSchedule, toggleSchedule, deleteSchedule } = d.cat
  const [bid, setBid] = useState(barbers[0]?.barber_id)
  const [form, setForm] = useState({ day_of_week: 'Monday', start_time: '09:00', end_time: '18:00' }); const [err, setErr] = useState('')
  const [edit, setEdit] = useState(null); const [editErr, setEditErr] = useState('')
  const rows = schedules.filter((s) => s.barber_id === +bid).sort((a, b) => WEEK.indexOf(a.day_of_week) - WEEK.indexOf(b.day_of_week))
  const add = (e) => { e.preventDefault()
    if (form.end_time <= form.start_time) return setErr('End time must be after start time.')
    if (rows.some((s) => s.day_of_week === form.day_of_week)) return setErr('That day already has a schedule — edit or remove it.')
    setErr(''); addSchedule({ ...form, barber_id: +bid }) }
  const openEdit = (s) => { setEditErr(''); setEdit({ schedule_id: s.schedule_id, barber_id: s.barber_id, day_of_week: s.day_of_week, start_time: s.start_time, end_time: s.end_time }) }
  const saveEdit = (e) => { e.preventDefault()
    if (edit.end_time <= edit.start_time) return setEditErr('End time must be after start time.')
    if (rows.some((s) => s.schedule_id !== edit.schedule_id && s.day_of_week === edit.day_of_week)) return setEditErr('That day already has a schedule — edit or remove it.')
    editSchedule(edit); setEdit(null) }
  return <div className="panel"><div className="toolbar"><select value={bid} onChange={(e) => setBid(e.target.value)}>{barbers.map((b) => <option key={b.barber_id} value={b.barber_id}>{fullName(b)}{b.is_active ? '' : ' (inactive)'}</option>)}</select></div>
    <div className="table-wrap"><table className="tbl left"><thead><tr><th>Day</th><th>Start</th><th>End</th><th>Active</th><th></th></tr></thead><tbody>
      {rows.map((s) => <tr key={s.schedule_id}><td>{s.day_of_week}</td><td>{fmt12(s.start_time)}</td><td>{fmt12(s.end_time)}</td><td><Switch on={s.is_active} onClick={() => toggleSchedule(s.schedule_id)} label="Toggle active" /></td>
        <td className="acts"><button className="mini ghost" onClick={() => openEdit(s)}>Edit</button><button className="mini ghost" onClick={() => deleteSchedule(s.schedule_id)}>Remove</button></td></tr>)}
    </tbody></table></div>{rows.length === 0 && <p className="muted center">No working days yet — this barber can't be booked.</p>}
    <form className="add-row" onSubmit={add}><select value={form.day_of_week} onChange={(e) => setForm({ ...form, day_of_week: e.target.value })}>{WEEK.map((x) => <option key={x}>{x}</option>)}</select>
      <input type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} /><input type="time" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} />
      <button className="btn btn-gold sm" type="submit">+ Add day</button></form>{err && <p className="auth-error">{err}</p>}
    <Modal open={!!edit} onClose={() => setEdit(null)} title="Edit schedule">
      {edit && <form className="form-grid" onSubmit={saveEdit}>
        <label className="full">Day<select value={edit.day_of_week} onChange={(e) => setEdit({ ...edit, day_of_week: e.target.value })}>{WEEK.map((x) => <option key={x}>{x}</option>)}</select></label>
        <label>Start<input type="time" value={edit.start_time} onChange={(e) => setEdit({ ...edit, start_time: e.target.value })} /></label>
        <label>End<input type="time" value={edit.end_time} onChange={(e) => setEdit({ ...edit, end_time: e.target.value })} /></label>
        {editErr && <p className="auth-error full">{editErr}</p>}
        <button className="btn btn-gold full" type="submit">Save</button></form>}
    </Modal></div>
}

function Activity({ d }) {
  const [f, setF] = useState('All'); const [q, setQ] = useState('')
  const { users: allUsers } = useStore()   // includes inactive accounts, so their names still show
  const person = (id) => allUsers.find((u) => u.users_id === id)
  const rows = [...d.logs].reverse().filter((l) => {
    const a = d.appointments.find((x) => x.appointment_id === l.appointment_id); const cust = a && person(a.user_id); const bar = a && d.bar(a.barber_id); const by = person(l.changed_by)
    const text = `${l.appointment_id} ${cust ? fullName(cust) : ''} ${bar ? fullName(bar) : ''} ${by ? fullName(by) : ''}`.toLowerCase()
    return (f === 'All' || l.new_status === f) && text.includes(q.trim().replace(/^#/, '').toLowerCase())
  })
  return <div className="panel"><div className="toolbar"><Search value={q} onChange={(e) => setQ(e.target.value)} />
    <select value={f} onChange={(e) => setF(e.target.value)}>{['All', ...STATUSES, 'Declined'].map((x) => <option key={x}>{x}</option>)}</select>
    <span className="muted">{rows.length} entries</span></div>
    <div className="table-wrap"><table className="tbl left"><thead><tr><th>When</th><th>Appt</th><th>Customer</th><th>Change</th><th>By</th></tr></thead><tbody>
    {rows.map((l) => { const a = d.appointments.find((x) => x.appointment_id === l.appointment_id); const by = person(l.changed_by); const cust = a && person(a.user_id)
      return <tr key={l.log_id}><td>{l.changed_at}</td><td>#{l.appointment_id}</td><td>{cust ? fullName(cust) : '—'}</td><td>{l.old_status ? <StatusBadge status={l.old_status} /> : 'New'} → <StatusBadge status={l.new_status} /></td><td>{by ? `${by.first_name} (${by.role})` : '—'}</td></tr> })}
  </tbody></table></div>{rows.length === 0 && <p className="muted center">No activity matches.</p>}</div>
}

// Contact messages from GET /api/admin/contact-messages (loaded each time the tab opens)
function Messages() {
  const { messages, loading, error, markRead, reply, remove } = useContactMessages()
  return <ContactMessages messages={messages} loading={loading} error={error} onMarkRead={markRead} onReply={reply} onDelete={remove} />
}

export default function Admin() {
  const { user, users } = useAuth(); const { appointments, logs, setStatus, adminSave, adminDelete } = useData(); const cat = useCatalog()
  const [tab, setTab] = useState('Overview')
  const { unreadMessages } = useStore()
  const tabBadge = { Appointments: pendingCount(appointments), Messages: unreadMessages }   // pending bookings / unread contact messages
  const d = { user, users, appointments, logs, setStatus, adminSave, adminDelete, cat,
    uName: (id) => { const u = users.find((x) => x.users_id === id); return u ? `${u.first_name} ${u.last_name}` : '—' },
    svc: (id) => cat.services.find((s) => s.service_id === id), bar: (id) => cat.barbers.find((b) => b.barber_id === id) }
  const View = { Overview, Appointments: Appts, Users, Barbers, Services, Schedules, Messages, Activity }[tab]
  return <Page><div className="page-title"><h1>ADMIN</h1><p className="sub">Everything in the shop, in one place.</p></div>
    <section className="page-body wide">
      <nav className="tabs" aria-label="Admin sections">{TABS.map((t) => <button key={t} className={tab === t ? 'on' : ''} onClick={() => setTab(t)}>{t}{tabBadge[t] > 0 && <span className="notif-badge" aria-label={`${tabBadge[t]} ${t === 'Messages' ? 'unread' : 'pending'}`}>{badgeText(tabBadge[t])}</span>}{tab === t && <motion.i layoutId="tab-line" />}</button>)}</nav>
      <motion.div key={tab} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}><View d={d} go={setTab} /></motion.div>
    </section></Page>
}