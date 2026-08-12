import { useState } from 'react'
import { AlertTriangle, Info, Wrench, AlertCircle, X } from 'lucide-react'
import { useNotices } from '../../hooks/useNotices'

const TYPE_CONFIG = {
  info:        { icon: Info,         classes: 'bg-blue-50 border-blue-200 text-blue-800' },
  warning:     { icon: AlertTriangle, classes: 'bg-warning/10 border-warning/30 text-yellow-800' },
  urgent:      { icon: AlertCircle,   classes: 'bg-danger/10 border-danger/30 text-red-800' },
  maintenance: { icon: Wrench,        classes: 'bg-gray-100 border-gray-300 text-gray-700' },
}

// Prioridade de exibição quando há múltiplos avisos ativos
const PRIORITY = { urgent: 0, maintenance: 1, warning: 2, info: 3 }

/**
 * Mostra apenas o aviso mais prioritário no Dashboard.
 * Para ver todos, o usuário acessa /notices.
 */
export default function NoticeBanner() {
  const { data: notices } = useNotices()
  const [dismissed, setDismissed] = useState(() => {
    return JSON.parse(sessionStorage.getItem('dismissedNotices') || '[]')
  })

  if (!notices || notices.length === 0) return null

  const visible = notices
    .filter((n) => !dismissed.includes(n._id))
    .sort((a, b) => PRIORITY[a.type] - PRIORITY[b.type])

  if (visible.length === 0) return null

  const notice = visible[0]
  const config = TYPE_CONFIG[notice.type] || TYPE_CONFIG.info
  const Icon = config.icon

  const dismiss = () => {
    const updated = [...dismissed, notice._id]
    setDismissed(updated)
    sessionStorage.setItem('dismissedNotices', JSON.stringify(updated))
  }

  return (
    <div className={`border rounded-2xl p-3 flex items-start gap-3 ${config.classes}`}>
      <Icon size={18} className="flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm">{notice.title}</p>
        <p className="text-xs opacity-90 mt-0.5">{notice.message}</p>
      </div>
      <button onClick={dismiss} className="flex-shrink-0 p-1 -mr-1 -mt-1 rounded-lg active:bg-black/5">
        <X size={16} />
      </button>
    </div>
  )
}
