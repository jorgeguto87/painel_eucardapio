import { useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { Soup, CheckCircle2 } from 'lucide-react'
import Input from '../../components/ui/Input'
import Button from '../../components/ui/Button'
import api from '../../config/api'

export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const email = searchParams.get('email')

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  const invalidLink = !token || !email

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (newPassword !== confirmPassword) {
      setError('As senhas não coincidem.')
      return
    }
    if (newPassword.length < 8) {
      setError('A senha deve ter pelo menos 8 caracteres.')
      return
    }

    setLoading(true)
    try {
      await api.post('/auth/reset-password', { email, token, newPassword })
      setDone(true)
      setTimeout(() => navigate('/login'), 2500)
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Não foi possível redefinir a senha.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col justify-center px-6 bg-bg">
      <div className="max-w-sm mx-auto w-full">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mb-4">
            <Soup size={32} className="text-white" />
          </div>
          <h1 className="text-xl font-bold text-secondary">Nova senha</h1>
          {email && <p className="text-gray-400 text-sm mt-1">{email}</p>}
        </div>

        {invalidLink ? (
          <div className="text-center bg-danger/10 rounded-xl p-5">
            <p className="text-sm text-secondary font-medium">Link inválido</p>
            <p className="text-xs text-gray-500 mt-1">
              Esse link de redefinição de senha está incompleto. Solicite um novo pelo login.
            </p>
          </div>
        ) : done ? (
          <div className="text-center bg-success/10 rounded-xl p-5">
            <CheckCircle2 size={28} className="text-success mx-auto mb-2" />
            <p className="text-sm text-secondary font-medium">Senha redefinida!</p>
            <p className="text-xs text-gray-500 mt-1">Redirecionando para o login...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Nova senha"
              type="password"
              placeholder="••••••••"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
              required
              minLength={8}
            />
            <Input
              label="Confirmar nova senha"
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              required
              minLength={8}
            />

            {error && (
              <p className="text-danger text-sm bg-danger/10 rounded-xl px-4 py-3">{error}</p>
            )}

            <Button type="submit" full loading={loading}>
              Redefinir senha
            </Button>
          </form>
        )}

        <Link to="/login" className="block text-center text-sm text-gray-500 font-medium mt-6">
          Voltar pro login
        </Link>
      </div>
    </div>
  )
}
