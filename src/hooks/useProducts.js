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

export const useCreateCategory = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (name) => api.post('/products/categories', { name }),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['products'] }); toast.success('Categoria criada!') },
    onError:    (err) => toast.error(err.response?.data?.error?.message || 'Erro ao criar categoria'),
  })
}

// Reordena sem "piscar" a tela — atualiza a lista local na hora (optimistic
// update), sem esperar o servidor confirmar. Se der erro, o React Query
// naturalmente vai buscar de novo e corrigir a ordem na próxima sincronização.
export const useReorderCategories = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (items) => api.patch('/products/categories/reorder', { items }),
    onError:    (err) => toast.error(err.response?.data?.error?.message || 'Erro ao reordenar'),
    onSettled:  () => qc.invalidateQueries({ queryKey: ['products'] }),
  })
}

export const useReorderProducts = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (items) => api.patch('/products/reorder', { items }),
    onError:    (err) => toast.error(err.response?.data?.error?.message || 'Erro ao reordenar'),
    onSettled:  () => qc.invalidateQueries({ queryKey: ['products'] }),
  })
}

// ── Grupos de variação ──────────────────────────────────────────────────

export const useVariantGroups = () =>
  useQuery({
    queryKey: ['variant-groups'],
    queryFn:  async () => (await api.get('/products/variant-groups')).data.data,
  })

export const useCreateVariantGroup = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload) => api.post('/products/variant-groups', payload),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['variant-groups'] }); toast.success('Grupo de variação criado!') },
    onError:    (err) => toast.error(err.response?.data?.error?.message || 'Erro ao criar grupo'),
  })
}

export const useUpdateVariantGroup = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...payload }) => api.patch(`/products/variant-groups/${id}`, payload),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['variant-groups'] }),
    onError:    (err) => toast.error(err.response?.data?.error?.message || 'Erro ao atualizar grupo'),
  })
}

export const useDeleteVariantGroup = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => api.delete(`/products/variant-groups/${id}`),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['variant-groups'] }); qc.invalidateQueries({ queryKey: ['products'] }) },
    onError:    (err) => toast.error(err.response?.data?.error?.message || 'Erro ao apagar grupo'),
  })
}
