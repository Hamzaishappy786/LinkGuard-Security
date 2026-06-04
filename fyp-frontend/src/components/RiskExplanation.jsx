// src/components/RiskExplanation.jsx
// Explainable-AI panel: renders the per-feature signals that drove the verdict.
import { motion } from 'framer-motion'

const SEVERITY_STYLES = {
  high:   { dot: 'bg-red-500',   chip: 'bg-red-50 border-red-200 text-red-800',       tag: 'High' },
  medium: { dot: 'bg-amber-500', chip: 'bg-amber-50 border-amber-200 text-amber-800', tag: 'Medium' },
}

export default function RiskExplanation({ explanation }) {
  if (!explanation) return null
  const { top_signals = [], safe_signals = [], summary } = explanation

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between flex-wrap gap-2 mb-1">
        <h2 className="text-xl font-bold text-gradient">Why this verdict?</h2>
        <span className="text-xs px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 font-medium">
          Explainable AI
        </span>
      </div>
      <p className="text-slate-600 text-sm mb-5">{summary}</p>

      {top_signals.length > 0 && (
        <div className="mb-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Risk indicators</h3>
          <div className="space-y-2">
            {top_signals.map((s, i) => {
              const style = SEVERITY_STYLES[s.severity] || SEVERITY_STYLES.medium
              return (
                <motion.div
                  key={s.feature}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className={`flex items-start gap-3 p-3 rounded-xl border ${style.chip}`}
                >
                  <span className={`mt-1.5 w-2.5 h-2.5 rounded-full flex-shrink-0 ${style.dot}`} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">{s.label}</span>
                      <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-white/70">
                        {style.tag}
                      </span>
                    </div>
                    <p className="text-sm">{s.phrase}</p>
                    <p className="text-xs opacity-70 mt-0.5">{s.why}</p>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>
      )}

      {safe_signals.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Reassuring signals</h3>
          <div className="flex flex-wrap gap-2">
            {safe_signals.map((s) => (
              <span
                key={s.feature}
                title={s.phrase}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-50 border border-green-200 text-green-800 text-sm"
              >
                <span className="w-2 h-2 rounded-full bg-green-500" />
                {s.label}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
