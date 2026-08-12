import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../config/api'
import toast from 'react-hot-toast'

export const useMyBilling = (options = {}) =>
  useQuery({
    queryKey: ['billing', 'me'],
    queryFn:  async () => (await api.get('/billing/me')).data.data,
    // Só é um badge decorativo na maioria das telas — no Dashboard não
    // precisa atualizar rápido o tempo todo. A tela de Financeiro em si
    // pede o ritmo rápido explicitamente (pra refletir pagamento via Pix).
    refetchInterval: options.refetchInterval ?? 5 * 60_000, // 5 min por padrão
  })

export const useGeneratePix = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.post('/billing/me/pix'),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['billing', 'me'] }),
    onError:    (err) => toast.error(err.response?.data?.error?.message || 'Erro ao gerar Pix'),
  })
}

export const useGenerateCardCheckout = () => {
  return useMutation({
    mutationFn: async () => (await api.post('/billing/me/card')).data.data,
    onError:    (err) => toast.error(err.response?.data?.error?.message || 'Erro ao gerar checkout de cartão'),
  })
}

// "Já paguei, verificar agora" — consulta direto na API do MP, sem esperar o
// webhook ou o ciclo automático do dia seguinte.
export const useCheckPayment = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => (await api.post('/billing/me/check')).data.data,
    onSuccess:  (result) => {
      qc.invalidateQueries({ queryKey: ['billing', 'me'] })
      if (result?.status === 'approved') {
        toast.success('Pagamento confirmado! Assinatura reativada.')
      } else if (result?.checked === false) {
        toast('Nenhuma cobrança pendente com pagamento pra verificar.')
      } else {
        toast('Ainda não identificamos o pagamento. Se você acabou de pagar, aguarde alguns instantes e tente de novo.')
      }
    },
    onError: (err) => toast.error(err.response?.data?.error?.message || 'Erro ao verificar pagamento'),
  })
}

// Assinar o plano (sair do trial): escolhe dia de vencimento + forma de
// pagamento da adesão + aceite do termo. Gera a cobrança da adesão — a
// assinatura só ativa quando esse pagamento confirmar.
export const useSubscribe = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ billingDay, paymentMethod, termsAccepted }) =>
      (await api.post('/billing/me/subscribe', { billingDay, paymentMethod, termsAccepted })).data.data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['billing', 'me'] }),
    onError:   (err) => toast.error(err.response?.data?.error?.message || 'Erro ao iniciar assinatura'),
  })
}

// Antecipar o pagamento da mensalidade atual, antes do vencimento normal —
// útil quando a primeira cobrança após a adesão caiu bem mais longe que um mês.
export const useAnticipatePayment = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => (await api.post('/billing/me/anticipate')).data.data,
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['billing', 'me'] }),
    onError:    (err) => toast.error(err.response?.data?.error?.message || 'Erro ao antecipar pagamento'),
  })
}
