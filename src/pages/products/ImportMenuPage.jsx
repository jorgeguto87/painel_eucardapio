import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Link2, FileImage, ClipboardPaste, Loader2, X, Plus, ChevronDown, ChevronUp, AlertTriangle,
  CheckCircle2, MapPin, Phone, Clock, Bike, Image as ImageIcon, RotateCcw,
} from 'lucide-react'
import TopBar from '../../components/layout/TopBar'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import LocationConfirmModal from '../../components/map/LocationConfirmModal'
import api from '../../config/api'
import useRestaurantStore from '../../stores/restaurantStore'

// ── Utilidades ─────────────────────────────────────────────────────────
const STORAGE = 'importacao-cardapio'
const DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const MAX_FILES = 10
const money = (c) => `R$ ${((c || 0) / 100).toFixed(2).replace('.', ',')}`
const toCentsInput = (v) => { const n = Number(String(v).replace(/\./g, '').replace(',', '.')); return Number.isFinite(n) ? Math.round(n * 100) : NaN }
const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim()
const errMsg = (e, fb) => e?.response?.data?.error?.message || fb

// Foto do celular → JPEG menor (até 1600px). O arquivo original nunca sai do aparelho.
const imageToBase64 = (file) => new Promise((resolve, reject) => {
  const url = URL.createObjectURL(file)
  const img = new window.Image()
  img.onload = () => {
    const scale = Math.min(1, 1600 / Math.max(img.width, img.height))
    const c = document.createElement('canvas')
    c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale)
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height)
    URL.revokeObjectURL(url)
    resolve({ mimeType: 'image/jpeg', data: c.toDataURL('image/jpeg', 0.82).split(',')[1], preview: c.toDataURL('image/jpeg', 0.4), name: file.name })
  }
  img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Imagem inválida')) }
  img.src = url
})
const pdfToBase64 = (file) => new Promise((resolve, reject) => {
  const r = new FileReader()
  r.onload = () => resolve({ mimeType: 'application/pdf', data: String(r.result).split(',')[1], preview: null, name: file.name })
  r.onerror = reject
  r.readAsDataURL(file)
})

const priceText = (p) => (p.pricingMode === 'variants'
  ? p.variantGroups.map((g) => g.options.map((o) => `${o.name} ${money(o.price)}`).join(' · ')).join(' | ')
  : money(p.price))

const STATUS = {
  new: { label: 'Novo', cls: 'bg-success/10 text-green-700' },
  update: { label: 'Mudou', cls: 'bg-primary/10 text-primary' },
  same: { label: 'Igual', cls: 'bg-gray-100 text-gray-500' },
}

// Decisão inicial: novo entra; mudou fica "Manter" até a pessoa escolher; igual fica de fora.
const withDecision = (p) => ({ ...p, include: p.status === 'new', action: p.status === 'new' ? 'create' : 'keep' })

const mergeDraft = (prev, next, round) => {
  const rekey = next.products.map((p) => withDecision({ ...p, key: `r${round}${p.key}` }))
  if (!prev) return { ...next, products: rekey, round }
  const seen = new Set(prev.products.map((p) => `${norm(p.category)}|${norm(p.name)}`))
  const added = rekey.filter((p) => !seen.has(`${norm(p.category)}|${norm(p.name)}`))
  const r = { ...next.restaurant, ...Object.fromEntries(Object.entries(prev.restaurant || {}).filter(([, v]) => v)) }
  return { ...prev, restaurant: r, products: [...prev.products, ...added], warnings: [...(prev.warnings || []), ...(next.warnings || [])], round }
}

// ── Acompanhamento de uma leitura/importação no servidor ─────────────
const useJob = () => {
  const [job, setJob] = useState(null) // { id, kind, progress }
  const timer = useRef(null)
  useEffect(() => () => clearTimeout(timer.current), [])
  const follow = (id, kind) => new Promise((resolve, reject) => {
    setJob({ id, kind, progress: 'Começando…' })
    const tick = async () => {
      try {
        const { data } = await api.get(`/menu-import/jobs/${id}`)
        const j = data.data
        if (j.status === 'running') { setJob({ id, kind, progress: j.progress }); timer.current = setTimeout(tick, 2000); return }
        setJob(null)
        if (j.status === 'done') resolve(j.result)
        else reject(new Error(j.error || 'Não foi possível concluir.'))
      } catch (e) {
        if (e?.response?.status >= 400 && e?.response?.status < 500) { setJob(null); reject(new Error(errMsg(e, 'Erro.'))) } else timer.current = setTimeout(tick, 4000)
      }
    }
    timer.current = setTimeout(tick, 1500)
  })
  return { job, follow }
}

// ═══════════════════════════════════════════════════════════════════════
export default function ImportMenuPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { restaurant, fetchRestaurant } = useRestaurantStore()
  const usage = useQuery({ queryKey: ['menu-import', 'usage'], queryFn: async () => (await api.get('/menu-import/usage')).data.data })
  const { job, follow } = useJob()

  const [draft, setDraft] = useState(() => { try { return JSON.parse(sessionStorage.getItem(STORAGE)) } catch { return null } })
  const [step, setStep] = useState(() => (draft ? 'review' : 'source'))
  const [result, setResult] = useState(null)

  useEffect(() => { if (!restaurant) fetchRestaurant() }, [restaurant, fetchRestaurant])
  useEffect(() => {
    try { if (draft) sessionStorage.setItem(STORAGE, JSON.stringify(draft)); else sessionStorage.removeItem(STORAGE) } catch { /* sem espaço: segue só em memória */ }
  }, [draft])

  const startRead = async (body) => {
    try {
      const { data } = await api.post('/menu-import/read', body)
      usage.refetch()
      const r = await follow(data.data.jobId, 'read')
      setDraft((d) => mergeDraft(d, r, (d?.round || 0) + 1))
      setStep('review')
      toast.success(`${r.products.length} produtos lidos!`)
    } catch (e) {
      usage.refetch()
      toast.error(e.message?.startsWith('Request failed') ? errMsg(e, 'Erro na leitura.') : errMsg(e, e.message))
    }
  }

  const startApply = async (payload) => {
    try {
      const { data } = await api.post('/menu-import/apply', payload)
      const r = await follow(data.data.jobId, 'apply')
      setResult(r)
      setDraft(null)
      setStep('done')
      qc.invalidateQueries()
      fetchRestaurant?.()
    } catch (e) {
      toast.error(e.message?.startsWith('Request failed') ? errMsg(e, 'Erro ao importar.') : errMsg(e, e.message))
    }
  }

  const restart = () => { setDraft(null); setResult(null); setStep('source') }

  return (
    <div>
      <TopBar title="Importar cardápio" back onBack={() => (step === 'source' && draft ? setStep('review') : navigate('/products'))} />
      <div className="page space-y-4 pb-32">
        {job ? (
          <Card className="py-10 text-center">
            <Loader2 className="mx-auto size-8 animate-spin text-primary" />
            <p className="mt-3 font-semibold text-secondary">{job.kind === 'read' ? 'Lendo o cardápio…' : 'Importando…'}</p>
            <p className="mt-1 text-sm text-gray-500">{job.progress}</p>
            <p className="mt-4 text-xs text-gray-400">Pode levar alguns minutos. Não feche esta tela.</p>
          </Card>
        ) : step === 'source' ? (
          <SourceStep usage={usage.data} onRead={startRead} hasDraft={!!draft} onBackToReview={() => setStep('review')} />
        ) : step === 'review' && draft ? (
          <ReviewStep draft={draft} setDraft={setDraft} restaurant={restaurant} onMore={() => setStep('source')} onDiscard={restart} onApply={startApply} />
        ) : step === 'done' && result ? (
          <DoneStep result={result} onMenu={() => navigate('/products')} onAgain={restart} />
        ) : (
          <SourceStep usage={usage.data} onRead={startRead} />
        )}
      </div>
    </div>
  )
}

// ── Passo 1: de onde vem o cardápio ──────────────────────────────────
function SourceStep({ usage, onRead, hasDraft, onBackToReview }) {
  const [mode, setMode] = useState(null)
  const [url, setUrl] = useState('')
  const [text, setText] = useState('')
  const [files, setFiles] = useState([])
  const [loadingFiles, setLoadingFiles] = useState(false)
  const inputRef = useRef(null)
  const semLeituras = usage && usage.remaining <= 0

  const addFiles = async (list) => {
    const arr = [...list]
    if (files.length + arr.length > MAX_FILES) toast.error(`Até ${MAX_FILES} fotos ou páginas por leitura. Envie o resto numa segunda leitura.`)
    setLoadingFiles(true)
    const out = []
    for (const f of arr.slice(0, MAX_FILES - files.length)) {
      try {
        if (f.type === 'application/pdf') {
          if (f.size > 8 * 1024 * 1024) { toast.error(`${f.name}: PDF acima de 8MB. Envie em partes.`); continue }
          out.push(await pdfToBase64(f))
        } else if (f.type.startsWith('image/')) out.push(await imageToBase64(f))
        else toast.error(`${f.name}: envie foto ou PDF.`)
      } catch { toast.error(`Não foi possível abrir ${f.name}.`) }
    }
    setFiles((v) => [...v, ...out])
    setLoadingFiles(false)
  }

  const sendFiles = () => onRead({ type: 'ai', files: files.map(({ mimeType, data }) => ({ mimeType, data })), text: text.trim() })

  const OPTIONS = [
    { id: 'link', icon: Link2, title: 'Link do cardápio', hint: 'OlaClick, Brendi ou site do restaurante. Lê tudo, com fotos e opcionais.' },
    { id: 'files', icon: FileImage, title: 'Foto ou PDF do cardápio', hint: 'Cardápio de papel, PDF ou imagem. A IA lê pra você.' },
    { id: 'text', icon: ClipboardPaste, title: 'iFood, Anota AI ou outro', hint: 'Cole o texto do cardápio e/ou mande prints das telas.' },
  ]

  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-gray-500">Traga o cardápio que você já tem. Nada é gravado antes de você conferir.</p>
        {usage && <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${semLeituras ? 'bg-danger/10 text-danger' : 'bg-bg text-gray-500'}`}>{usage.used}/{usage.limit} hoje</span>}
      </div>
      {semLeituras && <p className="rounded-xl bg-danger/10 px-3 py-2.5 text-xs text-secondary">Você usou as {usage.limit} leituras de hoje. Amanhã libera de novo.</p>}
      {hasDraft && (
        <button type="button" onClick={onBackToReview} className="w-full rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-left text-sm text-secondary cursor-pointer">
          Esta leitura vai se <b>juntar</b> ao que já foi lido. <span className="text-primary font-semibold">Voltar para a conferência →</span>
        </button>
      )}

      <div className="space-y-2">
        {OPTIONS.map(({ id, icon: Icon, title, hint }) => (
          <div key={id} className={`rounded-2xl border bg-white transition-colors ${mode === id ? 'border-primary ring-1 ring-primary' : 'border-gray-200'}`}>
            <button type="button" onClick={() => setMode(mode === id ? null : id)} className="flex w-full items-start gap-3 p-4 text-left cursor-pointer" aria-expanded={mode === id}>
              <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${mode === id ? 'bg-primary text-white' : 'bg-bg text-gray-500'}`}><Icon size={20} /></span>
              <span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-secondary">{title}</span><span className="block text-xs text-gray-400">{hint}</span></span>
            </button>

            {mode === 'link' && id === 'link' && (
              <div className="space-y-3 px-4 pb-4">
                <input className="input" inputMode="url" autoCapitalize="none" placeholder="https://seurestaurante.ola.click" value={url} onChange={(e) => setUrl(e.target.value)} aria-label="Link do cardápio" />
                <Button full disabled={!url.trim() || semLeituras} onClick={() => onRead({ type: 'link', url: url.trim() })}>Ler cardápio</Button>
                <p className="text-[11px] text-gray-400">iFood e Anota AI bloqueiam a leitura por link: use a terceira opção.</p>
              </div>
            )}

            {(mode === 'files' && id === 'files') || (mode === 'text' && id === 'text') ? (
              <div className="space-y-3 px-4 pb-4">
                {id === 'text' && (
                  <>
                    <div className="rounded-xl bg-bg px-3 py-2.5 text-xs leading-relaxed text-gray-600">
                      <b>Como copiar do iFood ou Anota AI:</b> abra o seu cardápio no navegador do celular, toque e segure no texto, escolha <b>Selecionar tudo</b> e <b>Copiar</b>. Cole abaixo. Se preferir, mande <b>prints</b> das telas (inclusive das opções de cada produto).
                    </div>
                    <textarea className="input min-h-36" placeholder="Cole aqui o texto do cardápio" value={text} onChange={(e) => setText(e.target.value)} aria-label="Texto do cardápio" />
                  </>
                )}
                <input ref={inputRef} type="file" multiple accept={id === 'files' ? 'image/*,application/pdf' : 'image/*'} className="hidden" onChange={(e) => { addFiles(e.target.files); e.target.value = '' }} />
                {files.length > 0 && (
                  <div className="grid grid-cols-4 gap-2">
                    {files.map((f, i) => (
                      <div key={i} className="relative aspect-square overflow-hidden rounded-xl border border-gray-200 bg-bg">
                        {f.preview ? <img src={f.preview} alt="" className="size-full object-cover" /> : <span className="grid size-full place-items-center p-1 text-center text-[10px] font-semibold text-gray-500">PDF<br />{f.name.slice(0, 14)}</span>}
                        <button type="button" onClick={() => setFiles((v) => v.filter((_, j) => j !== i))} aria-label="Remover arquivo" className="absolute right-1 top-1 grid size-6 place-items-center rounded-full bg-black/60 text-white cursor-pointer"><X size={13} /></button>
                      </div>
                    ))}
                  </div>
                )}
                {files.length < MAX_FILES && (
                  <button type="button" onClick={() => inputRef.current?.click()} disabled={loadingFiles} className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-gray-300 py-3 text-sm font-semibold text-gray-500 cursor-pointer disabled:opacity-60">
                    {loadingFiles ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} {id === 'files' ? 'Tirar foto ou escolher arquivo' : 'Adicionar prints'}
                  </button>
                )}
                <p className="text-[11px] text-gray-400">Até {MAX_FILES} fotos/páginas por leitura. Cardápio maior? Faça outra leitura depois: o sistema junta tudo. Os arquivos não ficam guardados.</p>
                <Button full disabled={semLeituras || loadingFiles || (!files.length && text.trim().length < 20)} onClick={sendFiles}>Ler com IA</Button>
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </>
  )
}

// ── Passo 2: conferir antes de gravar ────────────────────────────────
function ReviewStep({ draft, setDraft, restaurant, onMore, onDiscard, onApply }) {
  const [filter, setFilter] = useState('all')
  const [open, setOpen] = useState(null)
  const r = draft.restaurant || {}
  const [rest, setRest] = useState(() => ({
    logo: !!r.logoUrl,
    phone: !!r.phone,
    address: !!r.address,
    hours: !!r.hours,
    delivery: !!r.delivery,
  }))
  const [loc, setLoc] = useState(null) // { lat, lng } confirmado
  const [map, setMap] = useState(null)

  const products = draft.products
  const counts = useMemo(() => ({
    new: products.filter((p) => p.status === 'new').length,
    update: products.filter((p) => p.status === 'update').length,
    same: products.filter((p) => p.status === 'same').length,
    review: products.filter((p) => p.review).length,
  }), [products])
  const shown = products.filter((p) => (filter === 'all' ? p.status !== 'same' : filter === 'review' ? p.review : p.status === filter))
  const byCat = shown.reduce((acc, p) => { (acc[p.category] = acc[p.category] || []).push(p); return acc }, {})
  const selected = products.filter((p) => p.include)

  const setP = (key, patch) => setDraft((d) => ({ ...d, products: d.products.map((p) => (p.key === key ? { ...p, ...patch } : p)) }))
  const setAll = (fn) => setDraft((d) => ({ ...d, products: d.products.map(fn) }))

  const openAddressMap = async () => {
    if (Number.isFinite(r.latitude) && Number.isFinite(r.longitude)) return setMap({ initial: { lat: r.latitude, lng: r.longitude }, precision: 'saved' })
    try {
      const { data } = await api.post('/delivery/geocode', { ...r.address })
      setMap({ initial: data.data ? { lat: data.data.lat, lng: data.data.lng } : null, precision: data.data?.precision || null })
    } catch { setMap({ initial: null, precision: null }) }
  }

  const restaurantHasLocation = Number.isFinite(restaurant?.latitude) && Number.isFinite(restaurant?.longitude)
  const deliveryNeedsLocation = rest.delivery && r.delivery && ['zones', 'distance'].includes(r.delivery.mode) && !restaurantHasLocation && !(rest.address && loc)

  const submit = () => {
    if (rest.address && r.address && !loc) return openAddressMap()
    if (deliveryNeedsLocation) return toast.error('Para importar as áreas de entrega, confirme também o endereço no mapa.')
    const bad = selected.find((p) => !p.name.trim() || (p.pricingMode === 'simple' && !(p.price >= 0)))
    if (bad) { setOpen(bad.key); return toast.error(`Confira o produto "${bad.name || 'sem nome'}".`) }
    const restaurantPayload = {}
    if (rest.logo && r.logoUrl) restaurantPayload.logoUrl = r.logoUrl
    if (rest.phone && r.phone) restaurantPayload.phone = r.phone
    if (rest.address && r.address && loc) Object.assign(restaurantPayload, { address: r.address, latitude: loc.lat, longitude: loc.lng })
    if (rest.hours && r.hours) restaurantPayload.hours = r.hours
    if (rest.delivery && r.delivery) restaurantPayload.delivery = r.delivery
    const payload = {
      products: selected.map((p) => ({
        key: p.key, action: p.action === 'update' ? 'update' : 'create', productId: p.action === 'update' ? p.match?.productId : null,
        category: p.category, name: p.name.trim(), description: p.description || '', imageUrl: p.imageUrl || null, isAvailable: p.isAvailable !== false,
        pricingMode: p.pricingMode, price: p.price || 0, variantGroups: p.variantGroups, opcionalGroups: p.opcionalGroups, adicionalGroups: p.adicionalGroups,
      })),
      restaurant: Object.keys(restaurantPayload).length ? restaurantPayload : null,
    }
    if (!payload.products.length && !payload.restaurant) return toast.error('Nada selecionado para importar.')
    onApply(payload)
  }

  const hasRestaurantData = r.logoUrl || r.phone || r.address || r.hours || r.delivery
  const nRest = Object.entries(rest).filter(([k, v]) => v && (k === 'logo' ? r.logoUrl : r[k])).length

  return (
    <>
      <div className="grid grid-cols-4 gap-2 text-center">
        {[['all', 'Todos', products.length - counts.same], ['new', 'Novos', counts.new], ['update', 'Mudaram', counts.update], ['review', 'Revisar', counts.review]].map(([k, label, n]) => (
          <button key={k} type="button" onClick={() => setFilter(k)} aria-pressed={filter === k} className={`rounded-xl border px-1 py-2 cursor-pointer ${filter === k ? 'border-primary bg-primary/5' : 'border-gray-200 bg-white'}`}>
            <span className={`block text-lg font-extrabold ${k === 'review' && n ? 'text-warning' : 'text-secondary'}`}>{n}</span>
            <span className="block text-[11px] text-gray-500">{label}</span>
          </button>
        ))}
      </div>
      {counts.same > 0 && (
        <button type="button" onClick={() => setFilter(filter === 'same' ? 'all' : 'same')} className="text-xs text-gray-500 underline cursor-pointer">
          {filter === 'same' ? 'Esconder' : 'Ver'} {counts.same} produto(s) iguais ao que você já tem
        </button>
      )}
      {(draft.warnings || []).map((w, i) => <p key={i} className="rounded-xl bg-warning/10 px-3 py-2 text-xs text-secondary">{w}</p>)}

      <div className="flex flex-wrap gap-2">
        {counts.new > 0 && <button type="button" onClick={() => setAll((p) => (p.status === 'new' ? { ...p, include: true, action: 'create' } : p))} className="rounded-full bg-bg px-3 py-1.5 text-xs font-semibold text-secondary cursor-pointer">Marcar todos os novos</button>}
        {counts.update > 0 && <button type="button" onClick={() => setAll((p) => (p.status === 'update' ? { ...p, include: true, action: 'update' } : p))} className="rounded-full bg-bg px-3 py-1.5 text-xs font-semibold text-secondary cursor-pointer">Atualizar todos que mudaram</button>}
        <button type="button" onClick={onMore} className="rounded-full bg-bg px-3 py-1.5 text-xs font-semibold text-primary cursor-pointer">+ Ler mais uma parte</button>
      </div>

      {hasRestaurantData && (
        <Card>
          <p className="font-semibold text-sm text-secondary">Dados do restaurante</p>
          <p className="mb-3 text-xs text-gray-400">Marque o que quer trazer. Substitui o que está cadastrado hoje.</p>
          <div className="space-y-2">
            {r.logoUrl && (
              <RestRow checked={rest.logo} onChange={(v) => setRest((s) => ({ ...s, logo: v }))} icon={ImageIcon} title="Logo">
                <img src={r.logoUrl} alt="Logo lida" className="mt-1 size-12 rounded-xl border border-gray-100 object-cover" />
              </RestRow>
            )}
            {r.phone && <RestRow checked={rest.phone} onChange={(v) => setRest((s) => ({ ...s, phone: v }))} icon={Phone} title="Telefone"><span className="text-xs text-gray-500">{r.phone}</span></RestRow>}
            {r.address && (
              <RestRow checked={rest.address} onChange={(v) => setRest((s) => ({ ...s, address: v }))} icon={MapPin} title="Endereço">
                <span className="block text-xs text-gray-500">{[r.address.street, r.address.number].filter(Boolean).join(', ')} {r.address.neighborhood && `— ${r.address.neighborhood}`} · {r.address.city}/{r.address.state}</span>
                {rest.address && (
                  <button type="button" onClick={openAddressMap} className={`mt-1.5 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold cursor-pointer ${loc ? 'bg-success/10 text-green-700' : 'bg-warning/15 text-secondary'}`}>
                    {loc ? <><CheckCircle2 size={12} /> Local confirmado — ajustar</> : <><MapPin size={12} /> Confirmar no mapa</>}
                  </button>
                )}
              </RestRow>
            )}
            {r.hours && (
              <RestRow checked={rest.hours} onChange={(v) => setRest((s) => ({ ...s, hours: v }))} icon={Clock} title="Horários">
                <span className="block text-xs leading-relaxed text-gray-500">{r.hours.map((h) => `${DAYS[h.dayOfWeek]} ${h.isOpen ? h.shifts.map((s) => `${s.open}–${s.close}`).join(', ') : 'fechado'}`).join(' · ')}</span>
              </RestRow>
            )}
            {r.delivery && (
              <RestRow checked={rest.delivery} onChange={(v) => setRest((s) => ({ ...s, delivery: v }))} icon={Bike} title="Entrega">
                <span className="block text-xs text-gray-500">
                  {r.delivery.mode === 'zones' ? `${r.delivery.zones.length} área(s) no mapa: ${r.delivery.zones.map((z) => `${z.name} ${money(z.fee)}`).join(', ')}` : `Por distância: ${r.delivery.distanceBands.map((b) => `até ${String(b.maxKm).replace('.', ',')} km ${money(b.fee)}`).join(', ')}`}
                </span>
                {deliveryNeedsLocation && <span className="mt-1 block text-[11px] text-warning">Precisa do endereço confirmado no mapa.</span>}
              </RestRow>
            )}
          </div>
        </Card>
      )}

      {Object.keys(byCat).length === 0 && <p className="py-6 text-center text-sm text-gray-400">Nenhum produto neste filtro.</p>}
      {Object.entries(byCat).map(([cat, list]) => (
        <div key={cat}>
          <p className="mb-2 mt-2 text-xs font-bold uppercase tracking-wide text-gray-400">{cat}</p>
          <div className="space-y-2">
            {list.map((p) => <ProductRow key={p.key} p={p} open={open === p.key} onToggle={() => setOpen(open === p.key ? null : p.key)} onChange={(patch) => setP(p.key, patch)} />)}
          </div>
        </div>
      ))}

      <button type="button" onClick={() => { if (window.confirm('Descartar tudo que foi lido?')) onDiscard() }} className="mx-auto flex items-center gap-1.5 pt-2 text-xs text-gray-400 cursor-pointer"><RotateCcw size={13} /> Descartar e começar de novo</button>

      <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 border-t border-gray-100 bg-white/95 p-3 backdrop-blur md:bottom-0 md:left-64">
        <div className="mx-auto max-w-2xl">
          <Button full onClick={submit}>
            Importar {selected.length} produto{selected.length === 1 ? '' : 's'}{nRest ? ` + ${nRest} dado${nRest === 1 ? '' : 's'}` : ''}
          </Button>
        </div>
      </div>

      <LocationConfirmModal
        open={!!map}
        title="Onde fica o restaurante?"
        initial={map?.initial}
        precision={map?.precision}
        onConfirm={(p) => { setLoc(p); setMap(null) }}
        onClose={() => setMap(null)}
      />
    </>
  )
}

function RestRow({ checked, onChange, icon: Icon, title, children }) {
  return (
    <div className={`flex items-start gap-3 rounded-xl border p-3 ${checked ? 'border-primary/40 bg-primary/5' : 'border-gray-200'}`}>
      <input type="checkbox" className="mt-1 size-4 accent-primary" checked={checked} onChange={(e) => onChange(e.target.checked)} aria-label={`Importar ${title}`} />
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 text-sm font-medium text-secondary"><Icon size={15} className="text-gray-400" /> {title}</p>
        {children}
      </div>
    </div>
  )
}

function ProductRow({ p, open, onToggle, onChange }) {
  const st = STATUS[p.status]
  const [priceInput, setPriceInput] = useState(((p.price || 0) / 100).toFixed(2).replace('.', ','))
  const isUpdate = p.status === 'update' || p.status === 'same'
  return (
    <div className={`rounded-2xl border bg-white ${p.review ? 'border-warning/50' : 'border-gray-200'} ${p.include ? '' : 'opacity-70'}`}>
      <div className="flex items-start gap-3 p-3">
        {!isUpdate && <input type="checkbox" className="mt-1 size-5 shrink-0 accent-primary" checked={p.include} onChange={(e) => onChange({ include: e.target.checked, action: 'create' })} aria-label={`Importar ${p.name}`} />}
        {p.imageUrl ? <img src={p.imageUrl} alt="" loading="lazy" className="size-12 shrink-0 rounded-xl object-cover" /> : null}
        <button type="button" onClick={onToggle} className="min-w-0 flex-1 text-left cursor-pointer" aria-expanded={open}>
          <span className="flex flex-wrap items-center gap-1.5">
            <span className="text-sm font-semibold text-secondary">{p.name || 'Sem nome'}</span>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${st.cls}`}>{st.label}</span>
            {p.review && <span className="rounded-full bg-warning/15 px-2 py-0.5 text-[10px] font-bold text-secondary">Revisar</span>}
            {p.isAvailable === false && <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-500">Esgotado</span>}
          </span>
          <span className="mt-0.5 block truncate text-xs text-gray-500">{priceText(p)}</span>
          {(p.opcionalGroups.length > 0 || p.adicionalGroups.length > 0) && (
            <span className="block text-[11px] text-gray-400">
              {p.opcionalGroups.length > 0 && `${p.opcionalGroups.length} grupo(s) de opcionais`}{p.opcionalGroups.length > 0 && p.adicionalGroups.length > 0 && ' · '}{p.adicionalGroups.length > 0 && `${p.adicionalGroups.length} de adicionais`}
            </span>
          )}
        </button>
        <button type="button" onClick={onToggle} aria-label={open ? 'Fechar detalhes' : 'Ver detalhes'} className="p-1 text-gray-400 cursor-pointer">{open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}</button>
      </div>

      {isUpdate && p.status === 'update' && (
        <div className="grid grid-cols-2 gap-2 px-3 pb-3">
          {[['keep', 'Manter o meu'], ['update', 'Atualizar']].map(([v, label]) => (
            <button key={v} type="button" onClick={() => onChange({ action: v, include: v === 'update' })} aria-pressed={p.action === v}
              className={`rounded-xl border py-2 text-xs font-semibold cursor-pointer ${p.action === v ? (v === 'update' ? 'border-primary bg-primary text-white' : 'border-secondary bg-secondary text-white') : 'border-gray-200 text-gray-500'}`}>{label}</button>
          ))}
        </div>
      )}

      {open && (
        <div className="space-y-3 border-t border-gray-100 p-3">
          {p.warnings?.map((w, i) => <p key={i} className="flex gap-2 rounded-xl bg-warning/10 px-3 py-2 text-xs text-secondary"><AlertTriangle size={14} className="mt-0.5 shrink-0 text-warning" />{w}</p>)}
          {p.status === 'update' && p.match?.diffs?.length > 0 && (
            <div className="rounded-xl bg-bg p-3 text-xs">
              <p className="mb-1.5 font-semibold text-secondary">O que muda se atualizar</p>
              {p.match.diffs.map((d, i) => (
                <div key={i} className="mb-1.5 last:mb-0">
                  <span className="font-semibold text-gray-600">{d.label}: </span>
                  <span className="text-gray-400 line-through">{d.from}</span> <span className="text-secondary">→ {d.to}</span>
                </div>
              ))}
            </div>
          )}
          <div>
            <label className="label" htmlFor={`n-${p.key}`}>Nome</label>
            <input id={`n-${p.key}`} className="input" value={p.name} maxLength={100} onChange={(e) => onChange({ name: e.target.value })} />
          </div>
          {p.pricingMode === 'simple' && (
            <div>
              <label className="label" htmlFor={`p-${p.key}`}>Preço (R$)</label>
              <input id={`p-${p.key}`} className="input" inputMode="decimal" value={priceInput}
                onChange={(e) => { const v = e.target.value.replace(/[^0-9,.]/g, ''); setPriceInput(v); const c = toCentsInput(v); if (Number.isFinite(c)) onChange({ price: c }) }} />
            </div>
          )}
          <div>
            <label className="label" htmlFor={`d-${p.key}`}>Descrição</label>
            <textarea id={`d-${p.key}`} className="input min-h-16" maxLength={500} value={p.description} onChange={(e) => onChange({ description: e.target.value })} />
          </div>
          {p.variantGroups.map((g, i) => (
            <p key={`v${i}`} className="text-xs text-gray-600"><b>Variação · {g.name}:</b> {g.options.map((o) => `${o.name} ${money(o.price)}`).join(', ')}</p>
          ))}
          {p.opcionalGroups.map((g, i) => (
            <p key={`o${i}`} className="text-xs text-gray-600"><b>Opcionais · {g.name}</b> (escolhe {g.min === g.max ? g.min : `de ${g.min} a ${g.max}`}): {g.options.join(', ')}</p>
          ))}
          {p.adicionalGroups.map((g, i) => (
            <p key={`a${i}`} className="text-xs text-gray-600"><b>Adicionais · {g.name}:</b> {g.options.map((o) => `${o.name} +${money(o.price)}`).join(', ')}</p>
          ))}
          <p className="text-[11px] text-gray-400">Opcionais, adicionais e variações você ajusta depois na tela do produto.</p>
        </div>
      )}
    </div>
  )
}

// ── Passo 3: resultado ────────────────────────────────────────────────
function DoneStep({ result, onMenu, onAgain }) {
  return (
    <Card className="text-center">
      <CheckCircle2 className="mx-auto size-12 text-success" />
      <p className="mt-2 text-lg font-extrabold text-secondary">Cardápio importado!</p>
      <p className="mt-1 text-sm text-gray-500">
        {result.created} produto(s) criado(s){result.updated ? ` · ${result.updated} atualizado(s)` : ''}
        {result.restaurant?.length ? ` · ${result.restaurant.join(', ')}` : ''}
      </p>
      {[...(result.warnings || []), ...(result.errors || []).map((e) => `${e.name}: ${e.message}`)].map((w, i) => (
        <p key={i} className="mt-2 rounded-xl bg-warning/10 px-3 py-2 text-left text-xs text-secondary">{w}</p>
      ))}
      <div className="mt-5 space-y-2">
        <Button full onClick={onMenu}>Ver meu cardápio</Button>
        <button type="button" onClick={onAgain} className="w-full py-2 text-sm font-semibold text-primary cursor-pointer">Importar outra parte</button>
      </div>
    </Card>
  )
}
