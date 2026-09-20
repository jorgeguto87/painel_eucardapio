import { useMemo, useState } from 'react'
import { ChevronRight, ChevronLeft, CalendarRange, X } from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import TopBar from '../../components/layout/TopBar'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import {
  useRevenueRange,
  useDelivererRevenueReport,
  usePaymentMethodsReport,
  useTopProductsReport,
  useWeeksOfMonth,
  useDaysOfWeek,
} from '../../hooks/useReports'
import { formatCurrency } from '../../utils/format'
import {
  todayStr, dayBounds, monthBounds, anoBounds,
  monthLabel, dayLabel, formatDateRange, pct, variacao, paymentLabel, paymentColor,
} from './financeiro-utils'

const CHANNEL_OPTIONS = [
  { v: undefined,  l: 'Todos os canais' },
  { v: 'delivery', l: 'Delivery' },
  { v: 'mesa',     l: 'Mesa' },
  { v: 'balcao',   l: 'Balcão' },
]

const periodoHoje = () => {
  const date = todayStr()
  const { from, to } = dayBounds(date)
  return { nivel: 'dia', label: `Hoje, ${dayLabel(date)}`, from, to }
}

// ─── Pedacinhos de UI reaproveitados ───────────────────────────────────────

function RevenueRow({ title, subtitle, total, ordersCount, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between py-3 border-b border-gray-50 last:border-0 text-left"
    >
      <div>
        <p className="text-sm font-medium text-secondary">{title}</p>
        {subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-2">
        <div className="text-right">
          <p className="text-sm font-semibold text-secondary">{formatCurrency(total)}</p>
          {ordersCount != null && <p className="text-[11px] text-gray-400">{ordersCount} pedido(s)</p>}
        </div>
        <ChevronRight size={16} className="text-gray-300" />
      </div>
    </button>
  )
}

function BackHeader({ label, onBack }) {
  return (
    <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-primary font-medium mb-3">
      <ChevronLeft size={16} />
      {label}
    </button>
  )
}

function VarBadge({ value }) {
  if (value == null || !isFinite(value)) return null
  const positivo = value >= 0
  return (
    <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded-md ${positivo ? 'bg-success/15 text-green-700' : 'bg-danger/15 text-red-700'}`}>
      {positivo ? '▲' : '▼'} {pct(value)}
    </span>
  )
}

function KpiCard({ label, value, sub, varValue }) {
  return (
    <Card>
      <p className="text-xs font-medium text-gray-400 mb-1">{label}</p>
      <div className="flex items-center gap-2 flex-wrap">
        <p className="text-lg font-bold text-secondary">{value}</p>
        <VarBadge value={varValue} />
      </div>
      {sub && <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>}
    </Card>
  )
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-secondary text-white text-xs rounded-lg px-3 py-2 shadow-lg">
      <p className="font-semibold mb-0.5">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey}>{p.name}: {formatCurrency(p.value)}</p>
      ))}
    </div>
  )
}

function EvolucaoChart({ periods, seriesB, labelA, labelB }) {
  if (!periods || periods.length < 2) return null
  const data = periods.map((p, i) => ({
    label: p.label,
    a: p.total,
    ...(seriesB ? { b: seriesB[i]?.total ?? null } : {}),
  }))
  return (
    <div className="h-48 -mx-2">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
          <defs>
            <linearGradient id="corA" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#FF6B2C" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#FF6B2C" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="corB" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#1A1A2E" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#1A1A2E" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0F0F0" />
          <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
          <YAxis hide />
          <Tooltip content={<ChartTooltip />} />
          <Area type="monotone" dataKey="a" name={labelA || 'Faturamento'} stroke="#FF6B2C" fill="url(#corA)" strokeWidth={2} />
          {seriesB && <Area type="monotone" dataKey="b" name={labelB} stroke="#1A1A2E" fill="url(#corB)" strokeWidth={2} />}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

// ─── Seletor de período: drill-down Ano → Mês → Semana → Dia ──────────────

function SeletorPeriodo({ orderType, onPick }) {
  const [ano, setAno] = useState(new Date().getFullYear())
  const [mes, setMes] = useState(null)   // 'AAAA-MM'
  const [semana, setSemana] = useState(null) // { label, from, to }

  const anoRange = useMemo(() => anoBounds(ano), [ano])
  const { data: mesesDoAno, isLoading: loadingAno } = useRevenueRange(anoRange.from, anoRange.to, 'monthly', orderType)
  const { data: weeks, isLoading: loadingWeeks } = useWeeksOfMonth(mes, orderType)
  const { data: daysData, isLoading: loadingDays } = useDaysOfWeek(semana?.from, semana?.to, orderType)

  // Nível 3: dias da semana selecionada
  if (semana) {
    const periods = daysData?.periods || []
    return (
      <div>
        <BackHeader label={`${monthLabel(mes)} · ${semana.label}`} onBack={() => setSemana(null)} />
        <Button variant="secondary" full className="mb-3 !min-h-[40px] text-sm" onClick={() => onPick({
          nivel: 'semana', label: `${semana.label} · ${monthLabel(mes)}`, from: semana.from, to: semana.to,
        })}>
          Ver semana completa
        </Button>
        {loadingDays ? <LoadingSpinner /> : periods.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">Nenhum pedido nessa semana.</p>
        ) : (
          <Card>
            {periods.map((p) => {
              const { from, to } = dayBounds(p.label)
              return (
                <RevenueRow key={p.label} title={dayLabel(p.label)} total={p.total} ordersCount={p.ordersCount}
                  onClick={() => onPick({ nivel: 'dia', label: dayLabel(p.label), from, to })} />
              )
            })}
          </Card>
        )}
      </div>
    )
  }

  // Nível 2: semanas do mês selecionado
  if (mes) {
    return (
      <div>
        <BackHeader label="Meses" onBack={() => setMes(null)} />
        <Button variant="secondary" full className="mb-3 !min-h-[40px] text-sm" onClick={() => {
          const { from, to } = monthBounds(mes)
          onPick({ nivel: 'mes', label: monthLabel(mes), from, to })
        }}>
          Ver mês completo
        </Button>
        {loadingWeeks ? <LoadingSpinner /> : !weeks || weeks.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">Nenhum pedido neste mês.</p>
        ) : (
          <Card>
            {weeks.map((w) => (
              <RevenueRow key={w.label} title={w.label} subtitle={formatDateRange(w.from, w.to)}
                total={w.total} ordersCount={w.ordersCount} onClick={() => setSemana(w)} />
            ))}
          </Card>
        )}
      </div>
    )
  }

  // Nível 1: meses do ano selecionado
  const mesesRows = (mesesDoAno?.periods || [])
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <button onClick={() => setAno((a) => a - 1)} className="p-2 rounded-lg active:bg-gray-100"><ChevronLeft size={18} /></button>
        <p className="font-semibold text-secondary">{ano}</p>
        <button onClick={() => setAno((a) => a + 1)} disabled={ano >= new Date().getFullYear()} className="p-2 rounded-lg active:bg-gray-100 disabled:opacity-30"><ChevronRight size={18} /></button>
      </div>
      <Button variant="secondary" full className="mb-3 !min-h-[40px] text-sm" onClick={() => {
        const { from, to } = anoRange
        onPick({ nivel: 'ano', label: `Ano de ${ano}`, from, to })
      }}>
        Ver ano completo
      </Button>
      {loadingAno ? <LoadingSpinner /> : mesesRows.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">Nenhum pedido em {ano}.</p>
      ) : (
        <Card>
          {mesesRows.slice().reverse().map((m) => (
            <RevenueRow key={m.label} title={monthLabel(m.label)} total={m.total} ordersCount={m.ordersCount}
              onClick={() => setMes(m.label)} />
          ))}
        </Card>
      )}
    </div>
  )
}

// ─── Modal "Escolher período" — ver um período ou comparar dois ───────────

function ModalEscolherPeriodo({ open, onClose, orderType, onPickUnico, onPickComparacao }) {
  const [aba, setAba] = useState('ver') // 'ver' | 'comparar'
  const [a, setA] = useState(null)
  const [b, setB] = useState(null)

  const fechar = () => {
    setAba('ver'); setA(null); setB(null)
    onClose()
  }

  return (
    <Modal open={open} onClose={fechar} title="Escolher período">
      <div className="flex bg-gray-100 rounded-xl p-1 mb-4">
        {[{ v: 'ver', l: 'Ver período' }, { v: 'comparar', l: 'Comparar dois períodos' }].map((t) => (
          <button key={t.v} onClick={() => setAba(t.v)}
            className={`flex-1 text-xs font-medium py-2 rounded-lg transition-colors ${aba === t.v ? 'bg-white text-secondary shadow-sm' : 'text-gray-400'}`}>
            {t.l}
          </button>
        ))}
      </div>

      {aba === 'ver' ? (
        <SeletorPeriodo orderType={orderType} onPick={(p) => { onPickUnico(p); fechar() }} />
      ) : (
        <div>
          {!a ? (
            <>
              <p className="text-sm font-medium text-secondary mb-2">Primeiro período</p>
              <SeletorPeriodo orderType={orderType} onPick={setA} />
            </>
          ) : !b ? (
            <>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-secondary">Segundo período</p>
                <button onClick={() => setA(null)} className="text-xs text-primary font-medium">trocar 1º período</button>
              </div>
              <div className="mb-3 px-3 py-2 rounded-xl bg-gray-50 text-xs text-gray-500">
                Comparando com: <span className="font-semibold text-secondary">{a.label}</span>
              </div>
              <SeletorPeriodo orderType={orderType} onPick={setB} />
            </>
          ) : (
            <div>
              <p className="text-sm text-gray-500 mb-4">
                Comparar <span className="font-semibold text-secondary">{a.label}</span> com{' '}
                <span className="font-semibold text-secondary">{b.label}</span>?
              </p>
              <div className="flex gap-2 mb-3">
                <button onClick={() => setA(null)} className="flex-1 text-xs text-gray-500 border border-gray-200 rounded-xl py-2">trocar 1º</button>
                <button onClick={() => setB(null)} className="flex-1 text-xs text-gray-500 border border-gray-200 rounded-xl py-2">trocar 2º</button>
              </div>
              <Button full onClick={() => { onPickComparacao({ a, b }); fechar() }}>
                Comparar {a.label} com {b.label}
              </Button>
            </div>
          )}
        </div>
      )}
    </Modal>
  )
}

// ─── Dados de um período (faturamento + entregadores + pagamento + produtos) ─

function useDadosPeriodo(periodo, orderType) {
  const groupBy = periodo?.nivel === 'ano' ? 'monthly' : 'daily'
  const revenue      = useRevenueRange(periodo?.from, periodo?.to, groupBy, orderType)
  const deliverers   = useDelivererRevenueReport('daily', orderType, periodo?.from, periodo?.to)
  const payMethods   = usePaymentMethodsReport(periodo?.from, periodo?.to, orderType)
  const products     = useTopProductsReport(periodo?.from, periodo?.to, orderType)
  const isLoading = !periodo || revenue.isLoading || deliverers.isLoading || payMethods.isLoading || products.isLoading
  return {
    isLoading,
    revenue: revenue.data,
    deliverers: deliverers.data || [],
    paymentMethods: payMethods.data || [],
    products: products.data || [],
  }
}

function PaymentBreakdownCard({ paymentMethods, total }) {
  if (!paymentMethods || paymentMethods.length === 0) {
    return <Card><p className="text-sm text-gray-400 text-center py-4">Nenhum pagamento neste período.</p></Card>
  }
  return (
    <Card>
      <p className="text-xs font-medium text-gray-400 mb-3">Faturamento por forma de pagamento</p>
      <div className="space-y-2.5">
        {paymentMethods.map((p) => {
          const fatia = total > 0 ? (p.total / total) * 100 : 0
          return (
            <div key={p.paymentMethod}>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-medium text-secondary">{paymentLabel(p.paymentMethod)}</span>
                <span className="text-gray-400">{formatCurrency(p.total)} · {fatia.toFixed(0)}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${fatia}%`, backgroundColor: paymentColor(p.paymentMethod) }} />
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}

function ProductsCard({ products, title = 'Produtos mais vendidos' }) {
  if (!products || products.length === 0) {
    return <Card><p className="text-sm text-gray-400 text-center py-4">Nenhum produto vendido neste período.</p></Card>
  }
  return (
    <Card>
      <p className="text-xs font-medium text-gray-400 mb-3">{title}</p>
      <div className="space-y-2">
        {products.map((p, i) => (
          <div key={p.productId || p.nome} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xs font-bold text-gray-300 w-4 flex-shrink-0">{i + 1}</span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-secondary truncate">{p.nome}</p>
                <p className="text-xs text-gray-400">{p.qtd} vendido(s)</p>
              </div>
            </div>
            <p className="text-sm font-semibold text-secondary flex-shrink-0">{formatCurrency(p.total)}</p>
          </div>
        ))}
      </div>
    </Card>
  )
}

function DeliverersCard({ deliverers }) {
  return (
    <Card>
      <p className="text-xs font-medium text-gray-400 mb-3">Taxa de entrega por entregador</p>
      {!deliverers || deliverers.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-4">Nenhuma entrega neste período.</p>
      ) : (
        <div className="space-y-2">
          {deliverers.map((d) => (
            <div key={d.delivererId} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
              <div>
                <p className="text-sm font-medium">{d.delivererName}</p>
                <p className="text-xs text-gray-400">{d.deliveriesCount} entrega(s)</p>
              </div>
              <p className="text-sm font-semibold text-secondary">{formatCurrency(d.deliveryRevenue)}</p>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

// ─── Visão de um único período ─────────────────────────────────────────────

function PainelPeriodo({ periodo, orderType }) {
  const { isLoading, revenue, deliverers, paymentMethods, products } = useDadosPeriodo(periodo, orderType)

  if (isLoading) return <LoadingSpinner />
  const totals = revenue?.totals || { total: 0, ordersCount: 0, orderRevenue: 0, deliveryRevenue: 0, cancelledCount: 0 }
  const ticketMedio = totals.ordersCount > 0 ? totals.total / totals.ordersCount : 0

  return (
    <div>
      <EvolucaoChart periods={revenue?.periods} />
      <div className="grid grid-cols-2 gap-3 my-4">
        <KpiCard label="Faturamento total" value={formatCurrency(totals.total)} />
        <KpiCard label="Pedidos" value={totals.ordersCount} />
        <KpiCard label="Ticket médio" value={formatCurrency(ticketMedio)} />
        <KpiCard label="Cancelados" value={totals.cancelledCount || 0} />
        <KpiCard label="Receita de pedidos" value={formatCurrency(totals.orderRevenue)} />
        <KpiCard label="Receita de entregas" value={formatCurrency(totals.deliveryRevenue)} />
      </div>
      <div className="space-y-3">
        <PaymentBreakdownCard paymentMethods={paymentMethods} total={totals.total} />
        <ProductsCard products={products} />
        <DeliverersCard deliverers={deliverers} />
      </div>
    </div>
  )
}

// ─── Visão comparativa de dois períodos ────────────────────────────────────

function KpiComparativoRow({ label, valorA, valorB, labelA, labelB, formatFn = (v) => v }) {
  const v = variacao(valorB, valorA)
  return (
    <Card>
      <p className="text-xs font-medium text-gray-400 mb-2">{label}</p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-[11px] text-gray-400">{labelA}</p>
          <p className="text-base font-bold text-secondary">{formatFn(valorA)}</p>
        </div>
        <div>
          <p className="text-[11px] text-gray-400 flex items-center gap-1">{labelB} <VarBadge value={v} /></p>
          <p className="text-base font-bold text-secondary">{formatFn(valorB)}</p>
        </div>
      </div>
    </Card>
  )
}

function BarraComparativa({ title, itensA, itensB, keyFn, labelFn, colorFn, labelA, labelB }) {
  const chaves = Array.from(new Set([...(itensA || []).map(keyFn), ...(itensB || []).map(keyFn)]))
  if (chaves.length === 0) return <Card><p className="text-sm text-gray-400 text-center py-4">Sem dados neste comparativo.</p></Card>
  const maiorValor = Math.max(1, ...chaves.map((k) => {
    const a = (itensA || []).find((it) => keyFn(it) === k)
    const b = (itensB || []).find((it) => keyFn(it) === k)
    return Math.max(a?.total || 0, b?.total || 0)
  }))

  return (
    <Card>
      <p className="text-xs font-medium text-gray-400 mb-3">{title}</p>
      <div className="space-y-3">
        {chaves.map((k) => {
          const a = (itensA || []).find((it) => keyFn(it) === k)
          const b = (itensB || []).find((it) => keyFn(it) === k)
          return (
            <div key={k}>
              <p className="text-xs font-medium text-secondary mb-1">{labelFn(k)}</p>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="h-2 rounded-full flex-1 bg-gray-100 overflow-hidden">
                    <div className="h-full rounded-full opacity-50" style={{ width: `${((a?.total || 0) / maiorValor) * 100}%`, backgroundColor: colorFn(k) }} />
                  </div>
                  <span className="text-[11px] text-gray-400 w-20 text-right flex-shrink-0">{formatCurrency(a?.total || 0)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2 rounded-full flex-1 bg-gray-100 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${((b?.total || 0) / maiorValor) * 100}%`, backgroundColor: colorFn(k) }} />
                  </div>
                  <span className="text-[11px] text-gray-400 w-20 text-right flex-shrink-0">{formatCurrency(b?.total || 0)}</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
      <div className="flex items-center gap-4 mt-3 text-[11px] text-gray-400">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-300 opacity-50" />{labelA}</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-300" />{labelB}</span>
      </div>
    </Card>
  )
}

function PainelComparacao({ a, b, orderType }) {
  const dadosA = useDadosPeriodo(a, orderType)
  const dadosB = useDadosPeriodo(b, orderType)

  if (dadosA.isLoading || dadosB.isLoading) return <LoadingSpinner />

  const totalsA = dadosA.revenue?.totals || {}
  const totalsB = dadosB.revenue?.totals || {}
  const ticketA = totalsA.ordersCount > 0 ? totalsA.total / totalsA.ordersCount : 0
  const ticketB = totalsB.ordersCount > 0 ? totalsB.total / totalsB.ordersCount : 0

  const mesmaGranularidade = a.nivel === b.nivel

  return (
    <div>
      <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-xl bg-gray-50 text-xs text-gray-500">
        <span className="w-2 h-2 rounded-full bg-gray-400" />
        <span className="font-medium text-secondary">{a.label}</span>
        <span>vs</span>
        <span className="w-2 h-2 rounded-full bg-secondary" />
        <span className="font-medium text-secondary">{b.label}</span>
      </div>

      {mesmaGranularidade && (
        <EvolucaoChart periods={dadosA.revenue?.periods} seriesB={dadosB.revenue?.periods} labelA={a.label} labelB={b.label} />
      )}

      <div className="space-y-3 my-4">
        <KpiComparativoRow label="Faturamento total" valorA={totalsA.total} valorB={totalsB.total} labelA={a.label} labelB={b.label} formatFn={formatCurrency} />
        <div className="grid grid-cols-2 gap-3">
          <KpiComparativoRow label="Pedidos" valorA={totalsA.ordersCount} valorB={totalsB.ordersCount} labelA={a.label} labelB={b.label} />
          <KpiComparativoRow label="Ticket médio" valorA={ticketA} valorB={ticketB} labelA={a.label} labelB={b.label} formatFn={formatCurrency} />
          <KpiComparativoRow label="Cancelados" valorA={totalsA.cancelledCount || 0} valorB={totalsB.cancelledCount || 0} labelA={a.label} labelB={b.label} />
          <KpiComparativoRow label="Receita de entregas" valorA={totalsA.deliveryRevenue} valorB={totalsB.deliveryRevenue} labelA={a.label} labelB={b.label} formatFn={formatCurrency} />
        </div>
      </div>

      <div className="space-y-3">
        <BarraComparativa
          title="Forma de pagamento"
          itensA={dadosA.paymentMethods} itensB={dadosB.paymentMethods}
          keyFn={(it) => it.paymentMethod} labelFn={paymentLabel} colorFn={paymentColor}
          labelA={a.label} labelB={b.label}
        />
        <BarraComparativa
          title="Entregadores"
          itensA={dadosA.deliverers} itensB={dadosB.deliverers}
          keyFn={(it) => it.delivererId} labelFn={(k) => (dadosA.deliverers.find((d) => d.delivererId === k) || dadosB.deliverers.find((d) => d.delivererId === k))?.delivererName || '—'}
          colorFn={() => '#FF6B2C'}
          labelA={a.label} labelB={b.label}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <ProductsCard products={dadosA.products} title={`Mais vendidos · ${a.label}`} />
          <ProductsCard products={dadosB.products} title={`Mais vendidos · ${b.label}`} />
        </div>
      </div>
    </div>
  )
}

// ─── Página principal ──────────────────────────────────────────────────────

export default function ReportsPage() {
  const [orderType, setOrderType] = useState(undefined)
  const [modo, setModo] = useState('unico') // 'unico' | 'comparacao'
  const [periodo, setPeriodo] = useState(periodoHoje())
  const [comparacao, setComparacao] = useState(null)
  const [modalAberto, setModalAberto] = useState(false)

  return (
    <div>
      <TopBar
        title="Relatórios"
        subtitle="Faturamento do restaurante"
        back
        right={
          <button
            onClick={() => setModalAberto(true)}
            className="flex items-center gap-1.5 text-xs font-semibold text-primary border border-primary/30 rounded-lg px-2.5 py-1.5"
          >
            <CalendarRange size={14} /> Escolher período
          </button>
        }
      />

      <div className="page">
        <div className="flex gap-2 overflow-x-auto pb-1 mb-3 scrollbar-hide">
          {CHANNEL_OPTIONS.map((c) => (
            <button
              key={c.l}
              onClick={() => setOrderType(c.v)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border ${
                orderType === c.v ? 'border-secondary bg-secondary text-white' : 'border-gray-200 bg-surface text-gray-500'
              }`}
            >
              {c.l}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-secondary">
            {modo === 'comparacao' ? 'Comparativo' : periodo.label}
          </p>
          {modo === 'comparacao' && (
            <button onClick={() => setModo('unico')} className="flex items-center gap-1 text-xs text-gray-400">
              <X size={12} /> sair do comparativo
            </button>
          )}
        </div>

        {modo === 'comparacao' && comparacao
          ? <PainelComparacao a={comparacao.a} b={comparacao.b} orderType={orderType} />
          : <PainelPeriodo periodo={periodo} orderType={orderType} />}
      </div>

      <ModalEscolherPeriodo
        open={modalAberto}
        onClose={() => setModalAberto(false)}
        orderType={orderType}
        onPickUnico={(p) => { setPeriodo(p); setModo('unico') }}
        onPickComparacao={(c) => { setComparacao(c); setModo('comparacao') }}
      />
    </div>
  )
}
