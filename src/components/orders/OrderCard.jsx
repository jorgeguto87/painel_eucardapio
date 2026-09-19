import { formatCurrency, formatShortId } from '../../utils/format'
import Badge from '../ui/Badge'
import { STATUS_TONE } from './StatusBadge'
import PrimaryActionButton from './PrimaryActionButton'

export const channelLabel = (o) => {
  if (o.orderType === 'delivery') return 'Delivery'
  if (o.orderType === 'mesa') return `Mesa ${o.tableNumber ?? '—'}`
  switch (o.balcaoMode) {
    case 'mesa':    return `Balcão · Mesa ${o.tableNumber ?? '—'}`
    case 'entrega': return 'Balcão · Entrega'
    default:        return 'Balcão · Avulso'
  }
}

export const customerLabel = (o) =>
  (o.orderType === 'mesa' || (o.orderType === 'balcao' && o.balcaoMode !== 'entrega'))
    ? (o.customerName || 'Cliente no local')
    : (o.customerName || o.customerPhone || 'Cliente')

export const elapsedLabel = (createdAt, now) => {
  const min = Math.max(0, Math.floor((now - new Date(createdAt).getTime()) / 60000))
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  return `${h}h ${min % 60}m`
}

const timeHM = (d) => new Date(d).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

/** Card do quadro (desktop). */
export function OrderCard({ order, onOpen, now }) {
  const tone = STATUS_TONE[order.status] || STATUS_TONE.recebido
  const isNew = order.status === 'recebido'
  const late = now - new Date(order.createdAt).getTime() > 25 * 60000 && order.status !== 'saiu_entrega'

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={() => onOpen(order)}
      onKeyDown={(e) => e.key === 'Enter' && onOpen(order)}
      className="relative rounded-xl bg-surface shadow-card overflow-hidden cursor-pointer hover:-translate-y-0.5 hover:shadow-float transition-all"
    >
      <span className={`absolute inset-y-0 left-0 w-1 ${tone.bar}`} />
      {isNew && <span className={`absolute inset-y-0 left-1 w-px animate-pulse ${tone.bar}`} />}
      <div className="p-3 pl-4">
        <div className="flex items-baseline justify-between gap-2">
          <span className="font-bold text-xl leading-none tracking-tight text-secondary">#{formatShortId(order._id)}</span>
          <span className={`text-[11px] font-semibold rounded px-1.5 py-0.5 tabular-nums ${late ? 'bg-danger/10 text-danger' : `${tone.soft} ${tone.text}`}`}>
            {elapsedLabel(order.createdAt, now)}
          </span>
        </div>
        <div className="mt-1.5 flex items-center gap-2 text-xs text-gray-500">
          <span className="font-medium">{channelLabel(order)}</span>
          {order.status === 'pago' && <Badge status="pago" />}
          {order.paymentMethod === 'pix_manual' && order.status === 'recebido' && (
            <span className="text-[10px] font-bold uppercase text-amber-600">🔑 Pix</span>
          )}
        </div>
        <div className="text-[11px] text-gray-400 truncate">
          {customerLabel(order)}
          {order.customerName && order.customerPhone ? ` · ${order.customerPhone}` : ''} · {timeHM(order.createdAt)}
        </div>
        <div className="mt-1 font-semibold text-secondary tabular-nums">{formatCurrency(order.total)}</div>
        <PrimaryActionButton order={order} className="mt-2.5 w-full" />
      </div>
    </article>
  )
}

/** Linha da lista (celular / histórico). */
export function OrderRow({ order, onOpen, now, showStatus = true, showAction = true }) {
  const tone = STATUS_TONE[order.status] || STATUS_TONE.recebido
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(order)}
      onKeyDown={(e) => e.key === 'Enter' && onOpen(order)}
      className="relative flex items-center gap-3 rounded-xl bg-surface shadow-card pl-4 pr-3 py-3 cursor-pointer overflow-hidden active:bg-gray-50 transition-colors"
    >
      <span className={`absolute inset-y-0 left-0 w-1 ${tone.bar}`} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold text-secondary leading-none tracking-tight">#{formatShortId(order._id)}</span>
          <span className="text-xs font-medium text-gray-500">{channelLabel(order)}</span>
          {showStatus && <Badge status={order.status} />}
        </div>
        <div className="mt-1 text-[11px] text-gray-400 truncate">
          {customerLabel(order)} · {timeHM(order.createdAt)}{now ? ` · ${elapsedLabel(order.createdAt, now)}` : ''}
        </div>
        <div className="mt-0.5 font-semibold text-sm text-secondary tabular-nums">{formatCurrency(order.total)}</div>
      </div>
      {showAction && <PrimaryActionButton order={order} className="shrink-0 px-2.5 text-xs" />}
    </div>
  )
}
