import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../config/api'
import toast from 'react-hot-toast'

export const useCustomerAddresses = (customerId) =>
  useQuery({
    queryKey: ['customers', customerId, 'addresses'],
    queryFn:  async () => (await api.get(`/customers/${customerId}/addresses`)).data.data,
    enabled:  !!customerId,
  })

export const useCreateAddress = (customerId) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload) => api.post(`/customers/${customerId}/addresses`, payload),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['customers', customerId, 'addresses'] }); toast.success('Endereço salvo!') },
    onError:    (err) => toast.error(err.response?.data?.error?.message || 'Erro ao salvar endereço'),
  })
}

export const useUpdateAddress = (customerId) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ addressId, ...payload }) => api.patch(`/customers/${customerId}/addresses/${addressId}`, payload),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['customers', customerId, 'addresses'] }); toast.success('Endereço atualizado!') },
    onError:    (err) => toast.error(err.response?.data?.error?.message || 'Erro ao atualizar'),
  })
}

export const useDeleteAddress = (customerId) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (addressId) => api.delete(`/customers/${customerId}/addresses/${addressId}`),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['customers', customerId, 'addresses'] }); toast.success('Endereço removido!') },
    onError:    (err) => toast.error(err.response?.data?.error?.message || 'Erro ao remover'),
  })
}

export const useSetDefaultAddress = (customerId) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (addressId) => api.patch(`/customers/${customerId}/addresses/${addressId}/default`),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['customers', customerId, 'addresses'] }); toast.success('Endereço principal atualizado!') },
    onError:    (err) => toast.error(err.response?.data?.error?.message || 'Erro ao definir principal'),
  })
}
