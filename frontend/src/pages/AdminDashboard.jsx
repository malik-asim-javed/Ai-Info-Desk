import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  getFAQs, createFAQ, updateFAQ, deleteFAQ,
  getPolicies, createPolicy, updatePolicy, deletePolicy,
  updateMyProfile, getAnalytics
} from '../api'

function AdminDashboard() {
  const navigate = useNavigate()
  const [activeSection, setActiveSection] = useState('overview')
  const [faqs, setFaqs] = useState([])
  const [policies, setPolicies] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  const token = localStorage.getItem('token')
  const payload = token ? JSON.parse(atob(token.split('.')[1])) : {}
  const universityId = payload.university_id

  const [faqForm, setFaqForm] = useState({ question: '', answer: '' })
  const [editingFaq, setEditingFaq] = useState(null)
  const [faqModalOpen, setFaqModalOpen] = useState(false)

  const [policyForm, setPolicyForm] = useState({ title: '', content: '' })
  const [editingPolicy, setEditingPolicy] = useState(null)
  const [policyModalOpen, setPolicyModalOpen] = useState(false)

  const [settingsForm, setSettingsForm] = useState({ name: '', email: '', password: '' })
  const [settingsError, setSettingsError] = useState('')
  const [settingsSuccess, setSettingsSuccess] = useState('')
  const [savingSettings, setSavingSettings] = useState(false)

  const [analytics, setAnalytics] = useState(null)
  const [analyticsLoading, setAnalyticsLoading] = useState(true)

  const showSuccess = (msg) => {
    setSuccessMsg(msg)
    setTimeout(() => setSuccessMsg(''), 3000)
  }

  useEffect(() => {
    if (!token || !universityId) {
      navigate('/admin/login')
      return
    }
    loadData()
    setSettingsForm({ name: '', email: payload.sub || '', password: '' })
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [faqRes, policyRes] = await Promise.all([
        getFAQs(universityId),
        getPolicies(universityId)
      ])
      setFaqs(faqRes.data)
      setPolicies(policyRes.data)
    } catch (err) {
      setError('Failed to load data. Please try again.')
    } finally {
      setLoading(false)
    }
    loadAnalytics()
  }

  const loadAnalytics = async () => {
    setAnalyticsLoading(true)
    try {
      const res = await getAnalytics(universityId)
      setAnalytics(res.data)
    } catch {
      // Analytics is a non-critical enhancement — fail quietly and just
      // keep showing the loading/placeholder state rather than blocking
      // the rest of the dashboard with an error banner.
      setAnalytics(null)
    } finally {
      setAnalyticsLoading(false)
    }
  }

  const handleSignOut = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('role')
    navigate('/admin/login')
  }

  const handleCreateFAQ = async () => {
    if (!faqForm.question || !faqForm.answer) return
    try {
      const res = await createFAQ({ ...faqForm, university_id: universityId })
      setFaqs(prev => [...prev, res.data])
      setFaqForm({ question: '', answer: '' })
      setFaqModalOpen(false)
      showSuccess('FAQ created successfully.')
    } catch {
      setError('Failed to create FAQ.')
    }
  }

  const handleUpdateFAQ = async () => {
    if (!editingFaq) return
    try {
      const res = await updateFAQ(editingFaq.id, faqForm)
      setFaqs(prev => prev.map(f => f.id === editingFaq.id ? res.data : f))
      setEditingFaq(null)
      setFaqForm({ question: '', answer: '' })
      setFaqModalOpen(false)
      showSuccess('FAQ updated successfully.')
    } catch {
      setError('Failed to update FAQ.')
    }
  }

  const handleDeleteFAQ = async (id) => {
    try {
      await deleteFAQ(id)
      setFaqs(prev => prev.filter(f => f.id !== id))
      showSuccess('FAQ deleted.')
    } catch {
      setError('Failed to delete FAQ.')
    }
  }

  const handleEditFAQ = (faq) => {
    setEditingFaq(faq)
    setFaqForm({ question: faq.question, answer: faq.answer })
    setFaqModalOpen(true)
  }

  const closeFaqModal = () => {
    setFaqModalOpen(false)
    setEditingFaq(null)
    setFaqForm({ question: '', answer: '' })
  }

  const handleCreatePolicy = async () => {
    if (!policyForm.title || !policyForm.content) return
    try {
      const res = await createPolicy({ ...policyForm, university_id: universityId })
      setPolicies(prev => [...prev, res.data])
      setPolicyForm({ title: '', content: '' })
      setPolicyModalOpen(false)
      showSuccess('Policy created successfully.')
    } catch {
      setError('Failed to create policy.')
    }
  }

  const handleUpdatePolicy = async () => {
    if (!editingPolicy) return
    try {
      const res = await updatePolicy(editingPolicy.id, policyForm)
      setPolicies(prev => prev.map(p => p.id === editingPolicy.id ? res.data : p))
      setEditingPolicy(null)
      setPolicyForm({ title: '', content: '' })
      setPolicyModalOpen(false)
      showSuccess('Policy updated successfully.')
    } catch {
      setError('Failed to update policy.')
    }
  }

  const handleDeletePolicy = async (id) => {
    try {
      await deletePolicy(id)
      setPolicies(prev => prev.filter(p => p.id !== id))
      showSuccess('Policy deleted.')
    } catch {
      setError('Failed to delete policy.')
    }
  }

  const handleEditPolicy = (policy) => {
    setEditingPolicy(policy)
    setPolicyForm({ title: policy.title, content: policy.content })
    setPolicyModalOpen(true)
  }

  const closePolicyModal = () => {
    setPolicyModalOpen(false)
    setEditingPolicy(null)
    setPolicyForm({ title: '', content: '' })
  }

  const handleSaveSettings = async () => {
    setSettingsError('')

    const payloadToSend = {}
    if (settingsForm.name.trim()) payloadToSend.name = settingsForm.name.trim()
    if (settingsForm.email.trim() && settingsForm.email.trim() !== payload.sub) {
      payloadToSend.email = settingsForm.email.trim()
    }
    if (settingsForm.password) payloadToSend.password = settingsForm.password

    if (Object.keys(payloadToSend).length === 0) {
      setSettingsError('No changes to save.')
      return
    }

    setSavingSettings(true)
    try {
      const res = await updateMyProfile(payloadToSend)

      // If the email changed, the existing JWT's "sub" no longer matches —
      // safest to sign the admin out so they log back in with fresh data
      // rather than leaving the UI in a stale state.
      const emailChanged = payloadToSend.email && payloadToSend.email !== payload.sub

      setSettingsForm(prev => ({ ...prev, password: '' }))
      showSuccess('Settings saved.')
      setSettingsSuccess('Settings saved.')
      setTimeout(() => setSettingsSuccess(''), 3000)

      if (emailChanged) {
        setTimeout(() => {
          localStorage.removeItem('token')
          localStorage.removeItem('role')
          navigate('/admin/login')
        }, 1200)
      }
    } catch (err) {
      setSettingsError(err.response?.data?.detail || 'Failed to save settings.')
    } finally {
      setSavingSettings(false)
    }
  }

  const navItems = [
    { key: 'overview',  label: 'Overview',  icon: '⊞' },
    { key: 'faqs',      label: 'FAQs',      icon: '?' },
    { key: 'policies',  label: 'Policies',  icon: '📄' },
    { key: 'settings',  label: 'Settings',  icon: '⚙' },
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

      <aside className="w-52 border-r border-gray-100 flex flex-col bg-gray-50 flex-shrink-0">
        <div className="px-4 py-5 border-b border-gray-100">
          <div className="text-base font-semibold tracking-tight">
            Info<span className="text-indigo-600">Desk</span>
          </div>
          <div className="text-xs text-gray-400 mt-0.5">Admin Portal</div>
        </div>

        <nav className="flex flex-col gap-1 p-2 flex-1">
          {navItems.map((item) => (
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
            <div className="w-7 h-7 rounded-full bg-indigo-50 flex items-center justify-center text-xs font-medium text-indigo-600 flex-shrink-0">
              AD
            </div>
            <div>
              <div className="text-xs font-medium text-gray-900">Admin User</div>
              <div className="text-xs text-gray-400">University Admin</div>
            </div>
          </div>
        </div>
      </aside>

      <div className="flex flex-col flex-1 overflow-hidden">

        <div className="flex items-center justify-between px-6 py-3.5 border-b border-gray-100">
          <div>
            <div className="text-sm font-medium text-gray-900 capitalize">{activeSection}</div>
            <div className="text-xs text-gray-400">Manage your university data</div>
          </div>
          <div className="flex items-center gap-2">
            {activeSection === 'faqs' && (
              <button
                onClick={() => setFaqModalOpen(true)}
                className="text-xs font-medium text-white bg-indigo-600 px-3 py-1.5 rounded-lg hover:opacity-80 transition"
              >
                + Add FAQ
              </button>
            )}
            {activeSection === 'policies' && (
              <button
                onClick={() => setPolicyModalOpen(true)}
                className="text-xs font-medium text-white bg-indigo-600 px-3 py-1.5 rounded-lg hover:opacity-80 transition"
              >
                + Add Policy
              </button>
            )}
            <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
              University Admin
            </span>
            <button
              onClick={handleSignOut}
              className="text-xs text-gray-400 hover:text-gray-600 px-3 py-1 rounded-lg hover:bg-gray-100 transition"
            >
              Sign out
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">

          {error && (
            <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2 mb-4">
              {error}
            </div>
          )}

          {successMsg && (
            <div className="text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-2 mb-4">
              {successMsg}
            </div>
          )}

          {activeSection === 'overview' && (
            <div>
              <div className="grid grid-cols-3 gap-3 mb-6">
                {[
                  { label: 'Total FAQs', value: faqs.length, sub: 'across all categories' },
                  { label: 'Policies', value: policies.length, sub: 'documents uploaded' },
                  {
                    label: 'Queries today',
                    value: analyticsLoading ? '…' : (analytics ? analytics.queries_today : '—'),
                    sub: analytics ? `${analytics.queries_this_week} this week` : 'from student sessions'
                  },
                ].map((stat) => (
                  <div key={stat.label} className="bg-gray-50 rounded-xl p-4">
                    <div className="text-xs text-gray-400 mb-1">{stat.label}</div>
                    <div className="text-3xl font-bold text-gray-900">{stat.value}</div>
                    <div className="text-xs text-gray-400 mt-1">{stat.sub}</div>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-gray-900">Recent FAQs</span>
                <button
                  onClick={() => setActiveSection('faqs')}
                  className="text-xs text-indigo-600 hover:underline"
                >
                  View all →
                </button>
              </div>

              <div className="flex flex-col gap-2 mb-6">
                {faqs.slice(0, 3).map((faq) => (
                  <div key={faq.id} className="flex items-center justify-between p-4 bg-gray-50 border border-gray-100 rounded-xl">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{faq.question}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{faq.answer}</div>
                    </div>
                  </div>
                ))}
                {faqs.length === 0 && (
                  <p className="text-sm text-gray-400">No FAQs yet. Add some in the FAQs section.</p>
                )}
              </div>

              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-gray-900">Recent student questions</span>
              </div>

              <div className="flex flex-col gap-2">
                {analyticsLoading ? (
                  <p className="text-sm text-gray-400">Loading...</p>
                ) : analytics && analytics.recent_questions.length > 0 ? (
                  analytics.recent_questions.map((q, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 border border-gray-100 rounded-xl">
                      <span className="text-sm text-gray-700">{q.question}</span>
                      <span className="text-xs text-gray-400 flex-shrink-0 ml-4">
                        {new Date(q.created_at + 'Z').toLocaleString()}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-400">No questions asked yet.</p>
                )}
              </div>
            </div>
          )}

          {activeSection === 'faqs' && (
            <div className="relative">
              <div className="flex flex-col gap-2">
                {faqs.map((faq) => (
                  <div key={faq.id} className="flex items-start justify-between p-4 bg-gray-50 border border-gray-100 rounded-xl">
                    <div className="flex-1 min-w-0 pr-4">
                      <div className="text-sm font-medium text-gray-900">{faq.question}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{faq.answer}</div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleEditFAQ(faq)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-400 hover:text-gray-700 text-xs transition"
                      >✏</button>
                      <button
                        onClick={() => handleDeleteFAQ(faq.id)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-400 hover:text-red-500 text-xs transition"
                      >🗑</button>
                    </div>
                  </div>
                ))}
                {faqs.length === 0 && (
                  <p className="text-sm text-gray-400">No FAQs yet. Click "Add FAQ" to get started.</p>
                )}
              </div>

              {faqModalOpen && (
                <div
                  className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
                  onClick={closeFaqModal}
                >
                  <div
                    className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6"
                    onClick={e => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-between mb-5 pb-4 border-b border-gray-100">
                      <span className="text-sm font-medium text-gray-900">
                        {editingFaq ? 'Edit FAQ' : 'Add FAQ'}
                      </span>
                      <button
                        onClick={closeFaqModal}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition text-base"
                      >✕</button>
                    </div>
                    <div className="mb-4">
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">Question</label>
                      <input
                        type="text"
                        value={faqForm.question}
                        onChange={e => setFaqForm(prev => ({ ...prev, question: e.target.value }))}
                        placeholder="Enter question"
                        autoFocus
                        className="w-full text-sm px-3 py-2.5 border border-gray-200 rounded-lg outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50 transition"
                      />
                    </div>
                    <div className="mb-6">
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">Answer</label>
                      <textarea
                        value={faqForm.answer}
                        onChange={e => setFaqForm(prev => ({ ...prev, answer: e.target.value }))}
                        placeholder="Enter answer"
                        rows={4}
                        className="w-full text-sm px-3 py-2.5 border border-gray-200 rounded-lg outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50 transition resize-none"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={closeFaqModal}
                        className="flex-1 text-sm text-gray-500 border border-gray-200 py-2.5 rounded-lg hover:bg-gray-50 transition"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={editingFaq ? handleUpdateFAQ : handleCreateFAQ}
                        className="flex-1 text-sm font-medium text-white bg-indigo-600 py-2.5 rounded-lg hover:opacity-80 transition"
                      >
                        {editingFaq ? 'Update FAQ' : 'Add FAQ'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeSection === 'policies' && (
            <div className="relative">
              <div className="flex flex-col gap-2">
                {policies.map((policy) => (
                  <div key={policy.id} className="flex items-start justify-between p-4 bg-gray-50 border border-gray-100 rounded-xl">
                    <div className="flex-1 min-w-0 pr-4">
                      <div className="text-sm font-medium text-gray-900">{policy.title}</div>
                      <div className="text-xs text-gray-400 mt-0.5 line-clamp-2">{policy.content}</div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleEditPolicy(policy)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-400 hover:text-gray-700 text-xs transition"
                      >✏</button>
                      <button
                        onClick={() => handleDeletePolicy(policy.id)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-400 hover:text-red-500 text-xs transition"
                      >🗑</button>
                    </div>
                  </div>
                ))}
                {policies.length === 0 && (
                  <p className="text-sm text-gray-400">No policies yet. Click "Add Policy" to get started.</p>
                )}
              </div>

              {policyModalOpen && (
                <div
                  className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
                  onClick={closePolicyModal}
                >
                  <div
                    className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6"
                    onClick={e => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-between mb-5 pb-4 border-b border-gray-100">
                      <span className="text-sm font-medium text-gray-900">
                        {editingPolicy ? 'Edit Policy' : 'Add Policy'}
                      </span>
                      <button
                        onClick={closePolicyModal}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition text-base"
                      >✕</button>
                    </div>
                    <div className="mb-4">
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">Title</label>
                      <input
                        type="text"
                        value={policyForm.title}
                        onChange={e => setPolicyForm(prev => ({ ...prev, title: e.target.value }))}
                        placeholder="Policy title"
                        autoFocus
                        className="w-full text-sm px-3 py-2.5 border border-gray-200 rounded-lg outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50 transition"
                      />
                    </div>
                    <div className="mb-6">
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">Content</label>
                      <textarea
                        value={policyForm.content}
                        onChange={e => setPolicyForm(prev => ({ ...prev, content: e.target.value }))}
                        placeholder="Policy content"
                        rows={5}
                        className="w-full text-sm px-3 py-2.5 border border-gray-200 rounded-lg outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50 transition resize-none"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={closePolicyModal}
                        className="flex-1 text-sm text-gray-500 border border-gray-200 py-2.5 rounded-lg hover:bg-gray-50 transition"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={editingPolicy ? handleUpdatePolicy : handleCreatePolicy}
                        className="flex-1 text-sm font-medium text-white bg-indigo-600 py-2.5 rounded-lg hover:opacity-80 transition"
                      >
                        {editingPolicy ? 'Update Policy' : 'Add Policy'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeSection === 'settings' && (
            <div className="max-w-md">
              <div className="text-sm font-medium text-gray-900 mb-4">Account Settings</div>
              <div className="flex flex-col gap-4">

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Full name</label>
                  <input
                    type="text"
                    value={settingsForm.name}
                    onChange={e => setSettingsForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Your name"
                    className="w-full text-sm px-4 py-2.5 border border-gray-200 rounded-lg outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Email address</label>
                  <input
                    type="email"
                    value={settingsForm.email}
                    onChange={e => setSettingsForm(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full text-sm px-4 py-2.5 border border-gray-200 rounded-lg outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition"
                  />
                  <p className="text-xs text-gray-400 mt-1">Changing this will sign you out — log back in with the new email.</p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">New password</label>
                  <input
                    type="password"
                    value={settingsForm.password}
                    onChange={e => setSettingsForm(prev => ({ ...prev, password: e.target.value }))}
                    placeholder="Leave blank to keep current password"
                    className="w-full text-sm px-4 py-2.5 border border-gray-200 rounded-lg outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition"
                  />
                </div>

                {settingsError && (
                  <p className="text-xs text-red-500">{settingsError}</p>
                )}
                {settingsSuccess && (
                  <p className="text-xs text-green-600">{settingsSuccess}</p>
                )}

                <button
                  onClick={handleSaveSettings}
                  disabled={savingSettings}
                  className="w-full bg-gray-900 text-white text-sm font-medium py-2.5 rounded-lg hover:opacity-80 disabled:opacity-50 transition"
                >
                  {savingSettings ? 'Saving...' : 'Save changes'}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}

export default AdminDashboard
