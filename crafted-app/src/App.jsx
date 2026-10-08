import { useEffect } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import Header from './components/Header'
import Footer from './components/Footer'
import RequireRole from './components/RequireRole'
import Home from './pages/Home'
import { SignIn, SignUp } from './pages/Auth'
import Profile from './pages/Profile'
import ComingSoon from './pages/ComingSoon'
import About from './pages/About'
import Craftsmen from './pages/Craftsmen'
import Book from './pages/Book'
import Appointments from './pages/Appointments'
import Dashboard from './pages/Dashboard'
import Admin from './pages/Admin'

// Jump to the top whenever the page (not just the #section) changes
function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])
  return null
}

export default function App() {
  const location = useLocation()
  const bare = ['/signin', '/signup'].includes(location.pathname) // auth pages have no header/footer

  return (
    <>
      <ScrollToTop />
      {!bare && <Header />}
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<Home />} />
          <Route path="/signin" element={<SignIn />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/profile" element={<RequireRole><Profile /></RequireRole>} />

          {/* Built in the next stages */}
          <Route path="/about" element={<About />} />
          <Route path="/craftsmen" element={<Craftsmen />} />
          <Route path="/book" element={<RequireRole roles={['Customer']}><Book /></RequireRole>} />
          <Route path="/appointments" element={<RequireRole roles={['Customer']}><Appointments /></RequireRole>} />
          <Route path="/dashboard" element={<RequireRole roles={['Barber']}><Dashboard /></RequireRole>} />
          <Route path="/admin" element={<RequireRole roles={['Admin']}><Admin /></RequireRole>} />
          <Route path="*" element={<ComingSoon title="Not found" />} />
        </Routes>
      </AnimatePresence>
      {!bare && <Footer />}
    </>
  )
}
