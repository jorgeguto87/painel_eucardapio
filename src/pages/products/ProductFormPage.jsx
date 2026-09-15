import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Trash2, ChevronDown, Check, Plus, X, GripVertical } from 'lucide-react'
import TopBar from '../../components/layout/TopBar'
import Input from '../../components/ui/Input'
import Button from '../../components/ui/Button'
import ImageUploadField from '../../components/media/ImageUploadField'
import {
  useProducts, useProductCategories, useCreateProduct, useUpdateProduct, useDeleteProduct,
  useCreateCategory, useVariantGroups, useCreateVariantGroup, useUpdateVariantGroup,
} from '../../hooks/useProducts'
import {
  useOpcionais, useOpcionalCategorias, useCreateOpcional,
  useAdicionais, useAdicionalCategorias, useFavoritos,
} from '../../hooks/useAddons'
import { toCents, formatCurrency } from '../../utils/format'

const SEM_CATEGORIA = 'sem-categoria'
const NAO_PRECISA_NOME = 'Não precisa'

// Centavos → string com vírgula, sempre com 2 casas (ex: 2000 → "20,00").
// toReais sozinho não garante isso (2000 → 20, sem casas decimais) —
// causava o valor aparecer sem vírgula quando era um número "redondo".
const formatarPrecoParaInput = (cents = 0) => (cents / 100).toFixed(2).replace('.', ',')

export default function ProductFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEditing = !!id

  const { data: grouped } = useProducts()
  const { data: categories } = useProductCategories()
  const { data: variantGroups } = useVariantGroups()
  const { data: opcionais } = useOpcionais()
  const { data: opcionalCategorias } = useOpcionalCategorias()
  const { data: adicionais } = useAdicionais()
  const { data: adicionalCategorias } = useAdicionalCategorias()
  const { data: favoritos } = useFavoritos()
  const createProduct = useCreateProduct()
  const updateProduct  = useUpdateProduct()
  const deleteProduct  = useDeleteProduct()
  const createOpcional = useCreateOpcional()
  const createCategory = useCreateCategory()
  const createVariantGroup = useCreateVariantGroup()
  const updateVariantGroup = useUpdateVariantGroup()

  const [openCategories, setOpenCategories] = useState({})
  const [novaCategoriaAberta, setNovaCategoriaAberta] = useState(false)
  const [nomeNovaCategoria, setNomeNovaCategoria] = useState('')

  const [form, setForm] = useState({
    name: '', description: '', price: '', category: 'Geral', imageUrl: '', imageBase64: '',
    pricingMode: 'simple', variantGroupIds: [],
    opcionaisIds: [], adicionaisIds: [],
  })

  // Grupos de variação, montados localmente antes de salvar. Tem _id só
  // quando pertence DE VERDADE a este produto (carregado pra edição) —
  // nesse caso, salvar atualiza o grupo existente. Sem _id, é sempre
  // criado como grupo novo, próprio deste produto — inclusive quando
  // "reaproveitado" (isso só copia nome, nunca o _id nem o preço, ver
  // reaproveitarGrupo abaixo).
  const [gruposVariacao, setGruposVariacao] = useState([])

  useEffect(() => {
    if (isEditing && grouped) {
      const allProducts = Object.values(grouped).flat()
      const product = allProducts.find((p) => p._id === id)
      if (product) {
        setForm({
          name: product.name,
          description: product.description || '',
          price: formatarPrecoParaInput(product.price),
          category: product.category || 'Geral',
          imageUrl: product.imageUrl || '',
          imageBase64: product.imageBase64 || '',
          pricingMode: product.pricingMode || 'simple',
          variantGroupIds: (product.variantGroupIds || []).map((g) => g._id || g),
          opcionaisIds: (product.opcionaisIds || []).map((o) => o._id || o),
          adicionaisIds: (product.adicionaisIds || []).map((a) => a._id || a),
        })
        if (product.variantGroupIds?.length) {
          setGruposVariacao(product.variantGroupIds.map((g) => ({
            _id: g._id, name: g.name,
            options: (g.options || []).map((o) => ({ ...o, price: formatarPrecoParaInput(o.price) })),
          })))
        }
      }
    }
  }, [isEditing, grouped, id])

  const handleChange = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

  // ── Categoria ────────────────────────────────────────────────────────

  const handleCriarCategoria = async () => {
    const nome = nomeNovaCategoria.trim()
    if (!nome) return
    await createCategory.mutateAsync(nome)
    setForm((f) => ({ ...f, category: nome }))
    setNomeNovaCategoria('')
    setNovaCategoriaAberta(false)
  }

  // ── Grupos de variação ───────────────────────────────────────────────

  const adicionarGrupoNovo = () => {
    setGruposVariacao((gs) => [...gs, { tempId: `novo-${Date.now()}`, name: '', options: [{ name: '', price: '0,00' }] }])
  }

  // "Reaproveitar" copia só a ESTRUTURA (nome do grupo + nome das opções)
  // como ponto de partida — nunca o preço, e nunca o _id do grupo antigo.
  // Sem isso, editar o preço aqui alteraria silenciosamente o preço de
  // TODOS os outros produtos que usam aquele grupo, o que não faz
  // sentido nesse sistema (não existe preço base pra variação somar —
  // o valor da opção É o preço final, então precisa ser digitado de
  // novo, específico pra cada produto).
  const reaproveitarGrupo = (groupId) => {
    if (!groupId) return
    const grupo = (variantGroups || []).find((g) => g._id === groupId)
    if (!grupo) return
    setGruposVariacao((gs) => [...gs, {
      tempId: `reaproveitado-${Date.now()}`,
      name: grupo.name,
      options: grupo.options.map((o) => ({ name: o.name, price: '' })),
    }])
  }

  const removerGrupo = (index) => setGruposVariacao((gs) => gs.filter((_, i) => i !== index))

  const atualizarNomeGrupo = (index, nome) => {
    setGruposVariacao((gs) => gs.map((g, i) => (i === index ? { ...g, name: nome } : g)))
  }

  const adicionarOpcao = (grupoIndex) => {
    setGruposVariacao((gs) => gs.map((g, i) => (i === grupoIndex ? { ...g, options: [...g.options, { name: '', price: '0,00' }] } : g)))
  }

  const atualizarOpcao = (grupoIndex, opcaoIndex, campo, valor) => {
    setGruposVariacao((gs) => gs.map((g, i) => {
      if (i !== grupoIndex) return g
      const options = g.options.map((o, j) => (j === opcaoIndex ? { ...o, [campo]: valor } : o))
      return { ...g, options }
    }))
  }

  const removerOpcao = (grupoIndex, opcaoIndex) => {
    setGruposVariacao((gs) => gs.map((g, i) => (i === grupoIndex ? { ...g, options: g.options.filter((_, j) => j !== opcaoIndex) } : g)))
  }

  const gruposDisponiveisPraReaproveitar = variantGroups || []

  // ── Opcionais / Adicionais (inalterado) ─────────────────────────────

  const opcionalGroups = useMemo(() => {
    const groups = {}
    ;(opcionalCategorias || []).forEach((c) => { groups[c._id] = { name: c.name, items: [] } })
    ;(opcionais || []).forEach((o) => {
      const key = o.categoryId || SEM_CATEGORIA
      if (!groups[key]) groups[key] = { name: 'Sem categoria', items: [] }
      groups[key].items.push(o)
    })
    return Object.entries(groups).map(([key, g]) => ({ key, ...g })).filter((g) => g.items.length > 0)
  }, [opcionais, opcionalCategorias])

  const adicionalGroups = useMemo(() => {
    const groups = {}
    ;(adicionalCategorias || []).forEach((c) => { groups[c._id] = { name: c.name, items: [] } })
    ;(adicionais || []).forEach((a) => {
      const key = a.categoryId || SEM_CATEGORIA
      if (!groups[key]) groups[key] = { name: 'Sem categoria', items: [] }
      groups[key].items.push(a)
    })
    return Object.entries(groups).map(([key, g]) => ({ key, ...g })).filter((g) => g.items.length > 0)
  }, [adicionais, adicionalCategorias])

  const toggleCategoryOpen = (key) => setOpenCategories((f) => ({ ...f, [key]: !f[key] }))

  const toggleWholeCategory = (group, checked) => {
    const ids = group.items.map((i) => i._id)
    setForm((f) => ({
      ...f,
      opcionaisIds: checked ? [...new Set([...f.opcionaisIds, ...ids])] : f.opcionaisIds.filter((x) => !ids.includes(x)),
    }))
  }

  const addNaoPrecisa = async (group) => {
    const existing = group.items.find((i) => i.name.trim().toLowerCase() === NAO_PRECISA_NOME.toLowerCase())
    if (existing) {
      if (!form.opcionaisIds.includes(existing._id)) setForm((f) => ({ ...f, opcionaisIds: [...f.opcionaisIds, existing._id] }))
      return
    }
    const created = await createOpcional.mutateAsync({ name: NAO_PRECISA_NOME, categoryId: group.key === SEM_CATEGORIA ? null : group.key })
    setForm((f) => ({ ...f, opcionaisIds: [...f.opcionaisIds, created.data.data._id] }))
  }

  const toggleOpcional = (opcId) => {
    setForm((f) => ({ ...f, opcionaisIds: f.opcionaisIds.includes(opcId) ? f.opcionaisIds.filter((x) => x !== opcId) : [...f.opcionaisIds, opcId] }))
  }
  const toggleAdicional = (adId) => {
    setForm((f) => ({ ...f, adicionaisIds: f.adicionaisIds.includes(adId) ? f.adicionaisIds.filter((x) => x !== adId) : [...f.adicionaisIds, adId] }))
  }

  const applyFavorito = (favId) => {
    const fav = (favoritos || []).find((f) => f._id === favId)
    if (!fav) return
    setForm((f) => ({
      ...f,
      opcionaisIds: (fav.opcionalIds || []).map((o) => o._id || o),
      adicionaisIds: (fav.adicionalIds || []).map((a) => a._id || a),
    }))
  }

  useEffect(() => {
    if (!form.opcionaisIds.length && !form.adicionaisIds.length) return
    const toOpen = {}
    opcionalGroups.forEach((g) => { if (g.items.some((i) => form.opcionaisIds.includes(i._id))) toOpen[`op-${g.key}`] = true })
    adicionalGroups.forEach((g) => { if (g.items.some((i) => form.adicionaisIds.includes(i._id))) toOpen[`ad-${g.key}`] = true })
    if (Object.keys(toOpen).length) setOpenCategories((f) => ({ ...f, ...toOpen }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opcionalGroups, adicionalGroups])

  // ── Salvar ───────────────────────────────────────────────────────────

  const handleSubmit = async (e) => {
    e.preventDefault()

    let variantGroupIds = []
    if (form.pricingMode === 'variants') {
      // Cria os grupos NOVOS primeiro (os que ainda não têm _id), depois
      // junta com os IDs dos que já existiam (reaproveitados)
      for (const grupo of gruposVariacao) {
        const payload = {
          name: grupo.name,
          options: grupo.options.map((o) => ({ name: o.name, price: toCents(String(o.price).replace(',', '.')) })),
        }
        if (grupo._id) {
          // Grupo pertence a ESTE produto (veio do carregamento dele pra
          // edição) — atualiza de verdade, senão a edição feita aqui nunca
          // seria salva.
          await updateVariantGroup.mutateAsync({ id: grupo._id, ...payload })
          variantGroupIds.push(grupo._id)
        } else {
          // Novo — seja do zero, seja "reaproveitado" como modelo de nome
          // (nesse caso o preço veio em branco, preenchido agora) — sempre
          // cria um grupo próprio desse produto, nunca compartilhado.
          const criado = await createVariantGroup.mutateAsync(payload)
          variantGroupIds.push(criado.data.data._id)
        }
      }
    }

    const payload = {
      name:        form.name,
      description: form.description,
      pricingMode: form.pricingMode,
      price:       form.pricingMode === 'simple' ? toCents(form.price) : 0,
      variantGroupIds: form.pricingMode === 'variants' ? variantGroupIds : [],
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

  const isSaving = createProduct.isPending || updateProduct.isPending || createVariantGroup.isPending || updateVariantGroup.isPending

  return (
    <div>
      <TopBar title={isEditing ? 'Editar produto' : 'Novo produto'} back />

      <form onSubmit={handleSubmit} className="page space-y-5">
        <div>
          <p className="text-[11px] font-semibold text-primary uppercase tracking-wide mb-1">1 · Informações do produto</p>
          <Input label="Nome" value={form.name} onChange={handleChange('name')} placeholder="Ex: X-Burguer especial" required />
          <div className="mt-3">
            <label className="label">Descrição</label>
            <textarea className="input min-h-[80px] py-3" value={form.description} onChange={handleChange('description')} placeholder="Ingredientes e detalhes importantes" />
          </div>
        </div>

        <div>
          <p className="text-[11px] font-semibold text-primary uppercase tracking-wide mb-1">2 · Categoria</p>
          <div className="flex flex-wrap gap-2">
            {(categories || []).map((c) => (
              <button
                key={c.name}
                type="button"
                onClick={() => setForm((f) => ({ ...f, category: c.name }))}
                className={`text-xs font-medium px-3 py-2 rounded-xl border transition-colors flex items-center gap-1 ${
                  form.category === c.name ? 'bg-primary text-white border-primary' : 'border-gray-200 text-secondary hover:bg-bg'
                }`}
              >
                {form.category === c.name && <Check size={12} />} {c.name}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setNovaCategoriaAberta((v) => !v)}
              className="text-xs font-medium px-3 py-2 rounded-xl border border-dashed border-gray-300 text-gray-400 hover:border-primary hover:text-primary transition-colors flex items-center gap-1"
            >
              <Plus size={12} /> Criar categoria
            </button>
          </div>
          {novaCategoriaAberta && (
            <div className="flex gap-2 mt-2">
              <input
                autoFocus
                value={nomeNovaCategoria}
                onChange={(e) => setNomeNovaCategoria(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleCriarCategoria())}
                placeholder="Nome da nova categoria"
                className="flex-1 text-sm px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <button type="button" onClick={handleCriarCategoria} className="px-3 py-2 rounded-xl bg-primary text-white text-xs font-semibold">
                Criar
              </button>
            </div>
          )}
        </div>

        <div>
          <p className="text-[11px] font-semibold text-primary uppercase tracking-wide mb-1">3 · Preço</p>
          <p className="text-xs text-gray-400 mb-2">Escolha uma das formas de cobrar.</p>
          <div className="flex bg-bg rounded-xl p-1 mb-3">
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, pricingMode: 'simple' }))}
              className={`flex-1 text-xs font-semibold py-2.5 rounded-lg transition-colors ${form.pricingMode === 'simple' ? 'bg-secondary text-white' : 'text-gray-400'}`}
            >
              Preço simples
            </button>
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, pricingMode: 'variants' }))}
              className={`flex-1 text-xs font-semibold py-2.5 rounded-lg transition-colors ${form.pricingMode === 'variants' ? 'bg-secondary text-white' : 'text-gray-400'}`}
            >
              Com variações
            </button>
          </div>

          {form.pricingMode === 'simple' ? (
            <Input label="Valor" type="number" step="0.01" min="0" value={form.price} onChange={handleChange('price')} placeholder="0,00" required />
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-gray-400">Você pode usar mais de um grupo neste produto.</p>

              {gruposVariacao.map((grupo, grupoIndex) => (
                <div key={grupo._id || grupo.tempId} className="border border-gray-200 rounded-xl p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <GripVertical size={14} className="text-gray-300 shrink-0" />
                    <input
                      value={grupo.name}
                      onChange={(e) => atualizarNomeGrupo(grupoIndex, e.target.value)}
                      placeholder="Ex: Qual carne?"
                      className="flex-1 text-sm px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                    <button type="button" onClick={() => removerGrupo(grupoIndex)} className="p-2 text-gray-300 hover:text-danger">
                      <Trash2 size={15} />
                    </button>
                  </div>

                  <div className="space-y-1.5 pl-5">
                    {grupo.options.map((opcao, opcaoIndex) => (
                      <div key={opcaoIndex} className="flex items-center gap-2">
                        <input
                          value={opcao.name}
                          onChange={(e) => atualizarOpcao(grupoIndex, opcaoIndex, 'name', e.target.value)}
                          placeholder="Nome da opção"
                          className="flex-1 text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/30"
                        />
                        <input
                          value={opcao.price}
                          onChange={(e) => atualizarOpcao(grupoIndex, opcaoIndex, 'price', e.target.value)}
                          placeholder="R$ 0,00"
                          className="w-24 text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/30"
                        />
                        <button type="button" onClick={() => removerOpcao(grupoIndex, opcaoIndex)} className="text-gray-300 hover:text-danger shrink-0">
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                    <button type="button" onClick={() => adicionarOpcao(grupoIndex)} className="text-xs text-primary font-medium flex items-center gap-1">
                      <Plus size={12} /> Adicionar opção
                    </button>
                  </div>
                  <p className="text-[11px] text-gray-400 pl-5">As opções aparecem somente quando o cliente abre os detalhes do produto.</p>
                </div>
              ))}

              <div className="flex flex-wrap gap-2 items-center">
                <button
                  type="button"
                  onClick={adicionarGrupoNovo}
                  className="text-xs font-semibold px-3 py-2 rounded-xl border border-dashed border-gray-300 text-gray-500 hover:border-primary hover:text-primary transition-colors flex items-center gap-1"
                >
                  <Plus size={13} /> Novo grupo
                </button>
                {gruposDisponiveisPraReaproveitar.length > 0 && (
                  <select
                    defaultValue=""
                    onChange={(e) => { reaproveitarGrupo(e.target.value); e.target.value = '' }}
                    className="text-xs px-3 py-2 rounded-xl border border-primary/40 text-primary"
                  >
                    <option value="">Reaproveitar grupo...</option>
                    {gruposDisponiveisPraReaproveitar.map((g) => <option key={g._id} value={g._id}>{g.name}</option>)}
                  </select>
                )}
              </div>
            </div>
          )}
        </div>

        <div>
          <p className="text-[11px] font-semibold text-primary uppercase tracking-wide mb-1">4 · Imagem</p>
          <ImageUploadField
            label="Uma boa foto ajuda o cliente a decidir."
            imageUrl={form.imageUrl}
            imageBase64={form.imageBase64}
            onChange={({ imageUrl, imageBase64 }) => setForm((f) => ({
              ...f,
              imageUrl: imageUrl !== undefined ? imageUrl : f.imageUrl,
              imageBase64: imageBase64 !== undefined ? imageBase64 : f.imageBase64,
            }))}
          />
        </div>

        <div>
          <p className="text-[11px] font-semibold text-primary uppercase tracking-wide mb-1">5 · Escolhas e adicionais</p>
          <p className="text-xs text-gray-400 mb-2">Tudo organizado em um só lugar.</p>

          {favoritos?.length > 0 && (
            <div className="mb-3">
              <label className="label">Aplicar um favorito</label>
              <select className="input" defaultValue="" onChange={(e) => e.target.value && applyFavorito(e.target.value)}>
                <option value="">Escolher um pacote pronto...</option>
                {favoritos.map((f) => <option key={f._id} value={f._id}>{f.name}</option>)}
              </select>
            </div>
          )}

          {opcionalGroups.length > 0 && (
            <div className="mb-3">
              <label className="label">Escolhas grátis</label>
              <div className="space-y-2">
                {opcionalGroups.map((group) => {
                  const groupIds = group.items.map((i) => i._id)
                  const selectedCount = groupIds.filter((gid) => form.opcionaisIds.includes(gid)).length
                  const isOpen = !!openCategories[`op-${group.key}`]
                  const hasNaoPrecisa = group.items.some((i) => i.name.trim().toLowerCase() === NAO_PRECISA_NOME.toLowerCase() && form.opcionaisIds.includes(i._id))

                  return (
                    <div key={group.key} className="border border-gray-200 rounded-xl overflow-hidden">
                      <button type="button" onClick={() => toggleCategoryOpen(`op-${group.key}`)} className="w-full flex items-center justify-between px-3 py-2.5 bg-bg">
                        <div className="flex items-center gap-2">
                          <span
                            role="checkbox" aria-checked={selectedCount > 0}
                            onClick={(e) => { e.stopPropagation(); toggleWholeCategory(group, selectedCount === 0) }}
                            className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 ${selectedCount > 0 ? 'bg-primary border-primary' : 'border-gray-300'}`}
                          >
                            {selectedCount > 0 && <Check size={13} className="text-white" />}
                          </span>
                          <span className="text-sm font-medium">{group.name}</span>
                          {selectedCount > 0 && <span className="text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">{selectedCount} selecionado{selectedCount > 1 ? 's' : ''}</span>}
                        </div>
                        <ChevronDown size={16} className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                      </button>
                      {isOpen && (
                        <div className="p-3 space-y-2 border-t border-gray-100">
                          <div className="flex flex-wrap gap-2">
                            {group.items.map((o) => (
                              <button key={o._id} type="button" onClick={() => toggleOpcional(o._id)}
                                className={`text-xs px-3 py-1.5 rounded-full border ${form.opcionaisIds.includes(o._id) ? 'border-primary bg-primary/10 text-primary' : 'border-gray-200 text-gray-500'}`}>
                                {o.name}
                              </button>
                            ))}
                          </div>
                          {!hasNaoPrecisa && (
                            <button type="button" onClick={() => addNaoPrecisa(group)} disabled={createOpcional.isPending} className="text-xs text-gray-400 underline underline-offset-2 disabled:opacity-50">
                              + Adicionar opção "Não precisa" nessa categoria
                            </button>
                          )}
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
              <label className="label">Adicionais pagos</label>
              <div className="space-y-2">
                {adicionalGroups.map((group) => {
                  const groupIds = group.items.map((i) => i._id)
                  const selectedCount = groupIds.filter((gid) => form.adicionaisIds.includes(gid)).length
                  const isOpen = !!openCategories[`ad-${group.key}`]

                  return (
                    <div key={group.key} className="border border-gray-200 rounded-xl overflow-hidden">
                      <button type="button" onClick={() => toggleCategoryOpen(`ad-${group.key}`)} className="w-full flex items-center justify-between px-3 py-2.5 bg-bg">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{group.name}</span>
                          {selectedCount > 0 && <span className="text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">{selectedCount} selecionado{selectedCount > 1 ? 's' : ''}</span>}
                        </div>
                        <ChevronDown size={16} className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                      </button>
                      {isOpen && (
                        <div className="p-3 flex flex-wrap gap-2 border-t border-gray-100">
                          {group.items.map((a) => (
                            <button key={a._id} type="button" onClick={() => toggleAdicional(a._id)}
                              className={`text-xs px-3 py-1.5 rounded-full border ${form.adicionaisIds.includes(a._id) ? 'border-primary bg-primary/10 text-primary' : 'border-gray-200 text-gray-500'}`}>
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
        </div>

        <Button type="submit" full loading={isSaving}>
          {isEditing ? 'Salvar alterações' : 'Adicionar ao cardápio'}
        </Button>

        {isEditing && (
          <Button type="button" variant="danger" full onClick={handleDelete} loading={deleteProduct.isPending}>
            <Trash2 size={16} /> Remover produto
          </Button>
        )}
      </form>
    </div>
  )
}
