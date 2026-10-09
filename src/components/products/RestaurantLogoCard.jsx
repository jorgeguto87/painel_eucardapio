import { useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ImagePlus, RefreshCw, Trash2, Store } from 'lucide-react'
import Card from '../ui/Card'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import api from '../../config/api'
import { fileToBase64 } from '../../utils/imageUpload'

/**
 * Logo do restaurante na aba Cardápio.
 *
 * É a MESMA imagem de boas-vindas das Mensagens do bot (BotConfig.
 * welcomeImageBase64) — o cardápio digital já usa ela como logo. Por isso
 * fica tudo sincronizado: enviou lá, aparece aqui; trocou aqui, muda lá.
 * Salva na hora (sem botão "Salvar"), só esse campo.
 */
export default function RestaurantLogoCard() {
  const qc = useQueryClient()
  const inputRef = useRef(null)
  const [confirmarRemocao, setConfirmarRemocao] = useState(false)

  // Mesma queryKey da página Mensagens do bot — as duas telas se atualizam juntas.
  const { data: config, isLoading } = useQuery({
    queryKey: ['bot', 'config'],
    queryFn: async () => (await api.get('/bot/config')).data.data,
  })

  const salvar = useMutation({
    mutationFn: (welcomeImageBase64) => api.put('/bot/config', { welcomeImageBase64 }),
    onSuccess: (_res, valor) => {
      qc.invalidateQueries({ queryKey: ['bot', 'config'] })
      toast.success(valor ? 'Logo atualizada!' : 'Logo removida.')
    },
    onError: (err) => toast.error(err.response?.data?.error?.message || 'Erro ao salvar a logo.'),
  })

  const logo = config?.welcomeImageBase64 || config?.logoUrl || null
  const temLogo = !!logo

  const handleFile = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const base64 = await fileToBase64(file)
      salvar.mutate(base64)
    } catch (err) {
      toast.error(err.message)
    }
  }

  const remover = () => {
    setConfirmarRemocao(false)
    salvar.mutate(null)
  }

  return (
    <Card className="mb-4">
      <div className="flex items-center gap-3">
        <div className="w-16 h-16 rounded-2xl bg-bg flex items-center justify-center overflow-hidden flex-shrink-0 border border-gray-100">
          {isLoading ? null : temLogo
            ? <img src={logo} alt="Logo do restaurante" className="w-full h-full object-cover" />
            : <Store size={22} className="text-gray-300" />}
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm">Logo do restaurante</p>
          <p className="text-xs text-gray-400 leading-snug">
            {temLogo
              ? 'Aparece no cardápio digital e na 1ª mensagem do bot.'
              : 'Ainda sem logo. Ela aparece no cardápio digital e na 1ª mensagem do bot.'}
          </p>
        </div>
      </div>

      <div className="flex gap-2 mt-3">
        <button
          type="button"
          disabled={salvar.isPending || isLoading}
          onClick={() => inputRef.current?.click()}
          className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold py-2.5 rounded-xl bg-primary/10 text-primary hover:bg-primary/15 transition-colors cursor-pointer disabled:opacity-50"
        >
          {temLogo ? <RefreshCw size={14} /> : <ImagePlus size={14} />}
          {salvar.isPending ? 'Salvando...' : temLogo ? 'Trocar logo' : 'Enviar logo'}
        </button>
        {temLogo && (
          <button
            type="button"
            disabled={salvar.isPending}
            onClick={() => setConfirmarRemocao(true)}
            className="flex items-center justify-center gap-1.5 text-xs font-medium px-3 py-2.5 rounded-xl bg-bg text-gray-500 hover:text-danger transition-colors cursor-pointer disabled:opacity-50"
          >
            <Trash2 size={14} /> Remover
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        onChange={handleFile}
      />

      <Modal open={confirmarRemocao} onClose={() => setConfirmarRemocao(false)} title="Remover logo?">
        <p className="text-sm text-gray-600 mb-4">
          A logo sai do cardápio digital e a 1ª mensagem do bot passa a ir sem imagem.
        </p>
        <div className="flex gap-2">
          <Button variant="secondary" full onClick={() => setConfirmarRemocao(false)}>Cancelar</Button>
          <Button variant="danger" full onClick={remover}>Remover</Button>
        </div>
      </Modal>
    </Card>
  )
}
