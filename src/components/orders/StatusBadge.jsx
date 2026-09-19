// Cor de destaque por status, pra pintar a faixinha lateral dos cards e o
// contador das colunas do quadro. As mesmas 6 fases reais do sistema (sem
// "pronto", que só existe no protótipo de layout e nunca existiu no
// backend). O texto/emoji de cada status continua vindo do Badge.jsx
// já existente — não duplicamos os rótulos.
export const STATUS_TONE = {
  recebido:     { bar: 'bg-blue-500',   soft: 'bg-blue-50',   text: 'text-blue-700' },
  pago:         { bar: 'bg-purple-500', soft: 'bg-purple-50', text: 'text-purple-700' },
  preparo:      { bar: 'bg-warning',    soft: 'bg-warning/10', text: 'text-yellow-700' },
  saiu_entrega: { bar: 'bg-orange-500', soft: 'bg-orange-50', text: 'text-orange-700' },
  finalizado:   { bar: 'bg-success',    soft: 'bg-success/10', text: 'text-green-700' },
  cancelado:    { bar: 'bg-danger',     soft: 'bg-danger/10', text: 'text-red-700' },
}

export const STATUS_FILTER_LABEL = {
  '':           'Todos',
  recebido:     'Novos',
  pago:         'Pagos',
  preparo:      'Preparo',
  saiu_entrega: 'Entrega',
  finalizado:   'Concluídos',
  cancelado:    'Cancelados',
}

export const TYPE_FILTER_LABEL = {
  '':       'Todos os canais',
  delivery: 'Delivery',
  mesa:     'Mesa',
  balcao:   'Balcão',
}
