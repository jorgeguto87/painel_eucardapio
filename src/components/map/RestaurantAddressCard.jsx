import { useState } from 'react'
import { MapPin, Search, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'
import Card from '../ui/Card'
import api from '../../config/api'
import LocationConfirmModal from './LocationConfirmModal'

const UFS = 'AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO'.split(' ')
const fmtCep = (v) => { const d = String(v || '').replace(/\D/g, '').slice(0, 8); return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d }

/**
 * Endereço + localização do restaurante.
 * - CEP preenche rua/bairro/cidade; "Não sei o CEP" busca o CEP pela rua.
 * - Mudou o endereço → a localização precisa ser confirmada de novo.
 * - "Confirmar no mapa" procura o ponto e SEMPRE abre o mapa para ajustar.
 *
 * value = { address: {street, number, complement, neighborhood, city, state, zipCode}, latitude, longitude }
 */
export default function RestaurantAddressCard({ value, onChange, disabled }) {
  const a = value.address || {}
  const confirmed = Number.isFinite(value.latitude) && Number.isFinite(value.longitude)
  const [loadingCep, setLoadingCep] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [results, setResults] = useState(null)
  const [searching, setSearching] = useState(false)
  const [mapState, setMapState] = useState(null) // { initial, precision }
  const [geocoding, setGeocoding] = useState(false)

  // Qualquer mudança no endereço invalida a localização confirmada.
  const setAddr = (patch) => onChange({ address: { ...a, ...patch }, latitude: null, longitude: null })

  const lookupCep = async () => {
    const d = String(a.zipCode || '').replace(/\D/g, '')
    if (d.length !== 8) return toast.error('Digite os 8 números do CEP.')
    setLoadingCep(true)
    try {
      const { data } = await api.get(`/delivery/cep/${d}`)
      const r = data.data
      setAddr({ zipCode: fmtCep(r.zipCode), street: r.street || a.street, neighborhood: r.neighborhood || a.neighborhood, city: r.city || a.city, state: r.state || a.state })
    } catch (e) {
      toast.error(e.response?.data?.error?.message || 'CEP não encontrado.')
    } finally { setLoadingCep(false) }
  }

  const searchByStreet = async () => {
    setSearching(true)
    try {
      const { data } = await api.get('/delivery/cep-search', { params: { state: a.state, city: a.city, street: a.street } })
      setResults(data.data || [])
    } catch (e) {
      toast.error(e.response?.data?.error?.message || 'Não foi possível buscar agora.')
    } finally { setSearching(false) }
  }

  const openMap = async () => {
    if (!a.street || !a.city) return toast.error('Preencha pelo menos rua e cidade.')
    setGeocoding(true)
    try {
      const { data } = await api.post('/delivery/geocode', { street: a.street, number: a.number, neighborhood: a.neighborhood, city: a.city, state: a.state, zipCode: a.zipCode })
      const g = data.data
      setMapState({ initial: g ? { lat: g.lat, lng: g.lng } : null, precision: g?.precision || null })
    } catch {
      setMapState({ initial: null, precision: null })
    } finally { setGeocoding(false) }
  }

  const field = (key, label, props = {}) => (
    <div className={props.wrapClass || ''}>
      <label className="label">{label}</label>
      <input className="input" disabled={disabled} value={a[key] || ''} onChange={(e) => setAddr({ [key]: e.target.value })} {...props.input} />
    </div>
  )

  return (
    <Card>
      <div className="flex items-center gap-2 mb-1">
        <MapPin size={16} className="text-primary" />
        <span className="font-medium text-sm">Endereço e localização</span>
      </div>
      <p className="text-xs text-gray-400 mb-3">Usado para calcular a entrega por distância ou por área no mapa.</p>

      <div className="space-y-3">
        <div>
          <label className="label">CEP</label>
          <div className="flex gap-2">
            <input className="input flex-1" inputMode="numeric" placeholder="00000-000" disabled={disabled} value={a.zipCode || ''} onChange={(e) => setAddr({ zipCode: fmtCep(e.target.value) })} onBlur={() => String(a.zipCode || '').replace(/\D/g, '').length === 8 && lookupCep()} />
            <button type="button" onClick={lookupCep} disabled={disabled || loadingCep} aria-label="Buscar CEP" className="btn-secondary !min-h-0 h-12 w-12 !px-0 flex-shrink-0">
              {loadingCep ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
            </button>
          </div>
          <button type="button" onClick={() => setSearchOpen((v) => !v)} className="mt-1.5 text-xs font-semibold text-primary cursor-pointer">Não sei o CEP</button>
        </div>

        {searchOpen && (
          <div className="rounded-xl bg-bg p-3 space-y-2">
            <p className="text-xs text-gray-500">Preencha estado, cidade e a rua abaixo e toque em buscar.</p>
            <div className="grid grid-cols-[5.5rem_1fr] gap-2">
              <select className="input" disabled={disabled} value={a.state || ''} onChange={(e) => setAddr({ state: e.target.value })}>
                <option value="">UF</option>
                {UFS.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
              <input className="input" placeholder="Cidade" disabled={disabled} value={a.city || ''} onChange={(e) => setAddr({ city: e.target.value })} />
            </div>
            <input className="input" placeholder="Rua (pelo menos 3 letras)" disabled={disabled} value={a.street || ''} onChange={(e) => setAddr({ street: e.target.value })} />
            <button type="button" onClick={searchByStreet} disabled={disabled || searching} className="btn-secondary w-full">{searching ? <Loader2 size={16} className="animate-spin" /> : 'Buscar CEP'}</button>
            {results && (results.length ? (
              <ul className="divide-y divide-gray-100 rounded-xl bg-white">
                {results.map((r, i) => (
                  <li key={i}>
                    <button type="button" className="w-full px-3 py-2.5 text-left text-sm cursor-pointer" onClick={() => { setAddr({ zipCode: fmtCep(r.zipCode), street: r.street, neighborhood: r.neighborhood, city: r.city, state: r.state }); setSearchOpen(false); setResults(null) }}>
                      <span className="font-medium text-secondary">{r.street}</span>
                      <span className="block text-xs text-gray-400">{r.neighborhood} · CEP {fmtCep(r.zipCode)}{r.complement ? ` · ${r.complement}` : ''}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : <p className="text-xs text-gray-500">Nenhum CEP encontrado para essa rua.</p>)}
          </div>
        )}

        {field('street', 'Rua')}
        <div className="grid grid-cols-[6rem_1fr] gap-2">
          {field('number', 'Número', { input: { placeholder: 'Nº ou S/N' } })}
          {field('complement', 'Complemento', { input: { placeholder: 'Lote, quadra, loja…' } })}
        </div>
        {field('neighborhood', 'Bairro')}
        <div className="grid grid-cols-[1fr_5.5rem] gap-2">
          {field('city', 'Cidade')}
          <div>
            <label className="label">UF</label>
            <select className="input" disabled={disabled} value={a.state || ''} onChange={(e) => setAddr({ state: e.target.value })}>
              <option value="">—</option>
              {UFS.map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
        </div>

        <div className={`flex items-start gap-2 rounded-xl px-3 py-2.5 text-xs ${confirmed ? 'bg-success/10 text-secondary' : 'bg-warning/10 text-secondary'}`}>
          {confirmed ? <CheckCircle2 size={15} className="text-success flex-shrink-0 mt-0.5" /> : <AlertTriangle size={15} className="text-warning flex-shrink-0 mt-0.5" />}
          <span>{confirmed ? 'Localização confirmada no mapa.' : 'Falta confirmar a localização no mapa.'}</span>
        </div>
        <button type="button" onClick={openMap} disabled={disabled || geocoding} className="btn-primary w-full">
          {geocoding ? <Loader2 size={16} className="animate-spin" /> : <MapPin size={16} />}
          {confirmed ? 'Ajustar no mapa' : 'Confirmar no mapa'}
        </button>
      </div>

      <LocationConfirmModal
        open={!!mapState}
        title="Localização do restaurante"
        initial={confirmed ? { lat: value.latitude, lng: value.longitude } : mapState?.initial}
        precision={confirmed ? 'saved' : mapState?.precision}
        onClose={() => setMapState(null)}
        onConfirm={(p) => { onChange({ address: a, latitude: p.lat, longitude: p.lng }); setMapState(null); toast.success('Localização confirmada. Toque em Salvar.') }}
      />
    </Card>
  )
}
