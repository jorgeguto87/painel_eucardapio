import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../config/api'
import toast from 'react-hot-toast'

const errMsg = (err, fallback) => err.response?.data?.error?.message || fallback

export const useBanners = () =>
  useQuery({
    queryKey: ['banners'],
    queryFn:  async () => (await api.get('/banners')).data.data,
  })

export const useCreateBanner = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload) => api.post('/banners', payload),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['banners'] }); toast.success('Banner criado!') },
    onError:    (err) => toast.error(errMsg(err, 'Erro ao criar banner')),
  })
}

export const useUpdateBanner = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...payload }) => api.patch(`/banners/${id}`, payload),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['banners'] }); toast.success('Banner atualizado!') },
    onError:    (err) => toast.error(errMsg(err, 'Erro ao atualizar banner')),
  })
}

export const useDeleteBanner = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => api.delete(`/banners/${id}`),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['banners'] }); toast.success('Banner removido!') },
    onError:    (err) => toast.error(errMsg(err, 'Erro ao remover banner')),
  })
}
