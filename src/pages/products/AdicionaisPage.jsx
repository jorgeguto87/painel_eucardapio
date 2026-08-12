import { useState } from 'react'
import { Plus, Trash2, Pencil, Link2 } from 'lucide-react'
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
  useAdicionais, useCreateAdicional, useUpdateAdicional, useDeleteAdicional,
  useAdicionalCategorias, useCreateAdicionalCategoria, useUpdateAdicionalCategoria, useDeleteAdicionalCategoria,
} from '../../hooks/useAddons'

export default function AdicionaisPage() {
  const { data: adicionais, isLoading } = useAdicionais()
  const { data: categorias } = useAdicionalCategorias()
  const { data: groupedProducts } = useProducts()
  const createAdicional = useCreateAdicional()
  const updateAdicional = useUpdateAdicional()
  const deleteAdicional = useDeleteAdicional()
  const createCategoria = useCreateAdicionalCategoria()
  const updateCategoria = useUpdateAdicionalCategoria()
  const deleteCategoria = useDeleteAdicionalCategoria()

  const groupedProductEntries = Object.entries(groupedProducts || {})
  const allProducts = groupedProductEntries.flatMap(([, items]) => items)

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

  // Ao vincular um produto já existente do cardápio, pré-preenche nome E
  // preço a partir do produto (o restaurante ainda pode editar os dois —
  // útil pra dar um preço diferente de combo, por exemplo — mas não
  // precisa mais digitar o preço do zero toda vez).
  const handleLinkProduct = (productId) => {
    const product = allProducts.find((p) => p._id === productId)
    setItemForm((f) => ({
      ...f,
      linkedProductId: productId,
      name: f.name || product?.name || '',
      price: (!f.price || f.price === '0,00') && product ? String(toReais(product.price)).replace('.', ',') : f.price,
    }))
  }

  const submitItem = async (e) => {
    e.preventDefault()
    const payload = {
      name: itemForm.name,
      price: toCents(itemForm.price),
      categoryId: itemForm.categoryId || null,
      linkedProductId: itemForm.linkedProductId || null,
    }
    if (editingItem) {
      await updateAdicional.mutateAsync({ id: editingItem._id, ...payload })
    } else {
      await createAdicional.mutateAsync(payload)
    }
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
    if (editingCat) {
      await updateCategoria.mutateAsync({ id: editingCat._id, name: catName })
    } else {
      await createCategoria.mutateAsync({ name: catName })
    }
    setShowCatModal(false)
  }

  const handleDeleteCat = async (cat) => {
    if (!confirm(`Excluir a categoria "${cat.name}"? Os adicionais dela ficam sem categoria, não são apagados.`)) return
    await deleteCategoria.mutateAsync(cat._id)
  }

  if (isLoading) return <LoadingSpinner />

  return (
    <div>
      <TopBar title="Adicionais" subtitle="Itens pagos, com quantidade" back />

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
          <h3 className="font-semibold text-sm text-secondary mb-2">Adicionais cadastrados</h3>
          {(!adicionais || adicionais.length === 0) ? (
            <EmptyState title="Nenhum adicional ainda" subtitle="Cadastre itens como queijo extra, bacon, ou combos com bebidas do cardápio." />
          ) : (
            <div className="space-y-4">
              {Object.entries(grouped).map(([catLabel, items]) => (
                <div key={catLabel}>
                  <p className="text-xs font-semibold text-gray-400 uppercase mb-1.5">{catLabel}</p>
                  <div className="space-y-1.5">
                    {items.map((item) => (
                      <Card key={item._id} className="!py-2.5">
                        <div className="flex items-center justify-between">
                          <div className="min-w-0">
                            <span className="text-sm font-medium">{item.name}</span>
                            {item.linkedProductId && (
                              <span className="ml-1.5 inline-flex items-center gap-0.5 text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
                                <Link2 size={9} /> combo{item.linkedProductId.category ? ` · ${item.linkedProductId.category}` : ''}
                              </span>
                            )}
                            <p className="text-xs text-primary font-semibold">{formatCurrency(item.price)}</p>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
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
          <Plus size={16} /> Novo adicional
        </Button>
      </div>

      <Modal open={showItemModal} onClose={() => setShowItemModal(false)} title={editingItem ? 'Editar adicional' : 'Novo adicional'}>
        <form onSubmit={submitItem} className="space-y-4">
          <div>
            <label className="label">Vincular a um produto do cardápio (opcional)</label>
            <select className="input" value={itemForm.linkedProductId} onChange={(e) => handleLinkProduct(e.target.value)}>
              <option value="">Nenhum — item novo, só de adicional</option>
              {groupedProductEntries.map(([catName, items]) => (
                <optgroup key={catName} label={catName}>
                  {items.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
                </optgroup>
              ))}
            </select>
            <p className="text-xs text-gray-400 mt-1">
              Útil pra oferecer algo do cardápio como combo (ex: um refrigerante). O preço vem
              preenchido automaticamente com o preço do produto — pode ajustar se for um valor
              diferente pra combo. Sem imagem — o adicional aparece só com nome e preço.
            </p>
          </div>
          <Input label="Nome do adicional" placeholder="Ex: Queijo extra, Coca-cola (combo)..." value={itemForm.name} onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })} required />
          <Input label="Preço (R$)" placeholder="0,00" value={itemForm.price} onChange={(e) => setItemForm({ ...itemForm, price: e.target.value })} required />
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
