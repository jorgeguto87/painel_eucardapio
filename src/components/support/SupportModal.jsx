import { useState, useEffect } from 'react'
import Modal from '../ui/Modal'
import Input from '../ui/Input'
import Textarea from '../ui/Textarea'
import Button from '../ui/Button'
import useAuthStore from '../../stores/authStore'
import { useContactSupport } from '../../hooks/useSupport'

export default function SupportModal({ open, onClose }) {
  const { user } = useAuthStore()
  const contactSupport = useContactSupport()
  const [form, setForm] = useState({ name: '', subject: '', description: '' })

  useEffect(() => {
    if (open) {
      setForm({ name: user?.name || '', subject: '', description: '' })
    }
  }, [open, user])

  const handleSubmit = async (e) => {
    e.preventDefault()
    await contactSupport.mutateAsync(form)
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="Fale com o suporte">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Seu nome"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />
        <Input
          label="Assunto"
          placeholder="Ex: Dúvida sobre pagamento"
          value={form.subject}
          onChange={(e) => setForm({ ...form, subject: e.target.value })}
          required
        />
        <Textarea
          label="Descreva o problema"
          placeholder="Conte com detalhes o que está acontecendo..."
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          rows={5}
          required
        />
        <Button type="submit" full loading={contactSupport.isPending}>
          Enviar mensagem
        </Button>
      </form>
    </Modal>
  )
}
