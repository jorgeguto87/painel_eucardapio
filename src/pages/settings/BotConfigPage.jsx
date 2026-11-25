import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import TopBar from '../../components/layout/TopBar'
import Button from '../../components/ui/Button'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import ImageUploadField from '../../components/media/ImageUploadField'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../config/api'
import useUnsavedChangesGuard from '../../hooks/useUnsavedChangesGuard'

const useBotConfig = () =>
  useQuery({
    queryKey: ['bot', 'config'],
    queryFn:  async () => (await api.get('/bot/config')).data.data,
  })

const useUpdateBotConfig = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload) => api.put('/bot/config', payload),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['bot', 'config'] }); toast.success('Configuração salva!') },
    onError:    () => toast.error('Erro ao salvar.'),
  })
}

// O menu principal do bot (1-Fazer pedido, 2-Acompanhar pedido, 3-Cardápio,
// 4-Falar com atendente) é fixo e não é mais editável aqui — evita
// configuração incorreta de qual opção dispara qual fluxo. O link do
// cardápio também é automático (gerado pelo slug do restaurante).
const TEXT_FIELDS = [
  { key: 'welcomeMessage', label: 'Mensagem de boas-vindas', hint: 'Enviada junto com a imagem abaixo, na primeira mensagem do cliente.' },
  { key: 'awayMessage',    label: 'Mensagem fora do horário' },
  { key: 'openingMessage', label: 'Mensagem de abertura' },
]

export default function BotConfigPage() {
  const { data: config, isLoading } = useBotConfig()
  const update = useUpdateBotConfig()

  const [form, setForm] = useState(null)
  const navigate = useNavigate()

  useEffect(() => { if (config) setForm(config) }, [config])

  // Alterações não salvas (textos e imagem de boas-vindas) — avisa antes de sair.
  const pick = (v) => JSON.stringify({
    welcomeMessage: v?.welcomeMessage || '',
    welcomeImageBase64: v?.welcomeImageBase64 || null,
    awayMessage: v?.awayMessage || '',
    openingMessage: v?.openingMessage || '',
    isActive: v?.isActive !== false,
  })
  const isDirty = !!form && !!config && pick(form) !== pick(config)
  const confirmLeave = useUnsavedChangesGuard(isDirty)

  if (isLoading || !form) return <LoadingSpinner />

  const handleChange = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const handleSubmit = (e) => {
    e.preventDefault()
    update.mutate({
      welcomeMessage:     form.welcomeMessage,
      welcomeImageBase64: form.welcomeImageBase64 || null,
      awayMessage:        form.awayMessage,
      openingMessage:     form.openingMessage,
      isActive:           form.isActive !== false,
    })
  }

  return (
    <div>
      <TopBar title="Mensagens do bot" back onBack={() => { if (confirmLeave()) navigate(-1) }} />

      <form onSubmit={handleSubmit} className="page space-y-4">
        <div className={`rounded-2xl border p-4 ${form.isActive !== false ? 'border-success/30 bg-success/5' : 'border-gray-200 bg-white'}`}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-semibold text-sm text-secondary">Robô atende os clientes</p>
              <p className="text-xs text-gray-500 mt-0.5">{form.isActive !== false ? 'Ligado: responde no WhatsApp com o menu, o link do cardápio e o status do pedido.' : 'Desligado: o robô não responde mensagens.'}</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={form.isActive !== false}
              aria-label="Robô atende os clientes"
              onClick={() => setForm((f) => ({ ...f, isActive: f.isActive === false }))}
              className={`relative w-11 h-6 flex-shrink-0 rounded-full transition-colors ${form.isActive !== false ? 'bg-success' : 'bg-gray-300'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.isActive !== false ? 'translate-x-5' : ''}`} />
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-3 leading-relaxed bg-white/70 rounded-xl px-3 py-2">
            Mesmo desligado, o WhatsApp continua enviando o <b>código de acesso</b> dos clientes, o <b>status dos pedidos</b>, as <b>mensagens dos entregadores</b> e recebendo os <b>comprovantes de Pix</b>. Por isso ele precisa estar sempre conectado.
          </p>
        </div>

        <ImageUploadField
          label="Imagem de boas-vindas (enviada no 1º contato do cliente)"
          imageBase64={form.welcomeImageBase64}
          imageUrl={null}
          onChange={({ imageBase64 }) => setForm((f) => ({ ...f, welcomeImageBase64: imageBase64 }))}
        />

        {TEXT_FIELDS.map(({ key, label, hint }) => (
          <div key={key}>
            <label className="label">{label}</label>
            <textarea
              className="input min-h-[90px] py-3"
              value={form[key] || ''}
              onChange={handleChange(key)}
            />
            {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
          </div>
        ))}

        <div className="bg-bg rounded-xl p-3 text-xs text-gray-500 leading-relaxed">
          <p className="font-medium text-secondary mb-1">Menu principal (fixo)</p>
          1️⃣ Fazer pedido → manda o link do cardápio digital<br />
          2️⃣ Acompanhar pedido → mostra o status do último pedido<br />
          3️⃣ Ver cardápio → manda o link do cardápio digital<br />
          4️⃣ Falar com atendente
        </div>

        <Button type="submit" full loading={update.isPending}>Salvar</Button>
      </form>
    </div>
  )
}
