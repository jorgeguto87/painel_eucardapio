import { useState } from 'react'
import { Plus, Trash2, Pencil } from 'lucide-react'
import TopBar from '../../components/layout/TopBar'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Modal from '../../components/ui/Modal'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import EmptyState from '../../components/ui/EmptyState'
import {
  useOpcionais, useCreateOpcional, useUpdateOpcional, useDeleteOpcional,
  useOpcionalCategorias, useCreateOpcionalCategoria, useUpdateOpcionalCategoria, useDeleteOpcionalCategoria,
} from '../../hooks/useAddons'

export default function OpcionaisPage() {
  const { data: opcionais, isLoading } = useOpcionais()
  const { data: categorias } = useOpcionalCategorias()
  const createOpcional = useCreateOpcional()
  const updateOpcional = useUpdateOpcional()
  const deleteOpcional = useDeleteOpcional()
  const createCategoria = useCreateOpcionalCategoria()
  const updateCategoria = useUpdateOpcionalCategoria()
  const deleteCategoria = useDeleteOpcionalCategoria()

  const [showItemModal, setShowItemModal] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [itemForm, setItemForm] = useState({ name: '', categoryId: '' })

  const [showCatModal, setShowCatModal] = useState(false)
  const [editingCat, setEditingCat] = useState(null)
  const [catName, setCatName] = useState('')

  const catMap = Object.fromEntries((categorias || []).map((c) => [c._id, c.name]))
  const grouped = (opcionais || []).reduce((acc, o) => {
    const key = o.categoryId?.name || o.categoryId || 'Sem categoria'
    const label = o.categoryId ? (catMap[o.categoryId] || catMap[o.categoryId?._id] || 'Sem categoria') : 'Sem categoria'
    if (!acc[label]) acc[label] = []
    acc[label].push(o)
    return acc
  }, {})

  const openNewItem = () => { setEditingItem(null); setItemForm({ name: '', categoryId: '' }); setShowItemModal(true) }
  const openEditItem = (item) => {
    setEditingItem(item)
    setItemForm({ name: item.name, categoryId: item.categoryId?._id || item.categoryId || '' })
    setShowItemModal(true)
  }

  const submitItem = async (e) => {
    e.preventDefault()
    const payload = { name: itemForm.name, categoryId: itemForm.categoryId || null }
    if (editingItem) {
      await updateOpcional.mutateAsync({ id: editingItem._id, ...payload })
    } else {
      await createOpcional.mutateAsync(payload)
    }
    setShowItemModal(false)
  }

  const handleDeleteItem = async (item) => {
    if (!confirm(`Excluir "${item.name}"? Ele será removido de todos os produtos que o usam.`)) return
    await deleteOpcional.mutateAsync(item._id)
  }

  const openNewCat = () => { setEditingCat(null); setCatName(''); setShowCatModal(true) }
  const openEditCat = (cat) => { setEditingCat(cat); setCatName(cat.name); setShowCatModal(true) }

  const submitCat = async (e) => {
    e.preventDefault()
    if (editingCat) {
      await updateCategoria.mutateAsync({ id: editingCat._id, name: catName })
    } else {
      await createCategoria.mutateAsync({ name: catName })
    }
    setShowCatModal(false)
  }

  const handleDeleteCat = async (cat) => {
    if (!confirm(`Excluir a categoria "${cat.name}"? Os opcionais dela ficam sem categoria, não são apagados.`)) return
    await deleteCategoria.mutateAsync(cat._id)
  }

  if (isLoading) return <LoadingSpinner />

  return (
    <div>
      <TopBar title="Opcionais" subtitle="Itens grátis pra vincular aos produtos" back />

      <div className="page space-y-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-sm text-secondary">Categorias</h3>
            <button onClick={openNewCat} className="text-xs text-primary font-medium">+ Nova categoria</button>
          </div>
          {(!categorias || categorias.length === 0) ? (
            <p className="text-xs text-gray-400">Nenhuma categoria ainda — opcional.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {categorias.map((cat) => (
                <button
                  key={cat._id}
                  onClick={() => openEditCat(cat)}
                  className="text-xs bg-bg px-3 py-1.5 rounded-full flex items-center gap-1.5"
                >
                  {cat.name} <Pencil size={11} className="text-gray-400" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <h3 className="font-semibold text-sm text-secondary mb-2">Opcionais cadastrados</h3>
          {(!opcionais || opcionais.length === 0) ? (
            <EmptyState title="Nenhum opcional ainda" subtitle="Cadastre itens como salada, batata frita, maionese temperada..." />
          ) : (
            <div className="space-y-4">
              {Object.entries(grouped).map(([catLabel, items]) => (
                <div key={catLabel}>
                  <p className="text-xs font-semibold text-gray-400 uppercase mb-1.5">{catLabel}</p>
                  <div className="space-y-1.5">
                    {items.map((item) => (
                      <Card key={item._id} className="!py-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{item.name}</span>
                          <div className="flex items-center gap-1">
                            <button onClick={() => openEditItem(item)} className="p-1.5 rounded-lg hover:bg-gray-100">
                              <Pencil size={14} className="text-gray-500" />
                            </button>
                            <button onClick={() => handleDeleteItem(item)} className="p-1.5 rounded-lg hover:bg-gray-100">
                              <Trash2 size={14} className="text-danger" />
                            </button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <Button full variant="secondary" onClick={openNewItem}>
          <Plus size={16} /> Novo opcional
        </Button>
      </div>

      <Modal open={showItemModal} onClose={() => setShowItemModal(false)} title={editingItem ? 'Editar opcional' : 'Novo opcional'}>
        <form onSubmit={submitItem} className="space-y-4">
          <Input label="Nome" placeholder="Ex: Salada, Batata frita..." value={itemForm.name} onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })} required />
          <div>
            <label className="label">Categoria (opcional)</label>
            <select className="input" value={itemForm.categoryId} onChange={(e) => setItemForm({ ...itemForm, categoryId: e.target.value })}>
              <option value="">Sem categoria</option>
              {(categorias || []).map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select>
          </div>
          <Button type="submit" full loading={createOpcional.isPending || updateOpcional.isPending}>
            {editingItem ? 'Salvar' : 'Adicionar'}
          </Button>
        </form>
      </Modal>

      <Modal open={showCatModal} onClose={() => setShowCatModal(false)} title={editingCat ? 'Editar categoria' : 'Nova categoria'}>
        <form onSubmit={submitCat} className="space-y-4">
          <Input label="Nome" placeholder="Ex: Molhos, Acompanhamentos..." value={catName} onChange={(e) => setCatName(e.target.value)} required />
          <Button type="submit" full loading={createCategoria.isPending || updateCategoria.isPending}>Salvar</Button>
          {editingCat && (
            <Button type="button" variant="danger" full onClick={() => { handleDeleteCat(editingCat); setShowCatModal(false) }}>
              <Trash2 size={16} /> Excluir categoria
            </Button>
          )}
        </form>
      </Modal>
    </div>
  )
}
