import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
export const ZONE_COLORS = ['#FF6B2C', '#2563EB', '#16A34A', '#9333EA', '#DB2777', '#0891B2', '#CA8A04', '#DC2626']

/**
 * Mapa da tela Entrega.
 *  - mostra o restaurante (ponto laranja)
 *  - modo "distance": círculos de cada faixa (km)
 *  - modo "zones": áreas desenhadas + desenho de uma área nova (toque = ponto)
 *
 * Props: center {lat,lng}, bands [{maxKm}], zones [{name, polygon}], drawing [{lat,lng}] | null,
 *        onMapTap ({lat,lng}) — só chamado enquanto drawing !== null
 */
export default function DeliveryMap({ center, bands = [], zones = [], drawing = null, onMapTap, className = 'h-72' }) {
  const boxRef = useRef(null)
  const mapRef = useRef(null)
  const layerRef = useRef(null)
  const tapRef = useRef(onMapTap)
  const drawingRef = useRef(drawing)
  tapRef.current = onMapTap
  drawingRef.current = drawing

  useEffect(() => {
    const map = L.map(boxRef.current, { zoomControl: true, attributionControl: true }).setView([center.lat, center.lng], 14)
    L.tileLayer(TILE_URL, { maxZoom: 19, attribution: '&copy; OpenStreetMap' }).addTo(map)
    layerRef.current = L.layerGroup().addTo(map)
    map.on('click', (e) => { if (drawingRef.current) tapRef.current?.({ lat: Number(e.latlng.lat.toFixed(7)), lng: Number(e.latlng.lng.toFixed(7)) }) })
    mapRef.current = map
    setTimeout(() => map.invalidateSize(), 50)
    return () => { map.remove(); mapRef.current = null }
  }, [center.lat, center.lng])

  useEffect(() => {
    const map = mapRef.current, g = layerRef.current
    if (!map || !g) return
    g.clearLayers()
    const all = []
    L.circleMarker([center.lat, center.lng], { radius: 8, color: '#fff', weight: 3, fillColor: '#FF6B2C', fillOpacity: 1 }).bindTooltip('Restaurante').addTo(g)
    all.push([center.lat, center.lng])
    ;[...bands].filter((b) => Number(b.maxKm) > 0).sort((a, b) => b.maxKm - a.maxKm).forEach((b, i) => {
      const c = L.circle([center.lat, center.lng], { radius: Number(b.maxKm) * 1000, color: ZONE_COLORS[i % ZONE_COLORS.length], weight: 2, fillOpacity: 0.06 }).addTo(g)
      all.push(...[c.getBounds().getNorthEast(), c.getBounds().getSouthWest()].map((p) => [p.lat, p.lng]))
    })
    zones.forEach((z, i) => {
      if (!z.polygon || z.polygon.length < 3) return
      const pts = z.polygon.map((p) => [p.lat, p.lng])
      L.polygon(pts, { color: ZONE_COLORS[i % ZONE_COLORS.length], weight: 2, fillOpacity: 0.18 }).bindTooltip(z.name || `Área ${i + 1}`, { permanent: true, direction: 'center', className: 'zone-label' }).addTo(g)
      all.push(...pts)
    })
    if (drawing) {
      const pts = drawing.map((p) => [p.lat, p.lng])
      if (pts.length >= 2) L.polyline([...pts, ...(pts.length >= 3 ? [pts[0]] : [])], { color: '#1A1A2E', weight: 2, dashArray: '6 6' }).addTo(g)
      pts.forEach((p, i) => L.circleMarker(p, { radius: i === 0 ? 8 : 6, color: '#fff', weight: 2, fillColor: '#1A1A2E', fillOpacity: 1 }).addTo(g))
    }
    if (!drawing && all.length > 1) map.fitBounds(all, { padding: [24, 24], maxZoom: 16 })
  }, [center.lat, center.lng, bands, zones, drawing])

  return <div ref={boxRef} className={`w-full rounded-2xl overflow-hidden border border-gray-100 ${className}`} data-testid="mapa-entrega" />
}
