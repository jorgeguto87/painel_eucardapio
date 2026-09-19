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

export function primaryAction(order) {
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
}

export default function PrimaryActionButton({ order, size = 'md', className = '' }) {
  const [pickerOpen, setPickerOpen] = useState(false)
  const updateStatus = useUpdateOrderStatus()
  const action = primaryAction(order)
  if (!action) return null

  const base = `inline-flex items-center justify-center rounded-lg font-semibold transition-all active:scale-[0.98] whitespace-nowrap disabled:opacity-50 ${
    size === 'lg' ? 'h-10 px-4 text-sm' : 'h-9 px-3 text-sm'
  } ${VARIANT_CLASS[action.variant]} ${className}`

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
