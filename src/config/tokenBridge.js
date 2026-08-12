/**
 * Ponte de tokens — resolve a dependência circular entre api.js e authStore.js.
 *
 * api.js precisa ler tokens para injetar no Authorization.
 * authStore.js precisa usar api.js para fazer requisições.
 *
 * Solução: ambos importam este módulo neutro.
 * authStore grava aqui após login/refresh.
 * api.js lê daqui nos interceptors.
 */

let _accessToken  = null
let _refreshToken = null

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