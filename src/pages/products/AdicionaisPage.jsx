import { useState } from 'react'
import { Plus, Trash2, Pencil, Sparkles, DollarSign } from 'lucide-react'
import TopBar from '../../components/layout/TopBar'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Modal from '../../components/ui/Modal'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import EmptyState from '../../components/ui/EmptyState'
import { useProducts } from '../../hooks/useProducts'
import { toCents, toReais, formatCurrency } from '../../utils/format'
import {
  useOpcionais, useCreateOpcional, useUpdateOpcional, useDeleteOpcional,
  useOpcionalCategorias, useCreateOpcionalCategoria, useUpdateOpcionalCategoria, useDeleteOpcionalCategoria,
  useAdicionais, useCreateAdicional, useUpdateAdicional, useDeleteAdicional,
  useAdicionalCategorias, useCreateAdicionalCategoria, useUpdateAdicionalCategoria, useDeleteAdicionalCategoria,
} from '../../hooks/useAddons'

/**
 * Antes, Opcionais e Adicionais eram 2 telas totalmente separadas (mais
 * Favoritos, mais Banners) — confuso, muito botão espalhado. Agora ficam
 * juntos aqui, numa aba só, com a diferença entre os dois bem marcada
 * visualmente: Opcionais = grátis, escolha obrigatória. Adicionais =
 * pago, por quantidade, nunca obrigatório.
 */
export default function OpcionaisAdicionaisPage() {
  const [aba, setAba] = useState('opcionais') // 'opcionais' | 'adicionais'

  return (
    <div>
      <TopBar title="Opcionais e adicionais" subtitle="Tudo organizado em um só lugar" back />

      <div className="page">
        <div className="flex bg-bg rounded-xl p-1 mb-4">
          <button
            onClick={() => setAba('opcionais')}
            className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold py-2.5 rounded-lg transition-colors ${
              aba === 'opcionais' ? 'bg-white text-primary shadow-sm' : 'text-gray-400'
            }`}
          >
            <Sparkles size={14} /> Escolhas grátis
          </button>
          <button
            onClick={() => setAba('adicionais')}
            className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold py-2.5 rounded-lg transition-colors ${
              aba === 'adicionais' ? 'bg-white text-primary shadow-sm' : 'text-gray-400'
            }`}
          >
            <DollarSign size={14} /> Adicionais pagos
          </button>
        </div>

        {aba === 'opcionais' ? <AbaOpcionais /> : <AbaAdicionais />}
      </div>
    </div>
  )
}

function AbaOpcionais() {
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
    if (editingItem) await updateOpcional.mutateAsync({ id: editingItem._id, ...payload })
    else await createOpcional.mutateAsync(payload)
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
    if (editingCat) await updateCategoria.mutateAsync({ id: editingCat._id, name: catName })
    else await createCategoria.mutateAsync({ name: catName })
    setShowCatModal(false)
  }

  const handleDeleteCat = async (cat) => {
    if (!confirm(`Excluir a categoria "${cat.name}"? Os opcionais dela ficam sem categoria, não são apagados.`)) return
    await deleteCategoria.mutateAsync(cat._id)
  }

  if (isLoading) return <LoadingSpinner />

  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-400 -mt-1">Grátis — o cliente escolhe pelo menos 1, incluído no preço do produto.</p>

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
              <button key={cat._id} onClick={() => openEditCat(cat)} className="text-xs bg-bg px-3 py-1.5 rounded-full flex items-center gap-1.5">
                {cat.name} <Pencil size={11} className="text-gray-400" />
              </button>
            ))}
          </div>
        )}
      </div>

      <div>
        <h3 className="font-semibold text-sm text-secondary mb-2">Itens cadastrados</h3>
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
                        <span className="text-sm font-medium" translate="no">{item.name}</span>
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
        <Plus size={16} /> Novo item
      </Button>

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

function AbaAdicionais() {
  const { data: adicionais, isLoading } = useAdicionais()
  const { data: categorias } = useAdicionalCategorias()
  const { data: groupedProducts } = useProducts()
  const createAdicional = useCreateAdicional()
  const updateAdicional = useUpdateAdicional()
  const deleteAdicional = useDeleteAdicional()
  const createCategoria = useCreateAdicionalCategoria()
  const updateCategoria = useUpdateAdicionalCategoria()
  const deleteCategoria = useDeleteAdicionalCategoria()

  const allProducts = Object.values(groupedProducts || {}).flat()

  const [showItemModal, setShowItemModal] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [itemForm, setItemForm] = useState({ name: '', price: '0,00', categoryId: '', linkedProductId: '' })

  const [showCatModal, setShowCatModal] = useState(false)
  const [editingCat, setEditingCat] = useState(null)
  const [catName, setCatName] = useState('')

  const catMap = Object.fromEntries((categorias || []).map((c) => [c._id, c.name]))
  const grouped = (adicionais || []).reduce((acc, a) => {
    const label = a.categoryId ? (catMap[a.categoryId] || catMap[a.categoryId?._id] || 'Sem categoria') : 'Sem categoria'
    if (!acc[label]) acc[label] = []
    acc[label].push(a)
    return acc
  }, {})

  const openNewItem = () => { setEditingItem(null); setItemForm({ name: '', price: '0,00', categoryId: '', linkedProductId: '' }); setShowItemModal(true) }
  const openEditItem = (item) => {
    setEditingItem(item)
    setItemForm({
      name: item.name,
      price: String(toReais(item.price)).replace('.', ','),
      categoryId: item.categoryId?._id || item.categoryId || '',
      linkedProductId: item.linkedProductId?._id || item.linkedProductId || '',
    })
    setShowItemModal(true)
  }

  const handleLinkProduct = (productId) => {
    if (!productId) { setItemForm((f) => ({ ...f, linkedProductId: '' })); return }
    const product = allProducts.find((p) => p._id === productId)
    setItemForm((f) => ({
      ...f,
      linkedProductId: productId,
      name: f.name || product?.name || '',
      price: product ? String(toReais(product.price)).replace('.', ',') : f.price,
    }))
  }

  const submitItem = async (e) => {
    e.preventDefault()
    const payload = {
      name: itemForm.name,
      price: toCents(itemForm.price.replace(',', '.')),
      categoryId: itemForm.categoryId || null,
      linkedProductId: itemForm.linkedProductId || null,
    }
    if (editingItem) await updateAdicional.mutateAsync({ id: editingItem._id, ...payload })
    else await createAdicional.mutateAsync(payload)
    setShowItemModal(false)
  }

  const handleDeleteItem = async (item) => {
    if (!confirm(`Excluir "${item.name}"? Ele será removido de todos os produtos que o usam.`)) return
    await deleteAdicional.mutateAsync(item._id)
  }

  const openNewCat = () => { setEditingCat(null); setCatName(''); setShowCatModal(true) }
  const openEditCat = (cat) => { setEditingCat(cat); setCatName(cat.name); setShowCatModal(true) }

  const submitCat = async (e) => {
    e.preventDefault()
    if (editingCat) await updateCategoria.mutateAsync({ id: editingCat._id, name: catName })
    else await createCategoria.mutateAsync({ name: catName })
    setShowCatModal(false)
  }

  const handleDeleteCat = async (cat) => {
    if (!confirm(`Excluir a categoria "${cat.name}"? Os adicionais dela ficam sem categoria, não são apagados.`)) return
    await deleteCategoria.mutateAsync(cat._id)
  }

  if (isLoading) return <LoadingSpinner />

  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-400 -mt-1">Pago, com quantidade — o cliente escolhe quantos quiser, nunca obrigatório.</p>

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
              <button key={cat._id} onClick={() => openEditCat(cat)} className="text-xs bg-bg px-3 py-1.5 rounded-full flex items-center gap-1.5">
                {cat.name} <Pencil size={11} className="text-gray-400" />
              </button>
            ))}
          </div>
        )}
      </div>

      <div>
        <h3 className="font-semibold text-sm text-secondary mb-2">Itens cadastrados</h3>
        {(!adicionais || adicionais.length === 0) ? (
          <EmptyState title="Nenhum adicional ainda" subtitle="Cadastre itens como queijo extra, bacon, refrigerante..." />
        ) : (
          <div className="space-y-4">
            {Object.entries(grouped).map(([catLabel, items]) => (
              <div key={catLabel}>
                <p className="text-xs font-semibold text-gray-400 uppercase mb-1.5">{catLabel}</p>
                <div className="space-y-1.5">
                  {items.map((item) => (
                    <Card key={item._id} className="!py-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium" translate="no">{item.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-success">+{formatCurrency(item.price)}</span>
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
        <Plus size={16} /> Novo item
      </Button>

      <Modal open={showItemModal} onClose={() => setShowItemModal(false)} title={editingItem ? 'Editar adicional' : 'Novo adicional'}>
        <form onSubmit={submitItem} className="space-y-4">
          <div>
            <label className="label">Vincular a um produto já existente (opcional)</label>
            <select className="input" value={itemForm.linkedProductId} onChange={(e) => handleLinkProduct(e.target.value)}>
              <option value="">Não vincular — item avulso</option>
              {allProducts.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
            </select>
          </div>
          <Input label="Nome" placeholder="Ex: Queijo extra, Bacon..." value={itemForm.name} onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })} required />
          <Input label="Preço" placeholder="0,00" value={itemForm.price} onChange={(e) => setItemForm({ ...itemForm, price: e.target.value })} required />
          <div>
            <label className="label">Categoria (opcional)</label>
            <select className="input" value={itemForm.categoryId} onChange={(e) => setItemForm({ ...itemForm, categoryId: e.target.value })}>
              <option value="">Sem categoria</option>
              {(categorias || []).map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select>
          </div>
          <Button type="submit" full loading={createAdicional.isPending || updateAdicional.isPending}>
            {editingItem ? 'Salvar' : 'Adicionar'}
          </Button>
        </form>
      </Modal>

      <Modal open={showCatModal} onClose={() => setShowCatModal(false)} title={editingCat ? 'Editar categoria' : 'Nova categoria'}>
        <form onSubmit={submitCat} className="space-y-4">
          <Input label="Nome" placeholder="Ex: Extras de lanche..." value={catName} onChange={(e) => setCatName(e.target.value)} required />
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
