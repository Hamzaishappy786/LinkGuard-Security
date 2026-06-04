// src/pages/About.jsx
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { GradientBlobs, ShieldArt, AnalystArt } from '../components/Illustration.jsx'

const STATS = [
  { value: '~90%', label: 'of breaches start with a phishing email', icon: '🎣' },
  { value: 'Thousands', label: 'of new phishing sites appear every day', icon: '🌐' },
  { value: 'Seconds', label: 'is all an attacker needs to fool a user', icon: '⏱️' },
]

const APPROACH = [
  { icon: '🧠', title: 'Machine learning', text: 'A stacking ensemble trained on real phishing data scores every link from 30 structural features.' },
  { icon: '🌐', title: 'Live threat intel', text: 'Google Safe Browsing, VirusTotal and URLhaus add real-world reputation on top of the model.' },
  { icon: '🔍', title: 'Explainability', text: 'Instead of a black-box score, we surface the exact signals - so you learn what makes a link risky.' },
  { icon: '🤖', title: 'AI analyst', text: 'A grounded language model turns the technical findings into clear, human advice.' },
]

const STACK = ['React', 'Vite', 'Tailwind CSS', 'Framer Motion', 'Flask', 'scikit-learn', 'OpenCV', 'Google Gemini', 'Claude']

export default function About() {
  return (
    <div className="relative min-h-screen">
      <GradientBlobs />
      <div className="relative z-10">
        {/* Hero */}
        <section className="content-container pt-8 pb-6">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
              <span className="badge bg-teal-100 text-teal-700 mb-4">About the project</span>
              <h1 className="text-4xl md:text-5xl font-bold mb-4">
                <span className="text-gradient">Making the web</span><br />
                <span className="text-slate-900 dark:text-white">safer to click</span>
              </h1>
              <p className="text-lg text-slate-600 dark:text-slate-300 max-w-xl">
                LinkGuard is a phishing-detection platform that helps everyday users tell safe links from dangerous
                ones - and understand <em>why</em>. It pairs trustworthy machine learning with explainable, human-friendly guidance.
              </p>
            </motion.div>
            <motion.div className="flex justify-center"
              initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.7, delay: 0.15 }}>
              <ShieldArt className="w-56 h-56" />
            </motion.div>
          </div>
        </section>

        {/* The problem */}
        <section className="content-container py-6">
          <h2 className="text-2xl font-bold text-gradient mb-5 text-center">The problem</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {STATS.map((s, i) => (
              <motion.div key={i} className="stat-card p-6 text-center"
                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.06 }}>
                <div className="text-3xl mb-2">{s.icon}</div>
                <div className="text-2xl font-bold text-slate-900">{s.value}</div>
                <div className="text-sm text-slate-600 mt-1">{s.label}</div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Our approach */}
        <section className="content-container py-6">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <motion.div className="flex justify-center order-2 md:order-1"
              initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
              <AnalystArt className="w-52 h-52" />
            </motion.div>
            <div className="order-1 md:order-2">
              <h2 className="text-2xl font-bold text-gradient mb-5">Our approach</h2>
              <div className="space-y-3">
                {APPROACH.map((a, i) => (
                  <motion.div key={i} className="feature-card p-4 flex items-start gap-4"
                    initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: i * 0.05 }}>
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-r from-teal-100 to-cyan-100 flex items-center justify-center text-xl flex-shrink-0">{a.icon}</div>
                    <div>
                      <h3 className="font-bold text-slate-900">{a.title}</h3>
                      <p className="text-sm text-slate-600">{a.text}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Tech stack */}
        <section className="content-container py-6">
          <div className="card p-8 text-center">
            <h2 className="text-2xl font-bold text-gradient mb-2">Built with</h2>
            <p className="text-slate-600 mb-5">A modern, open stack - developed as a final-year project.</p>
            <div className="flex flex-wrap justify-center gap-2.5">
              {STACK.map((tech) => (
                <span key={tech} className="px-4 py-2 rounded-full bg-white border border-teal-200 text-slate-700 text-sm font-medium shadow-sm hover:border-teal-400 transition">
                  {tech}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="content-container py-8">
          <div className="card p-8 text-center bg-gradient-to-r from-teal-50 to-violet-50 border border-teal-100">
            <h2 className="text-2xl font-bold text-gradient mb-3">Ready to check a link?</h2>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/" className="btn-primary">Check a URL</Link>
              <Link to="/features" className="px-5 py-2.5 rounded-xl font-semibold bg-white/90 text-slate-700 hover:bg-white transition shadow-md">Explore features</Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
