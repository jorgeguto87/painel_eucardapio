import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Send, ArrowRightLeft, X, MapPin, GripVertical } from 'lucide-react'
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
} from '@dnd-kit/core'
import {
  SortableContext, verticalListSortingStrategy, useSortable, arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import TopBar from '../../components/layout/TopBar'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import { useDeliverers } from '../../hooks/useDeliverers'
import {
  useDelivererQueue,
  useReorderQueue,
  useSendDelivererQueue,
  useTransferDeliverer,
  useRemoveDeliverer,
} from '../../hooks/useOrders'
import { formatCurrency, formatShortId } from '../../utils/format'

const STAGE_LABELS = { fila: 'Na fila', proxima: 'Próxima entrega', no_local: 'No local' }
const STAGE_COLORS = {
  fila:     'bg-gray-100 text-gray-500',
  proxima:  'bg-primary/10 text-primary',
  no_local: 'bg-success/10 text-success',
}

// Mesmo padrão de arrastar-e-soltar já usado em Produtos (dnd-kit + alça de
// pontinhos) — equaliza a interação em vez de usar setinhas aqui.
function QueueOrderCard({ order, onOpen, onTransfer, onRemove, removePending }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: order._id })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }

  return (
    <div ref={setNodeRef} style={style}>
      <Card className="!p-3">
        <div className="flex items-start gap-2">
          <button {...attributes} {...listeners} className="touch-none text-gray-300 hover:text-gray-400 shrink-0 cursor-grab active:cursor-grabbing mt-1">
            <GripVertical size={16} />
          </button>
          <button onClick={onOpen} className="flex-1 text-left min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-sm">#{formatShortId(order._id)}</span>
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${STAGE_COLORS[order.deliveryStatus] || 'bg-gray-100 text-gray-500'}`}>
                {STAGE_LABELS[order.deliveryStatus] || order.deliveryStatus}
              </span>
            </div>
            <p className="text-xs text-gray-500 flex items-center gap-1">
              <MapPin size={11} />
              {order.deliveryAddress?.street}, {order.deliveryAddress?.number}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">{formatCurrency(order.total)}</p>
          </button>
        </div>

        <div className="flex gap-2 mt-2 pt-2 border-t border-gray-50">
          <Button variant="ghost" className="!min-h-0 !h-8 !px-2 text-xs flex-1" onClick={onTransfer}>
            <ArrowRightLeft size={13} />
            Transferir
          </Button>
          <Button variant="ghost" className="!min-h-0 !h-8 !px-2 text-xs text-danger" loading={removePending} onClick={onRemove}>
            <X size={13} />
          </Button>
        </div>
      </Card>
    </div>
  )
}

export default function DelivererQueuePage() {
  const { delivererId } = useParams()
  const navigate = useNavigate()
  const { data: deliverers } = useDeliverers()
  const { data: orders, isLoading } = useDelivererQueue(delivererId)
  const reorderQueue     = useReorderQueue()
  const sendQueue        = useSendDelivererQueue()
  const transferDeliverer = useTransferDeliverer()
  const removeDeliverer   = useRemoveDeliverer()

  const [transferTarget, setTransferTarget] = useState(null) // orderId sendo transferido
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const deliverer = deliverers?.find((d) => d._id === delivererId)
  const otherDeliverers = (deliverers || []).filter((d) => d._id !== delivererId && d.isActive !== false)

  const handleDragEnd = ({ active, over }) => {
    if (!orders || !over || active.id === over.id) return
    const oldIndex = orders.findIndex((o) => o._id === active.id)
    const newIndex = orders.findIndex((o) => o._id === over.id)
    const reordered = arrayMove(orders, oldIndex, newIndex)
    reorderQueue.mutate({ delivererId, orderIds: reordered.map((o) => o._id) })
  }

  return (
    <div>
      <TopBar title={deliverer?.name || 'Entregador'} subtitle="Fila de entregas" back />

      <div className="page space-y-3">
        <Button
          full
          loading={sendQueue.isPending}
          disabled={!orders || orders.length === 0}
          onClick={() => sendQueue.mutate(delivererId)}
        >
          <Send size={16} />
          Enviar lista por WhatsApp
        </Button>

        {isLoading ? (
          <LoadingSpinner />
        ) : !orders || orders.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">
            Nenhuma entrega na fila desse entregador ainda.
          </p>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={orders.map((o) => o._id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {orders.map((order) => (
                  <QueueOrderCard
                    key={order._id}
                    order={order}
                    onOpen={() => navigate(`/orders/${order._id}`)}
                    onTransfer={() => setTransferTarget(order._id)}
                    removePending={removeDeliverer.isPending}
                    onRemove={() => {
                      if (window.confirm('Remover esse pedido da fila? (não transfere pra ninguém)')) {
                        removeDeliverer.mutate(order._id)
                      }
                    }}
                  />
                ))}
              </div>
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
                onClick={() => {
                  transferDeliverer.mutate({ orderId: transferTarget, delivererId: d._id })
                  setTransferTarget(null)
                }}
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
