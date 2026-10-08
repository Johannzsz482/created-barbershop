import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

// <RequireRole roles={['Barber']}> ...page... </RequireRole>
export default function RequireRole({ roles, children }) {
  const { user } = useAuth()
  const location = useLocation()
  // Remember where the person was heading so sign-in can send them back there, except /profile:
  // logging out or deleting an account on that page would otherwise send the next login straight back to it.
  const from = location.pathname === '/profile' ? undefined : location.pathname + location.search
  if (!user) return <Navigate to="/signin" state={from ? { from } : undefined} replace />
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />
  return children
}
