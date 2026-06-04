// src/pages/FAQ.jsx
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link } from 'react-router-dom'
import { GradientBlobs } from '../components/Illustration.jsx'

const FAQS = [
  {
    q: 'What is phishing?',
    a: 'Phishing is when attackers disguise a malicious link or page as something trustworthy - a bank, a login screen, a delivery notice - to trick you into giving up passwords, money or personal data. LinkGuard analyses a link before you click it.',
  },
  {
    q: 'How accurate is LinkGuard?',
    a: 'Every verdict combines a machine-learning model with live threat-intelligence feeds (Google Safe Browsing, VirusTotal, URLhaus) and structural checks. No detector is perfect, so we always show the signals behind a verdict and recommend caution with anything flagged as risky.',
  },
  {
    q: 'What is "quishing"?',
    a: 'Quishing is phishing via QR codes - a malicious link hidden inside a QR image on a poster, email or invoice. Upload a QR image to LinkGuard and we decode the link and run it through the same checks as any other URL.',
  },
  {
    q: 'Can it spot look-alike (homograph) domains?',
    a: 'Yes. LinkGuard flags internationalised look-alike characters (e.g. a Cyrillic "a" standing in for a Latin one) and typosquats / brand impersonation such as "paypa1.com" or "secure-paypal.com".',
  },
  {
    q: 'Do you store the links I check?',
    a: 'Recent checks are kept in your browser so you can revisit them. If you create an account, your history is saved to your dashboard. You stay in control and can clear it at any time.',
  },
  {
    q: 'Does it work with shortened URLs?',
    a: 'Shorteners (bit.ly, tinyurl, etc.) are themselves treated as a risk signal because they hide the real destination, and LinkGuard inspects redirect behaviour where possible.',
  },
  {
    q: 'Is LinkGuard a replacement for antivirus?',
    a: 'No - think of it as a complementary first line of defence focused on links. Keep your antivirus, browser and operating system up to date as well.',
  },
  {
    q: 'How does the AI Security Analyst work?',
    a: 'After the verdict is computed, an AI language model explains it in plain English and answers your follow-up questions. It is grounded strictly in LinkGuard\'s own findings - it never invents facts about a site it has not analysed.',
  },
]

function FaqItem({ item, isOpen, onToggle, index }) {
  return (
    <motion.div
      className="card overflow-hidden"
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.4, delay: index * 0.04 }}
    >
      <button onClick={onToggle} className="w-full flex items-center justify-between gap-4 p-5 text-left">
        <span className="font-semibold text-slate-900">{item.q}</span>
        <motion.span animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.3 }} className="text-teal-600 flex-shrink-0">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <p className="px-5 pb-5 text-slate-600 leading-relaxed">{item.a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default function FAQ() {
  const [open, setOpen] = useState(0)
  return (
    <div className="relative min-h-screen">
      <GradientBlobs />
      <div className="relative z-10">
        <section className="content-container pt-8 pb-6 text-center">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
            <span className="badge bg-cyan-100 text-cyan-700 mb-4">Questions & answers</span>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              <span className="text-slate-900 dark:text-white">Frequently asked</span> <span className="text-gradient">questions</span>
            </h1>
            <p className="text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
              Everything you might want to know about how LinkGuard keeps you safe.
            </p>
          </motion.div>
        </section>

        <section className="content-container py-2">
          <div className="space-y-3 max-w-3xl mx-auto">
            {FAQS.map((item, i) => (
              <FaqItem key={i} item={item} index={i} isOpen={open === i} onToggle={() => setOpen(open === i ? -1 : i)} />
            ))}
          </div>
        </section>

        <section className="content-container py-8">
          <div className="card p-8 text-center bg-gradient-to-r from-teal-50 to-violet-50 border border-teal-100">
            <h2 className="text-2xl font-bold text-gradient mb-3">Still curious?</h2>
            <p className="text-slate-600 mb-5 max-w-xl mx-auto">The best way to understand LinkGuard is to try it on a real link.</p>
            <Link to="/" className="btn-primary">Check a URL</Link>
          </div>
        </section>
      </div>
    </div>
  )
}
