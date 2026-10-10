import { useRef, useState } from 'react'
import { api } from '../api'
import { useAuth } from '../context/AuthContext'
import { validateContact } from '../lib/validate'
import Modal from './Modal'

export default function ContactForm() {
  const formRef = useRef(null)
  const { user } = useAuth()
  const [typed, setTyped] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    msg: '',
  })
  // Signed in: name, email and phone come from the account (the server uses the account too, so replies reach it)
  const values = user
    ? { ...typed, firstName: user.first_name || '', lastName: user.last_name || '', email: user.email || '', phone: user.phone || '' }
    : typed
  const locked = !!user
  const [invalid, setInvalid] = useState({})
  const [ok, setOk] = useState({})
  const [status, setStatus] = useState('')
  const [sent, setSent] = useState(false)

  const handleChange = (e) => {
    const { id, value } = e.target

    const nextValues = { ...values, [id]: value }
    setTyped((v) => ({ ...v, [id]: value }))

    // After a failed submit, keep each field's red state in step with what's typed
    const errs = validateContact(nextValues, locked)
    if (id === 'email' || id === 'phone') {
      // email and phone are judged together: one valid contact method is enough
      setInvalid((inv) => (inv.email === undefined && inv.phone === undefined ? inv : { ...inv, email: !!errs.email, phone: !!errs.phone }))
      setOk((o) => ({ ...o, email: !errs.email && !!nextValues.email.trim(), phone: !errs.phone && !!nextValues.phone.trim() }))
    } else {
      setInvalid((inv) => (inv[id] === undefined ? inv : { ...inv, [id]: !!errs[id] }))
      setOk((o) => ({ ...o, [id]: !errs[id] }))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    const errs = validateContact(values, locked)
    setInvalid({ firstName: !!errs.firstName, lastName: !!errs.lastName, email: !!errs.email, phone: !!errs.phone, msg: !!errs.msg })

    if (Object.keys(errs).length) {
      setStatus(errs.contact || 'Please fill in all fields with valid details.')
      return
    }

    setStatus('Sending...')

    const r = await api('/contact', 'POST', {
      name: `${values.firstName.trim()} ${values.lastName.trim()}`,
      email: values.email.trim(),
      phone: values.phone.trim(),
      message: values.msg.trim(),
    })

    if (!r.ok) {
      setStatus(
        r.error || 'Unable to send your message. Please try again.'
      )
      return
    }

    setStatus('')
    setSent(true)
    setOk({})

    setTyped({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      msg: '',
    })
  }

  return (
    <>
    <form
      id="contact-form"
      ref={formRef}
      onSubmit={handleSubmit}
      noValidate
    >
      <div className={`field${invalid.firstName ? ' invalid' : ok.firstName ? ' valid' : ''}`}>
        <label htmlFor="firstName">First Name</label>

        <input
          id="firstName"
          type="text"
          placeholder="Juan"
          autoComplete="given-name"
          value={values.firstName}
          onChange={handleChange}
          readOnly={locked}
        />
      </div>

      <div className={`field${invalid.lastName ? ' invalid' : ok.lastName ? ' valid' : ''}`}>
        <label htmlFor="lastName">Last Name</label>

        <input
          id="lastName"
          type="text"
          placeholder="Dela Cruz"
          autoComplete="family-name"
          value={values.lastName}
          onChange={handleChange}
          readOnly={locked}
        />
      </div>

      <div className={`field${invalid.email ? ' invalid' : ok.email ? ' valid' : ''}`}>
        <label htmlFor="email">Email</label>

        <input
          id="email"
          type="email"
          placeholder="juandelacruz@gmail.com"
          autoComplete="email"
          value={values.email}
          onChange={handleChange}
          readOnly={locked}
        />
      </div>

      <div className={`field${invalid.phone ? ' invalid' : ok.phone ? ' valid' : ''}`}>
        <label htmlFor="phone">Phone{locked ? '' : ' (email or phone is required)'}</label>

        <input
          id="phone"
          type="tel"
          placeholder="0917 123 4567"
          autoComplete="tel"
          value={values.phone}
          onChange={handleChange}
          readOnly={locked}
        />
      </div>

      <div className={`field${invalid.msg ? ' invalid' : ok.msg ? ' valid' : ''}`}>
        <label htmlFor="msg">Message</label>

        <textarea
          id="msg"
          placeholder={'We’d love to hear what’s on your mind\n\n\nWrite your message here...'}
          value={values.msg}
          onChange={handleChange}
        />
      </div>

      <div className="send">
        <button
          className="btn btn-gold"
          type="submit"
        >
          Send a message
        </button>
      </div>

      <p
        className="form-status"
        id="form-status"
        role="status"
        aria-live="polite"
      >
        {status}
      </p>
    </form>
    <Modal open={sent} onClose={() => setSent(false)} title="Message sent successfully!">
      <p className="contact-success-text">Thanks for reaching out. We&rsquo;ve received your message and will get back to you soon.</p>
      <button className="btn btn-gold contact-success-btn" type="button" onClick={() => setSent(false)}>Done</button>
    </Modal>
    </>
  )
}