// src/components/Illustration.jsx
// Hand-built inline SVG artwork + animated gradient backdrops (no external images, no licensing).
import { motion } from 'framer-motion'

// Soft animated gradient blobs for page backgrounds.
export function GradientBlobs() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      <motion.div
        className="absolute -top-10 -left-10 w-72 h-72 rounded-full bg-teal-300 opacity-20 blur-3xl"
        animate={{ x: [0, 80, 0], y: [0, 40, 0] }}
        transition={{ duration: 22, repeat: Infinity, repeatType: 'reverse' }}
      />
      <motion.div
        className="absolute top-1/3 -right-10 w-96 h-96 rounded-full bg-violet-300 opacity-20 blur-3xl"
        animate={{ x: [0, -90, 0], y: [0, -40, 0] }}
        transition={{ duration: 26, repeat: Infinity, repeatType: 'reverse' }}
      />
      <motion.div
        className="absolute bottom-0 left-1/3 w-80 h-80 rounded-full bg-cyan-300 opacity-20 blur-3xl"
        animate={{ x: [0, 50, 0], y: [0, -30, 0] }}
        transition={{ duration: 30, repeat: Infinity, repeatType: 'reverse' }}
      />
    </div>
  )
}

// Big shield-with-check hero illustration.
export function ShieldArt({ className = 'w-56 h-56' }) {
  return (
    <motion.svg viewBox="0 0 200 200" className={className} aria-hidden="true"
      initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.7 }}>
      <defs>
        <linearGradient id="lgShieldGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#14B8A6" />
          <stop offset="55%" stopColor="#06B6D4" />
          <stop offset="100%" stopColor="#8B5CF6" />
        </linearGradient>
      </defs>
      <motion.g animate={{ y: [0, -8, 0] }} transition={{ duration: 6, repeat: Infinity }}>
        <path d="M100 20 L165 45 V100 C165 140 135 168 100 182 C65 168 35 140 35 100 V45 Z"
          fill="url(#lgShieldGrad)" opacity="0.95" />
        <path d="M100 20 L165 45 V100 C165 140 135 168 100 182 C65 168 35 140 35 100 V45 Z"
          fill="none" stroke="white" strokeOpacity="0.25" strokeWidth="2" />
        <path d="M72 100 l20 20 l38 -42" fill="none" stroke="white" strokeWidth="10"
          strokeLinecap="round" strokeLinejoin="round" />
      </motion.g>
    </motion.svg>
  )
}

// Browser window with an animated scan line.
export function ScanArt({ className = 'w-full max-w-md' }) {
  return (
    <svg viewBox="0 0 320 200" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="lgScanGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#14B8A6" />
          <stop offset="100%" stopColor="#8B5CF6" />
        </linearGradient>
      </defs>
      <rect x="10" y="14" width="300" height="172" rx="16" fill="white" stroke="#CCFBF1" strokeWidth="2" />
      <rect x="10" y="14" width="300" height="34" rx="16" fill="#F0FDFA" />
      <circle cx="32" cy="31" r="5" fill="#F43F5E" />
      <circle cx="50" cy="31" r="5" fill="#F59E0B" />
      <circle cx="68" cy="31" r="5" fill="#10B981" />
      <rect x="90" y="23" width="200" height="16" rx="8" fill="white" stroke="#99F6E4" strokeWidth="1.5" />
      <rect x="34" y="70" width="150" height="12" rx="6" fill="#E2E8F0" />
      <rect x="34" y="92" width="240" height="12" rx="6" fill="#E2E8F0" />
      <rect x="34" y="114" width="120" height="12" rx="6" fill="#E2E8F0" />
      <motion.rect x="10" width="300" height="4" rx="2" fill="url(#lgScanGrad)"
        animate={{ y: [54, 176, 54] }} transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }} />
    </svg>
  )
}

// Chat/AI sparkle illustration.
export function AnalystArt({ className = 'w-48 h-48' }) {
  return (
    <motion.svg viewBox="0 0 200 200" className={className} aria-hidden="true"
      animate={{ y: [0, -6, 0] }} transition={{ duration: 5, repeat: Infinity }}>
      <defs>
        <linearGradient id="lgAiGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#06B6D4" />
          <stop offset="100%" stopColor="#8B5CF6" />
        </linearGradient>
      </defs>
      <rect x="30" y="40" width="140" height="92" rx="20" fill="url(#lgAiGrad)" />
      <path d="M70 132 l0 22 l26 -22 z" fill="url(#lgAiGrad)" />
      <circle cx="74" cy="86" r="9" fill="white" />
      <circle cx="100" cy="86" r="9" fill="white" />
      <circle cx="126" cy="86" r="9" fill="white" />
      <path d="M150 28 l5 13 l13 5 l-13 5 l-5 13 l-5 -13 l-13 -5 l13 -5 z" fill="#14B8A6" />
    </motion.svg>
  )
}
