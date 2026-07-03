import axios from 'axios'

const api = axios.create({
  baseURL: 'http://localhost:8000',
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Auth
export const loginAdmin = (email, password) =>
  api.post('/api/auth/login', { email, password })

// Universities
export const getUniversities = () =>
  api.get('/api/universities/')

export const createUniversity = (data) =>
  api.post('/api/universities/', data)

// FAQs
export const getFAQs = (universityId) =>
  api.get('/api/faqs/', { params: { university_id: universityId } })

export const createFAQ = (data) =>
  api.post('/api/faqs/', data)

export const updateFAQ = (id, data) =>
  api.put(`/api/faqs/${id}`, data)

export const deleteFAQ = (id) =>
  api.delete(`/api/faqs/${id}`)

// Policies
export const getPolicies = (universityId) =>
  api.get('/api/policies/', { params: { university_id: universityId } })

export const createPolicy = (data) =>
  api.post('/api/policies/', data)

export const updatePolicy = (id, data) =>
  api.put(`/api/policies/${id}`, data)

export const deletePolicy = (id) =>
  api.delete(`/api/policies/${id}`)

// Admins
export const getAdmins = () =>
  api.get('/api/admins/')

export const addAdmin = (data) =>
  api.post('/api/admins/', data)

export const updateMyProfile = (data) =>
  api.patch('/api/admins/me', data)

export const deactivateAdmin = (id) =>
  api.patch(`/api/admins/${id}/deactivate`)

// Chat
export const sendMessage = (query, universityId, sessionId, history) =>
  api.post('/api/chat/', {
    query,
    university_id: universityId,
    session_id: sessionId || null,
    history: history || []
  })

// Analytics
export const getAnalytics = (universityId) =>
  api.get(`/api/analytics/${universityId}`)

export default api
