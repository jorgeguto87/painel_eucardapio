import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import TopBar from '../../components/layout/TopBar'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import api from '../../config/api'
import useAuthStore from '../../stores/authStore'

const DAY_LABELS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']

const useHours = () =>
  useQuery({
    queryKey: ['bot', 'hours'],
    queryFn:  async () => (await api.get('/bot/hours')).data.data,
  })

const useUpdateHours = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (hours) => api.put('/bot/hours', { hours }),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['bot', 'hours'] }); toast.success('Horários salvos!') },
    onError:    (err) => toast.error(err.response?.data?.error?.message || 'Erro ao salvar.'),
  })
}

export default function BusinessHoursPage() {
  const { data, isLoading } = useHours()
  const update = useUpdateHours()
  const [hours, setHours] = useState(null)
  // O servidor só deixa ADMIN alterar horários (PUT /bot/hours) — equipe
  // (operator) só visualiza, igual ao resto das configurações.
  const canEdit = useAuthStore((s) => s.user?.role) !== 'operator'

  useEffect(() => { if (data) setHours(data) }, [data])

  if (isLoading || !hours) return <LoadingSpinner />

  const updateDay = (dayOfWeek, field, value) => {
    if (!canEdit) return
    setHours((prev) => prev.map((h) => h.dayOfWeek === dayOfWeek ? { ...h, [field]: value } : h))
  }

  const handleSave = () => update.mutate(hours)

  return (
    <div>
      <TopBar title="Horário de funcionamento" back />

      <div className="page space-y-3">
        {!canEdit && (
          <p className="text-xs text-gray-500 bg-gray-100 rounded-lg px-3 py-2">
            Somente o administrador do restaurante pode alterar os horários.
          </p>
        )}
        <p className="text-xs text-gray-400">
          Se o horário de fechamento for menor que o de abertura (ex: 18:00 até 02:00), o restaurante fica aberto até de madrugada do dia seguinte.
        </p>
        {hours
          .slice()
          .sort((a, b) => a.dayOfWeek - b.dayOfWeek)
          .map((day) => (
            <Card key={day.dayOfWeek}>
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-sm">{DAY_LABELS[day.dayOfWeek]}</span>
                <button
                  type="button"
                  disabled={!canEdit}
                  onClick={() => updateDay(day.dayOfWeek, 'isOpen', !day.isOpen)}
                  className={`relative w-11 h-6 rounded-full transition-colors disabled:opacity-60 ${day.isOpen ? 'bg-success' : 'bg-gray-300'}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${day.isOpen ? 'translate-x-5' : ''}`} />
                </button>
              </div>

              {day.isOpen && (
                <div className="flex items-center gap-2">
                  <input
                    type="time"
                    className="input flex-1"
                    disabled={!canEdit}
                    value={day.openTime}
                    onChange={(e) => updateDay(day.dayOfWeek, 'openTime', e.target.value)}
                  />
                  <span className="text-gray-400 text-sm">até</span>
                  <input
                    type="time"
                    className="input flex-1"
                    disabled={!canEdit}
                    value={day.closeTime}
                    onChange={(e) => updateDay(day.dayOfWeek, 'closeTime', e.target.value)}
                  />
                </div>
              )}
            </Card>
          ))}

        {canEdit && (
          <Button full onClick={handleSave} loading={update.isPending} className="mt-2">
            Salvar horários
          </Button>
        )}
      </div>
    </div>
  )
}
