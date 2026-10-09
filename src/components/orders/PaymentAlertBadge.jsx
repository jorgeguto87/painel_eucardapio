import { AlertTriangle } from 'lucide-react'

/**
 * Hora de referência do pedido no painel: quando foi LIBERADO pro
 * restaurante (confirmedAt — ex: Pix pago, ou cliente confirmou "pagar na
 * entrega"), e não quando o cliente abriu o checkout. Pedido antigo (sem
 * confirmedAt) cai no createdAt.
 */
export const orderRefTime = (order) => order?.confirmedAt || order?.createdAt

export const orderRefMs = (order) => {
  const t = new Date(orderRefTime(order)).getTime()
  return Number.isFinite(t) ? t : 0
}

const ALERT_TEXT = {
  paid_after_change: 'Pago online — NÃO cobrar na entrega',
  double_payment: 'Pagamento em dobro — estornar',
}

export const paymentAlertText = (alert) =>
  (alert ? ALERT_TEXT[alert.type] || alert.message || 'Atenção ao pagamento' : null)

/**
 * Alerta de pagamento vindo do servidor (order.paymentAlert):
 *  - paid_after_change → cliente trocou pra "pagar na entrega" mas o
 *    pagamento online antigo foi aprovado: NÃO cobrar na entrega;
 *  - double_payment → pago duas vezes: estornar um deles no provedor.
 */
export default function PaymentAlertBadge({ alert, size = 'sm', showMessage = false, className = '' }) {
  if (!alert) return null
  const isDouble = alert.type === 'double_payment'
  const tone = isDouble
    ? 'bg-danger/10 text-red-700 border-danger/30'
    : 'bg-warning/10 text-amber-800 border-warning/30'
  const text = paymentAlertText(alert)
  const pad = size === 'lg' ? 'px-3 py-2 text-sm' : 'px-2 py-1 text-[11px]'
  return (
    <div className={`rounded-lg border font-bold ${tone} ${pad} ${className}`} role="alert">
      <span className="inline-flex items-center gap-1.5">
        <AlertTriangle size={size === 'lg' ? 16 : 12} className="shrink-0" />
        {text}
      </span>
      {showMessage && alert.message && alert.message !== text && (
        <p className="mt-1 text-xs font-medium opacity-90">{alert.message}</p>
      )}
    </div>
  )
}
