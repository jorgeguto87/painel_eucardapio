import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import TopBar from '../../components/layout/TopBar'
import Card from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import { useOrders } from '../../hooks/useOrders'
import { formatCurrency, formatShortId, formatDateTime } from '../../utils/format'

const TABS = [
  { value: '',             label: 'Todos' },
  { value: 'recebido',     label: 'Novos' },
  { value: 'pago',         label: 'Pagos' },
  { value: 'preparo',      label: 'Preparo' },
  { value: 'saiu_entrega', label: 'Entrega' },
  { value: 'finalizado',   label: 'Concluídos' },
  { value: 'cancelado',    label: 'Cancelados' },
]

export default function OrdersPage() {
  const navigate = useNavigate()
  const [tab, setTab] = useState('')
  const { data, isLoading } = useOrders(tab || undefined)

  const orders = data?.data || []

  return (
    <div>
      <TopBar title="Pedidos" />

      {/* Tabs */}
      <div className="sticky top-14 z-20 bg-bg pt-2 pb-1">
        <div className="flex gap-2 overflow-x-auto px-4 pb-2 max-w-lg mx-auto scrollbar-hide">
          {TABS.map((t) => (
            <button
              key={t.value}
              onClick={() => setTab(t.value)}
              className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                tab === t.value ? 'bg-primary text-white' : 'bg-surface text-gray-500'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="page pt-2">
        {isLoading ? (
          <LoadingSpinner />
        ) : orders.length === 0 ? (
          <Card><p className="text-gray-400 text-sm text-center py-8">Nenhum pedido nesta categoria</p></Card>
        ) : (
          <div className="space-y-2">
            {orders.map((order) => (
              <Card key={order._id} onClick={() => navigate(`/orders/${order._id}`)}>
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm">#{formatShortId(order._id)}</p>
                    <p className="text-xs text-gray-400 truncate">{order.customerName || order.customerPhone}</p>
                    <p className="text-xs text-gray-400 mt-1">{formatDateTime(order.createdAt)}</p>
                  </div>
                  <div className="text-right flex-shrink-0 ml-2">
                    <p className="font-semibold text-sm mb-1.5">{formatCurrency(order.total)}</p>
                    <Badge status={order.status} />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
