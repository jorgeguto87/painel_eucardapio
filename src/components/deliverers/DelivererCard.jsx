import { Bike, Phone } from 'lucide-react'
import Card from '../ui/Card'

const STATUS_CONFIG = {
  disponivel: { label: '🟢 Disponível', classes: 'text-green-700' },
  em_rota:    { label: '🟡 Em rota',    classes: 'text-yellow-700' },
  inativo:    { label: '⚪ Inativo',    classes: 'text-gray-400' },
}

export default function DelivererCard({ deliverer, onClick }) {
  const status = STATUS_CONFIG[deliverer.status] || STATUS_CONFIG.inativo

  return (
    <Card onClick={onClick}>
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
          <Bike size={20} className="text-primary" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{deliverer.name}</p>
          <div className="flex items-center gap-1 text-xs text-gray-400">
            <Phone size={12} />
            <span>{deliverer.phone}</span>
          </div>
        </div>

        <span className={`text-xs font-medium ${status.classes}`}>{status.label}</span>
      </div>
    </Card>
  )
}
