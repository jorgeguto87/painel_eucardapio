import { useEffect, useState } from 'react'
import { Bike, History, Printer } from 'lucide-react'
import TopBar from '../../components/layout/TopBar'
import { useOrders } from '../../hooks/useOrders'
import { usePrintAgentStatus, useSetAutoPrintRoles, PRINTER_ROLE_LABELS } from '../../hooks/usePrintAgent'
import { OrderCard, OrderRow } from '../../components/orders/OrderCard'
import { TypeFilterBar, StatusFilterBar } from '../../components/orders/FilterBar'
import OrderDetailModal from '../../components/orders/OrderDetailModal'
import DeliveryQueueModal from '../../components/orders/DeliveryQueueModal'
import HistoryModal from '../../components/orders/HistoryModal'

const BOARD_COLUMNS = [
  { status: 'recebido', label: 'Recebido' },
  { status: 'preparo',  label: 'Preparo' },
  { status: 'saiu_entrega', label: 'Em rota' },
]
// Um pedido "pago" ainda não entrou em preparo — mora na coluna Recebido.
const boardColumn = (o) => {
  if (o.status === 'recebido' || o.status === 'pago') return 'recebido'
  if (o.status === 'preparo' || o.status === 'saiu_entrega') return o.status
  return null
}

/**
 * Atalho rápido pra ligar/desligar a impressão automática por impressora —
 * muda com frequência (às vezes só usa uma ou duas no dia), por isso fica
 * no topo dos Pedidos e não em Configurações (que é setup raro).
 */
function AutoPrintBar() {
  const { data: status } = usePrintAgentStatus()
  const setAutoPrint = useSetAutoPrintRoles()

  if (!status?.isLinked || !status.printers?.length) return null

  const activeRoles = status.autoPrintRoles || []
  const toggleRole = (role) => {
    const next = activeRoles.includes(role) ? activeRoles.filter((r) => r !== role) : [...activeRoles, role]
    setAutoPrint.mutate(next)
  }

  return (
    <div className="flex items-center gap-2 bg-surface border border-gray-100 rounded-xl px-3 py-2 overflow-x-auto scrollbar-hide flex-shrink-0">
      <Printer size={14} className="text-gray-400 flex-shrink-0" />
      <span className="text-[11px] font-medium text-gray-400 flex-shrink-0">Impressão automática:</span>
      {status.printers.map((p) => (
        <label key={p.role} className="flex items-center gap-1.5 flex-shrink-0 cursor-pointer">
          <input type="checkbox" checked={activeRoles.includes(p.role)} onChange={() => toggleRole(p.role)} className="rounded accent-primary" />
          <span className="text-xs font-medium">{PRINTER_ROLE_LABELS[p.role] || p.role}</span>
        </label>
      ))}
    </div>
  )
}

export default function OrdersPage() {
  const [type, setType] = useState('')
  const [status, setStatus] = useState('')
  const [detailId, setDetailId] = useState(null)
  const [queueOpen, setQueueOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [now, setNow] = useState(Date.now())

  const { data, isLoading } = useOrders(status || undefined, type || undefined)
  const orders = (data?.data || []).slice().sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000)
    return () => clearInterval(t)
  }, [])

  const activeCount = orders.filter((o) => !['finalizado', 'cancelado'].includes(o.status)).length
  const onRoute = orders.filter((o) => o.status === 'saiu_entrega').length

  return (
    <div>
      <TopBar
        title="Pedidos"
        subtitle={`${activeCount} em andamento · ${onRoute} em rota`}
        right={
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setHistoryOpen(true)} className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-xs font-semibold border border-gray-200 bg-surface text-gray-600 active:bg-gray-100">
              <History size={14} /> <span className="hidden sm:inline">Histórico</span>
            </button>
            <button type="button" onClick={() => setQueueOpen(true)} className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-xs font-semibold border border-gray-200 bg-surface text-gray-600 active:bg-gray-100">
              <Bike size={14} /> <span className="hidden sm:inline">Fila de entrega</span>
            </button>
          </div>
        }
      />

      <div className="sticky top-14 md:top-16 z-20 bg-bg pt-2">
        <div className="flex flex-wrap items-center gap-2 px-4 pb-2 max-w-lg mx-auto md:max-w-5xl">
          <TypeFilterBar value={type} onChange={setType} />
          <StatusFilterBar value={status} onChange={setStatus} />
        </div>
        <div className="px-4 pb-2 max-w-lg mx-auto md:max-w-5xl">
          <AutoPrintBar />
        </div>
      </div>

      <div className="page pt-2">
        {isLoading ? (
          <p className="text-gray-400 text-sm text-center py-8">Carregando...</p>
        ) : (
          <>
            {/* Quadro (desktop) */}
            <div className="hidden lg:grid grid-cols-3 gap-4">
              {BOARD_COLUMNS.map((col) => {
                const list = orders.filter((o) => boardColumn(o) === col.status)
                return (
                  <div key={col.status} className="flex flex-col min-h-[200px] rounded-xl bg-bg border border-gray-100">
                    <div className="px-3 py-2.5 flex items-center justify-between border-b border-gray-100">
                      <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">{col.label}</span>
                      <span className="text-xs font-semibold text-gray-400">{list.length}</span>
                    </div>
                    <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[calc(100vh-16rem)]">
                      {list.length === 0 ? (
                        <p className="text-center text-xs text-gray-400 py-8">Nenhum pedido aqui</p>
                      ) : (
                        list.map((o) => <OrderCard key={o._id} order={o} now={now} onOpen={(order) => setDetailId(order._id)} />)
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Lista (mobile) */}
            <div className="lg:hidden space-y-4">
              {BOARD_COLUMNS.map((col) => {
                const list = orders.filter((o) => boardColumn(o) === col.status)
                if (list.length === 0) return null
                return (
                  <div key={col.status}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">{col.label}</span>
                      <span className="text-xs text-gray-400">{list.length}</span>
                    </div>
                    <div className="space-y-2">
                      {list.map((o) => <OrderRow key={o._id} order={o} now={now} onOpen={(order) => setDetailId(order._id)} />)}
                    </div>
                  </div>
                )
              })}
              {orders.filter((o) => boardColumn(o)).length === 0 && (
                <p className="text-gray-400 text-sm text-center py-8">Nenhum pedido nesta categoria</p>
              )}
            </div>
          </>
        )}
      </div>

      <OrderDetailModal
        orderId={detailId}
        onClose={() => setDetailId(null)}
        onOpenQueue={() => { setDetailId(null); setQueueOpen(true) }}
      />
      <DeliveryQueueModal
        open={queueOpen}
        onClose={() => setQueueOpen(false)}
        onOpenOrder={(id) => { setQueueOpen(false); setDetailId(id) }}
      />
      <HistoryModal
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        onOpenOrder={(id) => { setHistoryOpen(false); setDetailId(id) }}
      />
    </div>
  )
}
