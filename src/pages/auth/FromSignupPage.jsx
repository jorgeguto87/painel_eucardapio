import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import useAuthStore from '../../stores/authStore'
import LoadingSpinner from '../../components/ui/LoadingSpinner'

/**
 * Recebe o handoff do site institucional — o cadastro lá já cria o
 * restaurante e devolve accessToken/refreshToken prontos, então aqui só
 * aplica esses tokens e manda pro painel, sem pedir login de novo.
 */
export default function FromSignupPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const loginWithTokens = useAuthStore((s) => s.loginWithTokens)
  const [error, setError] = useState(false)

  useEffect(() => {
    const accessToken = searchParams.get('accessToken')
    const refreshToken = searchParams.get('refreshToken')

    if (!accessToken || !refreshToken) {
      setError(true)
      return
    }

    loginWithTokens({ accessToken, refreshToken }).then(({ ok }) => {
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
