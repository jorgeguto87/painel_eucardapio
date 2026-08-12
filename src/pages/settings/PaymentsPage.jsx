import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CreditCard, CheckCircle2, Wallet, Zap, Info } from 'lucide-react'
import toast from 'react-hot-toast'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import TopBar from '../../components/layout/TopBar'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Modal from '../../components/ui/Modal'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import api from '../../config/api'
import { toCents, toReais } from '../../utils/format'

const usePaymentConfig = () =>
  useQuery({
    queryKey: ['payments', 'config'],
    queryFn:  async () => (await api.get('/payments/config')).data.data,
  })

const useUpdatePaymentConfig = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload) => api.patch('/payments/config', payload),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['payments', 'config'] }); toast.success('Configuração salva!') },
    onError:    () => toast.error('Erro ao salvar.'),
  })
}

const METHOD_TOGGLES = [
  { key: 'acceptsPix',            label: 'PIX' },
  { key: 'acceptsCreditCard',     label: 'Cartão de crédito (online)' },
  { key: 'acceptsDebitCard',      label: 'Cartão de débito (online)' },
  { key: 'acceptsCashOnDelivery', label: 'Pagar na entrega' },
  { key: 'acceptsCardOnDelivery', label: 'Maquininha na entrega' },
]

const PROVIDERS = [
  {
    key: 'mercadopago', name: 'Mercado Pago', icon: Wallet,
    desc: 'A conta mais usada — exige ter cadastro no Mercado Pago.',
    help: 'Ao clicar em "Conectar", você será levado pro Mercado Pago pra autorizar o acesso com a sua conta. Se ainda não tem conta, crie uma gratuitamente em mercadopago.com.br antes de conectar.',
  },
  {
    key: 'pagbank', name: 'PagBank', icon: CreditCard,
    desc: 'Ex-PagSeguro — boa alternativa se você já usa a maquininha deles.',
    help: 'Ao clicar em "Conectar", você será levado pro PagBank pra autorizar o acesso. Se ainda não tem conta, crie uma gratuitamente em pagbank.com.br antes de conectar.',
  },
  {
    key: 'infinitepay', name: 'InfinitePay', icon: Zap,
    desc: 'Conexão mais simples — só precisa do seu $handle da InfinitePay.',
    help: [
      'Antes de conectar, é preciso habilitar o Checkout Integrado na sua conta InfinitePay:',
      '1. Abra o app InfinitePay (ou o site, app.infinitepay.io)',
      '2. Toque na aba "Vendas" no menu superior',
      '3. Desça a tela até achar "Checkout"',
      '4. Ative a opção "Checkout Integrado" (ou "Habilitar")',
      '5. Nas configurações do Checkout Integrado, desmarque a opção de solicitar endereço — o sistema já envia o endereço de entrega junto, então isso evita pedir de novo pro cliente na página de pagamento.',
      '',
      'Depois disso, digite seu handle aqui (o texto que aparece com $ no seu perfil InfinitePay — pode digitar com ou sem o $, não faz diferença).',
    ].join('\n'),
  },
]

export default function PaymentsPage() {
  const [searchParams] = useSearchParams()
  const { data: config, isLoading } = usePaymentConfig()
  const update = useUpdatePaymentConfig()
  const [form, setForm] = useState(null)
  const [infinitepayHandle, setInfinitepayHandle] = useState('')
  const [connectingInfinitePay, setConnectingInfinitePay] = useState(false)
  const [helpProvider, setHelpProvider] = useState(null)

  useEffect(() => { if (config) setForm(config) }, [config])

  useEffect(() => {
    if (searchParams.get('connected') === 'true') {
      toast.success('Conta de pagamento conectada com sucesso!')
    }
  }, [searchParams])

  const [connectingProvider, setConnectingProvider] = useState(null)

  const handleConnect = async (provider) => {
    if (provider === 'infinitepay') {
      setConnectingInfinitePay(true)
      return
    }
    setConnectingProvider(provider)
    try {
      const { data } = await api.get(`/payments/connect/${provider}`)
      window.location.href = data.data.url
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Erro ao conectar. Tente novamente em instantes.')
      setConnectingProvider(null)
    }
  }

  const [savingInfinitePay, setSavingInfinitePay] = useState(false)

  const submitInfinitePay = async (e) => {
    e.preventDefault()
    setSavingInfinitePay(true)
    try {
      await api.post('/payments/connect/infinitepay', { handle: infinitepayHandle })
      toast.success('InfinitePay conectado!')
      setConnectingInfinitePay(false)
      window.location.reload()
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Erro ao conectar. Confira o handle e tente de novo.')
    } finally {
      setSavingInfinitePay(false)
    }
  }

  const handleDisconnect = async () => {
    if (!confirm('Desconectar sua conta de pagamento? Pagamentos online ficarão indisponíveis até conectar outra.')) return
    await api.post('/payments/disconnect')
    toast.success('Conta desconectada.')
    window.location.reload()
  }

  const toggle = (key) => setForm((f) => ({ ...f, [key]: !f[key] }))

  const handleSave = () => {
    update.mutate({
      acceptsPix:            form.acceptsPix,
      acceptsCreditCard:     form.acceptsCreditCard,
      acceptsDebitCard:      form.acceptsDebitCard,
      acceptsCashOnDelivery: form.acceptsCashOnDelivery,
      acceptsCardOnDelivery: form.acceptsCardOnDelivery,
      deliveryFee:           toCents(form.deliveryFeeInput ?? toReais(form.deliveryFee)),
      freeDeliveryAbove:     form.freeDeliveryAboveInput
        ? toCents(form.freeDeliveryAboveInput)
        : form.freeDeliveryAbove,
    })
  }

  if (isLoading || !form) return <LoadingSpinner />

  const connectedProvider = PROVIDERS.find((p) => p.key === form.provider)

  return (
    <div>
      <TopBar title="Pagamentos" back />

      <div className="page space-y-4">
        <Card>
          <h3 className="font-semibold text-sm mb-1">Conta de pagamento online</h3>
          <p className="text-xs text-gray-400 mb-3">
            Só é possível ter uma conta conectada por vez. Pra trocar, desconecte a atual primeiro.
          </p>

          {form.isConnected ? (
            <>
              <div className="flex items-center gap-2 text-success text-sm mb-3">
                <CheckCircle2 size={16} />
                {connectedProvider?.name || form.provider} conectado
                {form.provider === 'infinitepay' && form.infinitepayHandle && ` ($${form.infinitepayHandle})`}
              </div>
              <Button variant="danger" full onClick={handleDisconnect}>Desconectar</Button>
            </>
          ) : (
            <div className="space-y-2">
              {PROVIDERS.map(({ key, name, icon: Icon, desc, help }) => (
                <div key={key} className="border border-gray-200 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <Icon size={16} className="text-primary" />
                      <span className="font-medium text-sm">{name}</span>
                    </div>
                    <button type="button" onClick={() => setHelpProvider({ name, help })} className="p-1 rounded-full hover:bg-gray-100">
                      <Info size={15} className="text-gray-400" />
                    </button>
                  </div>
                  <p className="text-xs text-gray-400 mb-2">{desc}</p>

                  {key === 'infinitepay' && connectingInfinitePay ? (
                    <form onSubmit={submitInfinitePay} className="flex gap-2">
                      <Input placeholder="$seuhandle" value={infinitepayHandle} onChange={(e) => setInfinitepayHandle(e.target.value)} required />
                      <Button type="submit" className="flex-shrink-0" loading={savingInfinitePay}>Salvar</Button>
                    </form>
                  ) : (
                    <Button full variant="secondary" loading={connectingProvider === key} onClick={() => handleConnect(key)}>
                      Conectar {name}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <h3 className="font-semibold text-sm mb-3">Métodos aceitos</h3>
          <div className="space-y-3">
            {METHOD_TOGGLES.map(({ key, label }) => (
              <div key={key} className="flex items-center justify-between">
                <span className="text-sm">{label}</span>
                <button
                  onClick={() => toggle(key)}
                  className={`relative w-11 h-6 rounded-full transition-colors ${form[key] ? 'bg-success' : 'bg-gray-300'}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form[key] ? 'translate-x-5' : ''}`} />
                </button>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h3 className="font-semibold text-sm mb-3">Taxa de entrega</h3>
          <Input
            label="Valor da entrega (R$)"
            type="number" step="0.01" min="0"
            defaultValue={toReais(form.deliveryFee)}
            onChange={(e) => setForm((f) => ({ ...f, deliveryFeeInput: e.target.value }))}
          />
          <div className="mt-3">
            <Input
              label="Entrega grátis acima de (R$, opcional)"
              type="number" step="0.01" min="0"
              defaultValue={form.freeDeliveryAbove ? toReais(form.freeDeliveryAbove) : ''}
              onChange={(e) => setForm((f) => ({ ...f, freeDeliveryAboveInput: e.target.value }))}
            />
          </div>
        </Card>

        <Button full onClick={handleSave} loading={update.isPending}>Salvar configurações</Button>
      </div>

      <Modal open={!!helpProvider} onClose={() => setHelpProvider(null)} title={`Como conectar — ${helpProvider?.name || ''}`}>
        <p className="text-sm text-gray-600 whitespace-pre-line">{helpProvider?.help}</p>
      </Modal>
    </div>
  )
}
