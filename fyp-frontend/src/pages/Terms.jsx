// src/pages/Terms.jsx
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { GradientBlobs } from '../components/Illustration.jsx'

const SECTIONS = [
  { h: '1. Acceptance of terms', p: 'By accessing or using LinkGuard you agree to these Terms of Service. If you do not agree, please do not use the service. This is a sample document provided for a student project and is not legal advice.' },
  { h: '2. The service', p: 'LinkGuard analyses links and images to estimate whether they are likely to be phishing or otherwise malicious, and provides explanations and optional reports. Results are automated estimates and may be incomplete or incorrect.' },
  { h: '3. No guarantee', p: 'The service is provided on an "as is" and "as available" basis. A "Safe" result is not a guarantee that a link is harmless, and a "Phishing" result is not a definitive legal judgement. Always use your own judgement and keep your devices and software up to date.' },
  { h: '4. Acceptable use', p: 'You agree not to misuse the service, including attempting to disrupt or overload it, reverse engineer it, or use it to facilitate unlawful activity. You are responsible for the links and content you submit.' },
  { h: '5. Accounts', p: 'If you create an account you are responsible for keeping your credentials secure and for activity under your account. Please notify us of any unauthorised use.' },
  { h: '6. Intellectual property', p: 'The LinkGuard name, interface, and original code belong to the project author. You may not copy or redistribute them without permission, except as allowed by the project license.' },
  { h: '7. Third-party services', p: 'The service relies on third-party providers for reputation data and AI-generated explanations. We are not responsible for the availability or accuracy of those providers.' },
  { h: '8. Limitation of liability', p: 'To the maximum extent permitted by law, we are not liable for any indirect, incidental, or consequential damages, or for any loss arising from reliance on a verdict produced by the service.' },
  { h: '9. Changes to these terms', p: 'We may revise these terms at any time. Continued use after changes take effect means you accept the revised terms.' },
  { h: '10. Governing law', p: 'These terms are governed by the laws applicable in the jurisdiction of the project author, without regard to conflict-of-law principles.' },
  { h: '11. Contact', p: 'Questions about these terms can be sent to the project maintainer using the contact details provided with the project.' },
]

export default function Terms() {
  return (
    <div className="relative min-h-screen">
      <GradientBlobs />
      <div className="relative z-10">
        <section className="content-container pt-8 pb-4 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <span className="badge bg-violet-100 text-violet-700 mb-4">Legal</span>
            <h1 className="text-4xl md:text-5xl font-bold mb-3">
              <span className="text-slate-900 dark:text-white">Terms of</span> <span className="text-gradient">Service</span>
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
              See also our <Link to="/privacy" className="text-teal-600 hover:text-teal-700 font-medium">Privacy Policy</Link>.
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
