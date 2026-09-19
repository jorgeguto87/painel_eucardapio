import { useState, useEffect } from 'react'
import { X, History } from 'lucide-react'
import { useOrders } from '../../hooks/useOrders'
import { OrderRow } from './OrderCard'
import { TypeFilterBar, StatusFilterBar, STATUS_OPTIONS_HISTORY } from './FilterBar'

/** Todos os pedidos (inclusive finalizados/cancelados), filtráveis — abre
 *  como modal a partir da tela de Pedidos, sem precisar navegar pra fora. */
export default function HistoryModal({ open, onClose, onOpenOrder }) {
  const [type, setType] = useState('')
  const [status, setStatus] = useState('')
  const { data, isLoading } = useOrders(status || undefined, type || undefined)

  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null
  const orders = (data?.data || []).slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-3xl sm:w-[calc(100%-1.5rem)] max-h-[90vh] flex flex-col bg-surface rounded-t-2xl sm:rounded-2xl shadow-xl z-10">
        <button onClick={onClose} className="absolute top-3 right-3 p-2 rounded-xl active:bg-gray-100 z-10"><X size={20} className="text-gray-400" /></button>

        <div className="px-5 pt-5 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="grid place-items-center size-9 rounded-lg bg-bg">
              <History size={18} className="text-gray-500" />
            </div>
            <div>
              <h2 className="font-semibold text-lg text-secondary">Histórico de pedidos</h2>
              <p className="text-xs text-gray-400">Todos os pedidos, incluindo finalizados e cancelados</p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <TypeFilterBar value={type} onChange={setType} />
            <StatusFilterBar value={status} onChange={setStatus} options={STATUS_OPTIONS_HISTORY} />
          </div>
        </div>

        <div className="p-4 space-y-2 overflow-y-auto">
          {isLoading ? (
            <p className="text-sm text-center py-10 text-gray-400">Carregando...</p>
          ) : orders.length === 0 ? (
            <p className="text-sm text-center py-10 text-gray-400">Nenhum pedido com esses filtros</p>
          ) : (
            orders.map((o) => <OrderRow key={o._id} order={o} onOpen={(x) => onOpenOrder(x._id)} showAction={false} />)
          )}
        </div>
      </div>
    </div>
  )
}
