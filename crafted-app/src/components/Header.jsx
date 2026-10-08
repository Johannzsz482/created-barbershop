import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { AnimatePresence, motion, useScroll } from 'framer-motion'
import { useAuth } from '../context/AuthContext'

function navLinks(user) {
  const last =
    user?.role === 'Admin' ? { to: '/admin', label: 'Admin' }
    : user?.role === 'Barber' ? { to: '/dashboard', label: 'Dashboard' }
    : { to: '/appointments', label: 'Appointments' }
  return [
    { to: '/', label: 'Home' },
    { to: '/#services', label: 'Services' },
    { to: '/about', label: 'About' },
    { to: '/#contact', label: 'Contact' },
    last,
  ]
}

export default function Header() {
  const { user } = useAuth()
  const { scrollYProgress } = useScroll() // drives the thin gold progress bar
  const { pathname, hash } = useLocation()
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)

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
          {navLinks(user).map((l) => (
            <li key={l.label}>
              <Link to={l.to} className={isActive(l.to) ? 'active' : ''}>
                {l.label}
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
            {navLinks(user).map((l) => <li key={l.label}><Link to={l.to}>{l.label}</Link></li>)}
          </motion.ul>
        )}
      </AnimatePresence>
    </motion.header>
  )
}
