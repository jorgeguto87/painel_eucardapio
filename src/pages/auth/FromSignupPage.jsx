import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import useAuthStore from '../../stores/authStore'
import LoadingSpinner from '../../components/ui/LoadingSpinner'

/**
 * Recebe o handoff do site institucional — o cadastro lá já cria o
 * restaurante e entra no painel sem pedir login de novo.
 *
 * Formatos aceitos:
 *   - `?code=...` (NOVO, preferido): código de uso único (60s) trocado por
 *     uma sessão em POST /api/auth/handoff/exchange — nenhum token na URL;
 *   - `?accessToken=...&refreshToken=...` (LEGADO, mantido até o cadastro
 *     passar a mandar `code`).
 * Em qualquer caso a URL é limpa na hora (tokens/código não ficam no
 * histórico do navegador).
 */
export default function FromSignupPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const loginWithTokens = useAuthStore((s) => s.loginWithTokens)
  const loginWithHandoffCode = useAuthStore((s) => s.loginWithHandoffCode)
  const [error, setError] = useState(false)
  const started = useRef(false) // código é de uso único — nunca tenta duas vezes (StrictMode)

  useEffect(() => {
    if (started.current) return
    started.current = true
    const code = searchParams.get('code')
    const accessToken = searchParams.get('accessToken')
    const refreshToken = searchParams.get('refreshToken')

    // Tira código/tokens da barra de endereço e do histórico imediatamente.
    try { window.history.replaceState(null, '', window.location.pathname) } catch { /* ignora */ }

    const attempt = code
      ? loginWithHandoffCode(code)
      : (accessToken && refreshToken)
        ? loginWithTokens({ accessToken, refreshToken })
        : Promise.resolve({ ok: false })

    attempt.then(({ ok }) => {
      if (ok) navigate('/', { replace: true })
      else setError(true)
    })
  }, [])

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center flex-col gap-4 px-6 text-center">
        <p className="text-secondary font-medium">Não foi possível entrar automaticamente.</p>
        <a href="/login" className="text-primary font-semibold">Fazer login manualmente</a>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center flex-col gap-4">
      <LoadingSpinner />
      <p className="text-gray-400 text-sm">Preparando seu painel...</p>
    </div>
  )
}
