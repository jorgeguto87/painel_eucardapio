import { useState } from 'react'
import { Copy, CreditCard, QrCode, AlertTriangle, RefreshCw, CalendarClock } from 'lucide-react'
import TopBar from '../../components/layout/TopBar'
import Card from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Modal from '../../components/ui/Modal'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import toast from 'react-hot-toast'
import {
  useMyBilling, useGeneratePix, useGenerateCardCheckout, useCheckPayment,
  useSubscribe, useAnticipatePayment,
} from '../../hooks/useBilling'
import { formatCurrency, formatDate } from '../../utils/format'

const BILLING_STATUS_LABELS = {
  pending:   'Pendente',
  paid:      'Pago',
  failed:    'Falhou',
  refunded:  'Estornado',
  cancelled: 'Cancelado',
  waived:    'Dispensado',
}

export default function FinanceiroPage() {
  const { data, isLoading } = useMyBilling({ refetchInterval: 15000 })
  const generatePix = useGeneratePix()
  const generateCardCheckout = useGenerateCardCheckout()
  const checkPayment = useCheckPayment()
  const subscribe = useSubscribe()
  const anticipate = useAnticipatePayment()
  const [showPix, setShowPix] = useState(false)
  const [showSubscribeModal, setShowSubscribeModal] = useState(false)
  const [showTermsModal, setShowTermsModal] = useState(false)
  const [hasViewedTerms, setHasViewedTerms] = useState(false)
  const [subscribeForm, setSubscribeForm] = useState({ billingDay: '', billingPeriod: 'monthly', paymentMethod: 'pix', termsAccepted: false })

  if (isLoading) return <LoadingSpinner />

  const { subscription, pendingBilling, history, plan } = data || {}
  const isRestricted = ['past_due', 'suspended'].includes(subscription?.status)
  const isTrial = subscription?.status === 'trial'
  const trialDaysLeft = subscription?.trialEndsAt
    ? Math.max(0, Math.ceil((new Date(subscription.trialEndsAt) - new Date()) / (1000 * 60 * 60 * 24)))
    : null
  const canAnticipate = subscription?.status === 'active' && subscription?.canAnticipateFirstPayment && !pendingBilling

  const openTermsModal = () => {
    setShowTermsModal(true)
    setHasViewedTerms(true)
  }

  const handleSubscribe = async (e) => {
    e.preventDefault()
    const day = Number(subscribeForm.billingDay)
    if (!day || day < 1 || day > 31) {
      toast.error('Escolha um dia entre 1 e 31.')
      return
    }
    if (!hasViewedTerms) {
      toast.error('Abra e leia o termo de adesão antes de continuar.')
      return
    }
    if (!subscribeForm.termsAccepted) {
      toast.error('É necessário aceitar o termo de adesão.')
      return
    }
    await subscribe.mutateAsync({
      billingDay: day,
      billingPeriod: subscribeForm.billingPeriod,
      paymentMethod: subscribeForm.paymentMethod,
      termsAccepted: true,
    })
    setShowSubscribeModal(false)
    toast.success('Adesão gerada! Pague abaixo pra ativar seu plano.')
  }

  const handleShowPix = async () => {
    if (!pendingBilling?.pixCode) {
      await generatePix.mutateAsync()
    }
    setShowPix(true)
  }

  const copyPixCode = () => {
    navigator.clipboard.writeText(pendingBilling.pixCode)
    toast.success('Código Pix copiado!')
  }

  const handleCardPayment = async () => {
    // Abre a aba JÁ, ainda dentro do clique do usuário — se esperarmos o
    // await terminar pra abrir, o navegador não reconhece mais como uma ação
    // direta do usuário e trata como pop-up bloqueado, mostrando "about:blank"
    // em vez da URL de pagamento (mesmo com o link certo sendo gerado).
    const newTab = window.open('', '_blank')
    try {
      const result = await generateCardCheckout.mutateAsync()
      if (!result?.checkoutUrl) {
        if (newTab) newTab.close()
        toast.error('Não foi possível gerar o link de pagamento.')
        return
      }
      if (newTab) {
        newTab.location.href = result.checkoutUrl
      } else {
        // Pop-up foi bloqueado mesmo assim — navega na mesma aba como fallback.
        window.location.href = result.checkoutUrl
      }
    } catch (err) {
      if (newTab) newTab.close()
    }
  }

  return (
    <div>
      <TopBar title="Assinatura Eu Cardápio" subtitle="Sua assinatura e pagamentos" back />

      <div className="page space-y-4">
        {isRestricted && (
          <div className="bg-danger/10 rounded-xl p-4 flex items-start gap-3">
            <AlertTriangle size={20} className="text-danger flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-danger">
                {subscription.status === 'suspended' ? 'Assinatura suspensa' : 'Pagamento pendente'}
              </p>
              <p className="text-xs text-gray-600 mt-1">
                {subscription.status === 'suspended'
                  ? 'O WhatsApp foi desconectado e o cardápio está bloqueado até a confirmação do pagamento.'
                  : 'Regularize o pagamento abaixo para evitar a suspensão do WhatsApp e do cardápio.'}
              </p>
            </div>
          </div>
        )}

        <Card>
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-semibold text-sm">Assinatura</h3>
            <Badge status={subscription?.status} />
          </div>
          {subscription?.currentPeriodEnd && (
            <p className="text-xs text-gray-400 mt-1">
              {subscription.status === 'active' ? 'Renova em' : 'Vencimento em'} {formatDate(subscription.currentPeriodEnd)}
            </p>
          )}
          {isTrial && subscription?.trialEndsAt && (
            <>
              <p className="text-xs text-gray-400 mt-1">
                {trialDaysLeft <= 0 ? 'Sua avaliação expira hoje' : `Falta${trialDaysLeft === 1 ? '' : 'm'} ${trialDaysLeft} dia${trialDaysLeft === 1 ? '' : 's'} de avaliação`} — até {formatDate(subscription.trialEndsAt)}
              </p>
              <Button full className="mt-3" onClick={() => setShowSubscribeModal(true)}>
                Assinar plano
              </Button>
            </>
          )}
        </Card>

        {canAnticipate && (
          <Card>
            <div className="flex items-start gap-3">
              <CalendarClock size={20} className="text-primary flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium">Você pode antecipar o pagamento</p>
                <p className="text-xs text-gray-500 mt-0.5 mb-3">
                  Seu vencimento ainda está longe. Se preferir, pode pagar a próxima mensalidade agora em vez de esperar.
                </p>
                <Button full variant="secondary" loading={anticipate.isPending} onClick={() => anticipate.mutate()}>
                  Antecipar pagamento
                </Button>
              </div>
            </div>
          </Card>
        )}

        {pendingBilling && (
          <Card>
            <h3 className="font-semibold text-sm mb-2">Cobrança em aberto</h3>
            <p className="text-2xl font-bold text-secondary mb-3">{formatCurrency(pendingBilling.total)}</p>

            {showPix && pendingBilling?.pixCode ? (
              <div className="bg-bg rounded-xl p-3 mb-3">
                {pendingBilling.pixQrCode && (
                  <img
                    src={`data:image/png;base64,${pendingBilling.pixQrCode}`}
                    alt="QR Code Pix"
                    className="w-48 h-48 mx-auto mb-3 bg-white rounded-lg p-2 border border-gray-100"
                  />
                )}
                <p className="text-xs text-gray-400 mb-2">Copie o código e pague no app do seu banco:</p>
                <p className="text-xs font-mono break-all bg-white rounded-lg p-2 border border-gray-100">{pendingBilling.pixCode}</p>
                <Button variant="secondary" full className="mt-2" onClick={copyPixCode}>
                  <Copy size={14} />
                  Copiar código Pix
                </Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Button full loading={generatePix.isPending} onClick={handleShowPix}>
                  <QrCode size={16} />
                  Pagar com Pix
                </Button>
                <Button full variant="secondary" loading={generateCardCheckout.isPending} onClick={handleCardPayment}>
                  <CreditCard size={16} />
                  Cartão
                </Button>
              </div>
            )}

            <Button
              full
              variant="secondary"
              className="mt-3"
              loading={checkPayment.isPending}
              onClick={() => checkPayment.mutate()}
            >
              <RefreshCw size={14} />
              Já paguei, verificar agora
            </Button>
          </Card>
        )}

        <Card>
          <h3 className="font-semibold text-sm mb-3">Histórico</h3>
          {!history || history.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">Nenhuma cobrança ainda.</p>
          ) : (
            <div className="space-y-2">
              {history.map((b) => (
                <div key={b._id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="text-sm font-medium">{formatCurrency(b.total)}</p>
                    <p className="text-xs text-gray-400">{formatDate(b.createdAt)}</p>
                  </div>
                  <Badge status={b.status} label={BILLING_STATUS_LABELS[b.status] || b.status} />
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Modal open={showSubscribeModal} onClose={() => setShowSubscribeModal(false)} title="Assinar plano">
        <form onSubmit={handleSubscribe} className="space-y-4">
          <div>
            <label className="label">Período</label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              <button
                type="button"
                onClick={() => setSubscribeForm({ ...subscribeForm, billingPeriod: 'monthly' })}
                className={`text-left p-3 rounded-xl border-2 transition-colors ${subscribeForm.billingPeriod === 'monthly' ? 'border-primary bg-primary/5' : 'border-gray-200'}`}
              >
                <p className="text-xs text-gray-500">Mensal</p>
                <p className="text-lg font-bold text-secondary">{formatCurrency(plan?.monthlyPrice || 0)}</p>
                <p className="text-xs text-gray-400">por mês</p>
              </button>
              <button
                type="button"
                onClick={() => setSubscribeForm({ ...subscribeForm, billingPeriod: 'annual' })}
                className={`text-left p-3 rounded-xl border-2 transition-colors relative ${subscribeForm.billingPeriod === 'annual' ? 'border-primary bg-primary/5' : 'border-gray-200'}`}
              >
                {plan?.annualDiscountPercent > 0 && (
                  <span className="absolute -top-2 right-2 bg-success text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                    -{plan.annualDiscountPercent}%
                  </span>
                )}
                <p className="text-xs text-gray-500">Anual</p>
                <p className="text-lg font-bold text-secondary">{formatCurrency(plan?.annualPrice || 0)}</p>
                <p className="text-xs text-gray-400">adesão + 11 meses</p>
              </button>
            </div>
          </div>

          <div className="bg-bg rounded-xl p-3 text-xs text-gray-500">
            Taxa de adesão (cobrada agora, uma única vez): <strong>{formatCurrency(plan?.setupFee || 0)}</strong>.
            {' '}Depois disso, a mensalidade escolhida acima passa a valer a partir da primeira cobrança.
          </div>

          <div>
            <label className="label">Forma de pagamento da adesão</label>
            <div className="flex gap-2 mt-1">
              <button
                type="button"
                onClick={() => setSubscribeForm({ ...subscribeForm, paymentMethod: 'pix' })}
                className={`flex-1 py-2.5 rounded-xl border text-sm font-medium flex items-center justify-center gap-1.5 ${subscribeForm.paymentMethod === 'pix' ? 'border-primary bg-primary/5 text-primary' : 'border-gray-200 text-gray-500'}`}
              >
                <QrCode size={14} /> Pix
              </button>
              <button
                type="button"
                onClick={() => setSubscribeForm({ ...subscribeForm, paymentMethod: 'card' })}
                className={`flex-1 py-2.5 rounded-xl border text-sm font-medium flex items-center justify-center gap-1.5 ${subscribeForm.paymentMethod === 'card' ? 'border-primary bg-primary/5 text-primary' : 'border-gray-200 text-gray-500'}`}
              >
                <CreditCard size={14} /> Cartão
              </button>
            </div>
          </div>

          <Input
            label="Dia de vencimento da mensalidade (1 a 31)"
            type="number"
            min={1}
            max={31}
            placeholder="Ex: 15"
            value={subscribeForm.billingDay}
            onChange={(e) => setSubscribeForm({ ...subscribeForm, billingDay: e.target.value })}
          />
          <p className="text-xs text-gray-400 -mt-2">
            Sua mensalidade sempre vencerá nesse dia, todo mês. A primeira cobrança nunca acontece antes de você ter aproveitado pelo menos algumas semanas de uso.
          </p>

          <button
            type="button"
            onClick={openTermsModal}
            className="w-full text-left bg-bg rounded-xl p-3 border border-gray-200 flex items-center justify-between"
          >
            <span className="text-sm font-medium text-primary">Ver termo de adesão completo</span>
            <span className="text-xs text-gray-400">{hasViewedTerms ? '✓ lido' : 'toque para abrir'}</span>
          </button>

          <label className={`flex items-start gap-2 text-sm ${!hasViewedTerms ? 'opacity-50' : ''}`}>
            <input
              type="checkbox"
              className="mt-0.5"
              disabled={!hasViewedTerms}
              checked={subscribeForm.termsAccepted}
              onChange={(e) => setSubscribeForm({ ...subscribeForm, termsAccepted: e.target.checked })}
            />
            Li e concordo com o termo de adesão.
          </label>

          <Button type="submit" full loading={subscribe.isPending} disabled={!hasViewedTerms || !subscribeForm.termsAccepted}>
            Confirmar assinatura
          </Button>
        </form>
      </Modal>

      <Modal open={showTermsModal} onClose={() => setShowTermsModal(false)} title="Termo de adesão">
        <div className="text-sm text-gray-600 leading-relaxed space-y-3">
          <p>
            Ao confirmar a adesão ao plano {plan?.name || ''}, você declara estar ciente e de acordo com:
          </p>
          <p>
            <strong>1. Taxa de adesão.</strong> Será cobrada uma taxa única de adesão no valor de{' '}
            <strong>{formatCurrency(plan?.setupFee || 0)}</strong>, referente à ativação do plano contratado.
            Essa taxa não é reembolsável após a confirmação do pagamento.
          </p>
          <p>
            <strong>2. Mensalidade recorrente.</strong> Após o período coberto pela adesão, será cobrada uma
            mensalidade no valor escolhido (mensal ou anual, com desconto), sempre no dia escolhido de cada mês.
          </p>
          <p>
            <strong>3. Primeira cobrança.</strong> É garantido um período mínimo de uso da plataforma a partir
            da confirmação da adesão antes da cobrança da primeira mensalidade.
          </p>
          <p>
            <strong>4. Atraso e suspensão.</strong> Em caso de não pagamento até a data de vencimento, o
            restaurante entra em período de carência, durante o qual o acesso permanece ativo. Após esse
            período sem regularização, o acesso ao WhatsApp e ao cardápio digital será suspenso
            automaticamente, sem prejuízo da cobrança devida.
          </p>
          <p>
            <strong>5. Reativação.</strong> O acesso é restabelecido automaticamente assim que o pagamento
            pendente for confirmado.
          </p>
          <p>
            <strong>6. Cancelamento.</strong> O restaurante pode solicitar o cancelamento a qualquer momento,
            sem multas, ficando o acesso disponível até o fim do período já pago. Assinaturas canceladas e
            não excluídas manualmente são removidas do sistema automaticamente após 15 dias.
          </p>
          <p>
            <strong>7. Alterações de plano ou valores.</strong> Eventuais alterações de preço serão
            comunicadas com antecedência mínima de 30 dias, não afetando cobranças já em andamento.
          </p>
          <Button full onClick={() => setShowTermsModal(false)} className="mt-2">Entendi</Button>
        </div>
      </Modal>
    </div>
  )
}
