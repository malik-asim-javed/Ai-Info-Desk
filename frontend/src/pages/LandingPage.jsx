import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { getUniversities } from "../api"

// Derive a short badge code (e.g. "UCP", "NUST") from a university's full name
const getShortCode = (name) => {
  const firstWord = name.split(' ')[0]
  if (/^[A-Z]{2,6}$/.test(firstWord)) return firstWord

  const words = name.split(' ').filter(w => !['of', 'the', 'and', '&', 'for'].includes(w.toLowerCase()))
  return words.slice(0, 3).map(w => w[0]).join('').toUpperCase()
}

function LandingPage() {
  const navigate = useNavigate()
  const [universities, setUniversities] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const loadUniversities = async () => {
      try {
        const res = await getUniversities()
        setUniversities(res.data)
      } catch {
        setError('Failed to load universities.')
      } finally {
        setLoading(false)
      }
    }
    loadUniversities()
  }, [])

  return (

    <div className="min-h-screen bg-white text-gray-900 font-sans">

      {/* NAV */}
      <nav className="flex items-center justify-between px-10 py-4 border-b border-gray-100">
        <span className="text-lg font-semibold tracking-tight">
          Info<span className="text-indigo-600">Desk</span>
        </span>
        <div className="flex items-center gap-2">
          <a href="#how" className="text-sm text-gray-500 hover:text-gray-900 px-4 py-2 rounded-md hover:bg-gray-100 transition">
            How it works
          </a>
          <a href="#universities" className="text-sm text-gray-500 hover:text-gray-900 px-4 py-2 rounded-md hover:bg-gray-100 transition">
            Universities
          </a>
          <button 
          onClick={()=>navigate('/admin/login')}
          className="text-sm font-medium text-white bg-gray-900 px-4 py-2 rounded-md hover:opacity-80 transition">
            Admin Login
          </button>
        </div>
      </nav>

      {/* HERO */}
      <section className="flex flex-col items-center text-center px-6 pt-24 pb-20">
        <div className="text-xs font-semibold tracking-widest text-indigo-600 bg-indigo-50 px-4 py-1.5 rounded-full mb-6">
          AI-powered · Retrieval based
        </div>
        <h1 className="text-5xl font-bold tracking-tight leading-tight max-w-xl mb-4">
          Your university, <br />
          <em className="text-indigo-600 not-italic">answered instantly.</em>
        </h1>
        <p className="text-base text-gray-500 max-w-md leading-relaxed mb-8">
          Ask anything about admissions, fees, scholarships, or policies.
          Get accurate answers sourced directly from your university's verified data.
        </p>
        <button
  onClick={() => navigate('/chat')}
  className="flex items-center gap-2 bg-gray-900 text-white text-sm font-medium px-6 py-3 rounded-lg hover:opacity-80 transition"
>
  Get started <span>→</span>
</button>
      </section>

      {/* UNIVERSITIES */}
      <section id="universities" className="px-10 py-14 border-t border-gray-100">
        <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase mb-1">
          Supported Institutions
        </p>
        <h2 className="text-2xl font-bold tracking-tight mb-1">Choose your university</h2>
        <p className="text-sm text-gray-500 mb-8">Select an institution below to start asking questions.</p>

        {loading ? (
          <p className="text-sm text-gray-400">Loading universities...</p>
        ) : error ? (
          <p className="text-sm text-red-500">{error}</p>
        ) : universities.length === 0 ? (
          <p className="text-sm text-gray-400">No universities available yet. Check back soon.</p>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {universities.map((uni) => (
              <div
                key={uni.id}
                onClick={() => navigate('/chat', { state: { university: uni } })}
                className="flex items-center gap-3 p-4 bg-gray-50 border border-gray-200 rounded-xl cursor-pointer hover:border-indigo-500 hover:bg-white transition"
              >
                <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center text-xs font-semibold text-indigo-600 shrink-0">
                  {getShortCode(uni.name)}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900 leading-snug">{uni.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{uni.city}, {uni.province}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="px-10 py-14 border-t border-gray-100">
        <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase mb-1">
          The Process
        </p>
        <h2 className="text-2xl font-bold tracking-tight mb-1">How it works</h2>
        <p className="text-sm text-gray-500 mb-8">Three simple steps to get verified answers.</p>
        <div className="grid grid-cols-3 gap-4">
          {[
            { num: "01", title: "Select your university", desc: "Pick your institution from the list. All answers are scoped strictly to that university's data." },
            { num: "02", title: "Ask in any language",    desc: "Type naturally in English, Urdu, or any supported language. The system understands you." },
            { num: "03", title: "Get a verified answer",  desc: "Responses come from verified university data — no hallucinations, no guesswork." },
          ].map((step) => (
            <div key={step.num} className="p-5 bg-gray-50 border border-gray-200 rounded-xl">
              <p className="text-3xl font-bold text-gray-200 mb-3">{step.num}</p>
              <div className="w-6 h-0.5 bg-indigo-600 rounded mb-3" />
              <p className="text-sm font-semibold text-gray-900 mb-1">{step.title}</p>
              <p className="text-xs text-gray-500 leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

    </div>
  )
}

export default LandingPage
