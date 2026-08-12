import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../config/api'
import toast from 'react-hot-toast'

export const useProducts = () =>
  useQuery({
    queryKey: ['products'],
    queryFn:  async () => {
      const { data } = await api.get('/products')
      return data.data // objeto agrupado por categoria
    },
  })

// Categorias já cadastradas pelo restaurante — usado para sugerir no
// formulário de produto em vez do operador digitar toda vez.
export const useProductCategories = () =>
  useQuery({
    queryKey: ['products', 'categories'],
    queryFn:  async () => (await api.get('/products/categories')).data.data,
  })

export const useCreateProduct = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload) => api.post('/products', payload),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['products'] }); toast.success('Produto criado!') },
    onError:    (err) => toast.error(err.response?.data?.error?.message || 'Erro ao criar'),
  })
}

export const useUpdateProduct = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...payload }) => api.patch(`/products/${id}`, payload),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['products'] }); toast.success('Produto atualizado!') },
    onError:    (err) => toast.error(err.response?.data?.error?.message || 'Erro ao atualizar'),
  })
}

export const useToggleProduct = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => api.patch(`/products/${id}/availability`),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['products'] }),
    onError:    (err) => toast.error(err.response?.data?.error?.message || 'Erro'),
  })
}

export const useDeleteProduct = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => api.delete(`/products/${id}`),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['products'] }); toast.success('Produto removido!') },
    onError:    (err) => toast.error(err.response?.data?.error?.message || 'Erro ao remover'),
  })
}
