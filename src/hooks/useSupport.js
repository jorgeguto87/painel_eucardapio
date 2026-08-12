import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../config/api'
import toast from 'react-hot-toast'

const errMsg = (err, fallback) => err.response?.data?.error?.message || fallback

// POST /api/support/contact
export const useContactSupport = () =>
  useMutation({
    mutationFn: (payload) => api.post('/support/contact', payload),
    onSuccess: () => toast.success('Mensagem enviada! Nosso suporte vai te responder por e-mail.'),
    onError: (err) => toast.error(errMsg(err, 'Erro ao enviar mensagem. Tente novamente.')),
  })
