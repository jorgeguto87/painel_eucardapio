import { useQuery } from '@tanstack/react-query'
import api from '../config/api'

const iso = (d) => (d ? new Date(d).toISOString() : undefined)

export const useRevenueReport = (period, orderType) =>
  useQuery({
    queryKey: ['reports', 'revenue', period, orderType],
    queryFn:  async () => (await api.get('/reports/revenue', { params: { period, orderType } })).data.data,
  })

// Faturamento de um intervalo arbitrário (usado pelo seletor de período e
// pelo comparativo) — period define só o agrupamento da série (diário pra
// semana/mês, mensal pro ano), from/to definem o intervalo real.
export const useRevenueRange = (from, to, period, orderType) =>
  useQuery({
    queryKey: ['reports', 'revenue-range', from, to, period, orderType],
    queryFn:  async () => (await api.get('/reports/revenue', {
      params: { period, from: iso(from), to: iso(to), orderType },
    })).data.data,
    enabled: !!from && !!to,
  })

export const useDelivererRevenueReport = (period, orderType, from, to) =>
  useQuery({
    queryKey: ['reports', 'revenue-deliverers', period, orderType, from, to],
    queryFn:  async () => (await api.get('/reports/revenue/deliverers', {
      params: { period, orderType, from: iso(from), to: iso(to) },
    })).data.data.deliverers,
    enabled: from !== undefined ? (!!from && !!to) : true,
  })

export const usePaymentMethodsReport = (from, to, orderType) =>
  useQuery({
    queryKey: ['reports', 'payment-methods', from, to, orderType],
    queryFn:  async () => (await api.get('/reports/revenue/payment-methods', {
      params: { from: iso(from), to: iso(to), orderType },
    })).data.data.paymentMethods,
    enabled: !!from && !!to,
  })

export const useTopProductsReport = (from, to, orderType, limit = 10) =>
  useQuery({
    queryKey: ['reports', 'products', from, to, orderType, limit],
    queryFn:  async () => (await api.get('/reports/revenue/products', {
      params: { from: iso(from), to: iso(to), orderType, limit },
    })).data.data.products,
    enabled: !!from && !!to,
  })

export const useMonthsReport = (orderType) =>
  useQuery({
    queryKey: ['reports', 'months', orderType],
    queryFn:  async () => (await api.get('/reports/months', { params: { orderType } })).data.data.months,
  })

export const useWeeksOfMonth = (month, orderType) =>
  useQuery({
    queryKey: ['reports', 'weeks', month, orderType],
    queryFn:  async () => (await api.get('/reports/weeks', { params: { month, orderType } })).data.data.weeks,
    enabled: !!month,
  })

export const useDaysOfWeek = (from, to, orderType) =>
  useQuery({
    queryKey: ['reports', 'days-of-week', from, to, orderType],
    queryFn:  async () => (await api.get('/reports/revenue', {
      params: { period: 'daily', from: iso(from), to: iso(to), orderType },
    })).data.data,
    enabled: !!from && !!to,
  })

export const useDayDetail = (date, orderType) =>
  useQuery({
    queryKey: ['reports', 'day', date, orderType],
    queryFn:  async () => (await api.get('/reports/day', { params: { date, orderType } })).data.data,
    enabled: !!date,
  })
