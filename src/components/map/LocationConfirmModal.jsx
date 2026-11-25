import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { X, MapPin, LocateFixed, Loader2, AlertTriangle } from 'lucide-react'

// Centro do Brasil — usado só quando não há nenhum ponto de referência.
const BRASIL = { lat: -15.78, lng: -47.93 }
const TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
const ATTRIBUTION = '&copy; OpenStreetMap'

/**
 * Tela cheia para CONFIRMAR a localização de um endereço.
 *
 * Regra: nunca salvar localização sem a pessoa ver e confirmar no mapa.
 * O alfinete fica fixo no centro e a pessoa arrasta o MAPA (mais fácil com
 * o dedo do que arrastar um marcador pequeno). Quando o endereço não foi
 * encontrado com precisão (lote/quadra, rua nova, zona rural), o botão de
 * confirmar só libera depois que o mapa for movido.
 *
 * Props:
 *   open, title
 *   initial    { lat, lng } | null  — ponto encontrado (endereço ou GPS)
 *   precision  'number' | 'street' | 'gps' | 'saved' | 'neighborhood' | 'city' | null
 *   fallback   { lat, lng } | null  — centro alternativo (ex.: restaurante)
 *   onConfirm  ({ lat, lng }) => void
 *   onClose    () => void
 */
export default function LocationConfirmModal({ open, title = 'Confirme a localização', initial, precision, fallback, onConfirm, onClose }) {
  const boxRef = useRef(null)
  const mapRef = useRef(null)
  const [moved, setMoved] = useState(false)
  const [locating, setLocating] = useState(false)
  const exact = ['number', 'street', 'gps', 'saved'].includes(precision) && !!initial
  const mustMove = !exact

  useEffect(() => {
    if (!open || !boxRef.current) return undefined
    setMoved(false)
    const start = initial || fallback || BRASIL
    const zoom = initial ? (exact ? 18 : precision === 'neighborhood' ? 15 : 13) : fallback ? 14 : 4
    const map = L.map(boxRef.current, { zoomControl: false, attributionControl: true }).setView([start.lat, start.lng], zoom)
    L.tileLayer(TILE_URL, { maxZoom: 19, attribution: ATTRIBUTION }).addTo(map)
    L.control.zoom({ position: 'topright' }).addTo(map)
    map.on('dragstart', () => setMoved(true))
    map.on('zoomstart', () => {})
    mapRef.current = map
    // O mapa só calcula o tamanho certo depois que a tela cheia terminou de montar.
    setTimeout(() => map.invalidateSize(), 50)
    return () => { map.remove(); mapRef.current = null }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!open) return null

  const useGps = () => {
    if (!navigator.geolocation) return
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false)
        mapRef.current?.setView([pos.coords.latitude, pos.coords.longitude], 18)
        setMoved(true)
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  const confirm = () => {
    const c = mapRef.current?.getCenter()
    if (c) onConfirm({ lat: Number(c.lat.toFixed(7)), lng: Number(c.lng.toFixed(7)) })
  }

  // Portal no <body>: o modal pode ser aberto de dentro de uma gaveta (BottomSheet)
  // que usa animação com transform — sem portal, o 'fixed' ficaria preso nela.
  return createPortal(
    <div className="fixed inset-0 z-[1000] flex flex-col bg-white" role="dialog" aria-modal="true" aria-label={title}>
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
        <MapPin size={18} className="text-primary flex-shrink-0" />
        <p className="flex-1 font-semibold text-secondary text-sm">{title}</p>
        <button type="button" onClick={onClose} aria-label="Fechar" className="p-2 -mr-2 text-gray-400 cursor-pointer"><X size={20} /></button>
      </div>

      {mustMove ? (
        <div className="flex items-start gap-2 bg-warning/10 px-4 py-2.5 text-xs text-secondary">
          <AlertTriangle size={15} className="text-warning flex-shrink-0 mt-0.5" />
          <span>Não encontramos o ponto exato. <b>Arraste o mapa</b> até o alfinete ficar em cima do local da entrega.</span>
        </div>
      ) : (
        <div className="bg-primary/5 px-4 py-2.5 text-xs text-secondary">
          Confira se o alfinete está no local exato. Se não estiver, <b>arraste o mapa</b> para ajustar.
        </div>
      )}

      <div className="relative flex-1">
        <div ref={boxRef} className="absolute inset-0" data-testid="mapa" />
        {/* Alfinete fixo no centro — a ponta marca o local */}
        <div className="pointer-events-none absolute left-1/2 top-1/2 z-[500] -translate-x-1/2 -translate-y-full" aria-hidden>
          <MapPin size={44} className="text-primary drop-shadow-lg" fill="#FF6B2C" stroke="white" strokeWidth={1.5} />
        </div>
        <button type="button" onClick={useGps} className="absolute bottom-4 right-4 z-[500] flex items-center gap-1.5 rounded-full bg-white px-3.5 py-2.5 text-xs font-semibold text-secondary shadow-lg cursor-pointer">
          {locating ? <Loader2 size={15} className="animate-spin" /> : <LocateFixed size={15} className="text-primary" />} Minha localização
        </button>
      </div>

      <div className="border-t border-gray-100 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <button
          type="button"
          onClick={confirm}
          disabled={mustMove && !moved}
          className="w-full rounded-2xl bg-primary py-4 text-sm font-bold text-white disabled:bg-gray-300 cursor-pointer disabled:cursor-not-allowed"
        >
          {mustMove && !moved ? 'Arraste o mapa até o local' : 'Confirmar localização'}
        </button>
      </div>
    </div>,
    document.body,
  )
}
