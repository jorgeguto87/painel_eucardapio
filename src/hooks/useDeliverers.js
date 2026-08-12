import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../config/api'
import toast from 'react-hot-toast'

export const useDeliverers = () =>
  useQuery({
    queryKey: ['deliverers'],
    queryFn:  async () => {
      const { data } = await api.get('/deliverers')
      return data.data || []
    },
  })

export const useCreateDeliverer = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload) => api.post('/deliverers', payload),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['deliverers'] }); toast.success('Entregador cadastrado!') },
    onError:    (err) => toast.error(err.response?.data?.error?.message || 'Erro ao cadastrar'),
  })
}

export const useUpdateDeliverer = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...payload }) => api.patch(`/deliverers/${id}`, payload),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['deliverers'] }); toast.success('Entregador atualizado!') },
    onError:    (err) => toast.error(err.response?.data?.error?.message || 'Erro ao atualizar'),
  })
}

export const useToggleDelivererStatus = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }) => api.patch(`/deliverers/${id}/status`, { status }),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['deliverers'] }),
    onError:    (err) => toast.error(err.response?.data?.error?.message || 'Erro ao atualizar status'),
  })
}

/**
 * Exclui um entregador definitivamente. Bloqueado pelo backend se o
 * entregador já tiver pedidos no histórico (usar desativar nesse caso).
 */
export const useDeleteDeliverer = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => api.delete(`/deliverers/${id}`),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['deliverers'] }); toast.success('Entregador excluído!') },
    onError:    (err) => toast.error(err.response?.data?.error?.message || 'Erro ao excluir entregador'),
  })
}
