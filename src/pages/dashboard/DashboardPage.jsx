import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShoppingBag, DollarSign, Clock, MessageCircle, Bike, AlertTriangle, UtensilsCrossed, PlusCircle } from 'lucide-react'
import TopBar from '../../components/layout/TopBar'
import Card from '../../components/ui/Card'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import Badge from '../../components/ui/Badge'
import NoticeBanner from '../../components/notices/NoticeBanner'
import CardapioLinkCard from '../../components/dashboard/CardapioLinkCard'
import PaymentAlertBadge, { orderRefMs } from '../../components/orders/PaymentAlertBadge'
import { useOrders, useTodaySummary } from '../../hooks/useOrders'
import { useWhatsappStatus } from '../../hooks/useWhatsapp'
import { useMyBilling } from '../../hooks/useBilling'
import useRestaurantStore from '../../stores/restaurantStore'
import toast from 'react-hot-toast'
import api from '../../config/api'
import { formatCurrency } from '../../utils/format'

// Endereço público do cardápio digital — OBRIGATÓRIO no build
// (.env.production). Sem ele, antes caía silenciosamente num domínio
// padrão (que pode não ser o deste ambiente); agora o botão avisa o erro.
const CARDAPIO_URL = (import.meta.env.VITE_CARDAPIO_URL || 'https://eucardapio.com.br').trim().replace(/\/+$/, '')

// Compatibilidade TEMPORÁRIA com o cardápio que ainda lê `?at=&rt=` no
// modo Balcão. Enquanto ligado (padrão), além do `?code=` o painel manda
// tokens de uma sessão SEPARADA (nunca a sessão do próprio painel). Depois
// que o cardápio passar a usar `?code=`, buildar com
// VITE_BALCAO_LEGACY_TOKENS=false.
const BALCAO_LEGACY_TOKENS = import.meta.env.VITE_BALCAO_LEGACY_TOKENS !== 'false'

export default function DashboardPage() {
  const navigate = useNavigate()
  const { restaurant, fetchRestaurant } = useRestaurantStore()
  const { data: ordersData, isLoading } = useOrders()
  // Contagens/faturamento do dia vêm agregados do servidor (fuso de São
  // Paulo, todos os pedidos do dia) — antes eram calculados aqui a partir
  // só dos 20 pedidos mais recentes, no fuso do navegador.
  const { data: summary } = useTodaySummary()
  const { data: whatsappStatus } = useWhatsappStatus()
  const { data: billingData } = useMyBilling()
  // Abre o cardápio numa aba nova, no modo balcão. Antes levava o access
  // E o refresh token do PRÓPRIO painel na URL (histórico, logs, Referer —
  // e as duas abas disputavam o mesmo refresh token). Agora pede ao backend
  // um código de uso único (60s) que o cardápio troca por uma sessão
  // própria em POST /api/auth/handoff/exchange.
  const abrirBalcao = async () => {
    if (!CARDAPIO_URL) {
      console.error('[Balcão] VITE_CARDAPIO_URL não configurada no build do painel.')
      toast.error('Endereço do cardápio não configurado neste painel (VITE_CARDAPIO_URL). Avise o suporte.')
      return
    }
    if (!restaurant?.slug) {
      toast.error('Ainda carregando os dados do restaurante. Tente de novo em instantes.')
      return
    }

    // Abre a aba já no clique (senão o bloqueador de pop-up barra o
    // window.open feito depois do await) e só depois navega.
    const win = window.open('about:blank', '_blank')
    if (win) { try { win.opener = null } catch { /* ignora */ } }

    try {
      const { data } = await api.post('/auth/handoff-code', { purpose: 'balcao', includeLegacyTokens: BALCAO_LEGACY_TOKENS })
      const params = new URLSearchParams({ code: data.data.code })
      if (data.data.legacy) {
        params.set('at', data.data.legacy.accessToken)
        params.set('rt', data.data.legacy.refreshToken)
      }
      const url = `${CARDAPIO_URL}/r/${encodeURIComponent(restaurant.slug)}/balcao?${params.toString()}`
      if (win && !win.closed) win.location.href = url
      else window.open(url, '_blank', 'noopener')
    } catch (err) {
      if (win && !win.closed) win.close()
      toast.error(err.response?.data?.error?.message || 'Não foi possível abrir o modo balcão agora. Tente de novo.')
    }
  }

  useEffect(() => {
    if (!restaurant) fetchRestaurant()
  }, [restaurant, fetchRestaurant])

  if (isLoading) return <LoadingSpinner />

  // Mais recentes primeiro, pela hora em que o pedido foi liberado pro
  // restaurante (confirmedAt), não pela abertura do checkout.
  const orders = (ordersData?.data || []).slice().sort((a, b) => orderRefMs(b) - orderRefMs(a))
  const subscriptionStatus = billingData?.subscription?.status
  const isPastDue = subscriptionStatus === 'past_due'
  const isSuspended = subscriptionStatus === 'suspended'
  const isTrial = subscriptionStatus === 'trial'
  const trialEndsAt = billingData?.subscription?.trialEndsAt
  const trialDaysLeft = trialEndsAt
    ? Math.ceil((new Date(trialEndsAt) - new Date()) / (1000 * 60 * 60 * 24))
    : null
  const showTrialWarning = isTrial && trialDaysLeft !== null && trialDaysLeft <= 3
  const byType = summary?.byType || {}
  const todayCount = (type) => byType[type]?.count || 0
  const todayRevenue = (type) => byType[type]?.revenue || 0
  const openOrdersCount = summary?.openCount ?? 0

  return (
    <div>
      <TopBar title={restaurant?.name || 'Eu Cardápio'} subtitle="Visão geral" />

      <div className="page space-y-4">
        <NoticeBanner />

        <button
          onClick={abrirBalcao}
          className="w-full flex items-center justify-center gap-2 rounded-2xl bg-primary py-4 text-sm font-bold text-white shadow-[0_8px_20px_-8px_rgba(255,107,44,0.55)] cursor-pointer"
        >
          <PlusCircle size={18} /> Novo pedido — Balcão
        </button>

        <CardapioLinkCard baseUrl={CARDAPIO_URL} slug={restaurant?.slug} restaurantName={restaurant?.name} />

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
                    : 'Regularize o pagamento para evitar a suspensão do WhatsApp e Cardápio Digital.'}
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
                  Toque para ativar sua assinatura Eu Cardápio e continuar com todas as funcionalidades.
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

        {/* Pedidos hoje — os 3 canais juntos, num cartão só, com divisória */}
        <Card>
          <p className="text-xs font-semibold text-gray-400 mb-3">Pedidos hoje</p>
          <div className="grid grid-cols-3 divide-x divide-gray-100">
            <div className="flex flex-col items-center gap-1 px-1 text-center">
              <ShoppingBag size={15} className="text-gray-400" />
              <span className="text-[10px] font-medium text-gray-400 leading-tight">Delivery</span>
              <span className="text-lg font-bold text-secondary">{todayCount('delivery')}</span>
            </div>
            <div className="flex flex-col items-center gap-1 px-1 text-center">
              <PlusCircle size={15} className="text-gray-400" />
              <span className="text-[10px] font-medium text-gray-400 leading-tight">Balcão</span>
              <span className="text-lg font-bold text-secondary">{todayCount('balcao')}</span>
            </div>
            <div className="flex flex-col items-center gap-1 px-1 text-center">
              <UtensilsCrossed size={15} className="text-gray-400" />
              <span className="text-[10px] font-medium text-gray-400 leading-tight">Mesa</span>
              <span className="text-lg font-bold text-secondary">{todayCount('mesa')}</span>
            </div>
          </div>
        </Card>

        {/* Faturamento hoje — mesmo padrão, clica e vai pro relatório */}
        <Card onClick={() => navigate('/reports')}>
          <p className="text-xs font-semibold text-gray-400 mb-3">Faturamento hoje</p>
          <div className="grid grid-cols-3 divide-x divide-gray-100">
            <div className="flex flex-col items-center gap-1 px-1 text-center">
              <DollarSign size={15} className="text-gray-400" />
              <span className="text-[10px] font-medium text-gray-400 leading-tight">Delivery</span>
              <span className="text-xs font-bold text-secondary whitespace-nowrap">{formatCurrency(todayRevenue('delivery'))}</span>
            </div>
            <div className="flex flex-col items-center gap-1 px-1 text-center">
              <DollarSign size={15} className="text-gray-400" />
              <span className="text-[10px] font-medium text-gray-400 leading-tight">Balcão</span>
              <span className="text-xs font-bold text-secondary whitespace-nowrap">{formatCurrency(todayRevenue('balcao'))}</span>
            </div>
            <div className="flex flex-col items-center gap-1 px-1 text-center">
              <DollarSign size={15} className="text-gray-400" />
              <span className="text-[10px] font-medium text-gray-400 leading-tight">Mesa</span>
              <span className="text-xs font-bold text-secondary whitespace-nowrap">{formatCurrency(todayRevenue('mesa'))}</span>
            </div>
          </div>
        </Card>

        {/* Pedidos em aberto + Entregadores — lado a lado, mesma altura */}
        <div className="grid grid-cols-2 gap-3">
          <Card onClick={() => navigate('/orders')}>
            <div className="flex items-center gap-2 text-gray-400 mb-1">
              <Clock size={16} />
              <span className="text-xs font-medium">Em aberto</span>
            </div>
            <p className="text-2xl font-bold text-primary">{openOrdersCount}</p>
          </Card>

          <Card onClick={() => navigate('/deliverers')} className="flex flex-col justify-center">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Bike size={17} className="text-primary" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-sm text-secondary leading-tight">Entregadores</p>
                <p className="text-[11px] text-gray-400 leading-tight">Filas e histórico</p>
              </div>
            </div>
          </Card>
        </div>

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
                        {order.orderType === 'mesa' && (
                          <span className="ml-1.5 text-[10px] font-bold uppercase text-primary bg-primary/10 rounded-full px-1.5 py-0.5">Mesa</span>
                        )}
                        {order.orderType === 'balcao' && (
                          <span className="ml-1.5 text-[10px] font-bold uppercase text-primary bg-primary/10 rounded-full px-1.5 py-0.5">
                            Balcão{order.balcaoMode === 'mesa' ? ` · Mesa ${order.tableNumber}` : order.balcaoMode === 'entrega' ? '' : ' · Avulso'}
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-gray-400">
                        {order.orderType === 'mesa'
                          ? `Mesa ${order.tableNumber}`
                          : (order.orderType === 'balcao' && order.balcaoMode !== 'entrega')
                            ? (order.customerName || 'Cliente no local')
                            : order.customerPhone}
                      </p>
                      <PaymentAlertBadge alert={order.paymentAlert} className="mt-1 w-fit" />
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
