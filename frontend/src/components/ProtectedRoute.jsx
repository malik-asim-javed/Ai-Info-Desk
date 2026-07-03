import { Navigate } from 'react-router-dom'

function ProtectedRoute({ children, role }) {
  const token = localStorage.getItem('token')

  if (!token) {
    return <Navigate to="/admin/login" replace />
  }

  let payload
  try {
    payload = JSON.parse(atob(token.split('.')[1]))
  } catch {
    localStorage.removeItem('token')
    localStorage.removeItem('role')
    return <Navigate to="/admin/login" replace />
  }

  // Expired token
  if (payload.exp && payload.exp * 1000 < Date.now()) {
    localStorage.removeItem('token')
    localStorage.removeItem('role')
    return <Navigate to="/admin/login" replace />
  }

  // Wrong role for this route
  if (role && payload.role !== role) {
    return <Navigate to="/admin/login" replace />
  }

  return children
}

export default ProtectedRoute
