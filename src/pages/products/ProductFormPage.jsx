import { useState, useEffect, useMemo, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Trash2, ChevronDown, Check, Plus, X, GripVertical, Info, Sparkles,
  Upload, Link as LinkIcon, ImagePlus, Save, ArrowLeft, HelpCircle, Minus,
  SkipForward, Layers,
} from 'lucide-react'
import TopBar from '../../components/layout/TopBar'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import {
  useProducts, useProductCategories, useCreateProduct, useUpdateProduct, useDeleteProduct,
  useCreateCategory, useVariantGroupTemplates,
} from '../../hooks/useProducts'
import {
  useOpcionais, useOpcionalCategorias, useCreateOpcional,
  useAdicionais, useAdicionalCategorias, useFavoritos,
} from '../../hooks/useAddons'
import { toCents, formatCurrency } from '../../utils/format'
import { fileToBase64 } from '../../utils/imageUpload'
import toast from 'react-hot-toast'
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
} from '@dnd-kit/core'
import {
  SortableContext, verticalListSortingStrategy, useSortable, arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

const SEM_CATEGORIA = 'sem-categoria'
const NAO_PRECISA_NOME = 'Não precisa'

// Centavos → string com vírgula, sempre com 2 casas (ex: 2000 → "20,00").
const formatarPrecoParaInput = (cents = 0) => (cents / 100).toFixed(2).replace('.', ',')

// ─── Seletor +/- pra mínimo/máximo — em vez de campo pra digitar, que no
// celular costuma "grudar" o número (toca, digita, e o valor vira uma
// concatenação em vez de substituir). Sempre limitado por [min, max], então
// nunca deixa configurar mais do que a quantidade de itens disponíveis.
function NumberStepper({ value, min, max, onChange }) {
  return (
    <div className="flex items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-white px-1 py-1">
      <button
        type="button"
        disabled={value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
        className="flex size-6 items-center justify-center rounded-md text-secondary hover:bg-bg disabled:opacity-30"
      >
        <Minus size={13} />
      </button>
      <span className="w-5 text-center text-sm font-bold tabular-nums">{value}</span>
      <button
        type="button"
        disabled={value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
        className="flex size-6 items-center justify-center rounded-md bg-primary/10 text-primary hover:bg-primary/20 disabled:opacity-30"
      >
        <Plus size={13} />
      </button>
    </div>
  )
}

// ─── Toggle "Oferecer opção de pular" — controla o item "Não precisa" +
// permiteNaoPrecisa + força mínimo 0, tudo junto (opcionais grátis e
// opcionais por variante usam exatamente o mesmo componente). ───────────────
function ToggleNaoPrecisa({ ativo, onToggle }) {
  return (
    <label className="flex items-center justify-between gap-2 rounded-lg bg-bg px-2.5 py-2 cursor-pointer">
      <span className="flex items-center gap-1.5 text-xs font-medium text-secondary">
        <SkipForward size={13} className="text-primary" /> Oferecer opção de pular ("Não precisa")
      </span>
      <span
        onClick={(e) => { e.preventDefault(); onToggle(!ativo) }}
        className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${ativo ? 'bg-primary' : 'bg-gray-300'}`}
      >
        <span className={`absolute top-0.5 size-4 rounded-full bg-white transition-transform ${ativo ? 'translate-x-4' : 'translate-x-0.5'}`} />
      </span>
    </label>
  )
}

// ─── Título numerado de seção, igual ao padrão do protótipo ────────────────

function SectionTitle({ number, title, text }) {
  return (
    <div className="mb-4 flex items-start gap-3">
      <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 font-mono text-[11px] font-bold text-primary">{number}</span>
      <div>
        <h2 className="text-base font-bold text-secondary">{title}</h2>
        {text && <p className="text-xs text-gray-400 mt-0.5">{text}</p>}
      </div>
    </div>
  )
}

// ─── Opção de variante, arrastável, com link de personalizar regra ─────────

function OpcaoArrastavel({ id, opcao, onChangeNome, onChangePreco, onRemover, temCategoriasDisponiveis, onAbrirOpcionais }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }

  return (
    <div ref={setNodeRef} style={style} className="space-y-1.5">
      <div className="grid grid-cols-[24px_1fr_110px_36px] items-center gap-2 rounded-xl border border-gray-200 bg-white p-2">
        <button type="button" {...attributes} {...listeners} className="touch-none text-gray-300 hover:text-gray-400 cursor-grab active:cursor-grabbing">
          <GripVertical size={16} />
        </button>
        <input
          value={opcao.name}
          onChange={(e) => onChangeNome(e.target.value)}
          placeholder="Ex: 500 ml"
          className="border-0 text-sm font-medium outline-none px-1 py-1"
        />
        <div className="relative">
          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[11px] text-gray-400">R$</span>
          <input
            value={opcao.price}
            onChange={(e) => onChangePreco(e.target.value)}
            placeholder="0,00"
            className="w-full rounded-lg border border-gray-200 pl-7 pr-2 py-1.5 text-xs font-semibold"
          />
        </div>
        <button type="button" onClick={onRemover} className="text-gray-300 hover:text-danger justify-self-center">
          <X size={16} />
        </button>
      </div>
      {temCategoriasDisponiveis && (
        <button
          type="button"
          onClick={onAbrirOpcionais}
          className={`ml-7 flex items-center gap-1 text-[11px] font-semibold hover:underline ${opcao.customOpcionais ? 'text-primary' : 'text-gray-400'}`}
        >
          <Sparkles size={11} /> {opcao.customOpcionais ? 'Opcionais personalizados para esta opção ✓' : `Escolher opcionais de "${opcao.name || 'esta opção'}"`}
        </button>
      )}
    </div>
  )
}

// ─── Painel (modal) de opcionais por variante — cada opção pode ter seu
// próprio conjunto de categorias/itens/regras, independente do que está
// configurado em "O que o cliente pode escolher?" (preço simples). ─────────

function PainelOpcionaisVariante({
  aberto, onClose, grupo, opcao, todasCategorias,
  onAtivarCustom, onDesativarCustom, onToggleCategoria, onToggleItem, onChangeRule, onToggleNaoPrecisa,
}) {
  if (!aberto || !opcao) return null

  const overrides = opcao.opcionalRulesOverride || []
  const getOverride = (catKey) => overrides.find((r) => r.categoryKey === catKey)

  return (
    <Modal open={aberto} onClose={onClose} title="Opcionais desta variante">
      <div className="space-y-4">
        <div className="rounded-xl bg-primary/5 border border-primary/20 px-3 py-2.5 text-xs text-secondary">
          Ligado a: <span className="font-semibold">{grupo?.name}</span> → <span className="font-semibold text-primary">{opcao.name || 'esta opção'}</span>
        </div>

        {!opcao.customOpcionais ? (
          <>
            <p className="text-xs text-gray-400">
              Esta opção está usando as mesmas categorias e a mesma regra configuradas em
              "O que o cliente pode escolher?" (a mesma coisa que vale pro preço simples).
              Personalize só se essa opção específica precisar de opcionais diferentes.
            </p>
            <Button full variant="secondary" onClick={onAtivarCustom}>
              <Layers size={15} className="mr-1.5" /> Personalizar opcionais desta opção
            </Button>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-gray-400">Escolha uma ou mais categorias pra essa opção.</p>
              <button type="button" onClick={onDesativarCustom} className="text-[11px] font-semibold text-gray-400 hover:text-danger shrink-0">
                Voltar ao padrão do produto
              </button>
            </div>

            <div className="space-y-3">
              {todasCategorias.map((cat) => {
                const override = getOverride(cat.key)
                const ativo = !!override
                const itemIds = override?.itemIds || []
                return (
                  <div key={cat.key} className={`rounded-xl border p-3 ${ativo ? 'border-primary/30' : 'border-gray-200'}`}>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={ativo} onChange={() => onToggleCategoria(cat)} />
                      <span className="text-sm font-semibold text-secondary">{cat.name}</span>
                      <span className="text-[11px] text-gray-400">({cat.items.length} itens)</span>
                    </label>

                    {ativo && (
                      <div className="mt-3 space-y-3 pl-1">
                        <div className="flex flex-wrap gap-2">
                          {cat.items.map((it) => (
                            <button
                              key={it._id} type="button"
                              onClick={() => onToggleItem(cat.key, it._id)}
                              className={`text-xs px-3 py-1.5 rounded-full border ${itemIds.includes(it._id) ? 'border-primary bg-primary/10 text-primary' : 'border-gray-200 text-gray-500'}`}
                            >
                              {it.name}
                            </button>
                          ))}
                        </div>

                        <div className="flex items-center gap-3 rounded-lg bg-bg p-2.5">
                          <div className="flex-1 flex items-center justify-between">
                            <span className="text-[11px] text-gray-400">Mínimo</span>
                            <NumberStepper
                              value={override.min} min={0} max={Math.max(0, override.max)}
                              onChange={(v) => onChangeRule(cat.key, 'min', v)}
                            />
                          </div>
                          <div className="flex-1 flex items-center justify-between">
                            <span className="text-[11px] text-gray-400">Máximo</span>
                            <NumberStepper
                              value={override.max} min={Math.max(1, override.min)} max={Math.max(1, itemIds.length)}
                              onChange={(v) => onChangeRule(cat.key, 'max', v)}
                            />
                          </div>
                        </div>

                        <ToggleNaoPrecisa
                          ativo={!!override.permiteNaoPrecisa}
                          onToggle={(ligar) => onToggleNaoPrecisa(cat, ligar)}
                        />
                      </div>
                    )}
                  </div>
                )
              })}
              {todasCategorias.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-4">Nenhuma categoria de opcional cadastrada ainda no restaurante.</p>
              )}
            </div>
          </>
        )}

        <Button full onClick={onClose}>Concluído</Button>
      </div>
    </Modal>
  )
}

export default function ProductFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEditing = !!id
  const fileRef = useRef(null)

  const { data: grouped } = useProducts()
  const { data: categories } = useProductCategories()
  const { data: variantGroupTemplates } = useVariantGroupTemplates()
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

  const [salvo, setSalvo] = useState(false)
  const [openCategories, setOpenCategories] = useState({})
  const [novaCategoriaAberta, setNovaCategoriaAberta] = useState(false)
  const [nomeNovaCategoria, setNomeNovaCategoria] = useState('')
  const [choiceTab, setChoiceTab] = useState('free') // 'free' | 'paid'
  const [imageMode, setImageMode] = useState('upload') // 'upload' | 'url'
  const [reuseOpen, setReuseOpen] = useState(false)
  const [favoriteOpen, setFavoriteOpen] = useState(false)
  const [regraVariante, setRegraVariante] = useState(null) // { grupoIndex, opcaoIndex } | null

  const [form, setForm] = useState({
    name: '', description: '', price: '', category: 'Geral', imageUrl: '', imageBase64: '',
    pricingMode: 'simple',
    opcionaisIds: [], adicionaisIds: [], opcionalRules: [],
  })

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
          opcionaisIds: (product.opcionaisIds || []).map((o) => o._id || o),
          adicionaisIds: (product.adicionaisIds || []).map((a) => a._id || a),
          opcionalRules: product.opcionalRules || [],
        })
        setGruposVariacao(
          (product.variantGroups || []).map((g) => ({
            _key: crypto.randomUUID(), name: g.name,
            options: (g.options || []).map((o) => ({
              _key: crypto.randomUUID(), name: o.name, price: formatarPrecoParaInput(o.price),
              customOpcionais: o.customOpcionais || false,
              opcionalRulesOverride: (o.opcionalRulesOverride || []).map((r) => ({
                ...r, itemIds: (r.itemIds || []).map((it) => it._id || it),
              })),
            })),
          }))
        )
        if (product.imageUrl) setImageMode('url')
      }
    } else if (!isEditing) {
      setForm({
        name: '', description: '', price: '', category: 'Geral', imageUrl: '', imageBase64: '',
        pricingMode: 'simple', opcionaisIds: [], adicionaisIds: [], opcionalRules: [],
      })
      setGruposVariacao([])
    }
  }, [isEditing, grouped, id])

  const handleChange = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

  // ── Categoria do produto ────────────────────────────────────────────

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
    setGruposVariacao((gs) => [...gs, { _key: crypto.randomUUID(), name: '', options: [{ _key: crypto.randomUUID(), name: '', price: '0,00' }] }])
    setReuseOpen(false)
  }

  const reaproveitarGrupo = (nomeGrupo) => {
    const template = (variantGroupTemplates || []).find((g) => g.name === nomeGrupo)
    if (!template) return
    setGruposVariacao((gs) => [...gs, {
      _key: crypto.randomUUID(),
      name: template.name,
      options: template.options.map((o) => ({ _key: crypto.randomUUID(), name: o.name, price: '' })),
    }])
    setReuseOpen(false)
  }

  const removerGrupo = (index) => setGruposVariacao((gs) => gs.filter((_, i) => i !== index))

  const atualizarNomeGrupo = (index, nome) => {
    setGruposVariacao((gs) => gs.map((g, i) => (i === index ? { ...g, name: nome } : g)))
  }

  // Opção nova herda automaticamente a configuração de opcionais da última
  // opção do mesmo grupo (se ela tiver uma personalizada) — assim o
  // restaurante não precisa configurar do zero pra cada tamanho/variação,
  // só ajustar o que for diferente.
  const adicionarOpcao = (grupoIndex) => {
    setGruposVariacao((gs) => gs.map((g, i) => {
      if (i !== grupoIndex) return g
      const ultima = g.options[g.options.length - 1]
      const heranca = ultima?.customOpcionais
        ? {
            customOpcionais: true,
            opcionalRulesOverride: (ultima.opcionalRulesOverride || []).map((r) => ({
              ...r, itemIds: r.itemIds ? [...r.itemIds] : undefined,
            })),
          }
        : {}
      return { ...g, options: [...g.options, { _key: crypto.randomUUID(), name: '', price: '0,00', ...heranca }] }
    }))
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

  const reordenarOpcoes = (grupoIndex, opcoesReordenadas) => {
    setGruposVariacao((gs) => gs.map((g, i) => (i === grupoIndex ? { ...g, options: opcoesReordenadas } : g)))
  }

  // Aplica uma função de atualização na opção certa dentro do grupo certo —
  // reaproveitado por todos os handlers de "opcionais por variante" abaixo.
  const atualizarOpcaoRegra = (grupoIndex, opcaoIndex, fn) => {
    setGruposVariacao((gs) => gs.map((g, i) => {
      if (i !== grupoIndex) return g
      const options = g.options.map((o, j) => (j === opcaoIndex ? fn(o) : o))
      return { ...g, options }
    }))
  }

  // Liga o modo "opcionais personalizados" nessa opção — semeia a partir do
  // que já está configurado em "O que o cliente pode escolher?" (produto
  // inteiro), com todos os itens de cada categoria pré-marcados, pra não
  // obrigar o restaurante a montar tudo de novo do zero.
  const ativarCustomOpcionais = (grupoIndex, opcaoIndex) => {
    atualizarOpcaoRegra(grupoIndex, opcaoIndex, (o) => ({
      ...o,
      customOpcionais: true,
      opcionalRulesOverride: o.opcionalRulesOverride?.length ? o.opcionalRulesOverride : opcionalGroups.map((g) => ({
        categoryKey: g.key,
        min: g.min,
        max: g.max,
        permiteNaoPrecisa: !!g.permiteNaoPrecisa,
        itemIds: g.items.map((it) => it._id),
      })),
    }))
  }

  const desativarCustomOpcionais = (grupoIndex, opcaoIndex) => {
    atualizarOpcaoRegra(grupoIndex, opcaoIndex, (o) => ({ ...o, customOpcionais: false }))
  }

  // Ativa/desativa uma categoria pra essa opção específica — ao ativar,
  // começa com todos os itens da categoria marcados (fácil de desmarcar o
  // que não quer do que exigir marcar um por um).
  const toggleCategoriaVariante = (grupoIndex, opcaoIndex, cat) => {
    atualizarOpcaoRegra(grupoIndex, opcaoIndex, (o) => {
      const atuais = o.opcionalRulesOverride || []
      const existe = atuais.some((r) => r.categoryKey === cat.key)
      const opcionalRulesOverride = existe
        ? atuais.filter((r) => r.categoryKey !== cat.key)
        : [...atuais, { categoryKey: cat.key, min: 0, max: Math.max(1, cat.items.length), permiteNaoPrecisa: false, itemIds: cat.items.map((it) => it._id) }]
      return { ...o, opcionalRulesOverride }
    })
  }

  const toggleItemVariante = (grupoIndex, opcaoIndex, catKey, itemId) => {
    atualizarOpcaoRegra(grupoIndex, opcaoIndex, (o) => {
      const opcionalRulesOverride = (o.opcionalRulesOverride || []).map((r) => {
        if (r.categoryKey !== catKey) return r
        const itemIds = r.itemIds.includes(itemId) ? r.itemIds.filter((x) => x !== itemId) : [...r.itemIds, itemId]
        // O máximo nunca pode passar da quantidade de itens escolhidos.
        return { ...r, itemIds, max: Math.min(r.max, Math.max(1, itemIds.length)) }
      })
      return { ...o, opcionalRulesOverride }
    })
  }

  const changeRuleVariante = (grupoIndex, opcaoIndex, catKey, campo, valor) => {
    atualizarOpcaoRegra(grupoIndex, opcaoIndex, (o) => {
      const opcionalRulesOverride = (o.opcionalRulesOverride || []).map((r) => (r.categoryKey === catKey ? { ...r, [campo]: valor } : r))
      return { ...o, opcionalRulesOverride }
    })
  }

  const toggleNaoPrecisaVariante = async (grupoIndex, opcaoIndex, cat, ligar) => {
    // Ligando: garante que existe um item "Não precisa" nessa categoria (cria
    // se faltar, igual ao nível de produto) e inclui ele nos itens dessa
    // variante. Desligando: só tira a marcação, mantém o item na lista.
    let naoPrecisaId = cat.items.find((i) => i.name.trim().toLowerCase() === NAO_PRECISA_NOME.toLowerCase())?._id
    if (ligar && !naoPrecisaId) {
      const created = await createOpcional.mutateAsync({ name: NAO_PRECISA_NOME, categoryId: cat.key === SEM_CATEGORIA ? null : cat.key })
      naoPrecisaId = created.data.data._id
    }
    atualizarOpcaoRegra(grupoIndex, opcaoIndex, (o) => {
      const opcionalRulesOverride = (o.opcionalRulesOverride || []).map((r) => {
        if (r.categoryKey !== cat.key) return r
        const itemIds = ligar && naoPrecisaId && !r.itemIds.includes(naoPrecisaId) ? [...r.itemIds, naoPrecisaId] : r.itemIds
        return { ...r, permiteNaoPrecisa: ligar, min: ligar ? 0 : (r.min || 1), itemIds, max: Math.max(r.max, itemIds.length ? 1 : r.max) }
      })
      return { ...o, opcionalRulesOverride }
    })
  }

  const sensorsOpcoes = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const menorPreco = useMemo(() => {
    const todos = gruposVariacao.flatMap((g) => g.options.map((o) => parseFloat(String(o.price).replace(',', '.')) || 0))
    return todos.length ? Math.min(...todos).toFixed(2).replace('.', ',') : '0,00'
  }, [gruposVariacao])

  // ── Opcionais / Adicionais ──────────────────────────────────────────

  const getRuleFor = (catKey) => form.opcionalRules.find((r) => r.categoryKey === catKey) || { min: 1, max: 1 }
  const setRuleFor = (catKey, campo, valor) => {
    setForm((f) => {
      const existe = f.opcionalRules.some((r) => r.categoryKey === catKey)
      const opcionalRules = existe
        ? f.opcionalRules.map((r) => (r.categoryKey === catKey ? { ...r, [campo]: valor } : r))
        : [...f.opcionalRules, { categoryKey: catKey, min: 1, max: 1, [campo]: valor }]
      return { ...f, opcionalRules }
    })
  }

  const opcionalGroups = useMemo(() => {
    const groups = {}
    ;(opcionalCategorias || []).forEach((c) => { groups[c._id] = { name: c.name, items: [] } })
    ;(opcionais || []).forEach((o) => {
      const key = o.categoryId || SEM_CATEGORIA
      if (!groups[key]) groups[key] = { name: 'Sem categoria', items: [] }
      groups[key].items.push(o)
    })
    return Object.entries(groups)
      .map(([key, g]) => ({ key, ...g, ...getRuleFor(key) }))
      .filter((g) => g.items.length > 0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opcionais, opcionalCategorias, form.opcionalRules])

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

  const toggleWholeAdicionalCategory = (group, checked) => {
    const ids = group.items.map((i) => i._id)
    setForm((f) => ({
      ...f,
      adicionaisIds: checked ? [...new Set([...f.adicionaisIds, ...ids])] : f.adicionaisIds.filter((x) => !ids.includes(x)),
    }))
  }

  // "Oferecer opção de pular" — cria (se faltar) o item "Não precisa" nessa
  // categoria, marca ele como selecionado, liga permiteNaoPrecisa e força o
  // mínimo pra 0 (o cardápio do cliente esconde esse 0, só mostra a opção de
  // pular dentro da própria lista — ver ProductDetailSheet no cardápio).
  const toggleNaoPrecisaProduto = async (group, ligar) => {
    let naoPrecisaId = group.items.find((i) => i.name.trim().toLowerCase() === NAO_PRECISA_NOME.toLowerCase())?._id
    if (ligar && !naoPrecisaId) {
      const created = await createOpcional.mutateAsync({ name: NAO_PRECISA_NOME, categoryId: group.key === SEM_CATEGORIA ? null : group.key })
      naoPrecisaId = created.data.data._id
    }
    setForm((f) => {
      const opcionaisIds = ligar && naoPrecisaId && !f.opcionaisIds.includes(naoPrecisaId)
        ? [...f.opcionaisIds, naoPrecisaId]
        : f.opcionaisIds
      const existe = f.opcionalRules.some((r) => r.categoryKey === group.key)
      const opcionalRules = existe
        ? f.opcionalRules.map((r) => (r.categoryKey === group.key ? { ...r, permiteNaoPrecisa: ligar, min: ligar ? 0 : (r.min || 1) } : r))
        : [...f.opcionalRules, { categoryKey: group.key, min: ligar ? 0 : 1, max: 1, permiteNaoPrecisa: ligar }]
      return { ...f, opcionaisIds, opcionalRules }
    })
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
    setFavoriteOpen(false)
  }

  // ── Imagem ───────────────────────────────────────────────────────────

  const handleFile = async (file) => {
    if (!file) return
    try {
      const base64 = await fileToBase64(file)
      setForm((f) => ({ ...f, imageBase64: base64, imageUrl: '' }))
    } catch (err) {
      toast.error(err.message)
    }
  }

  // ── Salvar ───────────────────────────────────────────────────────────

  const handleSubmit = async (e) => {
    e.preventDefault()

    const variantGroupsPayload = form.pricingMode === 'variants'
      ? gruposVariacao.map((grupo) => ({
          name: grupo.name,
          options: grupo.options.map((o) => ({
            name: o.name,
            price: toCents(String(o.price).replace(',', '.')),
            customOpcionais: !!o.customOpcionais,
            ...(o.opcionalRulesOverride?.length ? { opcionalRulesOverride: o.opcionalRulesOverride } : {}),
          })),
        }))
      : []

    // Qualquer item referenciado só dentro de uma variante (customOpcionais)
    // também precisa estar em opcionaisIds — é o que garante que o backend
    // vai popular esse item pro cardápio do cliente (o populate é feito só
    // em cima desse array, nunca dentro de variantGroups).
    const itemIdsDasVariantes = variantGroupsPayload
      .flatMap((g) => g.options)
      .flatMap((o) => o.opcionalRulesOverride || [])
      .flatMap((r) => r.itemIds || [])

    const payload = {
      name:        form.name,
      description: form.description,
      pricingMode: form.pricingMode,
      price:       form.pricingMode === 'simple' ? toCents(form.price) : 0,
      variantGroups: variantGroupsPayload,
      category:    form.category,
      imageUrl:    form.imageBase64 ? null : (form.imageUrl || null),
      imageBase64: form.imageBase64 || null,
      opcionaisIds: [...new Set([...form.opcionaisIds, ...itemIdsDasVariantes])],
      opcionalRules: form.opcionalRules,
      adicionaisIds: form.adicionaisIds,
    }

    if (isEditing) {
      await updateProduct.mutateAsync({ id, ...payload })
    } else {
      await createProduct.mutateAsync(payload)
    }
    setSalvo(true)
    setTimeout(() => setSalvo(false), 2600)
    if (!isEditing) navigate('/products')
  }

  const handleDelete = async () => {
    if (!confirm(`Remover "${form.name}" do cardápio? Essa ação não pode ser desfeita.`)) return
    await deleteProduct.mutateAsync(id)
    navigate('/products')
  }

  const isSaving = createProduct.isPending || updateProduct.isPending

  const grupoAtual = regraVariante ? gruposVariacao[regraVariante.grupoIndex] : null
  const opcaoAtual = regraVariante ? grupoAtual?.options[regraVariante.opcaoIndex] : null

  return (
    <div className="min-h-screen bg-bg">
      <TopBar
        title={isEditing ? 'Editar produto' : 'Novo produto'}
        subtitle={form.name || 'Produto sem nome'}
        back
        right={
          <Button onClick={handleSubmit} loading={isSaving} className="min-w-[120px]">
            {salvo ? <Check size={16} /> : <Save size={16} />}
            <span className="hidden sm:inline">{salvo ? 'Salvo!' : isEditing ? 'Salvar alterações' : 'Adicionar ao cardápio'}</span>
            <span className="sm:hidden">{salvo ? 'Salvo' : 'Salvar'}</span>
          </Button>
        }
      />

      <div className="mx-auto grid max-w-5xl gap-6 px-4 py-6 lg:grid-cols-[160px_minmax(0,1fr)]">
        {/* Navegação lateral — só desktop */}
        <aside className="hidden lg:block">
          <nav className="sticky top-20 space-y-1">
            {[['01', 'Produto', '#produto'], ['02', 'Preço', '#preco'], ['03', 'Escolhas', '#escolhas'], ['04', 'Imagem', '#imagem']].map(([n, label, href]) => (
              <a key={href} href={href} className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold text-gray-500 hover:bg-white hover:text-secondary transition-colors">
                <span className="font-mono text-[11px] text-primary">{n}</span>{label}
              </a>
            ))}
          </nav>
        </aside>

        <form onSubmit={handleSubmit} className="min-w-0 space-y-6">

          {/* ── 1. Sobre o produto ──────────────────────────────────── */}
          <section id="produto" className="bg-white rounded-2xl p-5 scroll-mt-20">
            <SectionTitle number="1" title="Sobre o produto" text="O que o cliente verá primeiro no cardápio." />
            <div className="space-y-4">
              <div>
                <label className="label">Nome do produto</label>
                <input value={form.name} onChange={handleChange('name')} placeholder="Ex: Marmitex da Casa" className="input" required />
              </div>
              <div>
                <label className="label">Descrição <span className="text-gray-400 font-normal">(opcional)</span></label>
                <textarea
                  value={form.description}
                  onChange={handleChange('description')}
                  rows={3}
                  maxLength={300}
                  placeholder="Conte o que acompanha e por que vale a pena pedir"
                  className="input min-h-[80px] py-3"
                />
                <p className="text-right text-[11px] text-gray-400 mt-0.5">{form.description.length}/300</p>
              </div>
              <div>
                <p className="label">Em qual categoria ele aparece?</p>
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
                  <div className="flex gap-2 mt-2 max-w-md">
                    <input
                      autoFocus
                      value={nomeNovaCategoria}
                      onChange={(e) => setNomeNovaCategoria(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleCriarCategoria())}
                      placeholder="Nome da nova categoria"
                      className="flex-1 text-sm px-3 py-2 rounded-xl border border-primary/30 bg-primary/5"
                    />
                    <button type="button" onClick={handleCriarCategoria} className="px-3 py-2 rounded-xl bg-primary text-white text-xs font-semibold">Criar</button>
                    <button type="button" onClick={() => setNovaCategoriaAberta(false)} className="p-2 text-gray-400"><X size={16} /></button>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* ── 2. Preço ─────────────────────────────────────────────── */}
          <section id="preco" className="bg-white rounded-2xl p-5 scroll-mt-20">
            <SectionTitle number="2" title="Como este produto é vendido?" text="Use um valor único ou ofereça versões diferentes." />

            <div className="grid grid-cols-2 rounded-xl bg-bg p-1 mb-5">
              <button type="button" onClick={() => setForm((f) => ({ ...f, pricingMode: 'simple' }))}
                className={`flex flex-col items-start gap-0.5 rounded-lg px-4 py-2.5 transition-colors ${form.pricingMode === 'simple' ? 'bg-white shadow-sm' : ''}`}>
                <span className="text-sm font-bold text-secondary">Preço simples</span>
                <span className="text-[11px] text-gray-400">Um único valor</span>
              </button>
              <button type="button" onClick={() => setForm((f) => ({ ...f, pricingMode: 'variants' }))}
                className={`flex flex-col items-start gap-0.5 rounded-lg px-4 py-2.5 transition-colors ${form.pricingMode === 'variants' ? 'bg-white shadow-sm' : ''}`}>
                <span className="text-sm font-bold text-secondary">Com variantes</span>
                <span className="text-[11px] text-gray-400">Tamanhos, tipos e mais</span>
              </button>
            </div>

            {form.pricingMode === 'simple' ? (
              <div className="max-w-xs">
                <label className="label">Preço final ao cliente</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">R$</span>
                  <input type="number" step="0.01" min="0" value={form.price} onChange={handleChange('price')} className="input pl-10 text-lg font-bold" required />
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-start gap-2.5 rounded-xl border border-primary/20 bg-primary/5 p-3.5 text-xs text-secondary">
                  <Info size={15} className="mt-0.5 shrink-0 text-primary" />
                  <p><strong>O preço de cada opção já é o valor final.</strong> No cardápio, o cliente verá "a partir de R$ {menorPreco}".</p>
                </div>

                {gruposVariacao.map((grupo, grupoIndex) => (
                  <div key={grupo._key} className="rounded-xl border border-gray-200 overflow-hidden">
                    <div className="flex items-start justify-between gap-3 border-b border-gray-100 p-3.5 bg-bg">
                      <div className="flex-1 min-w-0">
                        <span className="text-[10px] font-bold uppercase text-gray-400">Grupo {grupoIndex + 1}</span>
                        <input
                          value={grupo.name}
                          onChange={(e) => atualizarNomeGrupo(grupoIndex, e.target.value)}
                          placeholder="Ex: Qual tamanho?"
                          className="block w-full bg-transparent text-sm font-bold text-secondary outline-none"
                        />
                        <p className="text-[11px] text-gray-400">Essa é a pergunta que o cliente verá.</p>
                      </div>
                      <button type="button" onClick={() => removerGrupo(grupoIndex)} className="text-gray-300 hover:text-danger shrink-0">
                        <Trash2 size={15} />
                      </button>
                    </div>

                    <div className="p-3.5 space-y-2">
                      <DndContext
                        sensors={sensorsOpcoes}
                        collisionDetection={closestCenter}
                        onDragEnd={(event) => {
                          const { active, over } = event
                          if (!over || active.id === over.id) return
                          const oldIndex = grupo.options.findIndex((o) => o._key === active.id)
                          const newIndex = grupo.options.findIndex((o) => o._key === over.id)
                          reordenarOpcoes(grupoIndex, arrayMove(grupo.options, oldIndex, newIndex))
                        }}
                      >
                        <SortableContext items={grupo.options.map((o) => o._key)} strategy={verticalListSortingStrategy}>
                          {grupo.options.map((opcao, opcaoIndex) => (
                            <OpcaoArrastavel
                              key={opcao._key}
                              id={opcao._key}
                              opcao={opcao}
                              onChangeNome={(valor) => atualizarOpcao(grupoIndex, opcaoIndex, 'name', valor)}
                              onChangePreco={(valor) => atualizarOpcao(grupoIndex, opcaoIndex, 'price', valor)}
                              onRemover={() => removerOpcao(grupoIndex, opcaoIndex)}
                              temCategoriasDisponiveis={opcionalGroups.length > 0}
                              onAbrirOpcionais={() => setRegraVariante({ grupoIndex, opcaoIndex })}
                            />
                          ))}
                        </SortableContext>
                      </DndContext>
                      <button type="button" onClick={() => adicionarOpcao(grupoIndex)} className="text-xs text-primary font-semibold flex items-center gap-1 pt-1">
                        <Plus size={13} /> Adicionar opção
                      </button>
                    </div>
                  </div>
                ))}

                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={adicionarGrupoNovo} className="text-xs font-semibold px-3 py-2.5 rounded-xl border border-gray-200 text-secondary hover:bg-bg flex items-center gap-1.5">
                    <Plus size={14} /> Novo grupo
                  </button>
                  {variantGroupTemplates?.length > 0 && (
                    <div className="relative">
                      <button type="button" onClick={() => setReuseOpen((v) => !v)} className="text-xs font-semibold px-3 py-2.5 rounded-xl border border-gray-200 text-secondary hover:bg-bg flex items-center gap-1.5">
                        Reaproveitar grupo <ChevronDown size={13} />
                      </button>
                      {reuseOpen && (
                        <div className="absolute left-0 top-11 z-20 w-72 rounded-xl border border-gray-100 bg-white p-2 shadow-lg">
                          <p className="px-2 py-1 text-[10px] font-bold uppercase text-gray-400">Copia apenas os nomes</p>
                          {variantGroupTemplates.map((t) => (
                            <button key={t.name} type="button" onClick={() => reaproveitarGrupo(t.name)} className="block w-full rounded-lg px-2 py-2 text-left hover:bg-bg">
                              <span className="block text-sm font-semibold text-secondary">{t.name}</span>
                              <span className="text-[11px] text-gray-400">{t.options.map((o) => o.name).join(', ')}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>

          {/* ── 3. Escolhas (opcionais + adicionais) ────────────────── */}
          <section id="escolhas" className="bg-white rounded-2xl p-5 scroll-mt-20">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4">
              <SectionTitle number="3" title="O que o cliente pode escolher?" text="Vincule itens da sua lista e defina regras claras." />
              {favoritos?.length > 0 && (
                <div className="relative shrink-0">
                  <button type="button" onClick={() => setFavoriteOpen((v) => !v)} className="text-xs font-semibold px-3 py-2.5 rounded-xl border border-gray-200 text-secondary hover:bg-bg flex items-center gap-1.5">
                    <Sparkles size={13} className="text-primary" /> Aplicar favorito <ChevronDown size={13} />
                  </button>
                  {favoriteOpen && (
                    <div className="absolute right-0 top-11 z-20 w-72 rounded-xl border border-gray-100 bg-white p-2 shadow-lg">
                      <p className="px-2 py-1 text-[10px] font-bold uppercase text-gray-400">Pacotes salvos</p>
                      {favoritos.map((f) => (
                        <button key={f._id} type="button" onClick={() => applyFavorito(f._id)} className="block w-full rounded-lg px-2 py-2 text-left hover:bg-bg">
                          <span className="block text-sm font-semibold text-secondary">{f.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex gap-5 border-b border-gray-100 mb-4">
              <button type="button" onClick={() => setChoiceTab('free')} className={`flex items-center gap-1.5 pb-2.5 text-sm font-semibold border-b-2 -mb-px ${choiceTab === 'free' ? 'text-primary border-primary' : 'text-gray-400 border-transparent'}`}>
                Opcionais grátis <span className="text-[10px] bg-bg rounded-full px-1.5 py-0.5">{opcionalGroups.length}</span>
              </button>
              <button type="button" onClick={() => setChoiceTab('paid')} className={`flex items-center gap-1.5 pb-2.5 text-sm font-semibold border-b-2 -mb-px ${choiceTab === 'paid' ? 'text-primary border-primary' : 'text-gray-400 border-transparent'}`}>
                Adicionais pagos <span className="text-[10px] bg-bg rounded-full px-1.5 py-0.5">{form.adicionaisIds.length}</span>
              </button>
            </div>

            {choiceTab === 'free' ? (
              <div className="space-y-3">
                <div className="flex items-start gap-2.5 rounded-xl bg-bg p-3 text-xs text-gray-500">
                  <Info size={14} className="mt-0.5 shrink-0" />
                  <p>Opcionais já fazem parte do produto e não têm custo extra. Em cada categoria, escolha os itens oferecidos e quantos o cliente pode selecionar.</p>
                </div>

                {opcionalGroups.length === 0 && (
                  <p className="text-xs text-gray-400 py-4 text-center">Nenhuma categoria de opcional cadastrada ainda no restaurante.</p>
                )}

                {opcionalGroups.map((group) => {
                  const groupIds = group.items.map((i) => i._id)
                  const selectedCount = groupIds.filter((gid) => form.opcionaisIds.includes(gid)).length
                  const isOpen = !!openCategories[`op-${group.key}`]
                  const todosMarcados = selectedCount === group.items.length

                  return (
                    <div key={group.key} className={`rounded-xl border overflow-hidden ${isOpen ? 'border-primary/30' : 'border-gray-200'}`}>
                      <button type="button" onClick={() => toggleCategoryOpen(`op-${group.key}`)} className="w-full flex items-center justify-between px-4 py-3 bg-bg">
                        <div className="text-left">
                          <span className="text-sm font-bold text-secondary">{group.name}</span>
                          <p className="text-[11px] text-gray-400">{selectedCount} de {group.items.length} itens disponíveis</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-bold text-primary bg-primary/10 px-2 py-1 rounded-full">
                            {group.permiteNaoPrecisa
                              ? `Escolha ${group.max}`
                              : group.min === group.max ? `Escolha ${group.max}` : `Escolha de ${group.min} a ${group.max}`}
                          </span>
                          <ChevronDown size={16} className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                        </div>
                      </button>

                      {isOpen && (
                        <div className="p-4 grid md:grid-cols-2 gap-4 border-t border-gray-100">
                          {/* Coluna dos itens */}
                          <div className="space-y-2.5">
                            <label className="flex items-center gap-2 text-xs font-semibold text-secondary">
                              <input type="checkbox" checked={todosMarcados} onChange={(e) => toggleWholeCategory(group, e.target.checked)} />
                              Marcar todos
                            </label>
                            <div className="flex flex-wrap gap-2">
                              {group.items
                                .filter((o) => o.name.trim().toLowerCase() !== NAO_PRECISA_NOME.toLowerCase())
                                .map((o) => (
                                <button key={o._id} type="button" onClick={() => toggleOpcional(o._id)}
                                  className={`text-xs px-3 py-1.5 rounded-full border ${form.opcionaisIds.includes(o._id) ? 'border-primary bg-primary/10 text-primary' : 'border-gray-200 text-gray-500'}`}>
                                  {o.name}
                                </button>
                              ))}
                            </div>
                            <ToggleNaoPrecisa
                              ativo={!!group.permiteNaoPrecisa}
                              onToggle={(ligar) => toggleNaoPrecisaProduto(group, ligar)}
                            />
                          </div>

                          {/* Coluna da regra */}
                          <div className="rounded-xl bg-bg p-3.5 space-y-2.5 h-fit">
                            <p className="text-xs font-bold text-secondary flex items-center gap-1.5"><HelpCircle size={13} className="text-primary" /> Quantos o cliente escolhe?</p>
                            <div className="flex items-center gap-3">
                              {!group.permiteNaoPrecisa && (
                                <div className="flex-1 flex flex-col items-center gap-1">
                                  <label className="text-[10px] text-gray-400">Mínimo</label>
                                  <NumberStepper
                                    value={group.min} min={0} max={Math.max(0, group.max)}
                                    onChange={(v) => setRuleFor(group.key, 'min', v)}
                                  />
                                </div>
                              )}
                              <div className="flex-1 flex flex-col items-center gap-1">
                                <label className="text-[10px] text-gray-400">Máximo</label>
                                <NumberStepper
                                  value={group.max} min={Math.max(1, group.min)} max={Math.max(1, group.items.length)}
                                  onChange={(v) => setRuleFor(group.key, 'max', v)}
                                />
                              </div>
                            </div>
                            <p className="text-[11px] text-primary font-semibold bg-primary/10 rounded-lg px-2.5 py-1.5">
                              {group.permiteNaoPrecisa
                                ? `Escolha exatamente ${group.max} (ou "Não precisa")`
                                : group.min === group.max ? `Escolha exatamente ${group.max}` : group.min === 0 ? `Escolha até ${group.max}` : `Escolha de ${group.min} a ${group.max}`}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-start gap-2.5 rounded-xl bg-bg p-3 text-xs text-gray-500">
                  <Info size={14} className="mt-0.5 shrink-0" />
                  <p>O cliente pode adicionar quantas unidades quiser, inclusive nenhuma. Cada item soma o valor indicado ao pedido.</p>
                </div>

                {adicionalGroups.length === 0 && (
                  <p className="text-xs text-gray-400 py-4 text-center">Nenhuma categoria de adicional cadastrada ainda no restaurante.</p>
                )}

                {adicionalGroups.map((group) => {
                  const groupIds = group.items.map((i) => i._id)
                  const todosMarcados = groupIds.length > 0 && groupIds.every((gid) => form.adicionaisIds.includes(gid))
                  const selectedCount = groupIds.filter((gid) => form.adicionaisIds.includes(gid)).length

                  return (
                    <div key={group.key} className="rounded-xl border border-gray-200 p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h3 className="text-sm font-bold text-secondary">{group.name}</h3>
                          <p className="text-[11px] text-gray-400">{selectedCount} de {group.items.length} disponíveis</p>
                        </div>
                        <label className="flex items-center gap-2 text-xs font-semibold text-secondary">
                          <input type="checkbox" checked={todosMarcados} onChange={(e) => toggleWholeAdicionalCategory(group, e.target.checked)} />
                          Marcar todos
                        </label>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {group.items.map((item) => {
                          const marcado = form.adicionaisIds.includes(item._id)
                          return (
                            <button
                              key={item._id} type="button" onClick={() => toggleAdicional(item._id)}
                              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border ${marcado ? 'border-primary bg-primary/10 text-primary' : 'border-gray-200 text-gray-500'}`}
                            >
                              {item.name}
                              <span className={`font-semibold ${marcado ? 'text-primary' : 'text-success'}`}>{formatCurrency(item.price)}</span>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </section>

          {/* ── 4. Imagem ────────────────────────────────────────────── */}
          <section id="imagem" className="bg-white rounded-2xl p-5 scroll-mt-20">
            <SectionTitle number="4" title="Imagem do produto" text="Uma boa foto ajuda o cliente a decidir." />

            <div className="flex w-fit rounded-xl bg-bg p-1 mb-4">
              <button type="button" onClick={() => setImageMode('upload')} className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg ${imageMode === 'upload' ? 'bg-white shadow-sm text-secondary' : 'text-gray-400'}`}>
                <Upload size={13} /> Enviar arquivo
              </button>
              <button type="button" onClick={() => setImageMode('url')} className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg ${imageMode === 'url' ? 'bg-white shadow-sm text-secondary' : 'text-gray-400'}`}>
                <LinkIcon size={13} /> Colar URL
              </button>
            </div>

            {imageMode === 'upload' ? (
              <>
                <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" onChange={(e) => { handleFile(e.target.files?.[0]); e.target.value = '' }} />
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => { e.preventDefault(); handleFile(e.dataTransfer.files?.[0]) }}
                  className="w-full rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 hover:bg-primary/10 transition-colors overflow-hidden"
                >
                  {form.imageBase64 ? (
                    <img src={form.imageBase64} alt="Prévia do produto" className="h-44 w-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 px-4">
                      <span className="flex size-12 items-center justify-center rounded-full bg-white text-primary mb-3">
                        <ImagePlus size={20} />
                      </span>
                      <span className="text-sm font-bold text-secondary">Clique ou arraste uma foto aqui</span>
                      <span className="text-xs text-gray-400 mt-1">JPG, PNG ou WEBP</span>
                    </div>
                  )}
                </button>
              </>
            ) : (
              <div className="flex max-w-xl gap-2">
                <input value={form.imageUrl} onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value, imageBase64: '' }))} placeholder="https://exemplo.com/foto-do-produto.jpg" className="input" />
              </div>
            )}
            {(form.imageUrl && imageMode === 'url') && (
              <img src={form.imageUrl} alt="Prévia" className="h-32 mt-3 rounded-xl object-cover" onError={(e) => { e.target.style.display = 'none' }} />
            )}
          </section>

          {/* ── Rodapé ───────────────────────────────────────────────── */}
          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-8">
            {isEditing ? (
              <Button type="button" variant="ghost" onClick={handleDelete} loading={deleteProduct.isPending} className="text-danger">
                <Trash2 size={16} /> Remover produto
              </Button>
            ) : <span />}
            <Button type="submit" loading={isSaving}>
              {isEditing ? 'Salvar alterações' : 'Adicionar ao cardápio'}
            </Button>
          </div>
        </form>
      </div>

      <PainelOpcionaisVariante
        aberto={!!regraVariante}
        onClose={() => setRegraVariante(null)}
        grupo={grupoAtual}
        opcao={opcaoAtual}
        todasCategorias={opcionalGroups}
        onAtivarCustom={() => regraVariante && ativarCustomOpcionais(regraVariante.grupoIndex, regraVariante.opcaoIndex)}
        onDesativarCustom={() => regraVariante && desativarCustomOpcionais(regraVariante.grupoIndex, regraVariante.opcaoIndex)}
        onToggleCategoria={(cat) => regraVariante && toggleCategoriaVariante(regraVariante.grupoIndex, regraVariante.opcaoIndex, cat)}
        onToggleItem={(catKey, itemId) => regraVariante && toggleItemVariante(regraVariante.grupoIndex, regraVariante.opcaoIndex, catKey, itemId)}
        onChangeRule={(catKey, campo, valor) => regraVariante && changeRuleVariante(regraVariante.grupoIndex, regraVariante.opcaoIndex, catKey, campo, valor)}
        onToggleNaoPrecisa={(cat, ligar) => regraVariante && toggleNaoPrecisaVariante(regraVariante.grupoIndex, regraVariante.opcaoIndex, cat, ligar)}
      />
    </div>
  )
}
