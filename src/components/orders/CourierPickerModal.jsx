import Modal from '../ui/Modal'
import Badge from '../ui/Badge'
import { Check } from 'lucide-react'
import { useDeliverers } from '../../hooks/useDeliverers'
import { useAssignDeliverer, useTransferDeliverer } from '../../hooks/useOrders'

/**
 * Escolher entregador pra um pedido — usado tanto pra atribuir (ainda sem
 * ninguém) quanto pra trocar (já tem alguém, `currentDelivererId` fica
 * marcado e some da lista de opções clicáveis).
 */
export default function CourierPickerModal({ open, onClose, orderId, currentDelivererId }) {
  const { data: deliverers, isLoading } = useDeliverers()
  const assign = useAssignDeliverer()
  const transfer = useTransferDeliverer()

  const handlePick = (delivererId) => {
    if (currentDelivererId) {
      transfer.mutate({ orderId, delivererId })
    } else {
      assign.mutate({ orderId, delivererId })
    }
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={currentDelivererId ? 'Trocar entregador' : 'Atribuir entregador'}>
      {isLoading ? (
        <p className="text-gray-400 text-sm text-center py-4">Carregando...</p>
      ) : !deliverers || deliverers.length === 0 ? (
        <p className="text-gray-400 text-sm text-center py-4">Nenhum entregador cadastrado.</p>
      ) : (
        <div className="space-y-2">
          {deliverers.map((d) => (
            <button
              key={d._id}
              onClick={() => handlePick(d._id)}
              disabled={d.status === 'inativo' || d._id === currentDelivererId}
              className="w-full flex items-center justify-between p-3 rounded-xl bg-bg active:bg-gray-100 disabled:opacity-40 text-left"
            >
              <div>
                <p className="font-medium text-sm">{d.name}</p>
                <p className="text-xs text-gray-400">{d.phone} · {d.vehicleType}</p>
              </div>
              {d._id === currentDelivererId
                ? <Check size={18} className="text-primary" />
                : <Badge status={d.status === 'disponivel' ? 'connected' : d.status === 'em_rota' ? 'connecting' : 'disconnected'} label={d.status === 'disponivel' ? 'Disponível' : d.status === 'em_rota' ? 'Em rota' : 'Inativo'} />
              }
            </button>
          ))}
        </div>
      )}
    </Modal>
  )
}
