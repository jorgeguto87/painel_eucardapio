const STATUS_STYLES = {
  recebido:     'bg-blue-100 text-blue-700',
  pago:         'bg-purple-100 text-purple-700',
  preparo:      'bg-warning/20 text-yellow-700',
  saiu_entrega: 'bg-orange-100 text-orange-700',
  finalizado:   'bg-success/20 text-green-700',
  cancelado:    'bg-danger/20 text-red-700',
  // WhatsApp
  connected:    'bg-success/20 text-green-700',
  disconnected: 'bg-gray-100 text-gray-500',
  connecting:   'bg-yellow-100 text-yellow-700',
  error:        'bg-danger/20 text-red-700',
  // Subscription
  trial:        'bg-blue-100 text-blue-700',
  active:       'bg-success/20 text-green-700',
  past_due:     'bg-warning/20 text-yellow-700',
  suspended:    'bg-danger/20 text-red-700',
  cancelled:    'bg-gray-100 text-gray-500',
}

const STATUS_LABELS = {
  recebido:     '📥 Recebido',
  pago:         '✅ Pago',
  preparo:      '👨‍🍳 Preparo',
  saiu_entrega: '🛵 Saiu',
  finalizado:   '🎉 Entregue',
  cancelado:    '❌ Cancelado',
  connected:    '🟢 Conectado',
  disconnected: '⚪ Desconectado',
  connecting:   '🟡 Conectando',
  error:        '🔴 Erro',
  trial:        'Trial',
  active:       'Ativa',
  past_due:     'Vencida',
  suspended:    'Suspensa',
  cancelled:    'Cancelada',
}

export default function Badge({ status, label, className = '' }) {
  const style = STATUS_STYLES[status] || 'bg-gray-100 text-gray-600'
  const text  = label || STATUS_LABELS[status] || status

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${style} ${className}`}>
      {text}
    </span>
  )
}
