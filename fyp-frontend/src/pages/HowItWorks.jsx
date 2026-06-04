// src/pages/HowItWorks.jsx
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { GradientBlobs, ScanArt } from '../components/Illustration.jsx'

const STEPS = [
  {
    icon: '🔗',
    title: 'Submit a link',
    text: 'Paste a URL, upload a screenshot (we read the text with OCR), or scan a QR code - quishing is on the rise, so QR images are decoded automatically.',
    color: 'from-teal-500 to-cyan-500',
  },
  {
    icon: '🧬',
    title: 'Feature extraction',
    text: 'We break the link down into 30 structural signals - IP-in-URL, domain age, SSL state, sub-domain depth, shorteners, "@" tricks and more.',
    color: 'from-cyan-500 to-blue-500',
  },
  {
    icon: '🛡️',
    title: 'Multi-source analysis',
    text: 'A stacking machine-learning model scores the link, cross-checked against Google Safe Browsing, VirusTotal and URLhaus, plus WHOIS, SSL and look-alike / typosquat checks.',
    color: 'from-blue-500 to-violet-500',
  },
  {
    icon: '🔍',
    title: 'Explainable verdict',
    text: 'You get a clear Safe or Phishing verdict - and, crucially, the exact signals that drove it, colour-coded by risk. No black box.',
    color: 'from-violet-500 to-fuchsia-500',
  },
  {
    icon: '🤖',
    title: 'AI Security Analyst',
    text: 'An AI analyst turns the evidence into plain English and answers your follow-up questions - “is it safe to enter my password here?” - grounded only in the findings.',
    color: 'from-fuchsia-500 to-rose-500',
  },
]

export default function HowItWorks() {
  return (
    <div className="relative min-h-screen">
      <GradientBlobs />
      <div className="relative z-10">
        {/* Hero */}
        <section className="content-container pt-8 pb-6">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
              <span className="badge bg-teal-100 text-teal-700 mb-4">The pipeline</span>
              <h1 className="text-4xl md:text-5xl font-bold mb-4">
                <span className="text-gradient">How LinkGuard</span><br />
                <span className="text-slate-900 dark:text-white">checks a link</span>
              </h1>
              <p className="text-lg text-slate-600 dark:text-slate-300 max-w-xl">
                Five stages, from the moment you submit a link to a clear, explained verdict - combining classic
                machine learning, live threat intelligence and a grounded AI analyst.
              </p>
            </motion.div>
            <motion.div className="flex justify-center"
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.7, delay: 0.15 }}>
              <ScanArt />
            </motion.div>
          </div>
        </section>

        {/* Steps timeline */}
        <section className="content-container py-6">
          <div className="space-y-4">
            {STEPS.map((step, i) => (
              <motion.div
                key={i}
                className="card p-6 flex items-start gap-5"
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.5, delay: i * 0.05 }}
              >
                <div className="flex flex-col items-center">
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-r ${step.color} flex items-center justify-center text-2xl shadow-lg`}>
                    {step.icon}
                  </div>
                  {i < STEPS.length - 1 && <div className="w-0.5 flex-1 mt-2 bg-gradient-to-b from-teal-200 to-transparent min-h-[2rem]" />}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-teal-600">STEP {i + 1}</span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-1">{step.title}</h3>
                  <p className="text-slate-600">{step.text}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="content-container py-8">
          <div className="card p-8 text-center bg-gradient-to-r from-teal-50 to-violet-50 border border-teal-100">
            <h2 className="text-2xl font-bold text-gradient mb-3">See it in action</h2>
            <p className="text-slate-600 mb-5 max-w-xl mx-auto">Paste any link and watch the full pipeline run in seconds.</p>
            <Link to="/" className="btn-primary">Check a URL</Link>
          </div>
        </section>
      </div>
    </div>
  )
}
