import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShoppingBag, DollarSign, Clock, MessageCircle, Bike, AlertTriangle } from 'lucide-react'
import TopBar from '../../components/layout/TopBar'
import Card from '../../components/ui/Card'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import Badge from '../../components/ui/Badge'
import NoticeBanner from '../../components/notices/NoticeBanner'
import { useOrders } from '../../hooks/useOrders'
import { useWhatsappStatus } from '../../hooks/useWhatsapp'
import { useMyBilling } from '../../hooks/useBilling'
import useRestaurantStore from '../../stores/restaurantStore'
import { formatCurrency } from '../../utils/format'

export default function DashboardPage() {
  const navigate = useNavigate()
  const { restaurant, fetchRestaurant } = useRestaurantStore()
  const { data: ordersData, isLoading } = useOrders()
  const { data: whatsappStatus } = useWhatsappStatus()
  const { data: billingData } = useMyBilling()

  useEffect(() => {
    if (!restaurant) fetchRestaurant()
  }, [restaurant, fetchRestaurant])

  if (isLoading) return <LoadingSpinner />

  const orders = ordersData?.data || []
  const subscriptionStatus = billingData?.subscription?.status
  const isPastDue = subscriptionStatus === 'past_due'
  const isSuspended = subscriptionStatus === 'suspended'
  const isTrial = subscriptionStatus === 'trial'
  const trialEndsAt = billingData?.subscription?.trialEndsAt
  const trialDaysLeft = trialEndsAt
    ? Math.ceil((new Date(trialEndsAt) - new Date()) / (1000 * 60 * 60 * 24))
    : null
  const showTrialWarning = isTrial && trialDaysLeft !== null && trialDaysLeft <= 3
  const today = new Date().toDateString()
  const todayOrders = orders.filter((o) => new Date(o.createdAt).toDateString() === today)
  const openOrders = orders.filter((o) => !['finalizado', 'cancelado'].includes(o.status))
  const todayRevenue = todayOrders
    .filter((o) => o.status !== 'cancelado')
    .reduce((sum, o) => sum + o.total, 0)

  return (
    <div>
      <TopBar title={restaurant?.name || 'Eu Cardápio'} subtitle="Visão geral" />

      <div className="page space-y-4">
        <NoticeBanner />

        {/* Assinatura vencida/suspensa */}
        {(isPastDue || isSuspended) && (
          <Card
            className="border border-danger/30 bg-danger/5"
            onClick={() => navigate('/financeiro')}
          >
            <div className="flex items-start gap-3">
              <AlertTriangle size={20} className="text-danger flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-sm text-danger">
                  {isSuspended ? 'Assinatura suspensa' : 'Pagamento pendente'}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {isSuspended
                    ? 'WhatsApp desconectado e cardápio bloqueado. Toque para regularizar.'
                    : 'Regularize o pagamento para evitar a suspensão do WhatsApp e do cardápio.'}
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Trial acabando (3 dias ou menos) */}
        {showTrialWarning && (
          <Card
            className="border border-warning/30 bg-warning/5"
            onClick={() => navigate('/financeiro')}
          >
            <div className="flex items-start gap-3">
              <AlertTriangle size={20} className="text-warning flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-sm text-warning">
                  {trialDaysLeft <= 0 ? 'Sua avaliação expira hoje' : `Falta${trialDaysLeft === 1 ? '' : 'm'} ${trialDaysLeft} dia${trialDaysLeft === 1 ? '' : 's'} para expirar sua avaliação`}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Ative sua assinatura Eu Cardápio para continuar com todas as funcionalidades.
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* WhatsApp status */}
        {whatsappStatus && !whatsappStatus.connected && (
          <Card
            className="border border-warning/30 bg-warning/5"
            onClick={() => navigate('/whatsapp')}
          >
            <div className="flex items-center gap-3">
              <MessageCircle size={20} className="text-warning flex-shrink-0" />
              <div className="flex-1">
                <p className="font-medium text-sm">WhatsApp desconectado</p>
                <p className="text-xs text-gray-500">Toque para conectar e começar a receber pedidos</p>
              </div>
            </div>
          </Card>
        )}

        {/* Métricas do dia */}
        <div className="grid grid-cols-2 gap-3">
          <Card>
            <div className="flex items-center gap-2 text-gray-400 mb-1">
              <ShoppingBag size={16} />
              <span className="text-xs font-medium">Pedidos hoje</span>
            </div>
            <p className="text-2xl font-bold text-secondary">{todayOrders.length}</p>
          </Card>

          <Card onClick={() => navigate('/reports')}>
            <div className="flex items-center gap-2 text-gray-400 mb-1">
              <DollarSign size={16} />
              <span className="text-xs font-medium">Faturamento</span>
            </div>
            <p className="text-2xl font-bold text-secondary">{formatCurrency(todayRevenue)}</p>
          </Card>
        </div>

        <Card onClick={() => navigate('/orders')}>
          <div className="flex items-center gap-2 text-gray-400 mb-1">
            <Clock size={16} />
            <span className="text-xs font-medium">Pedidos em aberto</span>
          </div>
          <p className="text-2xl font-bold text-primary">{openOrders.length}</p>
        </Card>

        <Card onClick={() => navigate('/deliverers')}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Bike size={18} className="text-primary" />
            </div>
            <div>
              <p className="font-medium text-sm">Entregadores</p>
              <p className="text-xs text-gray-400">Filas de entrega e histórico</p>
            </div>
          </div>
        </Card>

        {/* Últimos pedidos */}
        <div>
          <h2 className="font-semibold text-secondary mb-3">Pedidos recentes</h2>
          {orders.length === 0 ? (
            <Card><p className="text-gray-400 text-sm text-center py-4">Nenhum pedido ainda</p></Card>
          ) : (
            <div className="space-y-2">
              {orders.slice(0, 5).map((order) => (
                <Card key={order._id} onClick={() => navigate(`/orders/${order._id}`)}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">
                        #{order._id.slice(-6).toUpperCase()}
                      </p>
                      <p className="text-xs text-gray-400">{order.customerPhone}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-sm mb-1">{formatCurrency(order.total)}</p>
                      <Badge status={order.status} />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
