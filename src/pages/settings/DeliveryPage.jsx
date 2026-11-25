import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Bike, MapPinned, Ruler, Map as MapIcon, Plus, Trash2, Undo2, Check, X, PencilLine, AlertTriangle } from 'lucide-react'
import TopBar from '../../components/layout/TopBar'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import DeliveryMap, { ZONE_COLORS } from '../../components/map/DeliveryMap'
import api from '../../config/api'
import useRestaurantStore from '../../stores/restaurantStore'
import useAuthStore from '../../stores/authStore'

const MODES = [
  { value: 'fixed', label: 'Taxa única', hint: 'Mesmo valor para qualquer endereço', icon: Bike },
  { value: 'neighborhood', label: 'Por bairro', hint: 'Um valor para cada bairro', icon: MapPinned },
  { value: 'distance', label: 'Por distância', hint: 'Faixas em km do restaurante', icon: Ruler },
  { value: 'zones', label: 'Área no mapa', hint: 'Desenhe as regiões no mapa', icon: MapIcon },
]

// R$ digitado (aceita "6,50" ou "6.50") ↔ centavos
const toCents = (v) => { if (v === '' || v == null) return null; const n = Number(String(v).replace(/\./g, '').replace(',', '.')); return Number.isFinite(n) ? Math.round(n * 100) : NaN }
const toReais = (c) => (c == null ? '' : (c / 100).toFixed(2).replace('.', ','))
const toInt = (v) => (v === '' || v == null ? null : Math.round(Number(v)))

const MoneyInput = ({ value, onChange, label, placeholder = '0,00', ...rest }) => (
  <div className="min-w-0">
    {label && <label className="label">{label}</label>}
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">R$</span>
      <input className="input !pl-9" inputMode="decimal" placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value.replace(/[^0-9,.]/g, ''))} {...rest} />
    </div>
  </div>
)

const TimeRange = ({ row, onChange, disabled }) => (
  <div className="flex items-center gap-1.5">
    <input className="input w-16 !px-2 text-center" inputMode="numeric" placeholder="min" aria-label="Tempo mínimo (min)" disabled={disabled} value={row.minTime} onChange={(e) => onChange({ minTime: e.target.value.replace(/\D/g, '') })} />
    <span className="text-xs text-gray-400">a</span>
    <input className="input w-16 !px-2 text-center" inputMode="numeric" placeholder="máx" aria-label="Tempo máximo (min)" disabled={disabled} value={row.maxTime} onChange={(e) => onChange({ maxTime: e.target.value.replace(/\D/g, '') })} />
    <span className="text-xs text-gray-400">min</span>
  </div>
)

const fromServer = (c) => ({
  mode: c.mode || 'fixed',
  fixedFee: toReais(c.fixedFee ?? 0),
  freeDeliveryAbove: toReais(c.freeDeliveryAbove),
  outOfArea: c.outOfArea || 'block',
  fallbackFee: toReais(c.fallbackFee ?? 0),
  neighborhoods: (c.neighborhoods || []).map((n) => ({ name: n.name, fee: toReais(n.fee), minTime: n.minTime ?? '', maxTime: n.maxTime ?? '' })),
  distanceBands: (c.distanceBands || []).map((b) => ({ maxKm: String(b.maxKm).replace('.', ','), fee: toReais(b.fee), minTime: b.minTime ?? '', maxTime: b.maxTime ?? '' })),
  zones: (c.zones || []).map((z) => ({ name: z.name, fee: toReais(z.fee), minTime: z.minTime ?? '', maxTime: z.maxTime ?? '', polygon: z.polygon || [] })),
})

const toServer = (f) => ({
  mode: f.mode,
  fixedFee: toCents(f.fixedFee) ?? 0,
  freeDeliveryAbove: toCents(f.freeDeliveryAbove),
  outOfArea: f.outOfArea,
  fallbackFee: toCents(f.fallbackFee) ?? 0,
  neighborhoods: f.neighborhoods.filter((n) => n.name.trim()).map((n) => ({ name: n.name.trim(), fee: toCents(n.fee) ?? 0, minTime: toInt(n.minTime), maxTime: toInt(n.maxTime) })),
  distanceBands: f.distanceBands.filter((b) => String(b.maxKm).trim()).map((b) => ({ maxKm: Number(String(b.maxKm).replace(',', '.')), fee: toCents(b.fee) ?? 0, minTime: toInt(b.minTime), maxTime: toInt(b.maxTime) })),
  zones: f.zones.map((z) => ({ name: z.name.trim(), fee: toCents(z.fee) ?? 0, minTime: toInt(z.minTime), maxTime: toInt(z.maxTime), polygon: z.polygon })),
})

export default function DeliveryPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const canEdit = useAuthStore((s) => s.user?.role) !== 'operator'
  const { restaurant, fetchRestaurant } = useRestaurantStore()
  const { data, isLoading } = useQuery({ queryKey: ['delivery', 'config'], queryFn: async () => (await api.get('/delivery/config')).data.data })
  const save = useMutation({
    mutationFn: (payload) => api.put('/delivery/config', payload),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['delivery', 'config'] }); toast.success('Entrega salva!') },
    onError: (err) => toast.error(err.response?.data?.error?.message || 'Erro ao salvar.'),
  })
  const [form, setForm] = useState(null)
  const [drawing, setDrawing] = useState(null) // { index: -1 (nova) | n (redesenhar), points: [] }
  const [suggestions, setSuggestions] = useState([])

  useEffect(() => { if (!restaurant) fetchRestaurant() }, [restaurant, fetchRestaurant])
  useEffect(() => { if (data) setForm(fromServer(data)) }, [data])

  const center = useMemo(() => (Number.isFinite(restaurant?.latitude) && Number.isFinite(restaurant?.longitude) ? { lat: restaurant.latitude, lng: restaurant.longitude } : null), [restaurant])
  const mapBands = useMemo(() => (form?.distanceBands || []).map((b) => ({ maxKm: Number(String(b.maxKm).replace(',', '.')) || 0 })), [form?.distanceBands])
  const mapZones = useMemo(() => (form?.zones || []).filter((_, i) => !drawing || drawing.index !== i), [form?.zones, drawing])

  // Sugestões de bairros da cidade do restaurante (melhor esforço, OpenStreetMap)
  const suggest = async (q) => {
    const city = restaurant?.address?.city
    if (!city || String(q).trim().length < 3) return setSuggestions([])
    try {
      const { data: r } = await api.get('/delivery/neighborhood-suggestions', { params: { q, city, state: restaurant?.address?.state } })
      setSuggestions(r.data || [])
    } catch { setSuggestions([]) }
  }

  if (isLoading || !form) return <LoadingSpinner />

  const set = (patch) => canEdit && setForm((f) => ({ ...f, ...patch }))
  const setRow = (key, i, patch) => canEdit && setForm((f) => ({ ...f, [key]: f[key].map((r, j) => (j === i ? { ...r, ...patch } : r)) }))
  const addRow = (key, row) => canEdit && setForm((f) => ({ ...f, [key]: [...f[key], row] }))
  const delRow = (key, i) => canEdit && setForm((f) => ({ ...f, [key]: f[key].filter((_, j) => j !== i) }))

  const needsLocation = (form.mode === 'distance' || form.mode === 'zones') && !center

  const finishDrawing = () => {
    if (drawing.points.length < 3) return toast.error('Marque pelo menos 3 pontos para fechar a área.')
    if (drawing.index === -1) addRow('zones', { name: `Área ${form.zones.length + 1}`, fee: '', minTime: '', maxTime: '', polygon: drawing.points })
    else setRow('zones', drawing.index, { polygon: drawing.points })
    setDrawing(null)
  }

  const handleSave = () => {
    const payload = toServer(form)
    const money = [payload.fixedFee, payload.freeDeliveryAbove, payload.fallbackFee, ...payload.neighborhoods.map((n) => n.fee), ...payload.distanceBands.map((b) => b.fee), ...payload.zones.map((z) => z.fee)]
    if (money.some((v) => Number.isNaN(v))) return toast.error('Confira os valores em reais.')
    if (payload.distanceBands.some((b) => !(b.maxKm > 0))) return toast.error('Confira os quilômetros das faixas.')
    if (drawing) return toast.error('Conclua ou cancele a área que está desenhando.')
    save.mutate(payload)
  }

  return (
    <div>
      <TopBar title="Entrega" subtitle="Taxa e área de entrega" back onBack={() => navigate(-1)} />

      <div className="page space-y-4">
        <div>
          <p className="label">Como você cobra a entrega?</p>
          <div className="grid grid-cols-2 gap-2">
            {MODES.map(({ value, label, hint, icon: Icon }) => (
              <button key={value} type="button" disabled={!canEdit} onClick={() => { set({ mode: value }); setDrawing(null) }} aria-pressed={form.mode === value}
                className={`rounded-2xl border p-3 text-left transition-colors cursor-pointer ${form.mode === value ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-gray-200 bg-white'}`}>
                <Icon size={20} className={form.mode === value ? 'text-primary' : 'text-gray-400'} />
                <p className="mt-1.5 text-sm font-semibold text-secondary">{label}</p>
                <p className="text-[11px] leading-tight text-gray-400">{hint}</p>
              </button>
            ))}
          </div>
        </div>

        {needsLocation && (
          <Card className="border border-warning/30 bg-warning/5">
            <div className="flex items-start gap-3">
              <AlertTriangle size={20} className="text-warning flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-secondary">Marque a localização do restaurante</p>
                <p className="text-xs text-gray-500 mt-0.5">Para cobrar por distância ou por área, o sistema precisa saber onde o restaurante fica.</p>
                <button type="button" onClick={() => navigate('/settings/profile')} className="mt-2 text-xs font-semibold text-primary cursor-pointer">Ir para Dados do restaurante →</button>
              </div>
            </div>
          </Card>
        )}

        {form.mode === 'fixed' && (
          <Card><MoneyInput label="Valor da entrega" value={form.fixedFee} onChange={(v) => set({ fixedFee: v })} disabled={!canEdit} /></Card>
        )}

        {form.mode === 'neighborhood' && (
          <Card>
            <p className="font-semibold text-sm text-secondary">Bairros atendidos</p>
            <p className="text-xs text-gray-400 mb-3">No cardápio, o cliente escolhe o bairro nesta lista.</p>
            <datalist id="sugestoes-bairro">{suggestions.map((s) => <option key={s} value={s} />)}</datalist>
            <div className="space-y-3">
              {form.neighborhoods.map((n, i) => (
                <div key={i} className="rounded-xl bg-bg p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <input className="input flex-1" placeholder="Nome do bairro" list="sugestoes-bairro" aria-label={`Bairro ${i + 1}`} disabled={!canEdit} value={n.name} onChange={(e) => { setRow('neighborhoods', i, { name: e.target.value }); suggest(e.target.value) }} />
                    {canEdit && <button type="button" onClick={() => delRow('neighborhoods', i)} aria-label={`Remover bairro ${i + 1}`} className="p-2 -mr-1 text-gray-400 cursor-pointer"><Trash2 size={18} /></button>}
                  </div>
                  <div className="grid grid-cols-[minmax(0,7rem)_1fr] gap-2 items-center">
                    <MoneyInput value={n.fee} aria-label={`Taxa do bairro ${i + 1}`} onChange={(v) => setRow('neighborhoods', i, { fee: v })} disabled={!canEdit} />
                    <TimeRange row={n} disabled={!canEdit} onChange={(p) => setRow('neighborhoods', i, p)} />
                  </div>
                </div>
              ))}
            </div>
            {canEdit && <button type="button" onClick={() => addRow('neighborhoods', { name: '', fee: '', minTime: '', maxTime: '' })} className="mt-3 flex items-center gap-1 text-sm font-semibold text-primary cursor-pointer"><Plus size={16} /> Adicionar bairro</button>}
          </Card>
        )}

        {form.mode === 'distance' && !needsLocation && (
          <Card>
            <p className="font-semibold text-sm text-secondary">Faixas de distância</p>
            <p className="text-xs text-gray-400 mb-3">Distância em linha reta do restaurante até o endereço.</p>
            <DeliveryMap center={center} bands={mapBands} />
            <div className="mt-3 space-y-3">
              {form.distanceBands.map((b, i) => (
                <div key={i} className="rounded-xl bg-bg p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="size-3 rounded-full flex-shrink-0" style={{ background: ZONE_COLORS[i % ZONE_COLORS.length] }} />
                    <span className="text-sm text-gray-500">Até</span>
                    <input className="input w-20 !px-2 text-center" inputMode="decimal" aria-label={`Quilômetros da faixa ${i + 1}`} disabled={!canEdit} value={b.maxKm} onChange={(e) => setRow('distanceBands', i, { maxKm: e.target.value.replace(/[^0-9,.]/g, '') })} />
                    <span className="text-sm text-gray-500 flex-1">km</span>
                    {canEdit && <button type="button" onClick={() => delRow('distanceBands', i)} aria-label={`Remover faixa ${i + 1}`} className="p-2 -mr-1 text-gray-400 cursor-pointer"><Trash2 size={18} /></button>}
                  </div>
                  <div className="grid grid-cols-[minmax(0,7rem)_1fr] gap-2 items-center">
                    <MoneyInput value={b.fee} aria-label={`Taxa da faixa ${i + 1}`} onChange={(v) => setRow('distanceBands', i, { fee: v })} disabled={!canEdit} />
                    <TimeRange row={b} disabled={!canEdit} onChange={(p) => setRow('distanceBands', i, p)} />
                  </div>
                </div>
              ))}
            </div>
            {canEdit && <button type="button" onClick={() => addRow('distanceBands', { maxKm: '', fee: '', minTime: '', maxTime: '' })} className="mt-3 flex items-center gap-1 text-sm font-semibold text-primary cursor-pointer"><Plus size={16} /> Adicionar faixa</button>}
          </Card>
        )}

        {form.mode === 'zones' && !needsLocation && (
          <Card>
            <p className="font-semibold text-sm text-secondary">Áreas de entrega</p>
            <p className="text-xs text-gray-400 mb-3">Desenhe cada região tocando nos cantos dela no mapa.</p>
            {drawing && (
              <div className="mb-2 rounded-xl bg-secondary px-3 py-2.5 text-xs text-white">
                Toque no mapa para marcar os cantos da área ({drawing.points.length} {drawing.points.length === 1 ? 'ponto' : 'pontos'}). Mínimo 3.
              </div>
            )}
            {/* Botões do desenho por cima do mapa — no celular ficam sempre à vista */}
            <div className="relative">
              <DeliveryMap center={center} zones={mapZones} drawing={drawing?.points || null} onMapTap={(p) => setDrawing((d) => ({ ...d, points: [...d.points, p] }))} className="h-80" />
              {drawing && (
                <div className="absolute inset-x-2 bottom-6 z-[500] grid grid-cols-3 gap-2">
                  <button type="button" onClick={() => setDrawing((d) => ({ ...d, points: d.points.slice(0, -1) }))} disabled={!drawing.points.length} className="flex items-center justify-center gap-1 rounded-xl bg-white py-2.5 text-xs font-semibold text-secondary shadow disabled:opacity-50 cursor-pointer"><Undo2 size={15} /> Desfazer</button>
                  <button type="button" onClick={() => setDrawing(null)} className="flex items-center justify-center gap-1 rounded-xl bg-white py-2.5 text-xs font-semibold text-secondary shadow cursor-pointer"><X size={15} /> Cancelar</button>
                  <button type="button" onClick={finishDrawing} className="flex items-center justify-center gap-1 rounded-xl bg-primary py-2.5 text-xs font-semibold text-white shadow cursor-pointer"><Check size={15} /> Concluir</button>
                </div>
              )}
            </div>
            {!drawing && canEdit && (
              <button type="button" onClick={() => setDrawing({ index: -1, points: [] })} className="mt-3 btn-primary w-full"><Plus size={16} /> Desenhar nova área</button>
            )}
            <div className="mt-3 space-y-3">
              {form.zones.map((z, i) => (
                <div key={i} className="rounded-xl bg-bg p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="size-3 rounded-full flex-shrink-0" style={{ background: ZONE_COLORS[i % ZONE_COLORS.length] }} />
                    <input className="input flex-1" aria-label={`Nome da área ${i + 1}`} disabled={!canEdit} value={z.name} onChange={(e) => setRow('zones', i, { name: e.target.value })} />
                    {canEdit && !drawing && <button type="button" onClick={() => setDrawing({ index: i, points: [] })} aria-label={`Redesenhar área ${i + 1}`} className="p-2 text-gray-400 cursor-pointer"><PencilLine size={18} /></button>}
                    {canEdit && !drawing && <button type="button" onClick={() => delRow('zones', i)} aria-label={`Remover área ${i + 1}`} className="p-2 -mr-1 text-gray-400 cursor-pointer"><Trash2 size={18} /></button>}
                  </div>
                  <div className="grid grid-cols-[minmax(0,7rem)_1fr] gap-2 items-center">
                    <MoneyInput value={z.fee} aria-label={`Taxa da área ${i + 1}`} onChange={(v) => setRow('zones', i, { fee: v })} disabled={!canEdit} />
                    <TimeRange row={z} disabled={!canEdit} onChange={(p) => setRow('zones', i, p)} />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        <Card>
          <MoneyInput label="Entrega grátis acima de (opcional)" placeholder="Ex: 80,00" value={form.freeDeliveryAbove} onChange={(v) => set({ freeDeliveryAbove: v })} disabled={!canEdit} />
          {form.mode !== 'fixed' && (
            <div className="mt-4">
              <p className="label">Endereço fora da área</p>
              <div className="space-y-2">
                {[['block', 'Não entregar', 'O cliente vê que o endereço está fora da área.'], ['fallback', 'Cobrar uma taxa padrão', 'Aceita o pedido com o valor abaixo.']].map(([v, t, h]) => (
                  <label key={v} className={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer ${form.outOfArea === v ? 'border-primary bg-primary/5' : 'border-gray-200'}`}>
                    <input type="radio" name="fora" className="mt-1 accent-primary" disabled={!canEdit} checked={form.outOfArea === v} onChange={() => set({ outOfArea: v })} />
                    <span><span className="block text-sm font-medium text-secondary">{t}</span><span className="block text-xs text-gray-400">{h}</span></span>
                  </label>
                ))}
              </div>
              {form.outOfArea === 'fallback' && <div className="mt-2"><MoneyInput label="Taxa padrão" value={form.fallbackFee} onChange={(v) => set({ fallbackFee: v })} disabled={!canEdit} /></div>}
            </div>
          )}
        </Card>

        {canEdit && <Button full onClick={handleSave} loading={save.isPending} disabled={needsLocation}>Salvar entrega</Button>}
      </div>
    </div>
  )
}
