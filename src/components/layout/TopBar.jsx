import { ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function TopBar({ title, subtitle, back = false, right }) {
  const navigate = useNavigate()

  return (
    <div className="sticky top-0 z-30 bg-surface border-b border-gray-100">
      <div className="flex items-center gap-3 px-4 h-14 max-w-lg mx-auto md:max-w-5xl md:h-16">
        {back && (
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-xl active:bg-gray-100 hover:bg-gray-100 transition-colors">
            <ArrowLeft size={20} />
          </button>
        )}
        <div className="flex-1 min-w-0">
          <h1 className="font-semibold text-secondary truncate">{title}</h1>
          {subtitle && <p className="text-xs text-gray-400 truncate">{subtitle}</p>}
        </div>
        {right && <div className="flex-shrink-0">{right}</div>}
      </div>
    </div>
  )
}
