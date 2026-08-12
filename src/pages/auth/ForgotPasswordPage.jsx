import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Soup, ArrowLeft, MailCheck } from 'lucide-react'
import Input from '../../components/ui/Input'
import Button from '../../components/ui/Button'
import api from '../../config/api'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await api.post('/auth/forgot-password', { email })
      setSent(true)
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Erro ao solicitar recuperação de senha.')
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
          <h1 className="text-xl font-bold text-secondary">Recuperar senha</h1>
          <p className="text-gray-400 text-sm mt-1 text-center">
            Informe o email da sua conta — vamos te mandar um link pra redefinir a senha.
          </p>
        </div>

        {sent ? (
          <div className="text-center bg-success/10 rounded-xl p-5">
            <MailCheck size={28} className="text-success mx-auto mb-2" />
            <p className="text-sm text-secondary font-medium">Verifique seu email</p>
            <p className="text-xs text-gray-500 mt-1">
              Se esse email estiver cadastrado, você vai receber um link para redefinir sua senha em instantes.
            </p>
          </div>
        ) : (
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

            {error && (
              <p className="text-danger text-sm bg-danger/10 rounded-xl px-4 py-3">{error}</p>
            )}

            <Button type="submit" full loading={loading}>
              Enviar link de recuperação
            </Button>
          </form>
        )}

        <Link to="/login" className="flex items-center justify-center gap-1.5 text-sm text-gray-500 font-medium mt-6">
          <ArrowLeft size={15} />
          Voltar pro login
        </Link>
      </div>
    </div>
  )
}
