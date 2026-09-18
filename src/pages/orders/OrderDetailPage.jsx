import { useParams, useNavigate } from 'react-router-dom'
import { MapPin, FileText, Ban, ChefHat, UtensilsCrossed, CheckCircle2, KeyRound, Paperclip } from 'lucide-react'
import TopBar from '../../components/layout/TopBar'
import Card from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import DeliveryAssigner from '../../components/orders/DeliveryAssigner'
import { useOrder, useCancelOrder, useUpdateOrderStatus, useConfirmManualPix } from '../../hooks/useOrders'
import { formatCurrency, formatShortId, formatDateTime } from '../../utils/format'

const PAYMENT_LABELS = {
  pix: 'PIX', credit_card: 'Cartão de crédito (online)', debit_card: 'Cartão de débito (online)',
  cash_on_delivery: 'Pagamento na entrega', pix_manual: 'Pix com chave',
}

const DELIVERY_PAYMENT_LABELS = { cash: 'Dinheiro', debit: 'Débito (maquininha)', credit: 'Crédito (maquininha)', voucher: 'Voucher (VR/VA, Ticket Alimentação)' }

export default function OrderDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data: order, isLoading } = useOrder(id)
  const cancelOrder = useCancelOrder()
  const updateStatus = useUpdateOrderStatus()
  const confirmManualPix = useConfirmManualPix()

  if (isLoading) return <LoadingSpinner />
  if (!order) return <p className="page text-center text-gray-400">Pedido não encontrado.</p>

  const hasAddress = order.deliveryAddress?.street
  const isMesa = order.orderType === 'mesa'
  const isBalcao = order.orderType === 'balcao'
  const isBalcaoMesa = isBalcao && order.balcaoMode === 'mesa'
  const isBalcaoAvulso = isBalcao && order.balcaoMode === 'avulso'
  // Ciclo curto = sem entregador, restaurante marca "Concluído" na mão.
  // Cobre mesa tradicional e as 2 submodalidades do balcão que não saem
  // pra rua (mesa e avulso) — só balcão-entrega segue o ciclo completo,
  // igual delivery normal, e isso já é resolvido sozinho por "hasAddress"
  // mais abaixo (só balcão-entrega tem endereço preenchido).
  const isCicloCurto = isMesa || isBalcaoMesa || isBalcaoAvulso
  const canCancel = !['finalizado', 'cancelado'].includes(order.status)
  // "Iniciar preparo" é manual mesmo pra pedido pago online — o status só
  // deve virar "preparo" quando a cozinha realmente começar, não assim que
  // o pagamento for confirmado (senão o cliente vê uma informação errada
  // sobre o andamento real do pedido).
  const canStartPreparing = ['recebido', 'pago'].includes(order.status)
  // Ciclo curto não tem entregador pra avançar sozinho até "finalizado" —
  // o restaurante marca "Concluído" manualmente na hora de entregar.
  const canFinishMesa = isCicloCurto && order.status === 'preparo'
  // Pix avulso — enquanto o pedido está "recebido", ainda não teve o
  // pagamento confirmado pelo restaurante (não tem gateway pra confirmar
  // sozinho). O bot pode ter marcado que o cliente já mandou o comprovante,
  // mas quem decide de fato é o restaurante, clicando em "Confirmar pagamento".
  const isAwaitingManualPix = order.paymentMethod === 'pix_manual' && order.status === 'recebido'

  const handleCancel = () => {
    if (window.confirm('Cancelar este pedido? Essa ação não pode ser desfeita.')) {
      cancelOrder.mutate(order._id, { onSuccess: () => navigate('/orders') })
    }
  }

  return (
    <div>
      <TopBar title={`Pedido #${formatShortId(order._id)}`} subtitle={formatDateTime(order.createdAt)} back />

      <div className="page space-y-4">
        {/*
          Status é só informativo aqui — pra pedidos com pagamento online,
          avança sozinho quando o Mercado Pago confirma. Daí em diante, quem
          comanda é o card de Entrega logo abaixo (atribuir entregador já
          avança pra "preparo"; e o progresso da entrega, incluindo
          "finalizado", vem do próprio entregador via WhatsApp).
        */}
        <div className="flex items-center justify-between">
          <Badge status={order.status} />
          {isAwaitingManualPix && (
            <Button
              variant="primary"
              className="!min-h-0 !h-9 !px-4 text-sm"
              loading={confirmManualPix.isPending}
              onClick={() => confirmManualPix.mutate(order._id)}
            >
              <KeyRound size={15} />
              Confirmar pagamento
            </Button>
          )}
          {canStartPreparing && (
            <Button
              variant="primary"
              className="!min-h-0 !h-9 !px-4 text-sm"
              loading={updateStatus.isPending}
              onClick={() => updateStatus.mutate({ id: order._id, status: 'preparo' })}
            >
              <ChefHat size={15} />
              Iniciar preparo
            </Button>
          )}
          {canFinishMesa && (
            <Button
              variant="primary"
              className="!min-h-0 !h-9 !px-4 text-sm"
              loading={updateStatus.isPending}
              onClick={() => updateStatus.mutate({ id: order._id, status: 'finalizado' })}
            >
              <CheckCircle2 size={15} />
              Concluir pedido
            </Button>
          )}
        </div>

        {/* Itens */}
        <Card>
          <h3 className="font-semibold text-sm mb-3">Itens</h3>
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
                  <p className="text-xs text-gray-500 mt-0.5 pl-3">
                    Opcionais: {item.chosenOpcionais.map((o) => o.name).join(', ')}
                  </p>
                )}
                {item.chosenAdicionais?.length > 0 && (
                  <div className="pl-3 mt-0.5">
                    {item.chosenAdicionais.map((a, j) => (
                      <p key={j} className="text-xs text-primary">
                        + {a.quantity}x {a.name} ({formatCurrency(a.subtotal)})
                      </p>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="border-t border-gray-100 mt-3 pt-3 space-y-1">
            <div className="flex justify-between text-sm text-gray-500">
              <span>Subtotal</span><span>{formatCurrency(order.subtotal)}</span>
            </div>
            {order.deliveryFee > 0 && (
              <div className="flex justify-between text-sm text-gray-500">
                <span>Taxa de entrega</span><span>{formatCurrency(order.deliveryFee)}</span>
              </div>
            )}
            <div className="flex justify-between font-semibold">
              <span>Total</span><span>{formatCurrency(order.total)}</span>
            </div>
          </div>
        </Card>

        {/* Pagamento */}
        <Card>
          <h3 className="font-semibold text-sm mb-2">Pagamento</h3>
          <p className="text-sm">{PAYMENT_LABELS[order.paymentMethod]}</p>
          {order.deliveryPaymentMethod && (
            <p className="text-sm text-gray-500 mt-1">
              {DELIVERY_PAYMENT_LABELS[order.deliveryPaymentMethod]}
              {order.paymentMethod === 'cash_on_delivery' && (
                isCicloCurto ? ' — no balcão' : ' — na entrega'
              )}
            </p>
          )}
          {order.paidAtCreation && (
            <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-success/10 px-2.5 py-1 text-xs font-semibold text-green-600">
              ✅ Já pago no balcão
            </p>
          )}
          {order.paymentMethod === 'pix_manual' && (
            <div className="mt-2 space-y-2">
              <p className="text-xs text-gray-500">
                <span className="font-semibold">Chave:</span> {order.manualPixKeySnapshot || '—'}
              </p>
              {isAwaitingManualPix ? (
                <p className="inline-flex items-center gap-1.5 rounded-full bg-warning/10 px-2.5 py-1 text-xs font-semibold text-amber-600">
                  🔑 Aguardando confirmação
                </p>
              ) : (
                <p className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-2.5 py-1 text-xs font-semibold text-green-600">
                  ✅ Pagamento confirmado
                </p>
              )}
              {order.manualPixProofReceivedAt && (
                <p className="flex items-center gap-1.5 text-xs text-gray-500">
                  <Paperclip size={13} />
                  Comprovante enviado pelo cliente em {formatDateTime(order.manualPixProofReceivedAt)}
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
        </Card>

        {/* Mesa (tradicional ou balcão-mesa) */}
        {(isMesa || isBalcaoMesa) && (
          <Card>
            <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
              <UtensilsCrossed size={16} className="text-primary" />
              {isBalcao ? 'Balcão — Mesa' : 'Mesa'}
            </h3>
            <p className="text-sm">Mesa {order.tableNumber}</p>
            {order.customerName && <p className="text-sm text-gray-500 mt-1">{order.customerName}</p>}
          </Card>
        )}

        {/* Balcão — avulso (aguarda e leva no balcão, sem mesa nem entrega) */}
        {isBalcaoAvulso && (
          <Card>
            <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
              <UtensilsCrossed size={16} className="text-primary" />
              Balcão — Retirada
            </h3>
            <p className="text-sm text-gray-500">Cliente aguarda e leva no balcão</p>
            {order.customerName && <p className="text-sm text-gray-500 mt-1">{order.customerName}</p>}
          </Card>
        )}

        {/* Cliente e endereço */}
        {hasAddress && (
          <Card>
            <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
              <MapPin size={16} className="text-primary" />
              Endereço de entrega
            </h3>
            <p className="text-sm">
              {order.deliveryAddress.street}, {order.deliveryAddress.number}
            </p>
            <p className="text-sm text-gray-500">{order.deliveryAddress.neighborhood}</p>
            {order.deliveryAddress.referencePoint && (
              <p className="text-xs text-gray-400 mt-1">Ref: {order.deliveryAddress.referencePoint}</p>
            )}
          </Card>
        )}

        {/* Entrega — só aparece se houver endereço */}
        {hasAddress && <DeliveryAssigner order={order} />}

        {/* Observações */}
        {order.notes && (
          <Card>
            <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
              <FileText size={16} className="text-primary" />
              Observações
            </h3>
            <p className="text-sm text-gray-600">{order.notes}</p>
          </Card>
        )}

        {/* Descartáveis */}
        {typeof order.wantsDisposables === 'boolean' && (
          <Card>
            <p className="text-sm">
              {order.wantsDisposables ? '🍴 Cliente quer talheres/descartáveis' : '🚫 Cliente não quer talheres/descartáveis'}
            </p>
          </Card>
        )}

        {/* Cancelar pedido */}
        {canCancel && (
          <Button
            full
            variant="ghost"
            className="text-danger"
            loading={cancelOrder.isPending}
            onClick={handleCancel}
          >
            <Ban size={16} />
            Cancelar pedido
          </Button>
        )}
      </div>
    </div>
  )
}
