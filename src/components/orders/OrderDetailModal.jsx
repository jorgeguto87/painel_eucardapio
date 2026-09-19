import { useState, useEffect } from 'react'
import { X, MapPin, Ban, KeyRound, Paperclip, Printer, UtensilsCrossed, ShoppingBag, Bike, ChevronRight } from 'lucide-react'
import { useOrder, useCancelOrder, useConfirmManualPix, useRemoveDeliverer } from '../../hooks/useOrders'
import { usePrintAgentStatus, usePrintOrder, PRINTER_ROLE_LABELS } from '../../hooks/usePrintAgent'
import { useDeliverers } from '../../hooks/useDeliverers'
import { formatCurrency, formatShortId, formatDateTime } from '../../utils/format'
import Badge from '../ui/Badge'
import Button from '../ui/Button'
import Modal from '../ui/Modal'
import PrimaryActionButton, { needsDelivery, isOpenOrder } from './PrimaryActionButton'
import CourierPickerModal from './CourierPickerModal'

const PAYMENT_LABELS = {
  pix: 'PIX', credit_card: 'Cartão de crédito (online)', debit_card: 'Cartão de débito (online)',
  cash_on_delivery: 'Pagamento na entrega', pix_manual: 'Pix com chave',
}
const DELIVERY_PAYMENT_LABELS = { cash: 'Dinheiro', debit: 'Débito (maquininha)', credit: 'Crédito (maquininha)', voucher: 'Voucher (VR/VA, Ticket Alimentação)' }
const DELIVERY_STAGE_LABELS = { fila: 'Na fila', proxima: 'Próxima entrega', no_local: 'No local', entregue: 'Entregue' }

const Section = ({ title, children }) => (
  <div>
    <h3 className="font-semibold text-sm mb-2 text-secondary">{title}</h3>
    {children}
  </div>
)

function ReprintModal({ open, onClose, orderId, printers }) {
  const [selected, setSelected] = useState([])
  const printOrder = usePrintOrder()
  const toggle = (role) => setSelected((prev) => (prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]))
  const handleConfirm = () => printOrder.mutate({ orderId, roles: selected }, { onSuccess: () => { onClose(); setSelected([]) } })
  return (
    <Modal open={open} onClose={onClose} title="Reimprimir pedido">
      <div className="space-y-2 mb-4">
        {printers.map((p) => (
          <label key={p.role} className="flex items-center gap-2.5 p-2.5 rounded-xl border border-gray-100 cursor-pointer">
            <input type="checkbox" checked={selected.includes(p.role)} onChange={() => toggle(p.role)} className="rounded accent-primary" />
            <span className="text-sm font-medium">{PRINTER_ROLE_LABELS[p.role] || p.role}</span>
          </label>
        ))}
      </div>
      <Button full disabled={selected.length === 0} loading={printOrder.isPending} onClick={handleConfirm}>Imprimir</Button>
    </Modal>
  )
}

export default function OrderDetailModal({ orderId, onClose, onOpenQueue }) {
  const { data: order, isLoading } = useOrder(orderId)
  const cancelOrder = useCancelOrder()
  const confirmManualPix = useConfirmManualPix()
  const { data: printStatus } = usePrintAgentStatus()
  const { data: deliverers } = useDeliverers()
  const removeDeliverer = useRemoveDeliverer()
  const [reprintOpen, setReprintOpen] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)

  useEffect(() => {
    if (orderId) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [orderId])

  if (!orderId) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-3xl sm:w-[calc(100%-1.5rem)] max-h-[92vh] overflow-y-auto bg-surface rounded-t-2xl sm:rounded-2xl shadow-xl z-10">
        <button onClick={onClose} className="absolute top-3 right-3 p-2 rounded-xl active:bg-gray-100 z-10">
          <X size={20} className="text-gray-400" />
        </button>

        {isLoading || !order ? (
          <div className="p-10 text-center text-sm text-gray-400">Carregando...</div>
        ) : (
          <OrderDetailBody
            order={order}
            printStatus={printStatus}
            deliverers={deliverers}
            confirmManualPix={confirmManualPix}
            cancelOrder={cancelOrder}
            removeDeliverer={removeDeliverer}
            onClose={onClose}
            onOpenQueue={onOpenQueue}
            onReprint={() => setReprintOpen(true)}
            onPickCourier={() => setPickerOpen(true)}
          />
        )}
      </div>

      {order && printStatus?.printers?.length > 0 && (
        <ReprintModal open={reprintOpen} onClose={() => setReprintOpen(false)} orderId={order._id} printers={printStatus.printers} />
      )}
      {order && (
        <CourierPickerModal open={pickerOpen} onClose={() => setPickerOpen(false)} orderId={order._id} currentDelivererId={order.delivererId} />
      )}
    </div>
  )
}

function OrderDetailBody({ order, printStatus, deliverers, confirmManualPix, cancelOrder, removeDeliverer, onClose, onOpenQueue, onReprint, onPickCourier }) {
  const isMesa = order.orderType === 'mesa'
  const isBalcao = order.orderType === 'balcao'
  const isBalcaoMesa = isBalcao && order.balcaoMode === 'mesa'
  const isBalcaoAvulso = isBalcao && order.balcaoMode === 'avulso'
  const hasAddress = needsDelivery(order)
  const canCancel = isOpenOrder(order)
  const isAwaitingManualPix = order.paymentMethod === 'pix_manual' && order.status === 'recebido'
  const assignedDeliverer = deliverers?.find((d) => d._id === order.delivererId)
  const canPrint = printStatus?.isLinked && printStatus.printers?.length > 0

  const handleCancel = () => {
    if (window.confirm('Cancelar este pedido? Essa ação não pode ser desfeita.')) {
      cancelOrder.mutate(order._id, { onSuccess: onClose })
    }
  }

  return (
    <>
      {/* Cabeçalho */}
      <div className="px-5 pt-5 pb-4 pr-12 border-b border-gray-100">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-3">
              <span className="font-bold text-3xl leading-none tracking-tight text-secondary">#{formatShortId(order._id)}</span>
              <Badge status={order.status} />
            </div>
            <div className="mt-2 text-sm text-gray-500">{formatDateTime(order.createdAt)}</div>
          </div>
          <div className="flex flex-col items-end gap-2">
            {isAwaitingManualPix && (
              <Button variant="primary" className="!min-h-0 !h-9 !px-4 text-sm" loading={confirmManualPix.isPending} onClick={() => confirmManualPix.mutate(order._id)}>
                <KeyRound size={15} /> Confirmar pagamento
              </Button>
            )}
            <PrimaryActionButton order={order} size="lg" />
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-5 gap-4 px-5 py-4">
        {/* Coluna esquerda */}
        <div className="md:col-span-3 space-y-4">
          <Section title="Itens">
            <div className="space-y-3">
              {order.items.map((item, i) => (
                <div key={i} className="text-sm">
                  <div className="flex justify-between">
                    <span>{item.quantity}x {item.name}</span>
                    <span className="font-medium">{formatCurrency(item.subtotal)}</span>
                  </div>
                  {item.chosenVariants?.length > 0 && (
                    <p className="text-xs font-semibold text-secondary mt-0.5 pl-3">
                      {item.chosenVariants.map((v) => `${v.groupName}: ${v.optionName}`).join(' · ')}
                    </p>
                  )}
                  {item.chosenOpcionais?.length > 0 && (
                    <p className="text-xs text-gray-500 mt-0.5 pl-3">Opcionais: {item.chosenOpcionais.map((o) => o.name).join(', ')}</p>
                  )}
                  {item.chosenAdicionais?.length > 0 && (
                    <div className="pl-3 mt-0.5">
                      {item.chosenAdicionais.map((a, j) => (
                        <p key={j} className="text-xs text-primary">+ {a.quantity}x {a.name} ({formatCurrency(a.subtotal)})</p>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="border-t border-gray-100 mt-3 pt-3 space-y-1">
              <div className="flex justify-between text-sm text-gray-500"><span>Subtotal</span><span>{formatCurrency(order.subtotal)}</span></div>
              {order.deliveryFee > 0 && (
                <div className="flex justify-between text-sm text-gray-500"><span>Taxa de entrega</span><span>{formatCurrency(order.deliveryFee)}</span></div>
              )}
              <div className="flex justify-between font-semibold"><span>Total</span><span>{formatCurrency(order.total)}</span></div>
            </div>
          </Section>

          <Section title="Pagamento">
            <p className="text-sm">{PAYMENT_LABELS[order.paymentMethod]}</p>
            {order.deliveryPaymentMethod && (
              <p className="text-sm text-gray-500 mt-1">
                {DELIVERY_PAYMENT_LABELS[order.deliveryPaymentMethod]}
                {order.paymentMethod === 'cash_on_delivery' && (hasAddress ? ' — na entrega' : ' — no balcão')}
              </p>
            )}
            {order.paidAtCreation && (
              <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-success/10 px-2.5 py-1 text-xs font-semibold text-green-600">✅ Já pago no balcão</p>
            )}
            {order.paymentMethod === 'pix_manual' && (
              <div className="mt-2 space-y-2">
                <p className="text-xs text-gray-500"><span className="font-semibold">Chave:</span> {order.manualPixKeySnapshot || '—'}</p>
                {order.status === 'recebido' ? (
                  <p className="inline-flex items-center gap-1.5 rounded-full bg-warning/10 px-2.5 py-1 text-xs font-semibold text-amber-600">🔑 Aguardando confirmação</p>
                ) : (
                  <p className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-2.5 py-1 text-xs font-semibold text-green-600">✅ Pagamento confirmado</p>
                )}
                {order.manualPixProofReceivedAt && (
                  <p className="flex items-center gap-1.5 text-xs text-gray-500">
                    <Paperclip size={13} /> Comprovante enviado em {formatDateTime(order.manualPixProofReceivedAt)}
                  </p>
                )}
              </div>
            )}
            {order.changeRequested && (
              <div className="mt-2 bg-warning/10 rounded-xl p-3 text-sm">
                <p>Troco para {formatCurrency(order.changeFor)}</p>
                <p className="font-semibold">Levar troco de {formatCurrency(order.changeAmount)}</p>
              </div>
            )}
          </Section>

          {order.notes && (
            <Section title="Observações">
              <p className="text-sm text-gray-600">{order.notes}</p>
            </Section>
          )}
        </div>

        {/* Coluna direita */}
        <div className="md:col-span-2 space-y-4">
          {hasAddress ? (
            <Section title="Entrega">
              <div className="flex items-start gap-2 text-sm">
                <MapPin size={16} className="text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p>{order.deliveryAddress.street}, {order.deliveryAddress.number}</p>
                  <p className="text-gray-500">{order.deliveryAddress.neighborhood}</p>
                  {order.deliveryAddress.referencePoint && (
                    <p className="text-xs text-gray-400 mt-1">Ref: {order.deliveryAddress.referencePoint}</p>
                  )}
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-gray-100">
                <div className="text-[11px] text-gray-400 mb-1.5 flex items-center gap-1.5"><Bike size={13} /> Entregador</div>
                {assignedDeliverer ? (
                  <>
                    <button onClick={() => onOpenQueue?.(assignedDeliverer._id)} className="w-full flex items-center justify-between bg-bg rounded-xl p-3 active:bg-gray-100">
                      <div className="text-left">
                        <p className="font-medium text-sm">{assignedDeliverer.name}</p>
                        {order.deliveryStatus && (
                          <p className="text-xs text-gray-400">{DELIVERY_STAGE_LABELS[order.deliveryStatus]}</p>
                        )}
                      </div>
                      <ChevronRight size={18} className="text-gray-300" />
                    </button>
                    {isOpenOrder(order) && (
                      <div className="flex gap-2 mt-2">
                        <Button variant="ghost" className="!min-h-0 !h-9 !px-3 text-xs flex-1" onClick={onPickCourier}>Trocar entregador</Button>
                        <Button
                          variant="ghost"
                          className="!min-h-0 !h-9 !px-3 text-xs text-danger"
                          loading={removeDeliverer.isPending}
                          onClick={() => { if (window.confirm('Remover este pedido da fila de entrega?')) removeDeliverer.mutate(order._id) }}
                        >
                          <X size={14} />
                        </Button>
                      </div>
                    )}
                  </>
                ) : isOpenOrder(order) ? (
                  <Button full variant="secondary" onClick={onPickCourier}>Selecionar entregador</Button>
                ) : (
                  <span className="text-xs text-gray-400">—</span>
                )}
              </div>
            </Section>
          ) : (isMesa || isBalcaoMesa) ? (
            <Section title={isBalcao ? 'Balcão — Mesa' : 'Mesa'}>
              <div className="flex items-center gap-3">
                <UtensilsCrossed size={20} className="text-primary flex-shrink-0" />
                <div>
                  <p className="font-bold text-lg leading-none">Mesa {order.tableNumber}</p>
                  {order.customerName && <p className="text-xs text-gray-500 mt-1">{order.customerName}</p>}
                </div>
              </div>
            </Section>
          ) : isBalcaoAvulso ? (
            <Section title="Balcão — Retirada">
              <div className="flex items-center gap-3">
                <ShoppingBag size={20} className="text-primary flex-shrink-0" />
                <div>
                  <p className="font-medium text-sm">Cliente aguarda e leva no balcão</p>
                  {order.customerName && <p className="text-xs text-gray-500 mt-1">{order.customerName}</p>}
                </div>
              </div>
            </Section>
          ) : null}

          {typeof order.wantsDisposables === 'boolean' && (
            <Section title="Descartáveis">
              <p className="text-sm text-gray-600">
                {order.wantsDisposables ? '🍴 Cliente quer talheres/descartáveis' : '🚫 Cliente não quer talheres/descartáveis'}
              </p>
            </Section>
          )}

          <div className="flex gap-2 pt-2">
            {canPrint && (
              <Button full variant="secondary" className="flex-1" onClick={onReprint}>
                <Printer size={16} /> Reimprimir
              </Button>
            )}
            {canCancel && (
              <Button full variant="ghost" className="flex-1 text-danger" loading={cancelOrder.isPending} onClick={handleCancel}>
                <Ban size={16} /> Cancelar
              </Button>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
