import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { AnimatePresence, motion, useScroll } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import { refresh, refreshUnreadMessages, useStore } from '../api'
import { badgeText, pendingCount } from '../lib/pending'

// badge = { count, label } for the last link: Admin (pending appointments + unread messages) or Barber (own pending)
function navLinks(user, badge) {
  const last =
    user?.role === 'Admin' ? { to: '/admin', label: 'Admin', badge }
    : user?.role === 'Barber' ? { to: '/dashboard', label: 'Dashboard', badge }
    : { to: '/appointments', label: 'Appointments' }
  return [
    { to: '/', label: 'Home' },
    { to: '/#services', label: 'Services' },
    { to: '/about', label: 'About' },
    // The Contact Us section is hidden for Admins, so don't link to it
    ...(user?.role === 'Admin' ? [] : [{ to: '/#contact', label: 'Contact' }]),
    last,
  ]
}

export default function Header() {
  const { user } = useAuth()
  const { scrollYProgress } = useScroll() // drives the thin gold progress bar
  const { pathname, hash } = useLocation()
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const { appointments, barbers, unreadMessages } = useStore()

  // Staff badges. Admin: every pending appointment + unread contact messages. Barber: only their own pending
  // appointments, on any date. Customers (and signed-out visitors) never get a badge.
  const role = user?.role
  const myBarberId = role === 'Barber' ? barbers.find((b) => b.user_id === user.users_id)?.barber_id : undefined
  const pending = role === 'Admin' ? pendingCount(appointments) : role === 'Barber' && myBarberId != null ? pendingCount(appointments, myBarberId) : 0
  const unread = role === 'Admin' ? unreadMessages : 0
  const badge = pending + unread > 0 ? {
    count: pending + unread,
    label: [pending && `${pending} pending ${pending === 1 ? 'appointment' : 'appointments'}`, unread && `${unread} unread ${unread === 1 ? 'message' : 'messages'}`].filter(Boolean).join(', '),
  } : null

  // New bookings and messages come from other people, so staff reload when they change page or return to the tab
  useEffect(() => {
    if (role !== 'Admin' && role !== 'Barber') return undefined
    const sync = () => { refresh(); if (role === 'Admin') refreshUnreadMessages() }
    sync()
    window.addEventListener('focus', sync)
    return () => window.removeEventListener('focus', sync)
  }, [role, pathname])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  useEffect(() => setOpen(false), [pathname, hash])

  const isActive = (to) => {
    const [p, h] = to.split('#')
    return pathname === p && hash.replace('#', '') === (h || '')
  }

  return (
    <motion.header
      className={`site-header${scrolled ? ' scrolled' : ''}`}
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    >
      <motion.div className="scroll-bar" style={{ scaleX: scrollYProgress }} />
      <nav className="site-nav" aria-label="Main">
        <ul className="nav-links">
          {navLinks(user, badge).map((l) => (
            <li key={l.label}>
              <Link to={l.to} className={isActive(l.to) ? 'active' : ''} aria-label={l.badge ? `${l.label}, ${l.badge.label}` : undefined}>
                {l.label}
                {l.badge && <span className="notif-badge nav-badge" aria-hidden="true">{badgeText(l.badge.count)}</span>}
                {isActive(l.to) && <motion.span layoutId="nav-underline" className="nav-underline" />}
              </Link>
            </li>
          ))}
        </ul>
        <Link className="nav-user" to={user ? '/profile' : '/signin'} aria-label={user ? 'Profile' : 'Sign in'}>
          <svg width="22" height="28" viewBox="0 0 22 28" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="11" cy="6" r="3.5" /><rect x="3" y="14" width="16" height="11" rx="5.5" />
          </svg>
        </Link>
        <button className="nav-toggle" onClick={() => setOpen((o) => !o)} aria-label="Menu" aria-expanded={open}>
          <span /><span /><span />
        </button>
      </nav>
      <AnimatePresence>
        {open && (
          <motion.ul className="nav-mobile" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
            {navLinks(user, badge).map((l) => <li key={l.label}><Link to={l.to} aria-label={l.badge ? `${l.label}, ${l.badge.label}` : undefined}>{l.label}{l.badge && <span className="notif-badge" aria-hidden="true">{badgeText(l.badge.count)}</span>}</Link></li>)}
          </motion.ul>
        )}
      </AnimatePresence>
    </motion.header>
  )
}