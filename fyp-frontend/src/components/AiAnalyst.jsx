// src/components/AiAnalyst.jsx
// Part B: Claude-powered analyst -- a one-shot plain-English explanation plus a
// streaming follow-up chat, both grounded in this URL's check result (`evidence`).
import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { analyzeUrl, streamAnalystChat } from '../utils/api.js'

export default function AiAnalyst({ evidence }) {
  const [analysis, setAnalysis] = useState('')
  const [loadingAnalysis, setLoadingAnalysis] = useState(false)
  const [error, setError] = useState('')

  const [messages, setMessages] = useState([]) // {role:'user'|'assistant', content}
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const scrollRef = useRef(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  const runAnalysis = async () => {
    setLoadingAnalysis(true)
    setError('')
    try {
      setAnalysis(await analyzeUrl(evidence))
    } catch (e) {
      setError(e.message || 'Could not generate analysis.')
    } finally {
      setLoadingAnalysis(false)
    }
  }

  const sendMessage = async (e) => {
    e?.preventDefault?.()
    const q = input.trim()
    if (!q || streaming) return
    setInput('')
    setError('')
    const nextHistory = [...messages, { role: 'user', content: q }]
    setMessages([...nextHistory, { role: 'assistant', content: '' }])
    setStreaming(true)
    try {
      let acc = ''
      for await (const delta of streamAnalystChat(evidence, nextHistory)) {
        acc += delta
        setMessages((prev) => {
          const copy = prev.slice()
          copy[copy.length - 1] = { role: 'assistant', content: acc }
          return copy
        })
      }
    } catch (err) {
      setMessages((prev) => {
        const copy = prev.slice()
        copy[copy.length - 1] = { role: 'assistant', content: '⚠️ ' + (err.message || 'Chat failed.') }
        return copy
      })
    } finally {
      setStreaming(false)
    }
  }

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
        <h2 className="text-xl font-bold text-gradient">AI Security Analyst</h2>
        <span className="text-xs px-2.5 py-1 rounded-full bg-violet-100 text-violet-700 font-medium">
          Powered by Claude
        </span>
      </div>

      {/* One-shot plain-English explanation */}
      {!analysis ? (
        <button onClick={runAnalysis} disabled={loadingAnalysis} className="btn-primary disabled:opacity-50">
          {loadingAnalysis ? 'Analyzing…' : 'Explain in plain English'}
        </button>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 whitespace-pre-wrap text-sm leading-relaxed"
        >
          {analysis}
        </motion.div>
      )}

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {/* Follow-up chat */}
      <div className="mt-6">
        <h3 className="text-sm font-semibold text-slate-700 mb-2">Ask a follow-up</h3>
        {messages.length > 0 && (
          <div ref={scrollRef} className="max-h-72 overflow-y-auto scroll-slim space-y-3 mb-3 pr-1">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm whitespace-pre-wrap leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-teal-500 text-white rounded-br-sm'
                      : 'bg-slate-100 text-slate-800 rounded-bl-sm'
                  }`}
                >
                  {m.content || (streaming && i === messages.length - 1 ? '…' : '')}
                </div>
              </div>
            ))}
          </div>
        )}
        <form onSubmit={sendMessage} className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="e.g. Is it safe to enter my password here?"
            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-400 text-sm"
          />
          <button type="submit" disabled={streaming || !input.trim()} className="btn-primary disabled:opacity-50">
            Send
          </button>
        </form>
      </div>
    </div>
  )
}
