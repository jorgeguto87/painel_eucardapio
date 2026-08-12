import { Send } from 'lucide-react'
import Button from '../ui/Button'
import { useDeliverers } from '../../hooks/useDeliverers'
import { useNotifyDeliverer } from '../../hooks/useOrders'

/**
 * A mensagem de entrega já é enviada automaticamente pelo backend (via
 * WhatsApp/Evolution API) assim que o entregador é atribuído ao pedido.
 * Este botão serve só para REENVIAR, caso a mensagem automática não tenha
 * chegado por algum motivo.
 */
export default function SendToDelivererButton({ order }) {
  const { data: deliverers } = useDeliverers()
  const deliverer = deliverers?.find((d) => d._id === order.delivererId)
  const notifyDeliverer = useNotifyDeliverer()

  if (!deliverer) return null

  return (
    <Button
      full
      variant="secondary"
      onClick={() => notifyDeliverer.mutate(order._id)}
      disabled={notifyDeliverer.isPending}
      className="mt-2"
    >
      <Send size={16} />
      {notifyDeliverer.isPending ? 'Reenviando...' : `Reenviar mensagem para ${deliverer.name}`}
    </Button>
  )
}
