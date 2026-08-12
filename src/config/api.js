import axios from 'axios'
import { tokenBridge } from './tokenBridge'
import { authEvents } from './authEvents'

// Em dev, caminho relativo + proxy do Vite. Em produção, a API roda em
// domínio diferente (VPS), então precisa da URL pública via VITE_API_URL
// definida em .env.production antes do build.
const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api'

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
})

// ─── Request interceptor — injeta access token ────────────────────────────────
api.interceptors.request.use((config) => {
  const token = tokenBridge.getAccessToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// ─── Response interceptor — refresh automático em 401 ────────────────────────
let isRefreshing = false
let failedQueue  = []

const processQueue = (error, token = null) => {
  failedQueue.forEach((p) => (error ? p.reject(error) : p.resolve(token)))
  failedQueue = []
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config

    if (error.response?.status !== 401 || original._retry) {
      return Promise.reject(error)
    }

    // Não tenta refresh nas rotas de auth
    if (
      original.url?.includes('/auth/login') ||
      original.url?.includes('/auth/refresh') ||
      original.url?.includes('/auth/logout')
    ) {
      return Promise.reject(error)
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => failedQueue.push({ resolve, reject }))
        .then((token) => {
          original.headers.Authorization = `Bearer ${token}`
          return api(original)
        })
        .catch((err) => Promise.reject(err))
    }

    original._retry = true
    isRefreshing    = true

    try {
      const refreshToken = tokenBridge.getRefreshToken()
      if (!refreshToken) throw new Error('Sem refresh token')

      const { data } = await axios.post(`${API_BASE}/auth/refresh`, { refreshToken })

      const newAccess  = data.data.accessToken
      const newRefresh = data.data.refreshToken

      tokenBridge.setTokens(newAccess, newRefresh)
      // Persiste também no localStorage (via authStore, que escuta este
      // evento) — sem isso, uma recarga de página usaria o refresh token
      // antigo já revogado.
      authEvents.emitTokensRefreshed(newAccess, newRefresh)

      original.headers.Authorization = `Bearer ${newAccess}`
      processQueue(null, newAccess)
      return api(original)
    } catch (refreshError) {
      processQueue(refreshError, null)
      tokenBridge.clearTokens()
      authEvents.emitForceLogout('session_expired')
      window.location.href = '/login'
      return Promise.reject(refreshError)
    } finally {
      isRefreshing = false
    }
  },
)

export default api