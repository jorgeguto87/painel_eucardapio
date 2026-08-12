import { create } from 'zustand'
import api from '../config/api'

const useRestaurantStore = create((set) => ({
  restaurant: null,
  isLoading:  false,

  fetchRestaurant: async () => {
    set({ isLoading: true })
    try {
      const { data } = await api.get('/restaurants/me')
      set({ restaurant: data.data, isLoading: false })
    } catch {
      set({ isLoading: false })
    }
  },

  updateRestaurant: async (updates) => {
    const { data } = await api.patch('/restaurants/me', updates)
    set({ restaurant: data.data })
    return data.data
  },
}))

export default useRestaurantStore
