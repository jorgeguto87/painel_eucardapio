import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import api from '../config/api'

export const PRINTER_ROLES = {
  BALCAO:  'balcao',
  COZINHA: 'cozinha',
  ENTREGA: 'entrega',
}

export const PRINTER_ROLE_LABELS = {
  [PRINTER_ROLES.BALCAO]:  'Balcão',
  [PRINTER_ROLES.COZINHA]: 'Cozinha',
  [PRINTER_ROLES.ENTREGA]: 'Entrega',
}

/**
 * Status do "Eu Cardápio Print" — se está pareado, quando foi visto pela
 * última vez, quais impressoras o programinha reportou e quais papéis
 * estão marcados pra impressão automática. Polling curto só quando a tela
 * de Configurações → Impressoras está aberta (pareamento é uma ação ao
 * vivo, o restaurante fica olhando o código funcionar).
 */
export const usePrintAgentStatus = ({ poll = false } = {}) =>
  useQuery({
    queryKey: ['print-agent', 'status'],
    queryFn:  async () => (await api.get('/print-agent/status')).data.data,
    refetchInterval: poll ? 5000 : 60000,
  })

/**
 * Gera (ou renova) o código de pareamento — o restaurante digita esse
 * código uma única vez dentro do programinha recém-instalado.
 */
export const useGeneratePairingCode = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.post('/print-agent/pairing-code'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['print-agent', 'status'] }),
    onError:   (err) => toast.error(err.response?.data?.error?.message || 'Erro ao gerar código.'),
  })
}

/**
 * Define quais papéis (balcão/cozinha/entrega) imprimem sozinhos a cada
 * pedido novo — usado tanto em Configurações → Impressoras quanto no
 * atalho rápido no topo da tela de Pedidos.
 */
export const useSetAutoPrintRoles = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (roles) => api.patch('/print-agent/auto-print', { roles }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['print-agent', 'status'] }),
    onError:   (err) => toast.error(err.response?.data?.error?.message || 'Erro ao salvar impressão automática.'),
  })
}

/**
 * Reimpressão manual de um pedido — o painel manda os papéis marcados
 * (um, vários ou todos os cadastrados). Quem de fato imprime é o
 * programinha, por polling; se estiver offline, fica na fila até voltar.
 */
export const usePrintOrder = () => {
  return useMutation({
    mutationFn: ({ orderId, roles }) => api.patch(`/orders/${orderId}/print`, { roles }),
    onSuccess: () => toast.success('Enviado para impressão!'),
    onError:   (err) => toast.error(err.response?.data?.error?.message || 'Erro ao enviar para impressão.'),
  })
}
