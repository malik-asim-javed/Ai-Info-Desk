import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { loginAdmin } from '../api'

function AdminLogin() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    setError('')
    setLoading(true)

    try {
      const response = await loginAdmin(email, password)
      const { access_token, role } = response.data

      // Store token and role in localStorage
      localStorage.setItem('token', access_token)
      localStorage.setItem('role', role)

      // Redirect based on role
      if (role === 'superadmin') {
        navigate('/superadmin/dashboard')
      } else {
        navigate('/admin/dashboard')
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid email or password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="w-full max-w-sm">

        {/* LOGO */}
        <div className="mb-8 text-center">
          <span className="text-2xl font-semibold tracking-tight">
            Info<span className="text-indigo-600">Desk</span>
          </span>
          <p className="text-sm text-gray-400 mt-1">Admin Portal</p>
        </div>

        {/* CARD */}
        <div className="border border-gray-200 rounded-2xl p-8 shadow-sm">
          <h1 className="text-xl font-bold tracking-tight text-gray-900 mb-1">Sign in</h1>
          <p className="text-sm text-gray-400 mb-6">Enter your credentials to access the dashboard.</p>

          {error && (
            <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2 mb-4">
              {error}
            </div>
          )}

          <div className="mb-4">
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Email address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@university.edu"
              className="w-full text-sm px-4 py-2.5 border border-gray-200 rounded-lg outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition"
            />
          </div>

          <div className="mb-6">
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              className="w-full text-sm px-4 py-2.5 border border-gray-200 rounded-lg outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition"
            />
          </div>

          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full bg-gray-900 text-white text-sm font-medium py-2.5 rounded-lg hover:opacity-80 transition disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </div>

        <p
          className="text-center text-xs text-gray-400 mt-6 cursor-pointer hover:text-gray-600 transition"
          onClick={() => navigate('/')}
        >
          ← Back to Info Desk
        </p>

      </div>
    </div>
  )
}

export default AdminLogin