// src/pages/Privacy.jsx
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { GradientBlobs } from '../components/Illustration.jsx'

const SECTIONS = [
  { h: '1. Introduction', p: 'LinkGuard ("we", "us") provides a phishing and malicious-link detection service. This Privacy Policy explains what information we handle when you use the service and how we treat it. This is a sample policy provided for a student project and does not constitute legal advice.' },
  { h: '2. Information we collect', p: 'We process the links (URLs) and images you submit for analysis. If you create an account, we store your username, email address, and a securely hashed password. We may keep a history of your checks so you can review them later. We also process basic technical data, such as request timing, needed to operate the service.' },
  { h: '3. How we use information', p: 'We use the data you provide only to analyse links, return a verdict, generate explanations and reports, maintain your history, and operate and improve the service. We do not sell your personal information.' },
  { h: '4. Third-party services', p: 'To assess a link we may query reputation services including Google Safe Browsing, VirusTotal and URLhaus, and we may send the verdict and extracted signals to an AI provider to generate a plain-language explanation. The link or its derived features may be shared with these providers for that purpose. Their handling of data is governed by their own policies.' },
  { h: '5. Storage and retention', p: 'Recent checks may be stored locally in your browser. If you are signed in, your history is stored in our database until you delete it or close your account. You can clear local history from your browser at any time.' },
  { h: '6. Cookies and local storage', p: 'We use browser local storage to keep you signed in and to remember recent checks and preferences. We do not use third-party advertising cookies.' },
  { h: '7. Your choices', p: 'You can review and delete your saved checks, update your account details, or request deletion of your account. Clearing your browser storage removes locally saved data.' },
  { h: '8. Children', p: 'The service is not directed to children under 13, and we do not knowingly collect their personal information.' },
  { h: '9. Changes to this policy', p: 'We may update this policy from time to time. Material changes will be reflected by updating the date shown below.' },
  { h: '10. Contact', p: 'Questions about this policy can be sent to the project maintainer using the contact details provided with the project.' },
]

export default function Privacy() {
  return (
    <div className="relative min-h-screen">
      <GradientBlobs />
      <div className="relative z-10">
        <section className="content-container pt-8 pb-4 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <span className="badge bg-teal-100 text-teal-700 mb-4">Legal</span>
            <h1 className="text-4xl md:text-5xl font-bold mb-3">
              <span className="text-gradient">Privacy</span> <span className="text-slate-900 dark:text-white">Policy</span>
            </h1>
            <p className="text-slate-500 dark:text-slate-400">Last updated: June 2026</p>
          </motion.div>
        </section>
        <section className="content-container pb-8">
          <div className="card p-6 md:p-8 max-w-3xl mx-auto space-y-6">
            {SECTIONS.map((s, i) => (
              <motion.div key={i}
                initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }} transition={{ duration: 0.35, delay: (i % 4) * 0.04 }}>
                <h2 className="text-lg font-bold text-slate-900 mb-1">{s.h}</h2>
                <p className="text-slate-600 leading-relaxed">{s.p}</p>
              </motion.div>
            ))}
            <div className="pt-4 border-t border-slate-100 text-sm text-slate-500">
              See also our <Link to="/terms" className="text-teal-600 hover:text-teal-700 font-medium">Terms of Service</Link>.
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
