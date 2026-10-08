import { useRef, useState } from 'react'
import { api } from '../api'
import Modal from './Modal'

const FIELDS = ['firstName', 'lastName', 'email', 'msg']

export default function ContactForm() {
  const formRef = useRef(null)
  const [values, setValues] = useState({
    firstName: '',
    lastName: '',
    email: '',
    msg: '',
  })
  const [invalid, setInvalid] = useState({})
  const [ok, setOk] = useState({})
  const [status, setStatus] = useState('')
  const [sent, setSent] = useState(false)

  const handleChange = (e) => {
    const { id, value } = e.target

    setValues((v) => ({
      ...v,
      [id]: value,
    }))

    // After a failed submit, keep each field's red state in step with what's typed
    const good = value.trim() !== '' && e.target.checkValidity()
    setInvalid((inv) => (inv[id] === undefined ? inv : { ...inv, [id]: !good }))
    setOk((o) => ({ ...o, [id]: good }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    const next = {}
    let valid = true

    FIELDS.forEach((id) => {
      const input = formRef.current.elements[id]
      const ok = input.value.trim() !== '' && input.checkValidity()

      next[id] = !ok

      if (!ok) {
        valid = false
      }
    })

    setInvalid(next)

    if (!valid) {
      setStatus('Please fill in all fields with valid details.')
      return
    }

    setStatus('Sending...')

    const r = await api('/contact', 'POST', {
      name: `${values.firstName.trim()} ${values.lastName.trim()}`,
      email: values.email.trim(),
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

    setValues({
      firstName: '',
      lastName: '',
      email: '',
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
        />
      </div>

      <div className={`field${invalid.email ? ' invalid' : ok.email ? ' valid' : ''}`}>
        <label htmlFor="email">Email</label>

        <input
          id="email"
          type="email"
          placeholder="juandelacruz@gmail.com"
          value={values.email}
          onChange={handleChange}
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