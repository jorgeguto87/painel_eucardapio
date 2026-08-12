import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Trash2, ChevronDown, Check } from 'lucide-react'
import TopBar from '../../components/layout/TopBar'
import Input from '../../components/ui/Input'
import Button from '../../components/ui/Button'
import ImageUploadField from '../../components/media/ImageUploadField'
import { useProducts, useProductCategories, useCreateProduct, useUpdateProduct, useDeleteProduct } from '../../hooks/useProducts'
import {
  useOpcionais, useOpcionalCategorias, useCreateOpcional,
  useAdicionais, useAdicionalCategorias, useFavoritos,
} from '../../hooks/useAddons'
import { toCents, toReais, formatCurrency } from '../../utils/format'

const SEM_CATEGORIA = 'sem-categoria'
const NAO_PRECISA_NOME = 'Não precisa'

export default function ProductFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEditing = !!id

  const { data: grouped } = useProducts()
  const { data: categories } = useProductCategories()
  const { data: opcionais } = useOpcionais()
  const { data: opcionalCategorias } = useOpcionalCategorias()
  const { data: adicionais } = useAdicionais()
  const { data: adicionalCategorias } = useAdicionalCategorias()
  const { data: favoritos } = useFavoritos()
  const createProduct = useCreateProduct()
  const updateProduct  = useUpdateProduct()
  const deleteProduct  = useDeleteProduct()
  const createOpcional = useCreateOpcional()

  // Categorias "abertas" na tela (mostrando os itens dela pra marcar/
  // desmarcar) — só uma questão de exibição, não afeta o que é salvo.
  const [openCategories, setOpenCategories] = useState({})

  const [form, setForm] = useState({
    name: '', description: '', price: '', category: 'Geral', imageUrl: '', imageBase64: '',
    opcionaisIds: [], adicionaisIds: [],
  })

  useEffect(() => {
    if (isEditing && grouped) {
      const allProducts = Object.values(grouped).flat()
      const product = allProducts.find((p) => p._id === id)
      if (product) {
        setForm({
          name: product.name,
          description: product.description || '',
          price: String(toReais(product.price)),
          category: product.category || 'Geral',
          imageUrl: product.imageUrl || '',
          imageBase64: product.imageBase64 || '',
          opcionaisIds: (product.opcionaisIds || []).map((o) => o._id || o),
          adicionaisIds: (product.adicionaisIds || []).map((a) => a._id || a),
        })
      }
    }
  }, [isEditing, grouped, id])

  const handleChange = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

  // Agrupa opcionais/adicionais (listas soltas) por categoria, pra exibir
  // organizado em vez de uma sopa de chips misturados.
  const opcionalGroups = useMemo(() => {
    const groups = {}
    ;(opcionalCategorias || []).forEach((c) => { groups[c._id] = { name: c.name, items: [] } })
    ;(opcionais || []).forEach((o) => {
      const key = o.categoryId || SEM_CATEGORIA
      if (!groups[key]) groups[key] = { name: 'Sem categoria', items: [] }
      groups[key].items.push(o)
    })
    return Object.entries(groups)
      .map(([key, g]) => ({ key, ...g }))
      .filter((g) => g.items.length > 0)
  }, [opcionais, opcionalCategorias])

  const adicionalGroups = useMemo(() => {
    const groups = {}
    ;(adicionalCategorias || []).forEach((c) => { groups[c._id] = { name: c.name, items: [] } })
    ;(adicionais || []).forEach((a) => {
      const key = a.categoryId || SEM_CATEGORIA
      if (!groups[key]) groups[key] = { name: 'Sem categoria', items: [] }
      groups[key].items.push(a)
    })
    return Object.entries(groups)
      .map(([key, g]) => ({ key, ...g }))
      .filter((g) => g.items.length > 0)
  }, [adicionais, adicionalCategorias])

  const toggleCategoryOpen = (key) => setOpenCategories((f) => ({ ...f, [key]: !f[key] }))

  // Marca/desmarca a categoria inteira de uma vez (todos os itens dela) —
  // atalho útil quando o produto usa a categoria toda.
  const toggleWholeCategory = (group, checked) => {
    const ids = group.items.map((i) => i._id)
    setForm((f) => ({
      ...f,
      opcionaisIds: checked
        ? [...new Set([...f.opcionaisIds, ...ids])]
        : f.opcionaisIds.filter((x) => !ids.includes(x)),
    }))
  }

  // "Não precisa" — cria (se ainda não existir nessa categoria) um
  // opcional especial representando "nenhuma dessas opções", e já marca
  // ele pro produto. Evita o restaurante ter que ir lá em Opcionais criar
  // isso manualmente toda vez.
  const addNaoPrecisa = async (group) => {
    const existing = group.items.find((i) => i.name.trim().toLowerCase() === NAO_PRECISA_NOME.toLowerCase())
    if (existing) {
      if (!form.opcionaisIds.includes(existing._id)) {
        setForm((f) => ({ ...f, opcionaisIds: [...f.opcionaisIds, existing._id] }))
      }
      return
    }
    const created = await createOpcional.mutateAsync({
      name: NAO_PRECISA_NOME,
      categoryId: group.key === SEM_CATEGORIA ? null : group.key,
    })
    setForm((f) => ({ ...f, opcionaisIds: [...f.opcionaisIds, created.data.data._id] }))
  }

  const toggleOpcional = (opcId) => {
    setForm((f) => ({
      ...f,
      opcionaisIds: f.opcionaisIds.includes(opcId) ? f.opcionaisIds.filter((x) => x !== opcId) : [...f.opcionaisIds, opcId],
    }))
  }
  const toggleAdicional = (adId) => {
    setForm((f) => ({
      ...f,
      adicionaisIds: f.adicionaisIds.includes(adId) ? f.adicionaisIds.filter((x) => x !== adId) : [...f.adicionaisIds, adId],
    }))
  }

  // Aplica um favorito: COPIA a seleção dele pra este produto (substitui a
  // seleção atual). Editar o favorito depois não afeta produtos que já
  // aplicaram ele antes, e vice-versa.
  const applyFavorito = (favId) => {
    const fav = (favoritos || []).find((f) => f._id === favId)
    if (!fav) return
    setForm((f) => ({
      ...f,
      opcionaisIds: (fav.opcionalIds || []).map((o) => o._id || o),
      adicionaisIds: (fav.adicionalIds || []).map((a) => a._id || a),
    }))
  }

  // Ao editar um produto que já tem opcionais/adicionais escolhidos, abre
  // de cara as categorias correspondentes — senão o restaurante teria que
  // clicar em cada uma pra descobrir o que já estava marcado.
  useEffect(() => {
    if (!form.opcionaisIds.length && !form.adicionaisIds.length) return
    const toOpen = {}
    opcionalGroups.forEach((g) => {
      if (g.items.some((i) => form.opcionaisIds.includes(i._id))) toOpen[`op-${g.key}`] = true
    })
    adicionalGroups.forEach((g) => {
      if (g.items.some((i) => form.adicionaisIds.includes(i._id))) toOpen[`ad-${g.key}`] = true
    })
    if (Object.keys(toOpen).length) setOpenCategories((f) => ({ ...f, ...toOpen }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opcionalGroups, adicionalGroups])

  const handleSubmit = async (e) => {
    e.preventDefault()
    const payload = {
      name:        form.name,
      description: form.description,
      price:       toCents(form.price),
      category:    form.category,
      imageUrl:    form.imageBase64 ? null : (form.imageUrl || null),
      imageBase64: form.imageBase64 || null,
      opcionaisIds: form.opcionaisIds,
      adicionaisIds: form.adicionaisIds,
    }

    if (isEditing) {
      await updateProduct.mutateAsync({ id, ...payload })
    } else {
      await createProduct.mutateAsync(payload)
    }
    navigate('/products')
  }

  const handleDelete = async () => {
    if (!confirm('Remover este produto do cardápio?')) return
    await deleteProduct.mutateAsync(id)
    navigate('/products')
  }

  const isSaving = createProduct.isPending || updateProduct.isPending

  return (
    <div>
      <TopBar title={isEditing ? 'Editar produto' : 'Novo produto'} back />

      <form onSubmit={handleSubmit} className="page space-y-4">
        <Input label="Nome" value={form.name} onChange={handleChange('name')} placeholder="Ex: X-Burguer" required />

        <div>
          <label className="label">Descrição</label>
          <textarea
            className="input min-h-[80px] py-3"
            value={form.description}
            onChange={handleChange('description')}
            placeholder="Ingredientes, detalhes..."
          />
        </div>

        <Input
          label="Preço (R$)"
          type="number"
          step="0.01"
          min="0"
          value={form.price}
          onChange={handleChange('price')}
          placeholder="0,00"
          required
        />

        <div>
          <label className="label">Categoria</label>
          <input
            className="input"
            list="product-categories"
            value={form.category}
            onChange={handleChange('category')}
            placeholder="Ex: Lanches, Bebidas"
          />
          <datalist id="product-categories">
            {(categories || []).map((c) => <option key={c} value={c} />)}
          </datalist>
          <p className="text-xs text-gray-400 mt-1">Escolha uma categoria já usada ou digite uma nova.</p>
        </div>

        <ImageUploadField
          label="Imagem do produto (opcional)"
          imageUrl={form.imageUrl}
          imageBase64={form.imageBase64}
          onChange={({ imageUrl, imageBase64 }) => setForm((f) => ({
            ...f,
            imageUrl: imageUrl !== undefined ? imageUrl : f.imageUrl,
            imageBase64: imageBase64 !== undefined ? imageBase64 : f.imageBase64,
          }))}
        />

        {favoritos?.length > 0 && (
          <div>
            <label className="label">Aplicar um favorito</label>
            <select className="input" defaultValue="" onChange={(e) => e.target.value && applyFavorito(e.target.value)}>
              <option value="">Escolher um pacote pronto...</option>
              {favoritos.map((f) => <option key={f._id} value={f._id}>{f.name}</option>)}
            </select>
            <p className="text-xs text-gray-400 mt-1">
              Substitui a seleção abaixo pela do favorito escolhido — depois você ainda pode ajustar.
            </p>
          </div>
        )}

        {opcionalGroups.length > 0 && (
          <div>
            <label className="label">Opcionais deste produto (grátis)</label>
            <p className="text-xs text-gray-400 mb-2">
              Marque as categorias que esse produto usa. Ao abrir uma categoria, escolha quais itens dela ficam disponíveis.
            </p>
            <div className="space-y-2">
              {opcionalGroups.map((group) => {
                const groupIds = group.items.map((i) => i._id)
                const selectedCount = groupIds.filter((id) => form.opcionaisIds.includes(id)).length
                const isOpen = !!openCategories[`op-${group.key}`]
                const hasNaoPrecisa = group.items.some((i) => i.name.trim().toLowerCase() === NAO_PRECISA_NOME.toLowerCase() && form.opcionaisIds.includes(i._id))

                return (
                  <div key={group.key} className="border border-gray-200 rounded-xl overflow-hidden">
                    <button
                      type="button"
                      onClick={() => toggleCategoryOpen(`op-${group.key}`)}
                      className="w-full flex items-center justify-between px-3 py-2.5 bg-bg"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          role="checkbox"
                          aria-checked={selectedCount > 0}
                          onClick={(e) => { e.stopPropagation(); toggleWholeCategory(group, selectedCount === 0) }}
                          className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 ${selectedCount > 0 ? 'bg-primary border-primary' : 'border-gray-300'}`}
                        >
                          {selectedCount > 0 && <Check size={13} className="text-white" />}
                        </span>
                        <span className="text-sm font-medium">{group.name}</span>
                        {selectedCount > 0 && (
                          <span className="text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">{selectedCount} selecionado{selectedCount > 1 ? 's' : ''}</span>
                        )}
                      </div>
                      <ChevronDown size={16} className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isOpen && (
                      <div className="p-3 space-y-2 border-t border-gray-100">
                        <div className="flex flex-wrap gap-2">
                          {group.items.map((o) => (
                            <button
                              key={o._id}
                              type="button"
                              onClick={() => toggleOpcional(o._id)}
                              className={`text-xs px-3 py-1.5 rounded-full border ${form.opcionaisIds.includes(o._id) ? 'border-primary bg-primary/10 text-primary' : 'border-gray-200 text-gray-500'}`}
                            >
                              {o.name}
                            </button>
                          ))}
                        </div>

                        {!hasNaoPrecisa && (
                          <button
                            type="button"
                            onClick={() => addNaoPrecisa(group)}
                            disabled={createOpcional.isPending}
                            className="text-xs text-gray-400 underline underline-offset-2 disabled:opacity-50"
                          >
                            + Adicionar opção "Não precisa" nessa categoria
                          </button>
                        )}
                        <p className="text-xs text-gray-400">
                          No cardápio, o cliente vê essa categoria como pergunta de escolha única — se quiser que ele possa
                          recusar (ex: "sem molho"), inclua a opção "Não precisa" acima.
                        </p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {adicionalGroups.length > 0 && (
          <div>
            <label className="label">Adicionais deste produto (pagos)</label>
            <p className="text-xs text-gray-400 mb-2">
              Marque as categorias que esse produto usa, e dentro dela escolha os itens disponíveis.
            </p>
            <div className="space-y-2">
              {adicionalGroups.map((group) => {
                const groupIds = group.items.map((i) => i._id)
                const selectedCount = groupIds.filter((id) => form.adicionaisIds.includes(id)).length
                const isOpen = !!openCategories[`ad-${group.key}`]

                return (
                  <div key={group.key} className="border border-gray-200 rounded-xl overflow-hidden">
                    <button
                      type="button"
                      onClick={() => toggleCategoryOpen(`ad-${group.key}`)}
                      className="w-full flex items-center justify-between px-3 py-2.5 bg-bg"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{group.name}</span>
                        {selectedCount > 0 && (
                          <span className="text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">{selectedCount} selecionado{selectedCount > 1 ? 's' : ''}</span>
                        )}
                      </div>
                      <ChevronDown size={16} className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isOpen && (
                      <div className="p-3 flex flex-wrap gap-2 border-t border-gray-100">
                        {group.items.map((a) => (
                          <button
                            key={a._id}
                            type="button"
                            onClick={() => toggleAdicional(a._id)}
                            className={`text-xs px-3 py-1.5 rounded-full border ${form.adicionaisIds.includes(a._id) ? 'border-primary bg-primary/10 text-primary' : 'border-gray-200 text-gray-500'}`}
                          >
                            {a.name} · {formatCurrency(a.price)}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <Button type="submit" full loading={isSaving}>
          {isEditing ? 'Salvar alterações' : 'Adicionar ao cardápio'}
        </Button>

        {isEditing && (
          <Button type="button" variant="danger" full onClick={handleDelete} loading={deleteProduct.isPending}>
            <Trash2 size={16} />
            Remover produto
          </Button>
        )}
      </form>
    </div>
  )
}
