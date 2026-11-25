import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { Plus, X, Copy } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import TopBar from '../../components/layout/TopBar'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import api from '../../config/api'
import useAuthStore from '../../stores/authStore'

const DAY_LABELS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
const MAX_SHIFTS = 3
const toMin = (t) => Number(String(t).slice(0, 2)) * 60 + Number(String(t).slice(3, 5))
const range = (s) => { const o = toMin(s.open), c = toMin(s.close); return [o, c > o ? c : 1440] }

// Mesma regra do servidor: turnos do mesmo dia não podem se sobrepor.
const dayError = (day) => {
  if (!day.isOpen) return null
  if (day.shifts.some((s) => !s.open || !s.close)) return 'Preencha o horário de cada turno.'
  const r = day.shifts.map(range).sort((a, b) => a[0] - b[0])
  for (let i = 1; i < r.length; i++) if (r[i][0] < r[i - 1][1]) return 'Os turnos estão se sobrepondo.'
  return null
}

const useHours = () => useQuery({ queryKey: ['bot', 'hours'], queryFn: async () => (await api.get('/bot/hours')).data.data })

const useUpdateHours = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (hours) => api.put('/bot/hours', { hours }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['bot', 'hours'] }); toast.success('Horários salvos!') },
    onError: (err) => toast.error(err.response?.data?.error?.message || 'Erro ao salvar.'),
  })
}

export default function BusinessHoursPage() {
  const { data, isLoading } = useHours()
  const update = useUpdateHours()
  const [hours, setHours] = useState(null)
  const [copyFrom, setCopyFrom] = useState(null)
  const [copyTo, setCopyTo] = useState([])
  // O servidor só deixa ADMIN alterar horários — equipe (operator) só visualiza.
  const canEdit = useAuthStore((s) => s.user?.role) !== 'operator'

  useEffect(() => {
    if (data) {
      setHours(data.map((d) => ({
        dayOfWeek: d.dayOfWeek,
        isOpen: !!d.isOpen,
        shifts: d.shifts?.length ? d.shifts.map((s) => ({ open: s.open, close: s.close })) : [{ open: d.openTime || '08:00', close: d.closeTime || '22:00' }],
      })).sort((a, b) => a.dayOfWeek - b.dayOfWeek))
    }
  }, [data])

  if (isLoading || !hours) return <LoadingSpinner />

  const setDay = (dow, fn) => canEdit && setHours((prev) => prev.map((h) => (h.dayOfWeek === dow ? fn(h) : h)))
  const setShift = (dow, i, field, value) => setDay(dow, (h) => ({ ...h, shifts: h.shifts.map((s, j) => (j === i ? { ...s, [field]: value } : s)) }))
  const addShift = (dow) => setDay(dow, (h) => {
    const last = h.shifts[h.shifts.length - 1]
    // Sugere o próximo turno 2h depois do fim do último (ex: 11–15 → 17–23).
    const start = Math.min(toMin(last?.close || '15:00') + 120, 22 * 60)
    const hhmm = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
    return { ...h, shifts: [...h.shifts, { open: hhmm(start), close: hhmm(Math.min(start + 240, 23 * 60 + 59)) }] }
  })
  const removeShift = (dow, i) => setDay(dow, (h) => ({ ...h, shifts: h.shifts.filter((_, j) => j !== i) }))

  const errors = Object.fromEntries(hours.map((d) => [d.dayOfWeek, dayError(d)]))
  const hasErrors = Object.values(errors).some(Boolean)

  const applyCopy = () => {
    const src = hours.find((h) => h.dayOfWeek === copyFrom)
    setHours((prev) => prev.map((h) => (copyTo.includes(h.dayOfWeek) ? { ...h, isOpen: src.isOpen, shifts: src.shifts.map((s) => ({ ...s })) } : h)))
    toast.success(`Horário de ${DAY_LABELS[copyFrom]} copiado.`)
    setCopyFrom(null); setCopyTo([])
  }

  const handleSave = () => {
    if (hasErrors) return toast.error('Corrija os horários marcados em vermelho.')
    update.mutate(hours)
  }

  return (
    <div>
      <TopBar title="Horário de funcionamento" back />

      <div className="page space-y-3 pb-28">
        {!canEdit && (
          <p className="text-xs text-gray-500 bg-gray-100 rounded-lg px-3 py-2">Somente o administrador do restaurante pode alterar os horários.</p>
        )}
        <p className="text-xs text-gray-400">
          Abre no almoço e no jantar? Use <b>+ adicionar turno</b>. Se o fechamento for menor que a abertura (ex: 18:00 até 02:00), o turno vai até a madrugada do dia seguinte.
        </p>

        {hours.map((day) => (
          <Card key={day.dayOfWeek} className={errors[day.dayOfWeek] ? 'ring-1 ring-danger/40' : ''}>
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-sm text-secondary">{DAY_LABELS[day.dayOfWeek]}</span>
              <div className="flex items-center gap-3">
                {canEdit && (
                  <button type="button" onClick={() => { setCopyFrom(day.dayOfWeek); setCopyTo([]) }} className="flex items-center gap-1 text-xs font-semibold text-primary cursor-pointer" aria-label={`Copiar horário de ${DAY_LABELS[day.dayOfWeek]}`}>
                    <Copy size={13} /> Copiar
                  </button>
                )}
                <button
                  type="button"
                  disabled={!canEdit}
                  role="switch"
                  aria-checked={day.isOpen}
                  aria-label={`${DAY_LABELS[day.dayOfWeek]} aberto`}
                  onClick={() => setDay(day.dayOfWeek, (h) => ({ ...h, isOpen: !h.isOpen }))}
                  className={`relative w-11 h-6 rounded-full transition-colors disabled:opacity-60 ${day.isOpen ? 'bg-success' : 'bg-gray-300'}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${day.isOpen ? 'translate-x-5' : ''}`} />
                </button>
              </div>
            </div>

            {!day.isOpen ? (
              <p className="text-xs text-gray-400 mt-1">Fechado</p>
            ) : (
              <div className="mt-3 space-y-2">
                {day.shifts.map((s, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input type="time" className="input min-w-0 flex-1 !px-2" aria-label={`Abre (turno ${i + 1})`} disabled={!canEdit} value={s.open} onChange={(e) => setShift(day.dayOfWeek, i, 'open', e.target.value)} />
                    <span className="text-gray-400 text-xs">até</span>
                    <input type="time" className="input min-w-0 flex-1 !px-2" aria-label={`Fecha (turno ${i + 1})`} disabled={!canEdit} value={s.close} onChange={(e) => setShift(day.dayOfWeek, i, 'close', e.target.value)} />
                    {canEdit && day.shifts.length > 1 && (
                      <button type="button" onClick={() => removeShift(day.dayOfWeek, i)} aria-label={`Remover turno ${i + 1}`} className="p-2 -mr-1 text-gray-400 cursor-pointer"><X size={18} /></button>
                    )}
                  </div>
                ))}
                {canEdit && day.shifts.length < MAX_SHIFTS && (
                  <button type="button" onClick={() => addShift(day.dayOfWeek)} className="flex items-center gap-1 text-xs font-semibold text-primary py-1 cursor-pointer">
                    <Plus size={14} /> adicionar turno
                  </button>
                )}
                {errors[day.dayOfWeek] && <p className="text-xs text-danger">{errors[day.dayOfWeek]}</p>}
              </div>
            )}
          </Card>
        ))}
      </div>

      {canEdit && (
        <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] md:bottom-0 md:left-64 z-30 bg-white/95 backdrop-blur border-t border-gray-100 p-3">
          <div className="max-w-2xl mx-auto"><Button full onClick={handleSave} loading={update.isPending}>Salvar horários</Button></div>
        </div>
      )}

      <Modal open={copyFrom !== null} onClose={() => setCopyFrom(null)} title={copyFrom !== null ? `Copiar horário de ${DAY_LABELS[copyFrom]}` : ''}>
        <p className="text-sm text-gray-500 mb-3">Para quais dias?</p>
        <div className="grid grid-cols-2 gap-2 mb-4">
          {DAY_LABELS.map((label, d) => d !== copyFrom && (
            <label key={d} className={`flex items-center gap-2 rounded-xl border px-3 py-3 text-sm cursor-pointer ${copyTo.includes(d) ? 'border-primary bg-primary/5' : 'border-gray-200'}`}>
              <input type="checkbox" className="accent-primary" checked={copyTo.includes(d)} onChange={() => setCopyTo((v) => (v.includes(d) ? v.filter((x) => x !== d) : [...v, d]))} />
              {label}
            </label>
          ))}
        </div>
        <Button full disabled={!copyTo.length} onClick={applyCopy}>Copiar</Button>
      </Modal>
    </div>
  )
}
