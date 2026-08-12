import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../config/api'
import toast from 'react-hot-toast'

const errMsg = (err, fallback) => err.response?.data?.error?.message || fallback

// GET /api/users
export const useTeam = () =>
  useQuery({
    queryKey: ['users', 'team'],
    queryFn: async () => (await api.get('/users')).data,
  })

// POST /api/users
export const useCreateTeamMember = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload) => api.post('/users', payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users', 'team'] })
      toast.success('Usuário adicionado!')
    },
    onError: (err) => toast.error(errMsg(err, 'Erro ao adicionar usuário')),
  })
}

// PATCH /api/users/:id
export const useUpdateTeamMember = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...payload }) => api.patch(`/users/${id}`, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users', 'team'] })
      toast.success('Usuário atualizado!')
    },
    onError: (err) => toast.error(errMsg(err, 'Erro ao atualizar usuário')),
  })
}

// DELETE /api/users/:id (exclui de verdade — libera o e-mail pra reuso)
export const useDeactivateTeamMember = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => api.delete(`/users/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users', 'team'] })
      toast.success('Usuário excluído.')
    },
    onError: (err) => toast.error(errMsg(err, 'Erro ao excluir usuário')),
  })
}

// Editar o PRÓPRIO perfil (nome, e opcionalmente e-mail com senha atual)
export const useUpdateMyProfile = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...payload }) => api.patch(`/users/${id}`, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['auth', 'me'] })
      toast.success('Perfil atualizado!')
    },
    onError: (err) => toast.error(errMsg(err, 'Erro ao atualizar perfil')),
  })
}
