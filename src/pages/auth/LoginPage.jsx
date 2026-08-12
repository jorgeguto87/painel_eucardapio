import { useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { Soup } from 'lucide-react'
import Input from '../../components/ui/Input'
import Button from '../../components/ui/Button'
import useAuthStore from '../../stores/authStore'

export default function LoginPage() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const login     = useAuthStore((s) => s.login)
  const isLoading = useAuthStore((s) => s.isLoading)

  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    const result = await login({ email, password })

    if (result.ok) {
      const redirectTo = location.state?.from || '/'
      navigate(redirectTo, { replace: true })
    } else {
      setError(result.message)
    }
  }

  return (
    <div className="min-h-screen flex flex-col justify-center px-6 bg-bg">
      <div className="max-w-sm mx-auto w-full">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mb-4">
            <Soup size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-secondary">Eu Cardápio</h1>
          <p className="text-gray-400 text-sm mt-1">Acesse o painel do seu restaurante</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Email"
            type="email"
            placeholder="seu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
            required
          />

          <Input
            label="Senha"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />

          {error && (
            <p className="text-danger text-sm bg-danger/10 rounded-xl px-4 py-3">{error}</p>
          )}

          <Button type="submit" full loading={isLoading}>
            Entrar
          </Button>

          <Link to="/forgot-password" className="block text-center text-sm text-primary font-medium">
            Esqueci minha senha
          </Link>
        </form>
      </div>
    </div>
  )
}
