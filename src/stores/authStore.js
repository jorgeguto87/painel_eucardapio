import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import api from '../config/api'
import { tokenBridge, AUTH_STORAGE_KEY } from '../config/tokenBridge'
import { authEvents } from '../config/authEvents'

const useAuthStore = create(
  persist(
    (set, get) => ({
      user:         null,
      accessToken:  null,
      refreshToken: null,
      isLoading:    false,

      login: async ({ email, password }) => {
        set({ isLoading: true })
        try {
          const { data } = await api.post('/auth/login', { email, password })
          const { accessToken, refreshToken, user } = data.data

          // Alimenta o bridge ANTES de navegar — o interceptor já usará o token correto
          tokenBridge.setTokens(accessToken, refreshToken)
          set({ accessToken, refreshToken, user, isLoading: false })

          return { ok: true }
        } catch (err) {
          set({ isLoading: false })
          return { ok: false, message: err.response?.data?.error?.message || 'Erro ao fazer login' }
        }
      },

      /**
       * Login direto com tokens já prontos — usado quando o cadastro vem
       * do site institucional (o backend já devolve accessToken/refreshToken
       * na hora de criar a conta, evita pedir senha de novo).
       */
      loginWithTokens: async ({ accessToken, refreshToken }) => {
        tokenBridge.setTokens(accessToken, refreshToken)
        set({ accessToken, refreshToken })
        const ok = await get().fetchMe()
        return { ok }
      },

      /**
       * Login por CÓDIGO DE TROCA de uso único (60s) — o jeito novo de
       * receber a sessão vinda de outra aplicação (ex: cadastro no site),
       * sem tokens na URL. O backend devolve uma sessão própria.
       */
      loginWithHandoffCode: async (code) => {
        try {
          const { data } = await api.post('/auth/handoff/exchange', { code })
          const { accessToken, refreshToken, user } = data.data
          tokenBridge.setTokens(accessToken, refreshToken)
          set({ accessToken, refreshToken, user })
          await get().fetchMe()
          return { ok: true }
        } catch {
          return { ok: false }
        }
      },

      logout: async () => {
        const { refreshToken } = get()
        if (refreshToken) {
          await api.post('/auth/logout', { refreshToken }).catch(() => {})
        }
        tokenBridge.clearTokens()
        set({ user: null, accessToken: null, refreshToken: null })
      },

      /**
       * Encerra a sessão localmente sem chamar o backend — usado quando o
       * refresh token já expirou/foi revogado (evento vindo do interceptor
       * HTTP em api.js).
       */
      clearSession: () => {
        tokenBridge.clearTokens()
        set({ user: null, accessToken: null, refreshToken: null })
      },

      fetchMe: async () => {
        try {
          const { data } = await api.get('/auth/me')
          set({ user: data.data })
          return true
        } catch {
          return false
        }
      },

      isAuthenticated: () => !!get().accessToken,
      isAdmin:         () => ['admin', 'superadmin'].includes(get().user?.role),
      isSuperAdmin:    () => get().user?.role === 'superadmin',
    }),
    {
      name: AUTH_STORAGE_KEY,
      partialize: (state) => ({
        accessToken:  state.accessToken,
        refreshToken: state.refreshToken,
        user:         state.user,
      }),
      // onRehydrateStorage é chamado quando o Zustand restaura o estado do localStorage
      // Alimentamos o bridge aqui para que o token esteja disponível imediatamente
      onRehydrateStorage: () => (state) => {
        if (state?.accessToken) {
          tokenBridge.setTokens(state.accessToken, state.refreshToken)
        }
      },
    },
  ),
)

export default useAuthStore

// Quando o interceptor HTTP (api.js) renova os tokens com sucesso, persiste
// no localStorage também. E quando o refresh falha de vez, limpa a sessão
// local sem precisar dar reload cru na página.
authEvents.onTokensRefreshed((accessToken, refreshToken) => {
  useAuthStore.setState({ accessToken, refreshToken })
})

authEvents.onForceLogout(() => {
  useAuthStore.getState().clearSession()
})

// Sessão compartilhada entre abas (login por navegador): quando OUTRA aba
// renova os tokens, faz login ou sai, o localStorage muda e o navegador
// avisa esta aba pelo evento 'storage'. Sem isso, cada aba ficava com o seu
// par de tokens em memória — a primeira a renovar revogava o refresh token
// da outra (rotação), e a outra era deslogada na renovação seguinte.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.storageArea && event.storageArea !== window.localStorage) return
    if (event.key !== AUTH_STORAGE_KEY && event.key !== null) return

    let next = { accessToken: null, refreshToken: null, user: null }
    try {
      const raw = event.key === null ? window.localStorage.getItem(AUTH_STORAGE_KEY) : event.newValue
      next = { ...next, ...(raw ? JSON.parse(raw)?.state : {}) }
    } catch { /* valor corrompido — trata como deslogado */ }

    const current = useAuthStore.getState()
    if (
      current.accessToken === (next.accessToken || null) &&
      current.refreshToken === (next.refreshToken || null)
    ) return

    if (next.accessToken && next.refreshToken) {
      tokenBridge.setTokens(next.accessToken, next.refreshToken)
      useAuthStore.setState({ accessToken: next.accessToken, refreshToken: next.refreshToken, user: next.user ?? current.user })
    } else {
      // Saiu em outra aba → sai aqui também (ProtectedRoute leva pro login).
      tokenBridge.clearTokens()
      useAuthStore.setState({ user: null, accessToken: null, refreshToken: null })
    }
  })
}
