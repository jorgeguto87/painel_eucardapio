import { useQuery } from '@tanstack/react-query'
import api from '../config/api'

/**
 * Avisos enviados pelo admin da plataforma (manutenção, comunicados etc).
 * Polling baixo — não é algo que muda a cada minuto.
 */
export const useNotices = () =>
  useQuery({
    queryKey: ['notices'],
    queryFn:  async () => {
      const { data } = await api.get('/notifications')
      return data.data || []
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
  })