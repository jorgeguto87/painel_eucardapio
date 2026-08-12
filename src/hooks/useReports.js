import { useQuery } from '@tanstack/react-query'
import api from '../config/api'

export const useRevenueReport = (period) =>
  useQuery({
    queryKey: ['reports', 'revenue', period],
    queryFn:  async () => (await api.get('/reports/revenue', { params: { period } })).data.data,
  })

export const useDelivererRevenueReport = (period) =>
  useQuery({
    queryKey: ['reports', 'revenue-deliverers', period],
    queryFn:  async () => (await api.get('/reports/revenue/deliverers', { params: { period } })).data.data,
  })

export const useMonthsReport = () =>
  useQuery({
    queryKey: ['reports', 'months'],
    queryFn:  async () => (await api.get('/reports/months')).data.data.months,
  })

export const useWeeksOfMonth = (month) =>
  useQuery({
    queryKey: ['reports', 'weeks', month],
    queryFn:  async () => (await api.get('/reports/weeks', { params: { month } })).data.data.weeks,
    enabled: !!month,
  })

export const useDaysOfWeek = (from, to) =>
  useQuery({
    queryKey: ['reports', 'days-of-week', from, to],
    queryFn:  async () => (await api.get('/reports/revenue', {
      params: { period: 'daily', from: new Date(from).toISOString(), to: new Date(to).toISOString() },
    })).data.data,
    enabled: !!from && !!to,
  })

export const useDayDetail = (date) =>
  useQuery({
    queryKey: ['reports', 'day', date],
    queryFn:  async () => (await api.get('/reports/day', { params: { date } })).data.data,
    enabled: !!date,
  })
