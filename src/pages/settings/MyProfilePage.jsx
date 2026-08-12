import { useState, useEffect } from 'react'
import TopBar from '../../components/layout/TopBar'
import Card from '../../components/ui/Card'
import Input from '../../components/ui/Input'
import Button from '../../components/ui/Button'
import useAuthStore from '../../stores/authStore'
import { useUpdateMyProfile } from '../../hooks/useTeam'

export default function MyProfilePage() {
  const { user, fetchMe } = useAuthStore()
  const updateProfile = useUpdateMyProfile()
  const isAdmin = user?.role === 'admin'
  const myId = user?.id || user?._id

  const [nameForm, setNameForm] = useState({ name: '' })
  const [emailForm, setEmailForm] = useState({ email: '', currentPassword: '' })

  useEffect(() => {
    if (user) {
      setNameForm({ name: user.name || '' })
      setEmailForm({ email: user.email || '', currentPassword: '' })
    }
  }, [user])

  const submitName = async (e) => {
    e.preventDefault()
    await updateProfile.mutateAsync({ id: myId, name: nameForm.name })
    await fetchMe()
  }

  const submitEmail = async (e) => {
    e.preventDefault()
    await updateProfile.mutateAsync({
      id: myId,
      email: emailForm.email,
      currentPassword: emailForm.currentPassword,
    })
    setEmailForm({ ...emailForm, currentPassword: '' })
    await fetchMe()
  }

  return (
    <div>
      <TopBar title="Meu perfil" back />

      <div className="page space-y-4">
        <Card>
          <h3 className="font-semibold text-sm mb-3">Nome</h3>
          <form onSubmit={submitName} className="space-y-3">
            <Input value={nameForm.name} onChange={(e) => setNameForm({ name: e.target.value })} required />
            <Button type="submit" full loading={updateProfile.isPending}>Salvar nome</Button>
          </form>
        </Card>

        {isAdmin && (
          <Card>
            <h3 className="font-semibold text-sm mb-1">E-mail de login</h3>
            <p className="text-xs text-gray-400 mb-3">Trocar o e-mail exige confirmar sua senha atual.</p>
            <form onSubmit={submitEmail} className="space-y-3">
              <Input label="Novo e-mail" type="email" value={emailForm.email} onChange={(e) => setEmailForm({ ...emailForm, email: e.target.value })} required />
              <Input label="Senha atual" type="password" value={emailForm.currentPassword} onChange={(e) => setEmailForm({ ...emailForm, currentPassword: e.target.value })} required />
              <Button type="submit" full loading={updateProfile.isPending}>Salvar e-mail</Button>
            </form>
          </Card>
        )}
      </div>
    </div>
  )
}
