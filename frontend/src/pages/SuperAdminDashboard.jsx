import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  getUniversities, createUniversity,
  getAdmins, addAdmin, deactivateAdmin
} from '../api'

const emptyUniForm = { name: '', city: '', province: '' }
const emptyAdminForm = { name: '', email: '', password: '' }

function SuperAdminDashboard() {
  const navigate = useNavigate()
  const [activeSection, setActiveSection] = useState('universities')

  const [universities, setUniversities] = useState([])
  const [admins, setAdmins] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  const [uniForm, setUniForm] = useState(emptyUniForm)
  const [adminForm, setAdminForm] = useState(emptyAdminForm)
  const [formError, setFormError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  // For admins section — add admin to existing uni
  const [addAdminUniId, setAddAdminUniId] = useState('')
  const [newAdminForm, setNewAdminForm] = useState({ name: '', email: '', password: '' })
  const [adminError, setAdminError] = useState('')
  const [adminSuccess, setAdminSuccess] = useState('')

  const token = localStorage.getItem('token')
  const payload = token ? JSON.parse(atob(token.split('.')[1])) : {}

  const showSuccess = (msg, setter) => {
    setter(msg)
    setTimeout(() => setter(''), 3000)
  }

  useEffect(() => {
    if (!token || payload.role !== 'superadmin') {
      navigate('/admin/login')
      return
    }
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [uniRes, adminRes] = await Promise.all([getUniversities(), getAdmins()])
      setUniversities(uniRes.data)
      setAdmins(adminRes.data)
    } catch {
      setLoadError('Failed to load data. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleSignOut = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('role')
    navigate('/admin/login')
  }

  // Admins belonging to a given university
  const adminsFor = (uniId) => admins.filter(a => a.university_id === uniId)
  const activeAdminCount = (uniId) => admins.filter(a => a.university_id === uniId && a.is_active).length

  const handleCreateUniversity = async () => {
    setFormError('')
    if (!uniForm.name || !uniForm.city || !uniForm.province) {
      setFormError('All university fields are required.')
      return
    }
    if (!adminForm.name || !adminForm.email || !adminForm.password) {
      setFormError('All admin fields are required.')
      return
    }

    try {
      const res = await createUniversity({
        name: uniForm.name,
        city: uniForm.city,
        province: uniForm.province,
        admin: adminForm
      })
      setUniversities(prev => [...prev, res.data])
      const adminRes = await getAdmins()
      setAdmins(adminRes.data)
      setUniForm(emptyUniForm)
      setAdminForm(emptyAdminForm)
      showSuccess('University and admin created successfully.', setSuccessMsg)
    } catch (err) {
      setFormError(err.response?.data?.detail || 'Failed to create university.')
    }
  }

  const handleDeactivateAdmin = async (uniId, adminId) => {
    if (activeAdminCount(uniId) <= 1) return // safety check
    try {
      const res = await deactivateAdmin(adminId)
      setAdmins(prev => prev.map(a => a.id === adminId ? res.data : a))
    } catch (err) {
      setAdminError(err.response?.data?.detail || 'Failed to deactivate admin.')
    }
  }

  const handleAddAdmin = async () => {
    setAdminError('')
    if (!addAdminUniId) { setAdminError('Select a university.'); return }
    if (!newAdminForm.name || !newAdminForm.email || !newAdminForm.password) {
      setAdminError('All fields are required.'); return
    }

    // Check email not already used
    const emailTaken = admins.some(a => a.email === newAdminForm.email)
    if (emailTaken) { setAdminError('This email is already assigned to an admin.'); return }

    try {
      const res = await addAdmin({ university_id: addAdminUniId, ...newAdminForm })
      setAdmins(prev => [...prev, res.data])
      setNewAdminForm({ name: '', email: '', password: '' })
      setAddAdminUniId('')
      showSuccess('Admin added successfully.', setAdminSuccess)
    } catch (err) {
      setAdminError(err.response?.data?.detail || 'Failed to add admin.')
    }
  }

  const navItems = [
    { key: 'universities', label: 'Universities', icon: '🏫' },
    { key: 'admins',       label: 'Admins',       icon: '🛠' },
    { key: 'settings',     label: 'Settings',     icon: '⚙' },
  ]

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-sm text-gray-400">Loading...</p>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-white text-gray-900 font-sans overflow-hidden">

      {/* SIDEBAR */}
      <aside className="w-52 border-r border-gray-100 flex flex-col bg-gray-50 flex-shrink-0">
        <div className="px-4 py-5 border-b border-gray-100">
          <div className="text-base font-semibold tracking-tight">
            Info<span className="text-indigo-600">Desk</span>
          </div>
          <div className="text-xs text-amber-500 font-medium mt-0.5">Super Admin</div>
        </div>

        <nav className="flex flex-col gap-1 p-2 flex-1">
          {navItems.map(item => (
            <button
              key={item.key}
              onClick={() => setActiveSection(item.key)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left transition w-full
                ${activeSection === item.key
                  ? 'bg-white text-indigo-600 font-medium border border-gray-200'
                  : 'text-gray-500 hover:bg-white hover:text-gray-900'}`}
            >
              <span>{item.icon}</span> {item.label}
            </button>
          ))}
        </nav>

        <div className="p-2 border-t border-gray-100">
          <div className="flex items-center gap-2 px-3 py-2">
            <div className="w-7 h-7 rounded-full bg-amber-50 flex items-center justify-center text-xs font-semibold text-amber-600 flex-shrink-0">
              SA
            </div>
            <div>
              <div className="text-xs font-medium text-gray-900">Super Admin</div>
              <div className="text-xs text-gray-400">Global access</div>
            </div>
          </div>
        </div>
      </aside>

      {/* MAIN */}
      <div className="flex flex-col flex-1 overflow-hidden">

        {/* Topbar */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-gray-100">
          <div>
            <div className="text-sm font-medium text-gray-900 capitalize">{activeSection}</div>
            <div className="text-xs text-gray-400">
              {activeSection === 'universities' && 'Manage all registered universities'}
              {activeSection === 'admins' && 'Manage admins across all universities'}
              {activeSection === 'settings' && 'Super admin account settings'}
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="text-xs text-gray-400 hover:text-gray-600 px-3 py-1 rounded-lg hover:bg-gray-100 transition"
          >
            Sign out
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">

          {loadError && (
            <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2 mb-4">
              {loadError}
            </div>
          )}

          {/* UNIVERSITIES */}
          {activeSection === 'universities' && (
            <div className="flex gap-6">

              {/* University list */}
              <div className="flex-1 flex flex-col gap-3">
                {successMsg && (
                  <div className="text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-2">
                    {successMsg}
                  </div>
                )}
                {universities.map(uni => {
                  const uniAdmins = adminsFor(uni.id)
                  const activeAdmins = uniAdmins.filter(a => a.is_active)
                  return (
                    <div key={uni.id} className="p-4 bg-gray-50 border border-gray-100 rounded-xl">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{uni.name}</div>
                          <div className="text-xs text-gray-400 mt-0.5">{uni.city}, {uni.province}</div>
                        </div>
                        <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full">
                          {activeAdmins.length} admin{activeAdmins.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {uniAdmins.map(admin => {
                          const canDeactivate = activeAdmins.length > 1 && admin.is_active
                          return (
                            <div
                              key={admin.id}
                              className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border
                                ${admin.is_active
                                  ? 'bg-white border-gray-200 text-gray-700'
                                  : 'bg-gray-100 border-gray-100 text-gray-400 line-through'}`}
                            >
                              <div className={`w-1.5 h-1.5 rounded-full ${admin.is_active ? 'bg-green-400' : 'bg-gray-300'}`} />
                              {admin.email}
                              {admin.is_active && (
                                <button
                                  onClick={() => canDeactivate && handleDeactivateAdmin(uni.id, admin.id)}
                                  title={canDeactivate ? 'Deactivate admin' : 'Cannot deactivate — only active admin'}
                                  className={`ml-1 text-xs leading-none transition
                                    ${canDeactivate ? 'text-red-400 hover:text-red-600 cursor-pointer' : 'text-gray-200 cursor-not-allowed'}`}
                                >
                                  ✕
                                </button>
                              )}
                            </div>
                          )
                        })}
                        {uniAdmins.length === 0 && (
                          <span className="text-xs text-gray-400">No admins yet</span>
                        )}
                      </div>
                    </div>
                  )
                })}
                {universities.length === 0 && (
                  <p className="text-sm text-gray-400">No universities yet. Add one using the form.</p>
                )}
              </div>

              {/* Create university form */}
              <div className="w-60 flex-shrink-0">
                <div className="bg-gray-50 border border-gray-100 rounded-xl p-4">
                  <div className="text-sm font-medium text-gray-900 mb-4 pb-2 border-b border-gray-100">
                    Add New University
                  </div>

                  <div className="text-xs font-semibold tracking-widest text-indigo-400 uppercase mb-2">
                    University Info
                  </div>

                  {[
                    { label: 'University name', key: 'name', placeholder: 'e.g. NUST' },
                    { label: 'City', key: 'city', placeholder: 'e.g. Islamabad' },
                    { label: 'Province', key: 'province', placeholder: 'e.g. Punjab' },
                  ].map(field => (
                    <div key={field.key} className="mb-3">
                      <label className="block text-xs text-gray-400 mb-1">{field.label}</label>
                      <input
                        type="text"
                        value={uniForm[field.key]}
                        onChange={e => setUniForm(prev => ({ ...prev, [field.key]: e.target.value }))}
                        placeholder={field.placeholder}
                        className="w-full text-xs px-3 py-2 border border-gray-200 rounded-lg outline-none focus:border-indigo-400 bg-white"
                      />
                    </div>
                  ))}

                  <div className="text-xs font-semibold tracking-widest text-indigo-400 uppercase mb-2 mt-4">
                    First Admin
                  </div>

                  {[
                    { label: 'Full name', key: 'name', placeholder: 'Admin name', type: 'text' },
                    { label: 'Email', key: 'email', placeholder: 'admin@uni.edu.pk', type: 'email' },
                    { label: 'Password', key: 'password', placeholder: '••••••••', type: 'password' },
                  ].map(field => (
                    <div key={field.key} className="mb-3">
                      <label className="block text-xs text-gray-400 mb-1">{field.label}</label>
                      <input
                        type={field.type}
                        value={adminForm[field.key]}
                        onChange={e => setAdminForm(prev => ({ ...prev, [field.key]: e.target.value }))}
                        placeholder={field.placeholder}
                        className="w-full text-xs px-3 py-2 border border-gray-200 rounded-lg outline-none focus:border-indigo-400 bg-white"
                      />
                    </div>
                  ))}

                  {formError && (
                    <p className="text-xs text-red-500 mb-2">{formError}</p>
                  )}

                  <button
                    onClick={handleCreateUniversity}
                    className="w-full text-xs font-medium text-white bg-indigo-600 py-2 rounded-lg hover:opacity-80 transition mt-1"
                  >
                    Create University
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ADMINS */}
          {activeSection === 'admins' && (
            <div className="flex gap-6">

              {/* All admins list */}
              <div className="flex-1">
                {adminSuccess && (
                  <div className="text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-2 mb-3">
                    {adminSuccess}
                  </div>
                )}
                <div className="flex flex-col gap-2">
                  {admins.map(admin => {
                    const uni = universities.find(u => u.id === admin.university_id)
                    return (
                      <div key={admin.id} className="flex items-center justify-between p-4 bg-gray-50 border border-gray-100 rounded-xl">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-xs font-semibold text-indigo-600">
                            {admin.name.split(' ').map(n => n[0]).join('')}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">{admin.name}</div>
                            <div className="text-xs text-gray-400">{admin.email}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-gray-400">{uni ? uni.name : '—'}</span>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full
                            ${admin.is_active ? 'text-green-700 bg-green-50' : 'text-gray-400 bg-gray-100'}`}>
                            {admin.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                  {admins.length === 0 && (
                    <p className="text-sm text-gray-400">No admins yet.</p>
                  )}
                </div>
              </div>

              {/* Add admin form */}
              <div className="w-60 flex-shrink-0">
                <div className="bg-gray-50 border border-gray-100 rounded-xl p-4">
                  <div className="text-sm font-medium text-gray-900 mb-4 pb-2 border-b border-gray-100">
                    Add Admin to University
                  </div>

                  <div className="mb-3">
                    <label className="block text-xs text-gray-400 mb-1">University</label>
                    <select
                      value={addAdminUniId}
                      onChange={e => setAddAdminUniId(e.target.value)}
                      className="w-full text-xs px-3 py-2 border border-gray-200 rounded-lg outline-none focus:border-indigo-400 bg-white"
                    >
                      <option value="">Select university…</option>
                      {universities.map(uni => (
                        <option key={uni.id} value={uni.id}>{uni.name}</option>
                      ))}
                    </select>
                  </div>

                  {[
                    { label: 'Full name', key: 'name', placeholder: 'Admin name', type: 'text' },
                    { label: 'Email', key: 'email', placeholder: 'admin@uni.edu.pk', type: 'email' },
                    { label: 'Password', key: 'password', placeholder: '••••••••', type: 'password' },
                  ].map(field => (
                    <div key={field.key} className="mb-3">
                      <label className="block text-xs text-gray-400 mb-1">{field.label}</label>
                      <input
                        type={field.type}
                        value={newAdminForm[field.key]}
                        onChange={e => setNewAdminForm(prev => ({ ...prev, [field.key]: e.target.value }))}
                        placeholder={field.placeholder}
                        className="w-full text-xs px-3 py-2 border border-gray-200 rounded-lg outline-none focus:border-indigo-400 bg-white"
                      />
                    </div>
                  ))}

                  {adminError && (
                    <p className="text-xs text-red-500 mb-2">{adminError}</p>
                  )}

                  <button
                    onClick={handleAddAdmin}
                    className="w-full text-xs font-medium text-white bg-indigo-600 py-2 rounded-lg hover:opacity-80 transition mt-1"
                  >
                    Add Admin
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* SETTINGS */}
          {activeSection === 'settings' && (
            <div className="max-w-md">
              <div className="text-sm font-medium text-gray-900 mb-4">Account Settings</div>
              <div className="flex flex-col gap-4">
                {[
                  { label: 'Full name', type: 'text', value: 'Super Admin' },
                  { label: 'Email address', type: 'email', value: payload.sub || 'superadmin@infodesk.com' },
                  { label: 'New password', type: 'password', value: '' },
                ].map(field => (
                  <div key={field.label}>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">{field.label}</label>
                    <input
                      type={field.type}
                      defaultValue={field.value}
                      placeholder={field.type === 'password' ? '••••••••' : ''}
                      disabled
                      className="w-full text-sm px-4 py-2.5 border border-gray-200 rounded-lg outline-none bg-gray-50 text-gray-400 cursor-not-allowed transition"
                    />
                  </div>
                ))}
                <p className="text-xs text-gray-400">
                  The super admin account is a fixed system credential and isn't editable from here yet.
                </p>
                <button disabled className="w-full bg-gray-200 text-gray-400 text-sm font-medium py-2.5 rounded-lg cursor-not-allowed transition">
                  Save changes
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}

export default SuperAdminDashboard
