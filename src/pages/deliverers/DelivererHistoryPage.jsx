import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ChevronRight, ChevronLeft, MapPin } from 'lucide-react'
import TopBar from '../../components/layout/TopBar'
import Card from '../../components/ui/Card'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import { useDeliverers } from '../../hooks/useDeliverers'
import {
  useDelivererHistoryMonths,
  useDelivererHistoryWeeks,
  useDelivererHistoryDays,
  useDelivererHistoryDay,
} from '../../hooks/useOrders'
import { formatCurrency, formatShortId, formatDateTime } from '../../utils/format'

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

const formatDateRange = (from, to) => {
  const f = new Date(from), t = new Date(to)
  const fmt = (d) => `${String(d.getDate()).padStart(2,'0')}/${MESES_ABREV[d.getMonth()]}`
  return `${fmt(f)} – ${fmt(t)}`
}

function Row({ title, subtitle, count, onClick }) {
  return (
    <button onClick={onClick} className="w-full flex items-center justify-between py-3 border-b border-gray-50 last:border-0 text-left">
      <div>
        <p className="text-sm font-medium text-secondary">{title}</p>
        {subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-400">{count} entrega(s)</span>
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

export default function DelivererHistoryPage() {
  const { delivererId } = useParams()
  const navigate = useNavigate()
  const { data: deliverers } = useDeliverers()
  const deliverer = deliverers?.find((d) => d._id === delivererId)

  const [month, setMonth] = useState(null)
  const [week, setWeek] = useState(null)     // { label, from, to }
  const [selectedDate, setSelectedDate] = useState(null) // AAAA-MM-DD

  const { data: months, isLoading: loadingMonths } = useDelivererHistoryMonths(delivererId)
  const { data: weeks, isLoading: loadingWeeks } = useDelivererHistoryWeeks(delivererId, month)
  const { data: days, isLoading: loadingDays } = useDelivererHistoryDays(delivererId, week?.from, week?.to)
  const { data: dayData, isLoading: loadingDay } = useDelivererHistoryDay(delivererId, selectedDate)

  // Nível 4: lista de entregas de um dia específico
  if (selectedDate) {
    return (
      <div>
        <TopBar title={deliverer?.name || 'Entregador'} subtitle="Histórico de entregas" back />
        <div className="page">
          <BackHeader label={dayLabel(selectedDate)} onBack={() => setSelectedDate(null)} />
          {loadingDay ? (
            <LoadingSpinner />
          ) : !dayData?.orders || dayData.orders.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">Nenhuma entrega neste dia.</p>
          ) : (
            <div className="space-y-2">
              {dayData.orders.map((order) => (
                <Card key={order._id} className="!p-3" onClick={() => navigate(`/orders/${order._id}`)}>
                  <div className="flex items-start justify-between">
                    <div className="min-w-0">
                      <p className="font-semibold text-sm">#{formatShortId(order._id)}</p>
                      <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                        <MapPin size={11} />
                        {order.deliveryAddress?.street}, {order.deliveryAddress?.number}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">{formatDateTime(order.updatedAt)}</p>
                    </div>
                    <p className="font-semibold text-sm flex-shrink-0">{formatCurrency(order.total)}</p>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div>
      <TopBar title={deliverer?.name || 'Entregador'} subtitle="Histórico de entregas" back />

      <div className="page">
        {/* Nível 3: dias da semana selecionada */}
        {week ? (
          <div>
            <BackHeader label={`${monthLabel(month)} · ${week.label}`} onBack={() => setWeek(null)} />
            {loadingDays ? (
              <LoadingSpinner />
            ) : !days || days.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">Nenhuma entrega nessa semana.</p>
            ) : (
              <Card>
                {days.map((d) => (
                  <Row key={d.label} title={dayLabel(d.label)} count={d.count} onClick={() => setSelectedDate(d.label)} />
                ))}
              </Card>
            )}
          </div>
        ) : month ? (
          /* Nível 2: semanas do mês selecionado */
          <div>
            <BackHeader label="Meses" onBack={() => setMonth(null)} />
            {loadingWeeks ? (
              <LoadingSpinner />
            ) : !weeks || weeks.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">Nenhuma entrega neste mês.</p>
            ) : (
              <Card>
                {weeks.map((w) => (
                  <Row key={w.label} title={w.label} subtitle={formatDateRange(w.from, w.to)} count={w.count} onClick={() => setWeek(w)} />
                ))}
              </Card>
            )}
          </div>
        ) : (
          /* Nível 1: lista de meses com entregas */
          loadingMonths ? (
            <LoadingSpinner />
          ) : !months || months.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">Nenhuma entrega concluída ainda.</p>
          ) : (
            <Card>
              {months.map((m) => (
                <Row key={m.label} title={monthLabel(m.label)} count={m.count} onClick={() => setMonth(m.label)} />
              ))}
            </Card>
          )
        )}
      </div>
    </div>
  )
}
