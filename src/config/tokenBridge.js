/**
 * Ponte de tokens — resolve a dependência circular entre api.js e authStore.js.
 *
 * api.js precisa ler tokens para injetar no Authorization.
 * authStore.js precisa usar api.js para fazer requisições.
 *
 * Solução: ambos importam este módulo neutro.
 * authStore grava aqui após login/refresh (e quando OUTRA aba atualiza o
 * localStorage — ver listener de 'storage' em authStore.js).
 * api.js lê daqui nos interceptors.
 *
 * O login é por NAVEGADOR (compartilhado entre abas — decisão do produto):
 * a fonte da verdade persistida é o localStorage (chave "auth", gravada
 * pelo persist do zustand); a memória daqui é só o cache rápido.
 */

export const AUTH_STORAGE_KEY = 'auth'

let _accessToken  = null
let _refreshToken = null

/**
 * Lê os tokens persistidos (formato do zustand persist: { state, version }).
 * Nunca lança.
 */
export const readPersistedAuth = () => {
  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY)
    if (!raw) return { accessToken: null, refreshToken: null, user: null }
    const state = JSON.parse(raw)?.state || {}
    return {
      accessToken: state.accessToken || null,
      refreshToken: state.refreshToken || null,
      user: state.user || null,
    }
  } catch {
    return { accessToken: null, refreshToken: null, user: null }
  }
}

export const tokenBridge = {
  getAccessToken:  () => _accessToken,
  getRefreshToken: () => _refreshToken,
  setTokens: (access, refresh) => {
    _accessToken  = access
    _refreshToken = refresh
  },
  clearTokens: () => {
    _accessToken  = null
    _refreshToken = null
  },
}
