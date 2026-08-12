import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../config/api'
import toast from 'react-hot-toast'

const errMsg = (err, fallback) => err.response?.data?.error?.message || fallback

// ─── Categorias de opcionais ────────────────────────────────────────────────

export const useOpcionalCategorias = () =>
  useQuery({ queryKey: ['addons', 'opcional-categorias'], queryFn: async () => (await api.get('/addons/opcional-categorias')).data.data })

export const useCreateOpcionalCategoria = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload) => api.post('/addons/opcional-categorias', payload),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['addons', 'opcional-categorias'] }); toast.success('Categoria criada!') },
    onError: (err) => toast.error(errMsg(err, 'Erro ao criar categoria')),
  })
}

export const useUpdateOpcionalCategoria = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...payload }) => api.patch(`/addons/opcional-categorias/${id}`, payload),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['addons', 'opcional-categorias'] }); toast.success('Categoria atualizada!') },
    onError: (err) => toast.error(errMsg(err, 'Erro ao atualizar categoria')),
  })
}

export const useDeleteOpcionalCategoria = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => api.delete(`/addons/opcional-categorias/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['addons', 'opcional-categorias'] })
      qc.invalidateQueries({ queryKey: ['addons', 'opcionais'] })
      toast.success('Categoria excluída.')
    },
    onError: (err) => toast.error(errMsg(err, 'Erro ao excluir categoria')),
  })
}

// ─── Opcionais ──────────────────────────────────────────────────────────────

export const useOpcionais = () =>
  useQuery({ queryKey: ['addons', 'opcionais'], queryFn: async () => (await api.get('/addons/opcionais')).data.data })

export const useCreateOpcional = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload) => api.post('/addons/opcionais', payload),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['addons', 'opcionais'] }); toast.success('Opcional criado!') },
    onError: (err) => toast.error(errMsg(err, 'Erro ao criar opcional')),
  })
}

export const useUpdateOpcional = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...payload }) => api.patch(`/addons/opcionais/${id}`, payload),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['addons', 'opcionais'] }); toast.success('Opcional atualizado!') },
    onError: (err) => toast.error(errMsg(err, 'Erro ao atualizar opcional')),
  })
}

export const useDeleteOpcional = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => api.delete(`/addons/opcionais/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['addons', 'opcionais'] })
      qc.invalidateQueries({ queryKey: ['products'] })
      toast.success('Opcional excluído.')
    },
    onError: (err) => toast.error(errMsg(err, 'Erro ao excluir opcional')),
  })
}

// ─── Categorias de adicionais ───────────────────────────────────────────────

export const useAdicionalCategorias = () =>
  useQuery({ queryKey: ['addons', 'adicional-categorias'], queryFn: async () => (await api.get('/addons/adicional-categorias')).data.data })

export const useCreateAdicionalCategoria = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload) => api.post('/addons/adicional-categorias', payload),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['addons', 'adicional-categorias'] }); toast.success('Categoria criada!') },
    onError: (err) => toast.error(errMsg(err, 'Erro ao criar categoria')),
  })
}

export const useUpdateAdicionalCategoria = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...payload }) => api.patch(`/addons/adicional-categorias/${id}`, payload),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['addons', 'adicional-categorias'] }); toast.success('Categoria atualizada!') },
    onError: (err) => toast.error(errMsg(err, 'Erro ao atualizar categoria')),
  })
}

export const useDeleteAdicionalCategoria = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => api.delete(`/addons/adicional-categorias/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['addons', 'adicional-categorias'] })
      qc.invalidateQueries({ queryKey: ['addons', 'adicionais'] })
      toast.success('Categoria excluída.')
    },
    onError: (err) => toast.error(errMsg(err, 'Erro ao excluir categoria')),
  })
}

// ─── Adicionais ─────────────────────────────────────────────────────────────

export const useAdicionais = () =>
  useQuery({ queryKey: ['addons', 'adicionais'], queryFn: async () => (await api.get('/addons/adicionais')).data.data })

export const useCreateAdicional = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload) => api.post('/addons/adicionais', payload),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['addons', 'adicionais'] }); toast.success('Adicional criado!') },
    onError: (err) => toast.error(errMsg(err, 'Erro ao criar adicional')),
  })
}

export const useUpdateAdicional = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...payload }) => api.patch(`/addons/adicionais/${id}`, payload),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['addons', 'adicionais'] }); toast.success('Adicional atualizado!') },
    onError: (err) => toast.error(errMsg(err, 'Erro ao atualizar adicional')),
  })
}

export const useDeleteAdicional = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => api.delete(`/addons/adicionais/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['addons', 'adicionais'] })
      qc.invalidateQueries({ queryKey: ['products'] })
      toast.success('Adicional excluído.')
    },
    onError: (err) => toast.error(errMsg(err, 'Erro ao excluir adicional')),
  })
}

// ─── Favoritos ──────────────────────────────────────────────────────────────

export const useFavoritos = () =>
  useQuery({ queryKey: ['addons', 'favoritos'], queryFn: async () => (await api.get('/addons/favoritos')).data.data })

export const useCreateFavorito = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload) => api.post('/addons/favoritos', payload),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['addons', 'favoritos'] }); toast.success('Favorito salvo!') },
    onError: (err) => toast.error(errMsg(err, 'Erro ao salvar favorito')),
  })
}

export const useUpdateFavorito = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...payload }) => api.patch(`/addons/favoritos/${id}`, payload),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['addons', 'favoritos'] }); toast.success('Favorito atualizado!') },
    onError: (err) => toast.error(errMsg(err, 'Erro ao atualizar favorito')),
  })
}

export const useDeleteFavorito = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => api.delete(`/addons/favoritos/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['addons', 'favoritos'] }); toast.success('Favorito excluído.') },
    onError: (err) => toast.error(errMsg(err, 'Erro ao excluir favorito')),
  })
}
