export default function FeatureTable({ features = {} }){
  const entries = Object.entries(features)
  if(entries.length===0) return <div className="text-sm text-slate-400">No feature details.</div>
  return (
    <div className="max-h-56 overflow-auto scroll-slim">
      <table className="w-full text-sm">
        <tbody>
          {entries.map(([k,v]) => (
            <tr key={k} className="border-b last:border-b-0">
              <td className="py-2 pr-3 font-medium text-slate-700">{k}</td>
              <td className="py-2 text-right text-slate-600">{String(v)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
