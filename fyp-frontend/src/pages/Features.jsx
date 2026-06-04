// src/pages/Features.jsx
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { GradientBlobs, ShieldArt } from '../components/Illustration.jsx'

const FEATURES = [
  { icon: '⚡', title: 'Real-time URL analysis', text: 'Paste any link and get a Safe / Phishing verdict in seconds, with a confidence score.', color: 'from-amber-400 to-orange-500' },
  { icon: '📷', title: 'Image & QR scanning', text: 'Upload a screenshot and we read the link with OCR - or scan a QR code (quishing) and we decode and check it.', color: 'from-teal-400 to-cyan-500' },
  { icon: '🔍', title: 'Explainable AI', text: 'Every verdict shows the exact structural signals behind it, colour-coded by risk - no black box.', color: 'from-violet-400 to-fuchsia-500' },
  { icon: '🤖', title: 'AI Security Analyst', text: 'A grounded AI explains the result in plain English and answers your follow-up questions.', color: 'from-cyan-400 to-blue-500' },
  { icon: '🎭', title: 'Look-alike & typosquat detection', text: 'Catches homograph (IDN) tricks and brand impersonation like “paypa1.com” or “secure-paypal.com”.', color: 'from-rose-400 to-pink-500' },
  { icon: '🌐', title: 'Threat intelligence', text: 'Cross-checks Google Safe Browsing, VirusTotal and URLhaus, plus live WHOIS and SSL inspection.', color: 'from-blue-400 to-indigo-500' },
  { icon: '📋', title: 'Bulk checking', text: 'Check several links at once and review them side by side.', color: 'from-emerald-400 to-teal-500' },
  { icon: '📄', title: 'Reports & history', text: 'Download Word / PDF reports and revisit every link you’ve checked from your dashboard.', color: 'from-fuchsia-400 to-purple-500' },
]

export default function Features() {
  return (
    <div className="relative min-h-screen">
      <GradientBlobs />
      <div className="relative z-10">
        <section className="content-container pt-8 pb-6">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
              <span className="badge bg-violet-100 text-violet-700 mb-4">Everything inside</span>
              <h1 className="text-4xl md:text-5xl font-bold mb-4">
                <span className="text-slate-900 dark:text-white">Features that keep you</span><br />
                <span className="text-gradient">one step ahead</span>
              </h1>
              <p className="text-lg text-slate-600 dark:text-slate-300 max-w-xl">
                LinkGuard blends machine learning, live threat feeds and explainable AI into one simple link checker.
              </p>
            </motion.div>
            <motion.div className="flex justify-center"
              initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.7, delay: 0.15 }}>
              <ShieldArt className="w-52 h-52 float-animation" />
            </motion.div>
          </div>
        </section>

        <section className="content-container py-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {FEATURES.map((f, i) => (
              <motion.div
                key={i}
                className="feature-card p-5"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.4, delay: (i % 4) * 0.05 }}
                whileHover={{ y: -6 }}
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${f.color} flex items-center justify-center text-2xl mb-3 shadow-md`}>
                  {f.icon}
                </div>
                <h3 className="font-bold text-slate-900 mb-1">{f.title}</h3>
                <p className="text-sm text-slate-600">{f.text}</p>
              </motion.div>
            ))}
          </div>
        </section>

        <section className="content-container py-8">
          <div className="card p-8 text-center bg-gradient-to-r from-teal-50 to-violet-50 border border-teal-100">
            <h2 className="text-2xl font-bold text-gradient mb-3">Try every feature free</h2>
            <p className="text-slate-600 mb-5 max-w-xl mx-auto">No sign-up needed to check a link - create an account to save history and download reports.</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/" className="btn-primary">Check a URL</Link>
              <Link to="/how-it-works" className="px-5 py-2.5 rounded-xl font-semibold bg-white/90 text-slate-700 hover:bg-white transition shadow-md">How it works</Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
