import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import Page from '../components/Page'
import Modal from '../components/Modal'
import { Field } from './Auth'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'
import Avatar, { barberPhotoSources } from '../components/Avatar'
import PhotoCropper from '../components/PhotoCropper'
import { fileUrl } from '../api'
import { cleanEmail, cleanUsername, rules } from '../lib/validate'

const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const PHOTO_MAX_MB = 5   // the backend enforces the same limits
const PHOTO_SIZE = 512   // the edited picture is saved as a square of this many pixels (shown in a circle everywhere)
const placeholder = <svg width="64" height="82" viewBox="0 0 22 28" fill="none" stroke="#8c8c8c" strokeWidth="2.5"><circle cx="11" cy="6" r="3.5" /><rect x="3" y="14" width="16" height="11" rx="5.5" /></svg>
const fmtDate = (d) => new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

export default function Profile() {
  const { user, myBarber, logout, changePassword, updateProfile, changePhoto, removePhoto, deleteAccount } = useAuth()
  const { cancelActiveFor } = useData()
  const navigate = useNavigate()
  const [modal, setModal] = useState(null) // 'pw' | 'del' | 'photo' | 'edit' | null
  const fileRef = useRef(null)
  const [file, setFile] = useState(null)       // the edited picture waiting to be saved (not saved yet)
  const [preview, setPreview] = useState('')   // temporary address used only to preview that picture
  // Photo editor: pend = a photo open in the cropper (nothing is kept until Apply); orig = the photo the applied crop came from, so it can be adjusted again
  const [pend, setPend] = useState(null); const [orig, setOrig] = useState(null); const [loadingCur, setLoadingCur] = useState(false)
  const urls = useRef([])   // temporary addresses made for the picture window, all released when it closes
  const openId = useRef(0)  // changes every time the window closes, so a slow "open current picture" cannot reopen the editor afterwards
  const mk = (blob) => { const u = URL.createObjectURL(blob); urls.current.push(u); return u }
  const release = () => { urls.current.forEach((u) => URL.revokeObjectURL(u)); urls.current = [] }
  const [saving, setSaving] = useState(false)
  const [broken, setBroken] = useState('')     // a saved picture whose file could not be loaded
  const [ed, setEd] = useState({ firstName: '', lastName: '', username: '', email: '', phone: '' }) // the Edit profile form
  const [fieldErr, setFieldErr] = useState({})  // message for each field of that form
  const [f, setF] = useState({ current: '', next: '', confirm: '' })
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const set = (k) => (e) => { setF({ ...f, [k]: e.target.value }); setError('') }
  const close = () => { openId.current += 1; setModal(null); setF({ current: '', next: '', confirm: '' }); setError(''); setDone(false); setFile(null); setPreview(''); setPend(null); setOrig(null); setLoadingCur(false); release() }

  // Free the temporary picture addresses when the page closes
  useEffect(() => release, [])
  // A barber's picture is their public barber photo; customers and admins use their own account picture
  const isBarber = user.role === 'Barber'
  const photoUrl = isBarber ? myBarber?.photo_url : user.photo_url
  const canPhoto = !isBarber || !!myBarber   // an unlinked barber account has no public profile to put a photo on
  const saved = photoUrl && broken !== photoUrl ? fileUrl(photoUrl) : ''

  const rows = [
    ['User ID', String(user.users_id).padStart(3, '0')], ['Username', '@' + user.username], ['Email', user.email],
    ['Phone', user.phone || '—'], ['Role', user.role], ['Created At', fmtDate(user.created_at)],
  ]

  const submitPw = async (e) => {
    e.preventDefault()
    if (!f.current || !f.next || !f.confirm) return setError('Please fill in every field.')
    if (f.next !== f.confirm) return setError('New passwords do not match.')
    const res = await changePassword(f.current, f.next)
    if (!res.ok) return setError(res.error)
    setDone(true)
  }
  const openEdit = () => {
    setEd({ firstName: user.first_name, lastName: user.last_name, username: user.username, email: user.email, phone: user.phone || '' })
    setFieldErr({}); setError(''); setModal('edit')
  }
  const setE = (k) => (e) => { setEd({ ...ed, [k]: e.target.value }); setFieldErr((x) => ({ ...x, [k]: '' })); setError('') }
  const submitEdit = async (e) => {
    e.preventDefault()
    const errs = {}
    for (const k of Object.keys(ed)) { const m = rules[k](ed[k]); if (m) errs[k] = m }
    setFieldErr(errs)
    if (Object.keys(errs).length) return setError('Please fix the highlighted fields.')
    setError(''); setSaving(true)
    const res = await updateProfile({
      firstName: ed.firstName.trim(), lastName: ed.lastName.trim(), username: cleanUsername(ed.username),
      email: cleanEmail(ed.email), phone: ed.phone.trim(),
    })
    setSaving(false)
    if (!res.ok) {
      if (res.field && res.field in ed) setFieldErr({ [res.field]: res.error }) // beside the right field
      else setError(res.error)
      return
    }
    close()
  }
  const onPick = (e) => {
    const picked = e.target.files?.[0]
    e.target.value = '' // lets the same file be chosen again
    if (!picked) return
    if (!PHOTO_TYPES.includes(picked.type)) return setError('Please choose a JPG, PNG or WEBP image.')
    if (picked.size > PHOTO_MAX_MB * 1024 * 1024) return setError(`That image is larger than ${PHOTO_MAX_MB} MB.`)
    setError(''); setPend({ url: mk(picked), view: null })   // opens the editor; the picture is only kept once Apply is pressed
  }
  const applyCrop = (cropped, view) => { setFile(cropped); setPreview(mk(cropped)); setOrig({ url: pend.url, view }); setPend(null) }
  const cancelCrop = () => setPend(null)   // leaves whatever picture was there before exactly as it was
  const adjustApplied = () => orig && setPend({ url: orig.url, view: orig.view })
  const discardNew = () => { setFile(null); setPreview(''); setOrig(null); setError('') }   // back to the saved picture
  const adjustCurrent = async () => {   // open the saved picture in the editor (the saved picture itself is not touched)
    setError(''); setLoadingCur(true)
    const id = openId.current
    for (const src of isBarber && myBarber ? barberPhotoSources(myBarber) : [fileUrl(photoUrl)]) {
      try {
        const r = await fetch(src); if (!r.ok) continue
        const b = await r.blob(); if (!b.type.startsWith('image/')) continue
        if (id !== openId.current) return
        setLoadingCur(false); return setPend({ url: mk(b), view: null })
      } catch { /* try the next one */ }
    }
    if (id !== openId.current) return
    setLoadingCur(false); setError('The current picture could not be opened for editing. Choose an image instead.')
  }
  const submitPhoto = async (e) => {
    e.preventDefault()
    if (pend) return setError('Apply or Cancel the photo edit before saving.')
    if (!file) return setError('Choose an image first.')
    setSaving(true)
    const res = await changePhoto(file)
    setSaving(false)
    if (!res.ok) return setError(res.error)
    close()
  }
  const submitRemove = async () => {
    setSaving(true)
    const res = await removePhoto()
    setSaving(false)
    if (!res.ok) return setError(res.error)
    close()
  }
  const submitDelete = async (e) => {
    e.preventDefault()
    const id = user.users_id
    const res = await deleteAccount(f.current)
    if (!res.ok) return setError(res.error)
    cancelActiveFor(id, id) // free up the slots they were holding
    navigate('/', { replace: true })
  }

  return (
    <Page>
      <div className="page-title"><h1>PROFILE</h1></div>
      <section className="page-body">
        <motion.div className="profile-card" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.45 }}>
          {isBarber && myBarber
            ? <Avatar barber={myBarber} size={104} />
            : saved
              ? <div className="avatar" style={{ width: 104, height: 104 }}><img src={saved} alt={user.first_name} onError={() => setBroken(photoUrl)} /></div>
              : placeholder}
          <h2>{user.first_name} {user.last_name}</h2>
          <dl>
            {rows.map(([k, v], i) => (
              <motion.div className="row" key={k} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 + i * 0.05 }}>
                <dt>{k}</dt><dd>{v}</dd>
              </motion.div>
            ))}
          </dl>
          <div className="profile-actions">
            <button className="btn btn-light" onClick={() => { logout(); navigate('/') }}>Log out</button>
            <button className="btn btn-outline" onClick={openEdit}>Edit profile</button>
            <button className="btn btn-outline" onClick={() => setModal('pw')}>Change password</button>
            {canPhoto && <button className="btn btn-outline" onClick={() => setModal('photo')}>Change picture</button>}
            {user.role === 'Customer' && <button className="link-danger" onClick={() => setModal('del')}>Delete my account</button>}
          </div>
        </motion.div>
      </section>

      <Modal open={modal === 'pw'} onClose={close} title="Change password">
        {done ? (
          <><p className="muted">Your password was updated. Use it the next time you sign in.</p><div className="row-btns"><button className="btn btn-gold" onClick={close}>Done</button></div></>
        ) : (
          <form className="stack" onSubmit={submitPw} noValidate>
            <Field label="Current password" icon="lock" type="password" value={f.current} onChange={set('current')} autoComplete="current-password" />
            <Field label="New password" icon="lock" type="password" value={f.next} onChange={set('next')} autoComplete="new-password" />
            <Field label="Confirm new password" icon="lock" type="password" value={f.confirm} onChange={set('confirm')} autoComplete="new-password" />
            <p className="auth-error" role="alert">{error}</p>
            <div className="row-btns"><button className="btn btn-gold" type="submit">Update password</button><button className="btn btn-outline" type="button" onClick={close}>Cancel</button></div>
          </form>
        )}
      </Modal>

      <Modal open={modal === 'edit'} onClose={close} title="Edit profile">
        <form className="stack" onSubmit={submitEdit} noValidate>
          <Field label="First name" value={ed.firstName} onChange={setE('firstName')} error={fieldErr.firstName} autoComplete="given-name" />
          <Field label="Last name" value={ed.lastName} onChange={setE('lastName')} error={fieldErr.lastName} autoComplete="family-name" />
          <Field label="Username" icon="user" value={ed.username} onChange={setE('username')} error={fieldErr.username} autoComplete="username" />
          <Field label="Email" icon="mail" type="email" value={ed.email} onChange={setE('email')} error={fieldErr.email} autoComplete="email" />
          <Field label="Phone (optional)" type="tel" value={ed.phone} onChange={setE('phone')} error={fieldErr.phone} autoComplete="tel" />
          <p className="auth-error" role="alert">{error}</p>
          <div className="row-btns"><button className="btn btn-gold" type="submit" disabled={saving}>Save changes</button><button className="btn btn-outline" type="button" onClick={close}>Cancel</button></div>
        </form>
      </Modal>

      <Modal open={modal === 'photo'} onClose={close} title="Change picture">
        <form className="stack" onSubmit={submitPhoto} noValidate>
          {pend ? (
            <PhotoCropper key={pend.url} src={pend.url} initialView={pend.view} aspect={1} round outWidth={PHOTO_SIZE} fileName="profile-photo.jpg" previewLabel="Live preview" onApply={applyCrop} onCancel={cancelCrop} />
          ) : (
            <>
              <div style={{ display: 'grid', placeItems: 'center' }}>
                {!preview && isBarber && myBarber
                  ? <Avatar barber={myBarber} size={104} />
                  : preview || saved
                    ? <div className="avatar" style={{ width: 104, height: 104 }}><img src={preview || saved} alt="Picture preview" /></div>
                    : placeholder}
              </div>
              {preview && <p className="muted center">New picture (not saved yet)</p>}
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} onChange={onPick} />
              <button className="btn btn-outline" type="button" disabled={saving} onClick={() => fileRef.current?.click()}>{preview ? 'Choose a different image' : 'Choose image from device'}</button>
              {preview
                ? <div className="photo-edit-actions"><button className="link-danger" type="button" disabled={saving} onClick={adjustApplied}>Adjust picture</button><button className="link-danger" type="button" disabled={saving} onClick={discardNew}>Cancel new picture</button></div>
                : photoUrl && <button className="btn btn-outline" type="button" disabled={loadingCur || saving} onClick={adjustCurrent}>{loadingCur ? 'Opening…' : 'Adjust current picture'}</button>}
              <p className="muted center">JPG, PNG or WEBP, up to {PHOTO_MAX_MB} MB.</p>
            </>
          )}
          <p className="auth-error" role="alert">{error}</p>
          {pend && <p className="muted center">Apply or Cancel the photo edit before saving.</p>}
          <div className="row-btns"><button className="btn btn-gold" type="submit" disabled={!file || saving || !!pend}>{saving ? 'Saving…' : 'Save picture'}</button><button className="btn btn-outline" type="button" onClick={close}>Cancel</button></div>
          {photoUrl && !pend && <button className="link-danger" type="button" disabled={saving} onClick={submitRemove}>Remove picture</button>}
        </form>
      </Modal>

      <Modal open={modal === 'del'} onClose={close} title="Delete your account?">
        <form className="stack" onSubmit={submitDelete} noValidate>
          <p className="muted">This permanently removes your account and cancels your upcoming appointments. This can't be undone. Enter your password to confirm.</p>
          <Field label="Password" icon="lock" type="password" value={f.current} onChange={set('current')} autoComplete="current-password" />
          <p className="auth-error" role="alert">{error}</p>
          <div className="row-btns"><button className="btn btn-danger" type="submit">Delete account</button><button className="btn btn-outline" type="button" onClick={close}>Keep my account</button></div>
        </form>
      </Modal>
    </Page>
  )
}