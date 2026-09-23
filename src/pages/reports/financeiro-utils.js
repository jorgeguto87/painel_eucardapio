// Helpers de data/label do painel financeiro. Os limites de dia/mês/ano
// usam offset fixo -03:00 (America/Sao_Paulo, sem horário de verão desde
// 2019) — mesma convenção usada no backend (report.service.js) pra bater
// exatamente com o fuso em que os pedidos são agrupados.

export const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
export const MESES_ABREV = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

const pad2 = (n) => String(n).padStart(2, '0')

export const todayStr = () => {
  const d = new Date()
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

export const dayBounds = (dateStr) => ({
  from: new Date(`${dateStr}T00:00:00-03:00`),
  to:   new Date(`${dateStr}T23:59:59.999-03:00`),
})

export const monthBounds = (monthStr) => {
  const [y, m] = monthStr.split('-').map(Number)
  const from = new Date(`${monthStr}-01T00:00:00-03:00`)
  const nextY = m === 12 ? y + 1 : y
  const nextM = m === 12 ? 1 : m + 1
  const to = new Date(new Date(`${nextY}-${pad2(nextM)}-01T00:00:00-03:00`).getTime() - 1)
  return { from, to }
}

export const anoBounds = (ano) => ({
  from: new Date(`${ano}-01-01T00:00:00-03:00`),
  to:   new Date(`${ano}-12-31T23:59:59.999-03:00`),
})

export const monthLabel = (ym) => {
  const [y, m] = ym.split('-')
  return `${MESES[parseInt(m, 10) - 1]} de ${y}`
}

export const dayLabel = (isoDay) => {
  const [, m, d] = isoDay.split('-')
  return `${d} de ${MESES[parseInt(m, 10) - 1]}`
}

export const formatDateRange = (from, to) => {
  const f = new Date(from), t = new Date(to)
  const fmt = (d) => `${pad2(d.getDate())}/${MESES_ABREV[d.getMonth()]}`
  return `${fmt(f)} – ${fmt(t)}`
}

export const pct = (v) =>
  `${Math.abs(v).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`

// null quando não dá pra calcular variação (sem base de comparação)
export const variacao = (atual, anterior) => {
  if (!anterior) return null
  return ((atual - anterior) / anterior) * 100
}

// A quebra por forma de pagamento no relatório (getPaymentMethodBreakdown,
// no backend) não usa mais o valor cru de `paymentMethod` — ele agrupa
// "cash_on_delivery" em 3 grupos diferentes conforme o tipo do pedido
// (mesa_local / balcao_local / entrega_local), porque esse mesmo valor por
// baixo do capô representa "pago à mesa", "pago no balcão" e "pago na
// entrega" ao mesmo tempo, e mostrar tudo como "Pagamento na entrega" era
// exatamente o bug relatado (pedido de mesa/balcão aparecendo como entrega).
// `cash_on_delivery` continua aqui só de fallback, caso algum relatório
// antigo/outro consumidor ainda mande o valor cru.
export const PAYMENT_LABELS = {
  pix:              'Pix',
  credit_card:      'Cartão de crédito',
  debit_card:       'Cartão de débito',
  pix_manual:       'Pix avulso',
  mesa_local:       'Pago na mesa',
  balcao_local:     'Pago no balcão',
  entrega_local:    'Pago na entrega',
  cash_on_delivery: 'Pagamento na entrega',
}

export const PAYMENT_COLORS = {
  pix:              '#22C55E',
  credit_card:      '#FF6B2C',
  debit_card:       '#FF8C5A',
  pix_manual:       '#1A1A2E',
  mesa_local:       '#6366F1',
  balcao_local:     '#0EA5E9',
  entrega_local:    '#F59E0B',
  cash_on_delivery: '#F59E0B',
}

export const paymentLabel = (key) => PAYMENT_LABELS[key] || key
export const paymentColor = (key) => PAYMENT_COLORS[key] || '#9CA3AF'
