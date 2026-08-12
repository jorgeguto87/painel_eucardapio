import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bike, Check, ChevronRight, X } from 'lucide-react'
import Card from '../ui/Card'
import Button from '../ui/Button'
import Badge from '../ui/Badge'
import Modal from '../ui/Modal'
import { useDeliverers } from '../../hooks/useDeliverers'
import { useAssignDeliverer, useRemoveDeliverer } from '../../hooks/useOrders'

const DELIVERY_STAGE_LABELS = {
  fila:     'Na fila',
  proxima:  'Próxima entrega',
  no_local: 'No local',
  entregue: 'Entregue',
}

/**
 * Widget de atribuição de entregador. Ao atribuir, o pedido vai pra fila
 * daquele entregador — o progresso (próxima/no local/entregue) daí em
 * diante é controlado pelo próprio entregador via WhatsApp, gerenciado na
 * tela de fila dele (clique no nome pra abrir).
 */
export default function DeliveryAssigner({ order }) {
  const navigate = useNavigate()
  const [pickerOpen, setPickerOpen] = useState(false)
  const { data: deliverers, isLoading } = useDeliverers()
  const assignDeliverer = useAssignDeliverer()
  const removeDeliverer = useRemoveDeliverer()

  const assignedDeliverer = deliverers?.find((d) => d._id === order.delivererId)

  const handleAssign = (delivererId) => {
    assignDeliverer.mutate({ orderId: order._id, delivererId })
    setPickerOpen(false)
  }

  return (
    <Card>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <Bike size={16} className="text-primary" />
          Entrega
        </h3>
        {order.deliveryStatus && (
          <span className="text-xs font-medium text-gray-500">
            {DELIVERY_STAGE_LABELS[order.deliveryStatus]}
          </span>
        )}
      </div>

      {assignedDeliverer ? (
        <div className="space-y-2 mb-3">
          <button
            onClick={() => navigate(`/deliverers/${assignedDeliverer._id}/queue`)}
            className="w-full flex items-center justify-between bg-bg rounded-xl p-3 active:bg-gray-100"
          >
            <div className="text-left">
              <p className="font-medium text-sm">{assignedDeliverer.name}</p>
              <p className="text-xs text-gray-400">Ver fila de entregas dele</p>
            </div>
            <ChevronRight size={18} className="text-gray-300" />
          </button>

          <div className="flex gap-2">
            <Button variant="ghost" className="!min-h-0 !h-9 !px-3 text-xs flex-1" onClick={() => setPickerOpen(true)}>
              Trocar entregador
            </Button>
            <Button
              variant="ghost"
              className="!min-h-0 !h-9 !px-3 text-xs text-danger"
              loading={removeDeliverer.isPending}
              onClick={() => {
                if (window.confirm('Remover este pedido da fila de entrega? (não transfere pra ninguém — use "Trocar entregador" se quiser transferir)')) {
                  removeDeliverer.mutate(order._id)
                }
              }}
            >
              <X size={14} />
            </Button>
          </div>
        </div>
      ) : (
        <Button full variant="secondary" onClick={() => setPickerOpen(true)}>
          Selecionar entregador
        </Button>
      )}

      <Modal open={pickerOpen} onClose={() => setPickerOpen(false)} title="Escolher entregador">
        {isLoading ? (
          <p className="text-gray-400 text-sm text-center py-4">Carregando...</p>
        ) : deliverers?.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-4">Nenhum entregador cadastrado.</p>
        ) : (
          <div className="space-y-2">
            {deliverers.map((d) => (
              <button
                key={d._id}
                onClick={() => handleAssign(d._id)}
                disabled={d.status === 'inativo'}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-bg active:bg-gray-100 disabled:opacity-40 text-left"
              >
                <div>
                  <p className="font-medium text-sm">{d.name}</p>
                  <p className="text-xs text-gray-400">{d.phone} · {d.vehicleType}</p>
                </div>
                {order.delivererId === d._id
                  ? <Check size={18} className="text-primary" />
                  : <Badge status={d.status === 'disponivel' ? 'connected' : d.status === 'em_rota' ? 'connecting' : 'disconnected'} label={d.status === 'disponivel' ? 'Disponível' : d.status === 'em_rota' ? 'Em rota' : 'Inativo'} />
                }
              </button>
            ))}
          </div>
        )}
      </Modal>
    </Card>
  )
}
