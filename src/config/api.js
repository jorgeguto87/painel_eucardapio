import axios from 'axios'
import { tokenBridge, readPersistedAuth } from './tokenBridge'
import { authEvents } from './authEvents'

// Em dev, caminho relativo + proxy do Vite. Em produção, a API roda em
// domínio diferente (VPS), então precisa da URL pública via VITE_API_URL
// definida em .env.production antes do build.
export const API_BASE = import.meta.env.VITE_API_URL
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

// ─── Renovação de sessão (uma por vez, entre TODAS as abas) ───────────────────
//
// Antes: qualquer erro no refresh (inclusive queda de rede ou 500) deslogava,
// e duas abas abertas renovavam o MESMO refresh token ao mesmo tempo — o
// backend rotaciona (a 2ª tentativa recebe 401), então uma aba derrubava a
// outra. Agora:
//   - só existe UMA renovação em andamento por vez: entre abas via
//     navigator.locks (quando o navegador suporta) e, dentro da aba, pela
//     mesma promise compartilhada;
//   - antes de chamar o backend, confere o localStorage: se outra aba já
//     renovou enquanto esperávamos, só adota os tokens novos;
//   - só encerra a sessão quando o endpoint de refresh responde 401/403
//     (token realmente inválido/revogado, usuário/restaurante inativo).
//     Erro de rede/servidor mantém a sessão (a requisição falha, a próxima
//     tenta de novo).

const REFRESH_LOCK_NAME = 'eucardapio-painel-auth-refresh'
let inFlightRefresh = null

const sessionEndedError = (cause) => {
  const err = new Error('SESSION_ENDED')
  err.sessionEnded = true
  err.cause = cause
  return err
}

const adoptTokens = ({ accessToken, refreshToken }) => {
  tokenBridge.setTokens(accessToken, refreshToken)
  // Persiste no localStorage (via authStore, que escuta este evento) — as
  // outras abas recebem pelo evento 'storage'.
  authEvents.emitTokensRefreshed(accessToken, refreshToken)
  return accessToken
}

const performRefresh = async (failedAccessToken) => {
  // Outra aba (ou outra requisição desta) já renovou enquanto esperávamos a vez?
  const persisted = readPersistedAuth()
  if (persisted.accessToken && persisted.refreshToken && persisted.accessToken !== failedAccessToken) {
    return adoptTokens(persisted)
  }

  const refreshToken = persisted.refreshToken || tokenBridge.getRefreshToken()
  if (!refreshToken) throw sessionEndedError(null)

  try {
    const { data } = await axios.post(`${API_BASE}/auth/refresh`, { refreshToken })
    return adoptTokens({ accessToken: data.data.accessToken, refreshToken: data.data.refreshToken })
  } catch (err) {
    const status = err.response?.status
    if (status === 401 || status === 403) {
      // Sem navigator.locks, outra aba pode ter rotacionado o mesmo token
      // agora mesmo — se o localStorage já tem um par novo, usa ele.
      const again = readPersistedAuth()
      if (again.refreshToken && again.accessToken && again.refreshToken !== refreshToken) {
        return adoptTokens(again)
      }
      throw sessionEndedError(err)
    }
    throw err // rede/5xx: não derruba a sessão
  }
}

/**
 * Renova o access token (uma renovação por vez). Exportado para testes e
 * para quem precisar forçar uma renovação.
 */
export const refreshAccessToken = (failedAccessToken = tokenBridge.getAccessToken()) => {
  if (inFlightRefresh) return inFlightRefresh
  const run = () => performRefresh(failedAccessToken)
  const locks = typeof navigator !== 'undefined' ? navigator.locks : undefined
  const promise = locks?.request ? locks.request(REFRESH_LOCK_NAME, run) : run()
  inFlightRefresh = promise.finally(() => { inFlightRefresh = null })
  return inFlightRefresh
}

const endSession = () => {
  tokenBridge.clearTokens()
  authEvents.emitForceLogout('session_expired')
  if (window.location.pathname !== '/login') window.location.href = '/login'
}

// ─── Assinatura bloqueada (402 SUBSCRIPTION_REQUIRED) ─────────────────────────

export const SUBSCRIPTION_NOTICE_KEY = 'eucardapio:subscription-required'
let lastSubscriptionRedirectAt = 0

const handleSubscriptionRequired = (error) => {
  const message = error.response?.data?.error?.message
    || 'Sua assinatura está suspensa. Regularize o pagamento para voltar a usar o painel.'
  authEvents.emitSubscriptionRequired({ message })

  // Evita laço/rajada: várias requisições recebem 402 ao mesmo tempo.
  const now = Date.now()
  if (now - lastSubscriptionRedirectAt < 5000) return
  lastSubscriptionRedirectAt = now

  const role = readPersistedAuth().user?.role
  // Equipe (operator) não acessa /financeiro — só vê o aviso (o
  // listener no App mostra o toast), sem redirecionar.
  if (role === 'operator') return
  if (window.location.pathname.startsWith('/financeiro')) return

  try { window.sessionStorage.setItem(SUBSCRIPTION_NOTICE_KEY, message) } catch { /* sem storage */ }
  window.location.assign('/financeiro')
}

// ─── Response interceptor ──────────────────────────────────────────────────────
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config || {}
    const status = error.response?.status

    if (status === 402 && error.response?.data?.error?.code === 'SUBSCRIPTION_REQUIRED') {
      handleSubscriptionRequired(error)
      return Promise.reject(error)
    }

    if (status !== 401 || original._retry) {
      return Promise.reject(error)
    }

    // Não tenta refresh nas rotas de auth
    if (
      original.url?.includes('/auth/login') ||
      original.url?.includes('/auth/refresh') ||
      original.url?.includes('/auth/logout') ||
      original.url?.includes('/auth/handoff')
    ) {
      return Promise.reject(error)
    }

    original._retry = true
    const usedToken = String(original.headers?.Authorization || '').replace(/^Bearer\s+/i, '') || null

    try {
      const newAccess = await refreshAccessToken(usedToken)
      original.headers = original.headers || {}
      original.headers.Authorization = `Bearer ${newAccess}`
      return api(original)
    } catch (refreshError) {
      if (refreshError?.sessionEnded) {
        endSession()
        return Promise.reject(refreshError)
      }
      // Falha transitória: mantém a sessão, devolve o erro original.
      return Promise.reject(error)
    }
  },
)

export default api
