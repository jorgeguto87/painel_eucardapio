/**
 * Pubsub minimalista para eventos de sessão do restaurante.
 *
 * Existe para permitir que `config/api.js` (camada HTTP, sem acesso ao
 * store) avise o `authStore` quando os tokens forem renovados ou a sessão
 * precisar ser encerrada, sem criar import circular entre os dois módulos.
 */

const logoutListeners  = new Set()
const refreshListeners = new Set()
const subscriptionListeners = new Set()

export const authEvents = {
  onForceLogout: (callback) => {
    logoutListeners.add(callback)
    return () => logoutListeners.delete(callback)
  },
  emitForceLogout: (reason) => {
    logoutListeners.forEach((cb) => cb(reason))
  },

  // Avisa o store quando o refresh automático (interceptor) renova os
  // tokens com sucesso, pra persistir no localStorage também — sem isso,
  // só a memória (tokenBridge) era atualizada, e a próxima recarga de
  // página usava o refresh token antigo (já revogado no backend por
  // rotação), disparando detecção de reuso e derrubando a sessão.
  onTokensRefreshed: (callback) => {
    refreshListeners.add(callback)
    return () => refreshListeners.delete(callback)
  },
  emitTokensRefreshed: (accessToken, refreshToken) => {
    refreshListeners.forEach((cb) => cb(accessToken, refreshToken))
  },

  // Assinatura bloqueada (HTTP 402 SUBSCRIPTION_REQUIRED) — quem escuta
  // decide como avisar/redirecionar.
  onSubscriptionRequired: (callback) => {
    subscriptionListeners.add(callback)
    return () => subscriptionListeners.delete(callback)
  },
  emitSubscriptionRequired: (info) => {
    subscriptionListeners.forEach((cb) => cb(info))
  },
}
