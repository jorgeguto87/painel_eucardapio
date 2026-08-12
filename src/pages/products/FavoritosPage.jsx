import { useState } from 'react'
import { Plus, Trash2, Pencil, Star } from 'lucide-react'
import TopBar from '../../components/layout/TopBar'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Modal from '../../components/ui/Modal'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import EmptyState from '../../components/ui/EmptyState'
import { formatCurrency } from '../../utils/format'
import { useOpcionais, useAdicionais, useFavoritos, useCreateFavorito, useUpdateFavorito, useDeleteFavorito } from '../../hooks/useAddons'

export default function FavoritosPage() {
  const { data: opcionais } = useOpcionais()
  const { data: adicionais } = useAdicionais()
  const { data: favoritos, isLoading } = useFavoritos()
  const createFavorito = useCreateFavorito()
  const updateFavorito = useUpdateFavorito()
  const deleteFavorito = useDeleteFavorito()

  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ name: '', opcionalIds: [], adicionalIds: [] })

  const openNew = () => { setEditing(null); setForm({ name: '', opcionalIds: [], adicionalIds: [] }); setShowModal(true) }
  const openEdit = (fav) => {
    setEditing(fav)
    setForm({
      name: fav.name,
      opcionalIds: (fav.opcionalIds || []).map((o) => o._id || o),
      adicionalIds: (fav.adicionalIds || []).map((a) => a._id || a),
    })
    setShowModal(true)
  }

  const toggleOpcional = (id) => {
    setForm((f) => ({
      ...f,
      opcionalIds: f.opcionalIds.includes(id) ? f.opcionalIds.filter((x) => x !== id) : [...f.opcionalIds, id],
    }))
  }
  const toggleAdicional = (id) => {
    setForm((f) => ({
      ...f,
      adicionalIds: f.adicionalIds.includes(id) ? f.adicionalIds.filter((x) => x !== id) : [...f.adicionalIds, id],
    }))
  }

  const submit = async (e) => {
    e.preventDefault()
    if (editing) {
      await updateFavorito.mutateAsync({ id: editing._id, ...form })
    } else {
      await createFavorito.mutateAsync(form)
    }
    setShowModal(false)
  }

  const handleDelete = async (fav) => {
    if (!confirm(`Excluir o favorito "${fav.name}"? Isso não afeta os produtos que já usaram essa combinação antes.`)) return
    await deleteFavorito.mutateAsync(fav._id)
  }

  if (isLoading) return <LoadingSpinner />

  return (
    <div>
      <TopBar title="Favoritos" subtitle="Pacotes prontos de opcionais + adicionais" back />

      <div className="page space-y-3">
        <p className="text-xs text-gray-400">
          Monte um pacote uma vez (ex: "Opcionais de lanche") e aplique de uma vez só em qualquer produto,
          na tela de edição do produto. Editar o favorito depois não muda produtos que já o usaram.
        </p>

        {(!favoritos || favoritos.length === 0) ? (
          <EmptyState icon={Star} title="Nenhum favorito ainda" subtitle="Crie um pacote reutilizável de opcionais/adicionais." />
        ) : (
          favoritos.map((fav) => (
            <Card key={fav._id}>
              <div className="flex items-center justify-between mb-1">
                <p className="font-medium text-sm flex items-center gap-1.5"><Star size={14} className="text-warning" />{fav.name}</p>
                <div className="flex items-center gap-1">
                  <button onClick={() => openEdit(fav)} className="p-1.5 rounded-lg hover:bg-gray-100">
                    <Pencil size={14} className="text-gray-500" />
                  </button>
                  <button onClick={() => handleDelete(fav)} className="p-1.5 rounded-lg hover:bg-gray-100">
                    <Trash2 size={14} className="text-danger" />
                  </button>
                </div>
              </div>
              <p className="text-xs text-gray-400">
                {(fav.opcionalIds || []).length} opcional(is) · {(fav.adicionalIds || []).length} adicional(is)
              </p>
            </Card>
          ))
        )}

        <Button full variant="secondary" onClick={openNew}>
          <Plus size={16} /> Novo favorito
        </Button>
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? 'Editar favorito' : 'Novo favorito'}>
        <form onSubmit={submit} className="space-y-4">
          <Input label="Nome do favorito" placeholder="Ex: Opcionais de lanche" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />

          <div>
            <label className="label">Opcionais incluídos</label>
            {(!opcionais || opcionais.length === 0) ? (
              <p className="text-xs text-gray-400">Nenhum opcional cadastrado ainda.</p>
            ) : (
              <div className="flex flex-wrap gap-2 mt-1">
                {opcionais.map((o) => (
                  <button
                    key={o._id}
                    type="button"
                    onClick={() => toggleOpcional(o._id)}
                    className={`text-xs px-3 py-1.5 rounded-full border ${form.opcionalIds.includes(o._id) ? 'border-primary bg-primary/10 text-primary' : 'border-gray-200 text-gray-500'}`}
                  >
                    {o.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="label">Adicionais incluídos</label>
            {(!adicionais || adicionais.length === 0) ? (
              <p className="text-xs text-gray-400">Nenhum adicional cadastrado ainda.</p>
            ) : (
              <div className="flex flex-wrap gap-2 mt-1">
                {adicionais.map((a) => (
                  <button
                    key={a._id}
                    type="button"
                    onClick={() => toggleAdicional(a._id)}
                    className={`text-xs px-3 py-1.5 rounded-full border ${form.adicionalIds.includes(a._id) ? 'border-primary bg-primary/10 text-primary' : 'border-gray-200 text-gray-500'}`}
                  >
                    {a.name} · {formatCurrency(a.price)}
                  </button>
                ))}
              </div>
            )}
          </div>

          <Button type="submit" full loading={createFavorito.isPending || updateFavorito.isPending}>
            {editing ? 'Salvar' : 'Criar favorito'}
          </Button>
        </form>
      </Modal>
    </div>
  )
}
