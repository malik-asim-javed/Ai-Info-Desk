import { useState, useRef, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { getUniversities, sendMessage } from '../api'

const STORAGE_KEY = 'infodesk_chats'
const MAX_STORED_CHATS = 20

const loadStoredChats = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

const saveStoredChats = (chats) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(chats))
  } catch {
    // localStorage unavailable or full — fail silently, history just won't persist
  }
}

function ChatPage() {
  const navigate = useNavigate()
  const location = useLocation()

  const [universities, setUniversities] = useState([])
  const [loadingUniversities, setLoadingUniversities] = useState(true)
  const [loadError, setLoadError] = useState('')

  const [selectedUniversity, setSelectedUniversity] = useState(null)
  const [messages, setMessages] = useState([])
  const [inputValue, setInputValue] = useState('')
  const [sessionId, setSessionId] = useState(null)
  const [isTyping, setIsTyping] = useState(false)

  const [recentChats, setRecentChats] = useState([])
  const [activeChatId, setActiveChatId] = useState(null)

  const messagesEndRef = useRef(null)

  useEffect(() => {
    loadUniversities()
    setRecentChats(loadStoredChats())
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  const loadUniversities = async () => {
    setLoadingUniversities(true)
    try {
      const res = await getUniversities()
      setUniversities(res.data)

      // If the user arrived from the landing page with a preselected
      // university, try to match it against the real records by name.
      const preselect = location.state?.university
      if (preselect) {
        const match = res.data.find(u => u.name === preselect.name)
        if (match) setSelectedUniversity(match)
      }
    } catch {
      setLoadError('Failed to load universities. Please refresh the page.')
    } finally {
      setLoadingUniversities(false)
    }
  }

  const handleSelectUniversity = (id) => {
    const uni = universities.find(u => u.id === id)
    setSelectedUniversity(uni || null)
    setMessages([])
    setSessionId(null)
    setActiveChatId(null)
  }

  const handleNewChat = () => {
    setMessages([])
    setSessionId(null)
    setActiveChatId(null)
  }

  const handleSelectChat = (chat) => {
    const uni = universities.find(u => u.id === chat.universityId)
    setSelectedUniversity(uni || { id: chat.universityId, name: chat.universityName })
    setMessages(chat.messages)
    setSessionId(chat.sessionId)
    setActiveChatId(chat.chatId)
  }

  const handleClearHistory = () => {
    saveStoredChats([])
    setRecentChats([])
    handleNewChat()
  }

  // Save (or update) the current conversation in localStorage, keyed by a
  // stable client-generated chatId — independent of the backend session_id,
  // which can rotate after the 2-hour session expiry.
  const persistChat = (msgs, currentSessionId) => {
    const chats = loadStoredChats()
    const chatId = activeChatId || crypto.randomUUID()

    const updatedChat = {
      chatId,
      sessionId: currentSessionId,
      universityId: selectedUniversity.id,
      universityName: selectedUniversity.name,
      messages: msgs,
      updatedAt: Date.now()
    }

    const next = [updatedChat, ...chats.filter(c => c.chatId !== chatId)].slice(0, MAX_STORED_CHATS)

    saveStoredChats(next)
    setRecentChats(next)
    if (!activeChatId) setActiveChatId(chatId)
  }

  const handleSendMessage = async () => {
    const query = inputValue.trim()
    if (!query || !selectedUniversity || isTyping) return

    const userMessage = { role: 'user', text: query }
    const messagesWithUser = [...messages, userMessage]

    // Conversation so far (excluding any error placeholders) gives the
    // model context for follow-up questions.
    const history = messages
      .filter(m => !m.error)
      .map(m => ({ role: m.role, text: m.text }))

    setMessages(messagesWithUser)
    setInputValue('')
    setIsTyping(true)

    try {
      const res = await sendMessage(query, selectedUniversity.id, sessionId, history)
      const newSessionId = res.data.session_id
      const finalMessages = [...messagesWithUser, { role: 'bot', text: res.data.response }]
      setMessages(finalMessages)
      setSessionId(newSessionId)
      persistChat(finalMessages, newSessionId)
    } catch (err) {
      const finalMessages = [...messagesWithUser, {
        role: 'bot',
        text: 'Sorry, something went wrong getting a response. Please try again.',
        error: true
      }]
      setMessages(finalMessages)
      persistChat(finalMessages, sessionId)
    } finally {
      setIsTyping(false)
    }
  }

  return (
    <div className="flex h-screen bg-white text-gray-900 font-sans">

      {/* SIDEBAR */}
      <aside className="w-56 border-r border-gray-100 flex flex-col bg-gray-50">
        <div className="px-4 py-5 border-b border-gray-100">
          <button
            onClick={() => navigate('/')}
            className="text-base font-semibold tracking-tight cursor-pointer hover:opacity-80 transition"
          >
            Info<span className="text-indigo-600">Desk</span>
          </button>
        </div>

        <button
          onClick={handleNewChat}
          className="flex items-center justify-center gap-2 text-sm font-medium text-indigo-600 m-3 p-2 rounded-lg border border-indigo-200 hover:bg-indigo-50 transition"
        >
          + New chat
        </button>

        <div className="flex-1 overflow-y-auto px-3 py-2">
          <p className="text-xs font-semibold text-gray-400 uppercase mb-2 px-1">Recent</p>
          {recentChats.length === 0 ? (
            <p className="text-xs text-gray-400 px-1">No chats yet</p>
          ) : (
            <div className="flex flex-col gap-1">
              {recentChats.map((chat) => {
                const preview = chat.messages.find(m => m.role === 'user')?.text || 'New conversation'
                return (
                  <button
                    key={chat.chatId}
                    onClick={() => handleSelectChat(chat)}
                    className={`text-left text-xs px-2 py-2 rounded-lg transition ${
                      activeChatId === chat.chatId
                        ? 'bg-white border border-gray-200 text-gray-900'
                        : 'text-gray-500 hover:bg-white hover:text-gray-900'
                    }`}
                  >
                    <div className="font-medium truncate">{preview}</div>
                    <div className="text-gray-400 truncate mt-0.5">{chat.universityName}</div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <div className="p-3 border-t border-gray-100">
          {recentChats.length > 0 && (
            <button
              onClick={handleClearHistory}
              className="text-xs text-gray-400 hover:text-red-500 transition mb-2"
            >
              Clear history
            </button>
          )}
          <div className="text-xs text-gray-400">👤 Guest user</div>
          <p className="text-xs text-gray-300 mt-1">Session-based access</p>
        </div>
      </aside>

      {/* MAIN */}
      <div className="flex flex-col flex-1">

        {/* TOPBAR */}
        <div className="border-b border-gray-100 px-6 py-3">
          <label className="text-xs font-medium text-gray-600 block mb-1.5">Select University</label>
          <select
            value={selectedUniversity?.id || ''}
            onChange={(e) => handleSelectUniversity(e.target.value)}
            disabled={loadingUniversities}
            className="text-sm px-4 py-2 border border-gray-200 rounded-lg outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition w-full max-w-xs disabled:opacity-50"
          >
            <option value="">
              {loadingUniversities ? 'Loading universities...' : 'Select a university...'}
            </option>
            {universities.map(uni => (
              <option key={uni.id} value={uni.id}>{uni.name}</option>
            ))}
          </select>
          {loadError && (
            <p className="text-xs text-red-500 mt-1.5">{loadError}</p>
          )}
        </div>

        {/* MESSAGES */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <p className="text-lg font-semibold text-gray-900 mb-1">Welcome to InfoDesk</p>
                <p className="text-sm text-gray-400">Select a university and ask a question to get started.</p>
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-sm px-4 py-2 rounded-lg ${
                    msg.role === 'user'
                      ? 'bg-indigo-600 text-white'
                      : msg.error
                        ? 'bg-red-50 text-red-600 border border-red-200'
                        : 'bg-gray-100 text-gray-900'
                  }`}>
                    <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="max-w-sm px-4 py-2 rounded-lg bg-gray-100 text-gray-400">
                    <p className="text-sm">Thinking...</p>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* INPUT */}
        <div className="border-t border-gray-100 p-6">
          <div className="flex gap-3">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              disabled={!selectedUniversity || isTyping}
              placeholder={selectedUniversity ? "Ask a question..." : "Select a university first"}
              className="flex-1 text-sm px-4 py-2.5 border border-indigo-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-100 disabled:opacity-50 disabled:bg-gray-50 transition"
            />
            <button
              onClick={handleSendMessage}
              disabled={!selectedUniversity || isTyping}
              className="bg-indigo-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:opacity-80 disabled:opacity-50 transition"
            >
              Send
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}

export default ChatPage
