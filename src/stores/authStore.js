import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import api from '../config/api'
import { tokenBridge } from '../config/tokenBridge'
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
      name: 'auth',
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