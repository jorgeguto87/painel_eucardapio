import { useState, useEffect } from 'react'
import { X, Bike, ChevronLeft, GripVertical, ArrowRightLeft, Send } from 'lucide-react'
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
} from '@dnd-kit/core'
import {
  SortableContext, verticalListSortingStrategy, useSortable, arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useDeliverers } from '../../hooks/useDeliverers'
import {
  useDelivererQueue, useReorderQueue, useSendDelivererQueue,
  useTransferDeliverer, useRemoveDeliverer,
} from '../../hooks/useOrders'
import { formatCurrency, formatShortId } from '../../utils/format'
import Modal from '../ui/Modal'

const COURIER_DOT = { disponivel: 'bg-success', em_rota: 'bg-orange-500', inativo: 'bg-gray-300' }

/** Card fechado — um por entregador, na grade inicial do modal. */
function DelivererCard({ deliverer, onSelect }) {
  const { data: orders } = useDelivererQueue(deliverer._id)
  const sendQueue = useSendDelivererQueue()
  const count = orders?.length || 0
  const emRota = deliverer.status === 'em_rota'

  const handleSend = (e) => {
    e.stopPropagation()
    sendQueue.mutate(deliverer._id)
  }

  return (
    <button
      type="button"
      onClick={() => onSelect(deliverer._id)}
      className="text-left rounded-xl bg-bg border border-gray-100 p-3 active:bg-gray-100 transition-colors"
    >
      <div className="flex items-center gap-2 mb-2">
        <i className={`size-2 rounded-full flex-shrink-0 ${COURIER_DOT[deliverer.status] || 'bg-gray-300'}`} />
        <span className="font-semibold text-sm flex-1 truncate">{deliverer.name}</span>
        {emRota ? (
          <span className="text-[10px] font-bold uppercase text-orange-600 bg-orange-50 rounded-full px-2 py-0.5 flex-shrink-0">Em rota</span>
        ) : count > 0 ? (
          <span
            role="button"
            title="Enviar lista por WhatsApp"
            onClick={handleSend}
            className="text-base leading-none flex-shrink-0 p-1 -m-1 rounded-lg active:bg-gray-200"
          >
            {sendQueue.isPending ? '…' : '📤'}
          </span>
        ) : null}
      </div>
      <p className="text-center text-sm text-gray-500 py-2">
        {count === 0 ? 'Nenhum pedido na fila' : `${count} ${count === 1 ? 'pedido' : 'pedidos'} na fila`}
      </p>
    </button>
  )
}

/** Item arrastável dentro da fila detalhada de um entregador — mesmo padrão
 *  de arrastar (dnd-kit + alça de pontinhos) já usado em Produtos. */
function QueueItem({ order, onOpenOrder, onTransfer, onRemove }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: order._id })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }

  return (
    <li ref={setNodeRef} style={style} className="px-3 py-2.5 flex items-center gap-2 bg-surface">
      <button {...attributes} {...listeners} className="touch-none text-gray-300 hover:text-gray-400 shrink-0 cursor-grab active:cursor-grabbing">
        <GripVertical size={16} />
      </button>
      <button type="button" onClick={() => onOpenOrder(order._id)} className="min-w-0 flex-1 text-left hover:opacity-80">
        <span className="font-bold text-sm tracking-tight">#{formatShortId(order._id)}</span>
        <p className="text-[11px] text-gray-400 truncate">
          {order.deliveryAddress?.street}, {order.deliveryAddress?.number} · {formatCurrency(order.total)}
        </p>
      </button>
      <button onClick={onTransfer} className="p-1.5 rounded-lg bg-bg border border-gray-100" title="Transferir"><ArrowRightLeft size={13} /></button>
      <button onClick={onRemove} className="p-1.5 rounded-lg bg-bg border border-gray-100 text-danger" title="Remover"><X size={13} /></button>
    </li>
  )
}

/** Fila detalhada de um único entregador — Tela 2 do modal. */
function DelivererQueueDetail({ deliverer, otherDeliverers, onBack, onOpenOrder }) {
  const { data: orders, isLoading } = useDelivererQueue(deliverer._id)
  const reorderQueue = useReorderQueue()
  const sendQueue = useSendDelivererQueue()
  const transferDeliverer = useTransferDeliverer()
  const removeDeliverer = useRemoveDeliverer()
  const [transferTarget, setTransferTarget] = useState(null)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const handleDragEnd = ({ active, over }) => {
    if (!orders || !over || active.id === over.id) return
    const oldIndex = orders.findIndex((o) => o._id === active.id)
    const newIndex = orders.findIndex((o) => o._id === over.id)
    const reordered = arrayMove(orders, oldIndex, newIndex)
    reorderQueue.mutate({ delivererId: deliverer._id, orderIds: reordered.map((o) => o._id) })
  }

  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-primary font-medium mb-3">
        <ChevronLeft size={16} /> Todos os entregadores
      </button>

      <div className="flex items-center gap-2 mb-3">
        <i className={`size-2 rounded-full flex-shrink-0 ${COURIER_DOT[deliverer.status] || 'bg-gray-300'}`} />
        <span className="font-semibold text-sm flex-1 truncate">{deliverer.name}</span>
        {deliverer.status === 'em_rota' && (
          <span className="text-[10px] font-bold uppercase text-orange-600 bg-orange-50 rounded-full px-2 py-0.5">Em rota</span>
        )}
        <button
          type="button"
          disabled={!orders || orders.length === 0 || sendQueue.isPending}
          onClick={() => sendQueue.mutate(deliverer._id)}
          className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-primary/10 text-primary disabled:opacity-30"
        >
          <Send size={13} /> {deliverer.status === 'em_rota' ? 'Reenviar' : 'Enviar'}
        </button>
      </div>

      <div className="rounded-xl bg-bg border border-gray-100 overflow-hidden">
        {isLoading ? (
          <p className="px-3 py-4 text-xs text-gray-400">Carregando...</p>
        ) : !orders || orders.length === 0 ? (
          <p className="px-3 py-4 text-xs text-gray-400">Sem entregas na fila</p>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={orders.map((o) => o._id)} strategy={verticalListSortingStrategy}>
              <ul className="divide-y divide-gray-100">
                {orders.map((o) => (
                  <QueueItem
                    key={o._id}
                    order={o}
                    onOpenOrder={onOpenOrder}
                    onTransfer={() => setTransferTarget(o._id)}
                    onRemove={() => { if (window.confirm('Remover esse pedido da fila?')) removeDeliverer.mutate(o._id) }}
                  />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        )}
      </div>

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
    </div>
  )
}

export default function DeliveryQueueModal({ open, onClose, onOpenOrder }) {
  const { data: deliverers, isLoading } = useDeliverers()
  const [selectedId, setSelectedId] = useState(null)

  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else { document.body.style.overflow = ''; setSelectedId(null) }
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null
  const active = (deliverers || []).filter((d) => d.isActive !== false)
  const selected = active.find((d) => d._id === selectedId)

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-3xl sm:w-[calc(100%-1.5rem)] max-h-[90vh] overflow-y-auto bg-surface rounded-t-2xl sm:rounded-2xl shadow-xl z-10">
        <button onClick={onClose} className="absolute top-3 right-3 p-2 rounded-xl active:bg-gray-100 z-10"><X size={20} className="text-gray-400" /></button>

        {!selected && (
          <div className="px-5 pt-5 pb-4 flex items-center gap-3 border-b border-gray-100">
            <div className="grid place-items-center size-9 rounded-lg bg-primary/10">
              <Bike size={18} className="text-primary" />
            </div>
            <div>
              <h2 className="font-semibold text-lg text-secondary">Fila de entrega</h2>
              <p className="text-xs text-gray-400">Escolha um entregador pra ver a fila dele</p>
            </div>
          </div>
        )}

        <div className="p-5">
          {selected ? (
            <DelivererQueueDetail
              deliverer={selected}
              otherDeliverers={active.filter((x) => x._id !== selected._id)}
              onBack={() => setSelectedId(null)}
              onOpenOrder={onOpenOrder}
            />
          ) : isLoading ? (
            <p className="text-sm text-center py-6 text-gray-400">Carregando...</p>
          ) : active.length === 0 ? (
            <p className="text-sm text-center py-6 text-gray-400">Nenhum entregador cadastrado.</p>
          ) : (
            <div className="grid sm:grid-cols-2 gap-3">
              {active.map((d) => (
                <DelivererCard key={d._id} deliverer={d} onSelect={setSelectedId} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
