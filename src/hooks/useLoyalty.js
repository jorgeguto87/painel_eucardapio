import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import api from '../config/api'

const errMsg = (err, fallback) => err.response?.data?.error?.message || fallback

// ─── Cupons ─────────────────────────────────────────────────────────────

export const useCoupons = () =>
  useQuery({
    queryKey: ['loyalty', 'coupons'],
    queryFn:  async () => (await api.get('/loyalty/coupons')).data.data,
  })

export const useCreateCoupon = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload) => api.post('/loyalty/coupons', payload),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['loyalty', 'coupons'] }); toast.success('Cupom criado!') },
    onError: (err) => toast.error(errMsg(err, 'Erro ao criar cupom')),
  })
}

export const useUpdateCoupon = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...payload }) => api.patch(`/loyalty/coupons/${id}`, payload),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['loyalty', 'coupons'] }); toast.success('Cupom atualizado!') },
    onError: (err) => toast.error(errMsg(err, 'Erro ao atualizar cupom')),
  })
}

export const useDeleteCoupon = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => api.delete(`/loyalty/coupons/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['loyalty', 'coupons'] }); toast.success('Cupom removido.') },
    onError: (err) => toast.error(errMsg(err, 'Erro ao remover cupom')),
  })
}

// ─── Regras de cashback ───────────────────────────────────────────────────

export const useCashbackRules = () =>
  useQuery({
    queryKey: ['loyalty', 'cashback-rules'],
    queryFn:  async () => (await api.get('/loyalty/cashback-rules')).data.data,
  })

export const useCreateCashbackRule = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload) => api.post('/loyalty/cashback-rules', payload),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['loyalty', 'cashback-rules'] }); toast.success('Regra criada!') },
    onError: (err) => toast.error(errMsg(err, 'Erro ao criar regra')),
  })
}

export const useUpdateCashbackRule = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...payload }) => api.patch(`/loyalty/cashback-rules/${id}`, payload),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['loyalty', 'cashback-rules'] }); toast.success('Regra atualizada!') },
    onError: (err) => toast.error(errMsg(err, 'Erro ao atualizar regra')),
  })
}

export const useDeleteCashbackRule = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => api.delete(`/loyalty/cashback-rules/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['loyalty', 'cashback-rules'] }); toast.success('Regra removida.') },
    onError: (err) => toast.error(errMsg(err, 'Erro ao remover regra')),
  })
}

// ─── Config geral de cashback (validade + empilhamento) ───────────────────

export const useCashbackConfig = () =>
  useQuery({
    queryKey: ['loyalty', 'cashback-config'],
    queryFn:  async () => (await api.get('/loyalty/cashback-config')).data.data,
  })

export const useUpdateCashbackConfig = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload) => api.patch('/loyalty/cashback-config', payload),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['loyalty', 'cashback-config'] }); toast.success('Configuração salva!') },
    onError: (err) => toast.error(errMsg(err, 'Erro ao salvar configuração')),
  })
}
