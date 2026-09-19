import { useState, useEffect } from 'react'
import { X, Bike, Send, ChevronUp, ChevronDown, ArrowRightLeft } from 'lucide-react'
import { useDeliverers } from '../../hooks/useDeliverers'
import {
  useDelivererQueue, useReorderQueue, useSendDelivererQueue,
  useTransferDeliverer, useRemoveDeliverer,
} from '../../hooks/useOrders'
import { formatCurrency, formatShortId } from '../../utils/format'
import Modal from '../ui/Modal'

const COURIER_DOT = { disponivel: 'bg-success', em_rota: 'bg-orange-500', inativo: 'bg-gray-300' }

function DelivererColumn({ deliverer, otherDeliverers, onOpenOrder }) {
  const { data: orders, isLoading } = useDelivererQueue(deliverer._id)
  const reorderQueue = useReorderQueue()
  const sendQueue = useSendDelivererQueue()
  const transferDeliverer = useTransferDeliverer()
  const removeDeliverer = useRemoveDeliverer()
  const [transferTarget, setTransferTarget] = useState(null)

  const move = (index, direction) => {
    if (!orders) return
    const newIndex = index + direction
    if (newIndex < 0 || newIndex >= orders.length) return
    const reordered = [...orders]
    ;[reordered[index], reordered[newIndex]] = [reordered[newIndex], reordered[index]]
    reorderQueue.mutate({ delivererId: deliverer._id, orderIds: reordered.map((o) => o._id) })
  }

  return (
    <section className="rounded-xl bg-bg border border-gray-100 overflow-hidden">
      <header className="flex items-center gap-2 px-3 py-2.5 border-b border-gray-100 bg-surface">
        <i className={`size-2 rounded-full flex-shrink-0 ${COURIER_DOT[deliverer.status] || 'bg-gray-300'}`} />
        <span className="font-semibold text-sm flex-1 truncate">{deliverer.name}</span>
        <span className="text-[11px] text-gray-400">{orders?.length || 0} {orders?.length === 1 ? 'pedido' : 'pedidos'}</span>
        <button
          type="button"
          title="Enviar lista por WhatsApp"
          disabled={!orders || orders.length === 0 || sendQueue.isPending}
          onClick={() => sendQueue.mutate(deliverer._id)}
          className="p-1.5 rounded-lg bg-surface border border-gray-100 disabled:opacity-30 active:bg-gray-100"
        >
          <Send size={13} />
        </button>
      </header>

      {isLoading ? (
        <p className="px-3 py-4 text-xs text-gray-400">Carregando...</p>
      ) : !orders || orders.length === 0 ? (
        <p className="px-3 py-4 text-xs text-gray-400">Sem entregas na fila</p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {orders.map((o, index) => (
            <li key={o._id} className="px-3 py-2.5 flex items-center gap-2">
              <button type="button" onClick={() => onOpenOrder(o._id)} className="min-w-0 flex-1 text-left hover:opacity-80">
                <span className="font-bold text-sm tracking-tight">#{formatShortId(o._id)}</span>
                <p className="text-[11px] text-gray-400 truncate">
                  {o.deliveryAddress?.street}, {o.deliveryAddress?.number} · {formatCurrency(o.total)}
                </p>
              </button>
              <div className="flex flex-col gap-0.5">
                <button onClick={() => move(index, -1)} disabled={index === 0} className="p-1 rounded bg-surface border border-gray-100 disabled:opacity-20"><ChevronUp size={12} /></button>
                <button onClick={() => move(index, 1)} disabled={index === orders.length - 1} className="p-1 rounded bg-surface border border-gray-100 disabled:opacity-20"><ChevronDown size={12} /></button>
              </div>
              <button onClick={() => setTransferTarget(o._id)} className="p-1.5 rounded-lg bg-surface border border-gray-100" title="Transferir"><ArrowRightLeft size={13} /></button>
              <button
                onClick={() => { if (window.confirm('Remover esse pedido da fila?')) removeDeliverer.mutate(o._id) }}
                className="p-1.5 rounded-lg bg-surface border border-gray-100 text-danger"
                title="Remover"
              >
                <X size={13} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <Modal open={!!transferTarget} onClose={() => setTransferTarget(null)} title="Transferir para">
        {otherDeliverers.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-4">Nenhum outro entregador disponível.</p>
        ) : (
          <div className="space-y-2">
            {otherDeliverers.map((d) => (
              <button
                key={d._id}
                onClick={() => { transferDeliverer.mutate({ orderId: transferTarget, delivererId: d._id }); setTransferTarget(null) }}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-bg active:bg-gray-100 text-left"
              >
                <div>
                  <p className="font-medium text-sm">{d.name}</p>
                  <p className="text-xs text-gray-400">{d.phone} · {d.vehicleType}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </Modal>
    </section>
  )
}

export default function DeliveryQueueModal({ open, onClose, onOpenOrder }) {
  const { data: deliverers, isLoading } = useDeliverers()

  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null
  const active = (deliverers || []).filter((d) => d.isActive !== false)

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-3xl sm:w-[calc(100%-1.5rem)] max-h-[90vh] overflow-y-auto bg-surface rounded-t-2xl sm:rounded-2xl shadow-xl z-10">
        <button onClick={onClose} className="absolute top-3 right-3 p-2 rounded-xl active:bg-gray-100 z-10"><X size={20} className="text-gray-400" /></button>

        <div className="px-5 pt-5 pb-4 flex items-center gap-3 border-b border-gray-100">
          <div className="grid place-items-center size-9 rounded-lg bg-primary/10">
            <Bike size={18} className="text-primary" />
          </div>
          <div>
            <h2 className="font-semibold text-lg text-secondary">Fila de entrega</h2>
            <p className="text-xs text-gray-400">Quem está com o quê, agora</p>
          </div>
        </div>

        <div className="p-5 grid sm:grid-cols-2 gap-3">
          {isLoading ? (
            <p className="text-sm col-span-2 text-center py-6 text-gray-400">Carregando...</p>
          ) : active.length === 0 ? (
            <p className="text-sm col-span-2 text-center py-6 text-gray-400">Nenhum entregador cadastrado.</p>
          ) : (
            active.map((d) => (
              <DelivererColumn key={d._id} deliverer={d} otherDeliverers={active.filter((x) => x._id !== d._id)} onOpenOrder={onOpenOrder} />
            ))
          )}
        </div>
      </div>
    </div>
  )
}
