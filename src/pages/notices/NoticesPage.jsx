import { Info, AlertTriangle, AlertCircle, Wrench } from 'lucide-react'
import TopBar from '../../components/layout/TopBar'
import Card from '../../components/ui/Card'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import { useNotices } from '../../hooks/useNotices'
import { formatDateTime } from '../../utils/format'

const TYPE_CONFIG = {
  info:        { icon: Info,          label: 'Informação',  classes: 'bg-blue-50 text-blue-700' },
  warning:     { icon: AlertTriangle, label: 'Atenção',      classes: 'bg-warning/10 text-yellow-700' },
  urgent:      { icon: AlertCircle,   label: 'Urgente',      classes: 'bg-danger/10 text-red-700' },
  maintenance: { icon: Wrench,        label: 'Manutenção',   classes: 'bg-gray-100 text-gray-600' },
}

export default function NoticesPage() {
  const { data: notices, isLoading } = useNotices()

  return (
    <div>
      <TopBar title="Avisos" subtitle="Comunicados da plataforma" back />

      <div className="page">
        {isLoading ? (
          <LoadingSpinner />
        ) : !notices || notices.length === 0 ? (
          <Card><p className="text-gray-400 text-sm text-center py-8">Nenhum aviso no momento.</p></Card>
        ) : (
          <div className="space-y-2">
            {notices.map((notice) => {
              const config = TYPE_CONFIG[notice.type] || TYPE_CONFIG.info
              const Icon = config.icon
              return (
                <Card key={notice._id}>
                  <div className="flex items-start gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${config.classes}`}>
                      <Icon size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold text-sm">{notice.title}</p>
                        <span className="text-[10px] text-gray-400 flex-shrink-0">{formatDateTime(notice.createdAt)}</span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{notice.message}</p>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
