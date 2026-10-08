import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth, homeFor } from '../context/AuthContext'
import { cleanEmail, cleanUsername, validateSignUp } from '../lib/validate'
import '../styles/auth-validation.css'

const BG = '/assets/banner_b&w.png' // sign in / sign up background

const Icon = {
  user: <svg width="16" height="18" viewBox="0 0 22 28" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="6" r="3.5" /><rect x="3" y="14" width="16" height="11" rx="5.5" /></svg>,
  mail: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="5" width="18" height="14" rx="3" /><path d="m4 7 8 6 8-6" /></svg>,
  lock: <svg width="16" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><rect x="5" y="11" width="14" height="10" rx="3" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>,
}

const Eye = <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></svg>
const EyeOff = <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3l18 18M10.6 5.1A9.7 9.7 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4M6.5 6.6A17 17 0 0 0 2 12s3.5 7 10 7c1.7 0 3.2-.4 4.5-1M9.9 9.9a3 3 0 0 0 4.2 4.2" /></svg>

// Text field with an optional icon. Password fields get a show/hide eye button.
export function Field({ label, icon, type, error, valid, ...props }) {
  const [show, setShow] = useState(false)
  const isPw = type === 'password'
  return (
    <label className={`auth-field${error ? ' invalid' : valid ? ' valid' : ''}`}>
      <span>{label}</span>
      <div>
        {icon && Icon[icon]}
        <input type={isPw && show ? 'text' : type} aria-invalid={error ? true : undefined} {...props} />
        {isPw && <button type="button" className="eye" onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide password' : 'Show password'}>{show ? EyeOff : Eye}</button>}
      </div>
      {error && <small className="field-error" role="alert">{error}</small>}
    </label>
  )
}

function Shell({ title, side, className = '', children }) {
  return (
    <div className={`auth-page ${side} ${className}`.trim()} style={{ '--auth-bg': `url("${BG}")` }}>
      <Link to="/" className="auth-home">&larr; Back to site</Link>
      <motion.div className={`auth-wrap ${side}`} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: 'easeOut' }}>
        <h1>{title}</h1>
        {children}
      </motion.div>
    </div>
  )
}

export function SignIn() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState({ id: '', pw: '' })
  const [touched, setTouched] = useState({})
  const [serverErr, setServerErr] = useState({})
  const [error, setError] = useState('')
  const errors = { id: form.id.trim() ? '' : 'Enter your username or email.', pw: form.pw ? '' : 'Enter your password.' }
  const set = (k) => (e) => {
    setForm({ ...form, [k]: e.target.value }); setError('')
    setTouched((t) => ({ ...t, [k]: true })); setServerErr((s) => ({ ...s, [k]: '' }))
  }
  const blur = (k) => () => setTouched((t) => ({ ...t, [k]: true }))
  const shown = (k) => serverErr[k] || (touched[k] ? errors[k] : '')

  const submit = async (e) => {
    e.preventDefault()
    setTouched({ id: true, pw: true })
    if (errors.id || errors.pw) return setError('Enter your username or email and password.')
    const res = await login(form.id.trim(), form.pw)
    if (!res.ok) {
      const key = { identity: 'id', password: 'pw' }[res.field] // backend field name -> this form's field
      if (key) setServerErr({ [key]: res.error })
      else setError(res.error)
      return
    }
    navigate(location.state?.from || homeFor(res.user.role), { replace: true })
  }

  return (
    <Shell title="Sign In" side="center" className="auth-signin">
      <form className="auth-card auth-form" onSubmit={submit} noValidate>
        <Field label="Enter your username or email" icon="user" placeholder="juandelacruz" value={form.id} onChange={set('id')} onBlur={blur('id')} error={shown('id')} autoComplete="username" />
        <Field label="Password" icon="lock" type="password" placeholder="*****" value={form.pw} onChange={set('pw')} onBlur={blur('pw')} error={shown('pw')} autoComplete="current-password" />
        <p className="auth-error" role="alert">{error}</p>
        <button className="btn btn-light" type="submit">Sign In</button>
        <Link className="btn btn-outline" to="/signup">Create an account</Link>
      </form>
    </Shell>
  )
}

const EMPTY = { firstName: '', lastName: '', username: '', email: '', phone: '', password: '', confirm: '' }

export function SignUp() {
  const { signup } = useAuth()
  const navigate = useNavigate()
  const [f, setF] = useState(EMPTY)
  const [touched, setTouched] = useState({})
  const [serverErr, setServerErr] = useState({})
  const [error, setError] = useState('')
  const errors = validateSignUp(f)
  const set = (k) => (e) => {
    setF({ ...f, [k]: e.target.value }); setError('')
    setServerErr((s) => ({ ...s, [k]: '' }))
  }
  const blur = (k) => () => setTouched((t) => ({ ...t, [k]: true }))
  // a message from the backend wins; otherwise show the live browser check once the field has been used
  // The email is checked live while typing (as soon as something is entered); other fields wait until they have been used.
  const shown = (k) => serverErr[k] || (touched[k] || (k === 'email' && f.email !== '') ? errors[k] : '')
  const ok = (k) => f[k] !== '' && !errors[k] && !serverErr[k] // subtle green once the value passes the same rules

  const submit = async (e) => {
    e.preventDefault()
    setTouched(Object.fromEntries(Object.keys(EMPTY).map((k) => [k, true])))
    if (Object.keys(errors).length) return setError('Please fix the highlighted fields.')
    const res = await signup({
      firstName: f.firstName.trim(), lastName: f.lastName.trim(), username: cleanUsername(f.username),
      email: cleanEmail(f.email), phone: f.phone.trim(), password: f.password,
    })
    if (!res.ok) {
      if (res.field && res.field in EMPTY) setServerErr({ [res.field]: res.error }) // beside the right field
      else setError(res.error)
      return
    }
    navigate('/', { replace: true })
  }

  return (
    <Shell title="Create Account" side="center">
      <form className="auth-card auth-form" onSubmit={submit} noValidate>
        <Field label="First Name" placeholder="ex. Juan" value={f.firstName} onChange={set('firstName')} onBlur={blur('firstName')} error={shown('firstName')} valid={ok('firstName')} autoComplete="given-name" />
        <Field label="Last Name" placeholder="ex. Dela Cruz" value={f.lastName} onChange={set('lastName')} onBlur={blur('lastName')} error={shown('lastName')} valid={ok('lastName')} autoComplete="family-name" />
        <Field label="Username" icon="user" placeholder="juandelacruz" value={f.username} onChange={set('username')} onBlur={blur('username')} error={shown('username')} valid={ok('username')} autoComplete="username" />
        <Field label="Email" icon="mail" type="email" placeholder="juandelacruz@gmail.com" value={f.email} onChange={set('email')} onBlur={blur('email')} error={shown('email')} valid={ok('email')} autoComplete="email" />
        <Field label="Phone (optional)" type="tel" placeholder="09171234567" value={f.phone} onChange={set('phone')} onBlur={blur('phone')} error={shown('phone')} valid={ok('phone')} autoComplete="tel" />
        <Field label="Password" icon="lock" type="password" placeholder="*****" value={f.password} onChange={set('password')} onBlur={blur('password')} error={shown('password')} valid={ok('password')} autoComplete="new-password" />
        <Field label="Confirm Password" icon="lock" type="password" placeholder="*****" value={f.confirm} onChange={set('confirm')} onBlur={blur('confirm')} error={shown('confirm')} valid={ok('confirm')} autoComplete="new-password" />
        <p className="auth-error" role="alert">{error}</p>
        <button className="btn btn-light" type="submit">Create Account</button>
        <Link className="btn btn-outline" to="/signin">Sign In</Link>
      </form>
    </Shell>
  )
}