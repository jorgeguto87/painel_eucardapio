import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../config/api'
import toast from 'react-hot-toast'

export const useWhatsappStatus = (options = {}) =>
  useQuery({
    queryKey:       ['whatsapp', 'status'],
    queryFn:        async () => {
      const { data } = await api.get('/whatsapp/status')
      return data.data
    },
    // Só é um badge decorativo na maioria das telas — no Dashboard não
    // precisa atualizar rápido o tempo todo (isso só sobrecarregava sessão
    // à toa). A tela de WhatsApp em si pede o ritmo rápido explicitamente.
    refetchInterval: options.refetchInterval ?? 5 * 60_000, // 5 min por padrão
  })

export const useQRCode = (enabled) =>
  useQuery({
    queryKey:       ['whatsapp', 'qrcode'],
    queryFn:        async () => {
      const { data } = await api.get('/whatsapp/qrcode')
      return data.data
    },
    enabled,
    refetchInterval: 20000, // QR code expira em ~60s, renova a cada 20s
  })

export const useConnectWhatsapp = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.post('/whatsapp/connect'),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['whatsapp'] }),
    onError:    (err) => toast.error(err.response?.data?.error?.message || 'Erro ao conectar'),
  })
}

export const useDisconnectWhatsapp = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.post('/whatsapp/disconnect'),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['whatsapp'] }); toast.success('WhatsApp desconectado') },
    onError:    (err) => toast.error(err.response?.data?.error?.message || 'Erro ao desconectar'),
  })
}
