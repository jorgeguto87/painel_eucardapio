import { useState } from 'react'
import toast from 'react-hot-toast'
import { Plus, Trash2, Crown, Pencil } from 'lucide-react'
import TopBar from '../../components/layout/TopBar'
import Card from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Modal from '../../components/ui/Modal'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import useAuthStore from '../../stores/authStore'
import { useTeam, useCreateTeamMember, useUpdateTeamMember, useDeactivateTeamMember } from '../../hooks/useTeam'

const ROLE_LABELS = { admin: 'Administrador', operator: 'Equipe' }

export default function TeamPage() {
  const { user } = useAuthStore()
  const { data, isLoading } = useTeam()
  const createMember = useCreateTeamMember()
  const updateMember = useUpdateTeamMember()
  const deactivateMember = useDeactivateTeamMember()

  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'operator' })

  const [editModal, setEditModal] = useState(null)
  const [editForm, setEditForm] = useState({ name: '', email: '' })

  const users = (data?.data || []).filter((u) => u.isActive)
  const adminCount = users.filter((u) => u.role === 'admin').length
  const operatorCount = users.filter((u) => u.role === 'operator').length

  const handleAdd = async (e) => {
    e.preventDefault()
    await createMember.mutateAsync(form)
    setShowAdd(false)
    setForm({ name: '', email: '', password: '', role: 'operator' })
  }

  const handleRemove = async (member) => {
    if (member.isOwner) {
      toast.error('O administrador principal não pode ser excluído por aqui.')
      return
    }
    if (!confirm(`Excluir ${member.name} da equipe? Isso não pode ser desfeito.`)) return
    await deactivateMember.mutateAsync(member._id)
  }

  const openEdit = (member) => {
    setEditForm({ name: member.name, email: member.email })
    setEditModal(member)
  }

  const submitEdit = async (e) => {
    e.preventDefault()
    await updateMember.mutateAsync({ id: editModal._id, ...editForm })
    setEditModal(null)
  }

  if (isLoading) return <LoadingSpinner />

  return (
    <div>
      <TopBar title="Equipe" subtitle="Quem tem acesso ao painel" back />

      <div className="page space-y-3">
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs text-gray-400">
            {adminCount} administrador(es) (máx. 3) · {operatorCount} de equipe (máx. 5)
          </p>
        </div>

        {users.map((member) => (
          <Card key={member._id}>
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="font-medium text-sm truncate">{member.name}</p>
                  {member.isOwner && <Crown size={14} className="text-warning flex-shrink-0" />}
                </div>
                <p className="text-xs text-gray-400 truncate">{member.email}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Badge status={member.role === 'admin' ? 'active' : 'trial'} label={ROLE_LABELS[member.role]} />
                {!member.isOwner && member._id !== (user?.id || user?._id) && (
                  <button
                    onClick={() => openEdit(member)}
                    className="p-1.5 rounded-lg hover:bg-gray-100"
                    title="Editar nome/e-mail"
                  >
                    <Pencil size={16} className="text-gray-500" />
                  </button>
                )}
                {!member.isOwner && member._id !== (user?.id || user?._id) && (
                  <button
                    onClick={() => handleRemove(member)}
                    className="p-1.5 rounded-lg hover:bg-gray-100"
                    title="Excluir da equipe"
                  >
                    <Trash2 size={16} className="text-danger" />
                  </button>
                )}
              </div>
            </div>
          </Card>
        ))}

        <Button full variant="secondary" onClick={() => setShowAdd(true)} className="mt-2">
          <Plus size={16} /> Adicionar à equipe
        </Button>
      </div>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Adicionar usuário">
        <form onSubmit={handleAdd} className="space-y-4">
          <Input label="Nome" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <Input label="E-mail" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          <Input label="Senha" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={8} />

          <div>
            <label className="label">Tipo de acesso</label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              <button
                type="button"
                onClick={() => setForm({ ...form, role: 'operator' })}
                className={`p-3 rounded-xl border-2 text-left ${form.role === 'operator' ? 'border-primary bg-primary/5' : 'border-gray-200'}`}
              >
                <p className="text-sm font-medium">Equipe</p>
                <p className="text-xs text-gray-400">Pedidos, clientes, entregadores</p>
              </button>
              <button
                type="button"
                onClick={() => setForm({ ...form, role: 'admin' })}
                className={`p-3 rounded-xl border-2 text-left ${form.role === 'admin' ? 'border-primary bg-primary/5' : 'border-gray-200'}`}
                disabled={adminCount >= 3}
              >
                <p className="text-sm font-medium">Administrador</p>
                <p className="text-xs text-gray-400">Acesso completo</p>
              </button>
            </div>
          </div>

          <p className="text-xs text-gray-400">
            Equipe não vê WhatsApp, Cardápio, Financeiro, Pagamentos, Dados do restaurante nem Mensagens do bot.
          </p>

          <Button type="submit" full loading={createMember.isPending}>Adicionar</Button>
        </form>
      </Modal>

      <Modal open={!!editModal} onClose={() => setEditModal(null)} title="Editar usuário">
        <form onSubmit={submitEdit} className="space-y-4">
          <Input label="Nome" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} required />
          <Input label="E-mail" type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} required />
          <p className="text-xs text-gray-400">
            Como admin, você pode editar o e-mail de outro usuário sem precisar da senha dele.
          </p>
          <Button type="submit" full loading={updateMember.isPending}>Salvar</Button>
        </form>
      </Modal>
    </div>
  )
}
