import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../config/api'
import toast from 'react-hot-toast'

export const useOrders = (status) =>
  useQuery({
    queryKey: ['orders', status],
    queryFn:  async () => {
      const params = status ? { status } : {}
      const { data } = await api.get('/orders', { params })
      return data
    },
    refetchInterval: 30000, // polling a cada 30s
  })

export const useOrder = (id) =>
  useQuery({
    queryKey: ['orders', id],
    queryFn:  async () => {
      const { data } = await api.get(`/orders/${id}`)
      return data.data
    },
    enabled: !!id,
    refetchInterval: 15000, // pra refletir mudanças feitas pelo entregador via WhatsApp
  })

export const useUpdateOrderStatus = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }) => api.patch(`/orders/${id}/status`, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders'] })
      toast.success('Status atualizado!')
    },
    onError: (err) => toast.error(err.response?.data?.error?.message || 'Erro ao atualizar'),
  })
}

/**
 * Cancela o pedido — usado, por exemplo, quando o cliente pede cancelamento
 * numa conversa com o atendente.
 */
export const useCancelOrder = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => api.patch(`/orders/${id}/status`, { status: 'cancelado' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders'] })
      toast.success('Pedido cancelado.')
    },
    onError: (err) => toast.error(err.response?.data?.error?.message || 'Erro ao cancelar pedido'),
  })
}

/**
 * Atribui um entregador a um pedido — vai pro final da fila dele (não envia
 * WhatsApp imediatamente, isso é uma ação separada — ver useSendDelivererQueue).
 */
export const useAssignDeliverer = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ orderId, delivererId }) => api.patch(`/orders/${orderId}/assign-deliverer`, { delivererId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders'] })
      qc.invalidateQueries({ queryKey: ['deliverer-queue'] })
      toast.success('Adicionado à fila do entregador!')
    },
    onError: (err) => toast.error(err.response?.data?.error?.message || 'Erro ao atribuir entregador'),
  })
}

/**
 * Remove o pedido da fila de entrega sem transferir pra ninguém (ex: cliente
 * cancelou, ou o entregador não conseguiu entregar e voltou com o pedido).
 */
export const useRemoveDeliverer = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (orderId) => api.patch(`/orders/${orderId}/remove-deliverer`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders'] })
      qc.invalidateQueries({ queryKey: ['deliverer-queue'] })
      toast.success('Removido da fila de entrega.')
    },
    onError: (err) => toast.error(err.response?.data?.error?.message || 'Erro ao remover'),
  })
}

/**
 * Transfere o pedido para outro entregador — some da fila do antigo, vai
 * pro final da fila do novo.
 */
export const useTransferDeliverer = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ orderId, delivererId }) => api.patch(`/orders/${orderId}/transfer-deliverer`, { delivererId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders'] })
      qc.invalidateQueries({ queryKey: ['deliverer-queue'] })
      toast.success('Pedido transferido!')
    },
    onError: (err) => toast.error(err.response?.data?.error?.message || 'Erro ao transferir'),
  })
}

/**
 * Histórico de entregas do entregador — mesmo drill-down do relatório de
 * faturamento (Mês → Semana → Dia), nunca uma lista infinita.
 */
export const useDelivererHistoryMonths = (delivererId) =>
  useQuery({
    queryKey: ['deliverer-history-months', delivererId],
    queryFn:  async () => (await api.get(`/orders/deliverer/${delivererId}/history/months`)).data.data.months,
    enabled: !!delivererId,
  })

export const useDelivererHistoryWeeks = (delivererId, month) =>
  useQuery({
    queryKey: ['deliverer-history-weeks', delivererId, month],
    queryFn:  async () => (await api.get(`/orders/deliverer/${delivererId}/history/weeks`, { params: { month } })).data.data.weeks,
    enabled: !!delivererId && !!month,
  })

export const useDelivererHistoryDays = (delivererId, from, to) =>
  useQuery({
    queryKey: ['deliverer-history-days', delivererId, from, to],
    queryFn:  async () => (await api.get(`/orders/deliverer/${delivererId}/history/days`, {
      params: { from: new Date(from).toISOString(), to: new Date(to).toISOString() },
    })).data.data.days,
    enabled: !!delivererId && !!from && !!to,
  })

export const useDelivererHistoryDay = (delivererId, date) =>
  useQuery({
    queryKey: ['deliverer-history-day', delivererId, date],
    queryFn:  async () => (await api.get(`/orders/deliverer/${delivererId}/history/day`, { params: { date } })).data.data,
    enabled: !!delivererId && !!date,
  })

/**
 * Lista a fila de entregas pendentes de um entregador, em ordem.
 */
export const useDelivererQueue = (delivererId) =>
  useQuery({
    queryKey: ['deliverer-queue', delivererId],
    queryFn:  async () => (await api.get(`/orders/queue/${delivererId}`)).data.data,
    enabled: !!delivererId,
    refetchInterval: 15000, // reflete ações do entregador via WhatsApp
  })

/**
 * Reordena a fila de um entregador — orderIds na ordem desejada.
 */
export const useReorderQueue = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ delivererId, orderIds }) => api.patch('/orders/queue/reorder', { delivererId, orderIds }),
    onSuccess: (_, { delivererId }) => qc.invalidateQueries({ queryKey: ['deliverer-queue', delivererId] }),
    onError: (err) => toast.error(err.response?.data?.error?.message || 'Erro ao reordenar'),
  })
}

/**
 * Envia (ou reenvia) a lista numerada de entregas por WhatsApp pro entregador.
 */
export const useSendDelivererQueue = () => {
  return useMutation({
    mutationFn: (delivererId) => api.post(`/orders/queue/${delivererId}/send`),
    onSuccess: (res) => toast.success(`Lista enviada! (${res.data.data.ordersCount} pedido(s))`),
    onError: (err) => toast.error(err.response?.data?.error?.message || 'Erro ao enviar lista'),
  })
}
