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

export const useUpdateCategory = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, name }) => api.patch(`/products/categories/${id}`, { name }),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['products'] }); toast.success('Categoria renomeada!') },
    onError:    (err) => toast.error(err.response?.data?.error?.message || 'Erro ao renomear categoria'),
  })
}

export const useDeleteCategory = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...payload }) => api.delete(`/products/categories/${id}`, { data: payload }),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['products'] }); toast.success('Categoria apagada!') },
    onError:    (err) => toast.error(err.response?.data?.error?.message || 'Erro ao apagar categoria'),
  })
}

export const useDuplicateProduct = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, categories }) => api.post(`/products/${id}/duplicate`, { categories }),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['products'] }); toast.success('Produto duplicado!') },
    onError:    (err) => toast.error(err.response?.data?.error?.message || 'Erro ao duplicar produto'),
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

// Sugestões de grupo de variação pra reaproveitar como MODELO (nome do
// grupo + nome das opções, nunca preço) — não existe mais coleção própria
// de grupo, isso é só um atalho de preenchimento derivado dos produtos
// que já existem.
export const useVariantGroupTemplates = () =>
  useQuery({
    queryKey: ['variant-group-templates'],
    queryFn:  async () => (await api.get('/products/variant-group-templates')).data.data,
  })
