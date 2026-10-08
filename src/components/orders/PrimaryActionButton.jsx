import { useState } from 'react'
import { useUpdateOrderStatus } from '../../hooks/useOrders'
import CourierPickerModal from './CourierPickerModal'

// Mesma lógica de negócio de OrderDetailPage.jsx, só compactada num botão
// reaproveitável no card do board, na linha da lista e no modal de detalhe.
export const isCicloCurto = (order) => {
  const isMesa = order.orderType === 'mesa'
  const isBalcaoMesa = order.orderType === 'balcao' && order.balcaoMode === 'mesa'
  const isBalcaoAvulso = order.orderType === 'balcao' && order.balcaoMode === 'avulso'
  return isMesa || isBalcaoMesa || isBalcaoAvulso
}
export const needsDelivery = (order) => !!order.deliveryAddress?.street
export const isOpenOrder = (order) => order.status !== 'finalizado' && order.status !== 'cancelado'

// Pagamento online (Pix/cartão pelo gateway). Enquanto o pedido está
// "recebido", o pagamento AINDA NÃO foi aprovado — o servidor recusa
// iniciar o preparo nesse caso (e confere no provedor antes de recusar).
export const ONLINE_PAYMENT_METHODS = ['pix', 'credit_card', 'debit_card']
export const isAwaitingOnlinePayment = (order) =>
  ONLINE_PAYMENT_METHODS.includes(order.paymentMethod) && order.status === 'recebido'

// Texto único de confirmação de cancelamento — o servidor não deixa
// reabrir pedido cancelado, então o aviso é verdadeiro.
export const CANCEL_CONFIRM_TEXT =
  'Cancelar este pedido? Um pedido cancelado não pode ser reaberto. ' +
  'O cashback e o cupom usados voltam para o cliente; pagamento online já aprovado precisa ser estornado no painel do provedor.'

export function primaryAction(order) {
  if (isAwaitingOnlinePayment(order)) {
    return { kind: 'awaiting_payment', label: 'Aguardando pagamento', variant: 'muted' }
  }
  if (['recebido', 'pago'].includes(order.status)) {
    return { kind: 'start_prep', label: 'Iniciar preparo', variant: 'primary' }
  }
  if (order.status === 'preparo') {
    if (isCicloCurto(order)) return { kind: 'finish', label: 'Concluir pedido', variant: 'primary' }
    if (needsDelivery(order)) {
      return order.delivererId
        ? null // já atribuído — progresso normal segue pelo WhatsApp com o entregador
        : { kind: 'assign_courier', label: 'Atribuir entregador', variant: 'primary' }
    }
    return null
  }
  if (order.status === 'saiu_entrega') {
    // Caminho normal é o entregador confirmar a entrega pelo WhatsApp; este
    // botão é só uma via manual, pro restaurante fechar o pedido na mão
    // quando precisar (ex.: entregador não conseguiu atualizar por lá).
    return { kind: 'finish', label: 'Confirmar entrega manualmente', variant: 'secondary' }
  }
  return null
}

const VARIANT_CLASS = {
  primary:   'bg-primary text-white hover:brightness-105',
  secondary: 'bg-secondary text-white hover:brightness-110',
  muted:     'bg-gray-100 text-gray-500 cursor-not-allowed',
}

export default function PrimaryActionButton({ order, size = 'md', className = '' }) {
  const [pickerOpen, setPickerOpen] = useState(false)
  const updateStatus = useUpdateOrderStatus()
  const action = primaryAction(order)
  if (!action) return null

  const base = `inline-flex items-center justify-center rounded-lg font-semibold transition-all active:scale-[0.98] whitespace-nowrap disabled:opacity-50 ${
    size === 'lg' ? 'h-10 px-4 text-sm' : 'h-9 px-3 text-sm'
  } ${VARIANT_CLASS[action.variant]} ${className}`

  if (action.kind === 'awaiting_payment') {
    return (
      <button type="button" className={base} disabled title="O pagamento online ainda não foi confirmado pelo provedor." onClick={(e) => e.stopPropagation()}>
        {action.label}
      </button>
    )
  }

  if (action.kind === 'assign_courier') {
    return (
      <>
        <button type="button" className={base} onClick={(e) => { e.stopPropagation(); setPickerOpen(true) }}>
          {action.label}
        </button>
        <CourierPickerModal open={pickerOpen} onClose={() => setPickerOpen(false)} orderId={order._id} />
      </>
    )
  }

  const run = (e) => {
    e.stopPropagation()
    if (action.kind === 'finish' && order.status === 'saiu_entrega') {
      if (!window.confirm('Confirmar a entrega deste pedido manualmente? Use isso só se o entregador não conseguir atualizar pelo WhatsApp.')) return
    }
    updateStatus.mutate({ id: order._id, status: action.kind === 'start_prep' ? 'preparo' : 'finalizado' })
  }

  return (
    <button type="button" className={base} disabled={updateStatus.isPending} onClick={run}>
      {action.label}
    </button>
  )
}
