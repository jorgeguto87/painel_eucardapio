import { useQuery } from '@tanstack/react-query'
import api from '../config/api'

export const useRevenueReport = (period, orderType) =>
  useQuery({
    queryKey: ['reports', 'revenue', period, orderType],
    queryFn:  async () => (await api.get('/reports/revenue', { params: { period, orderType } })).data.data,
  })

export const useDelivererRevenueReport = (period, orderType) =>
  useQuery({
    queryKey: ['reports', 'revenue-deliverers', period, orderType],
    queryFn:  async () => (await api.get('/reports/revenue/deliverers', { params: { period, orderType } })).data.data,
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
      params: { period: 'daily', from: new Date(from).toISOString(), to: new Date(to).toISOString(), orderType },
    })).data.data,
    enabled: !!from && !!to,
  })

export const useDayDetail = (date, orderType) =>
  useQuery({
    queryKey: ['reports', 'day', date, orderType],
    queryFn:  async () => (await api.get('/reports/day', { params: { date, orderType } })).data.data,
    enabled: !!date,
  })
