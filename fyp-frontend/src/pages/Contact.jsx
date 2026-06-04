// src/pages/Contact.jsx
import { useState } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { GradientBlobs, AnalystArt } from '../components/Illustration.jsx'

const INFO = [
  { icon: '✉️', label: 'Email', value: 'hello@linkguard.example' },
  { icon: '🛡️', label: 'Report phishing', value: 'abuse@linkguard.example' },
  { icon: '⏱️', label: 'Response time', value: 'Usually within 2 business days' },
]

export default function Contact() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' })
  const [sent, setSent] = useState(false)

  const update = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  const handleSubmit = (e) => {
    e.preventDefault()
    // Demo form: there is no backend contact endpoint, so we acknowledge locally.
    setSent(true)
  }

  return (
    <div className="relative min-h-screen">
      <GradientBlobs />
      <div className="relative z-10">
        <section className="content-container pt-8 pb-4">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
              <span className="badge bg-teal-100 text-teal-700 mb-4">Contact</span>
              <h1 className="text-4xl md:text-5xl font-bold mb-3">
                <span className="text-gradient">Get in</span> <span className="text-slate-900 dark:text-white">touch</span>
              </h1>
              <p className="text-lg text-slate-600 dark:text-slate-300 max-w-xl">
                Questions, feedback, or a phishing link to report? Send a message and we will get back to you.
              </p>
            </motion.div>
            <motion.div className="flex justify-center"
              initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6, delay: 0.15 }}>
              <AnalystArt className="w-48 h-48" />
            </motion.div>
          </div>
        </section>

        <section className="content-container pb-8">
          <div className="grid lg:grid-cols-5 gap-6">
            {/* Form */}
            <div className="lg:col-span-3 card p-6 md:p-8">
              {sent ? (
                <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-10">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-r from-teal-500 to-emerald-500 flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">Message sent</h3>
                  <p className="text-slate-600">Thanks, {form.name || 'there'}. We have received your message and will reply soon.</p>
                  <button onClick={() => { setSent(false); setForm({ name: '', email: '', subject: '', message: '' }) }} className="btn-primary mt-6">
                    Send another
                  </button>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                      <input required value={form.name} onChange={update('name')} className="input" placeholder="Your name" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                      <input required type="email" value={form.email} onChange={update('email')} className="input" placeholder="you@example.com" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Subject</label>
                    <input value={form.subject} onChange={update('subject')} className="input" placeholder="How can we help?" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Message</label>
                    <textarea required rows={5} value={form.message} onChange={update('message')} className="input resize-none" placeholder="Write your message..." />
                  </div>
                  <button type="submit" className="btn-primary w-full sm:w-auto">Send message</button>
                  <p className="text-xs text-slate-400">This is a demo contact form for a student project; messages are not actually delivered.</p>
                </form>
              )}
            </div>

            {/* Info */}
            <div className="lg:col-span-2 space-y-4">
              {INFO.map((it) => (
                <motion.div key={it.label} className="feature-card p-4 flex items-start gap-3"
                  initial={{ opacity: 0, x: 16 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.35 }}>
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-teal-100 to-cyan-100 flex items-center justify-center text-lg flex-shrink-0">{it.icon}</div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-slate-900">{it.label}</div>
                    <div className="text-sm text-slate-600 break-all">{it.value}</div>
                  </div>
                </motion.div>
              ))}
              <div className="card p-4 text-sm text-slate-600">
                Looking for answers first? Check the{' '}
                <Link to="/faq" className="text-teal-600 hover:text-teal-700 font-medium">FAQ</Link> or learn{' '}
                <Link to="/how-it-works" className="text-teal-600 hover:text-teal-700 font-medium">how it works</Link>.
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
