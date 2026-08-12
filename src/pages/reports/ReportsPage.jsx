import { useState } from 'react'
import { ChevronRight, ChevronLeft, Calendar } from 'lucide-react'
import TopBar from '../../components/layout/TopBar'
import Card from '../../components/ui/Card'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import {
  useRevenueReport,
  useMonthsReport,
  useWeeksOfMonth,
  useDaysOfWeek,
  useDayDetail,
} from '../../hooks/useReports'
import { formatCurrency } from '../../utils/format'

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const MESES_ABREV = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

const monthLabel = (ym) => {
  const [y, m] = ym.split('-')
  return `${MESES[parseInt(m, 10) - 1]} de ${y}`
}

const dayLabel = (isoDay) => {
  const [, m, d] = isoDay.split('-')
  return `${d} de ${MESES[parseInt(m, 10) - 1]}`
}

const shortDay = (isoDay) => {
  const [, m, d] = isoDay.split('-')
  return `${d}/${m}`
}

const formatDateRange = (from, to) => {
  const f = new Date(from), t = new Date(to)
  const fmt = (d) => `${String(d.getDate()).padStart(2,'0')}/${MESES_ABREV[d.getMonth()]}`
  return `${fmt(f)} – ${fmt(t)}`
}

// ─── Linha de item de lista clicável (mês, semana ou dia) ─────────────────

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

function DetailGrid({ totals, deliverers, loadingDeliverers }) {
  return (
    <>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <Card>
          <p className="text-xs font-medium text-gray-400 mb-1">Total</p>
          <p className="text-xl font-bold text-secondary">{formatCurrency(totals.total)}</p>
        </Card>
        <Card>
          <p className="text-xs font-medium text-gray-400 mb-1">Pedidos</p>
          <p className="text-xl font-bold text-secondary">{totals.ordersCount}</p>
        </Card>
        <Card>
          <p className="text-xs font-medium text-gray-400 mb-1">Receita de pedidos</p>
          <p className="text-lg font-semibold text-primary">{formatCurrency(totals.orderRevenue)}</p>
        </Card>
        <Card>
          <p className="text-xs font-medium text-gray-400 mb-1">Receita de entregas</p>
          <p className="text-lg font-semibold text-primary">{formatCurrency(totals.deliveryRevenue)}</p>
        </Card>
      </div>

      <Card>
        <p className="text-xs font-medium text-gray-400 mb-3">Taxa de entrega por entregador</p>
        {loadingDeliverers ? (
          <LoadingSpinner />
        ) : !deliverers || deliverers.length === 0 ? (
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
    </>
  )
}

// ─── Aba "Diário": lista dos últimos dias com receita, clicável ───────────

function DailyTab({ onSelectDay }) {
  const { data, isLoading } = useRevenueReport('daily')
  const periods = data?.periods || []

  if (isLoading) return <LoadingSpinner />
  if (periods.length === 0) return <p className="text-sm text-gray-400 text-center py-8">Nenhum pedido nos últimos 30 dias.</p>

  return (
    <Card>
      {periods.slice().reverse().map((p) => (
        <RevenueRow
          key={p.label}
          title={dayLabel(p.label)}
          total={p.total}
          ordersCount={p.ordersCount}
          onClick={() => onSelectDay(p.label)}
        />
      ))}
    </Card>
  )
}

// ─── Aba "Mensal": drill-down Mês → Semana → Dia → Detalhe ────────────────

function MonthlyTab({ onSelectDay }) {
  const [month, setMonth] = useState(null)
  const [week, setWeek] = useState(null) // { label, from, to }

  const { data: months, isLoading: loadingMonths } = useMonthsReport()
  const { data: weeks, isLoading: loadingWeeks } = useWeeksOfMonth(month)
  const { data: daysData, isLoading: loadingDays } = useDaysOfWeek(week?.from, week?.to)

  // Nível 3: dias da semana selecionada
  if (week) {
    const periods = daysData?.periods || []
    return (
      <div>
        <BackHeader label={`${monthLabel(month)} · ${week.label}`} onBack={() => setWeek(null)} />
        {loadingDays ? (
          <LoadingSpinner />
        ) : periods.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">Nenhum pedido nessa semana.</p>
        ) : (
          <Card>
            {periods.map((p) => (
              <RevenueRow
                key={p.label}
                title={dayLabel(p.label)}
                total={p.total}
                ordersCount={p.ordersCount}
                onClick={() => onSelectDay(p.label)}
              />
            ))}
          </Card>
        )}
      </div>
    )
  }

  // Nível 2: semanas do mês selecionado
  if (month) {
    return (
      <div>
        <BackHeader label="Meses" onBack={() => setMonth(null)} />
        {loadingWeeks ? (
          <LoadingSpinner />
        ) : !weeks || weeks.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">Nenhum pedido neste mês.</p>
        ) : (
          <Card>
            {weeks.map((w) => (
              <RevenueRow
                key={w.label}
                title={w.label}
                subtitle={formatDateRange(w.from, w.to)}
                total={w.total}
                ordersCount={w.ordersCount}
                onClick={() => setWeek(w)}
              />
            ))}
          </Card>
        )}
      </div>
    )
  }

  // Nível 1: lista de meses com receita
  if (loadingMonths) return <LoadingSpinner />
  if (!months || months.length === 0) return <p className="text-sm text-gray-400 text-center py-8">Nenhum pedido no último ano.</p>

  return (
    <Card>
      {months.map((m) => (
        <RevenueRow
          key={m.label}
          title={monthLabel(m.label)}
          total={m.total}
          ordersCount={m.ordersCount}
          onClick={() => setMonth(m.label)}
        />
      ))}
    </Card>
  )
}

// ─── Página principal ──────────────────────────────────────────────────────

export default function ReportsPage() {
  const [tab, setTab] = useState('daily') // 'daily' | 'monthly'
  const [selectedDate, setSelectedDate] = useState(null) // dia em detalhe (AAAA-MM-DD)

  const { data: dayDetail, isLoading: loadingDayDetail } = useDayDetail(selectedDate)

  // Tela de detalhe do dia (nível final, alcançável a partir de qualquer aba)
  if (selectedDate) {
    return (
      <div>
        <TopBar title="Relatórios" subtitle="Faturamento do restaurante" back />
        <div className="page">
          <BackHeader label={dayLabel(selectedDate)} onBack={() => setSelectedDate(null)} />
          {loadingDayDetail ? (
            <LoadingSpinner />
          ) : !dayDetail?.hasData ? (
            <p className="text-sm text-gray-400 text-center py-8">Nenhum pedido neste dia.</p>
          ) : (
            <DetailGrid
              totals={dayDetail.totals}
              deliverers={dayDetail.deliverers}
              loadingDeliverers={loadingDayDetail}
            />
          )}
        </div>
      </div>
    )
  }

  return (
    <div>
      <TopBar title="Relatórios" subtitle="Faturamento do restaurante" back />

      <div className="page">
        <div className="flex bg-gray-100 rounded-xl p-1 mb-4">
          {[{ v: 'daily', l: 'Diário' }, { v: 'monthly', l: 'Mensal' }].map((t) => (
            <button
              key={t.v}
              onClick={() => setTab(t.v)}
              className={`flex-1 text-xs font-medium py-2 rounded-lg transition-colors ${
                tab === t.v ? 'bg-white text-secondary shadow-sm' : 'text-gray-400'
              }`}
            >
              {t.l}
            </button>
          ))}
        </div>

        {tab === 'daily'
          ? <DailyTab onSelectDay={setSelectedDate} />
          : <MonthlyTab onSelectDay={setSelectedDate} />}
      </div>
    </div>
  )
}
