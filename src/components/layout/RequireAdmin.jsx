import { Navigate } from 'react-router-dom'
import useAuthStore from '../../stores/authStore'

/**
 * Bloqueia rotas restritas a admin (WhatsApp, Cardápio, Financeiro, e
 * algumas seções de Configurações) — usuários de equipe (role=operator)
 * são redirecionados de volta pro Dashboard, mesmo digitando a URL direto.
 * O menu já esconde esses links, isso aqui é o reforço no back — er,
 * no front mesmo, pra não depender só de esconder visualmente.
 */
export default function RequireAdmin({ children }) {
  const role = useAuthStore((s) => s.user?.role)

  if (role === 'operator') {
    return <Navigate to="/" replace />
  }

  return children
}
