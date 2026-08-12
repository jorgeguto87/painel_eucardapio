/**
 * Formata centavos para reais.
 * Ex: 4250 → "R$ 42,50"
 */
export const formatCurrency = (cents = 0) => {
  return `R$ ${(cents / 100).toFixed(2).replace('.', ',')}`
}

/**
 * Converte reais (string ou número) para centavos.
 * Ex: "42,50" → 4250
 */
export const toCents = (value) => {
  const num = typeof value === 'string'
    ? parseFloat(value.replace(',', '.'))
    : value
  return Math.round((num || 0) * 100)
}

/**
 * Converte centavos para reais (número, para inputs).
 * Ex: 4250 → 42.50
 */
export const toReais = (cents = 0) => cents / 100

/**
 * Formata apenas a data (sem hora). Ex: 2026-08-15T... → "15/08/2026"
 */
export const formatDate = (date) => {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('pt-BR')
}

/**
 * Formata data/hora relativa simples.
 */
export const formatDateTime = (date) => {
  return new Date(date).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

export const formatShortId = (id = '') => id.slice(-6).toUpperCase()
