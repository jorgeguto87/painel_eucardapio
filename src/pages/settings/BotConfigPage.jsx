import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import TopBar from '../../components/layout/TopBar'
import Button from '../../components/ui/Button'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import ImageUploadField from '../../components/media/ImageUploadField'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../config/api'

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

  useEffect(() => { if (config) setForm(config) }, [config])

  if (isLoading || !form) return <LoadingSpinner />

  const handleChange = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const handleSubmit = (e) => {
    e.preventDefault()
    update.mutate({
      welcomeMessage:     form.welcomeMessage,
      welcomeImageBase64: form.welcomeImageBase64 || null,
      awayMessage:        form.awayMessage,
      openingMessage:     form.openingMessage,
    })
  }

  return (
    <div>
      <TopBar title="Mensagens do bot" back />

      <form onSubmit={handleSubmit} className="page space-y-4">
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
