import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus, ImageOff, SlidersHorizontal, Star, Image, QrCode, ChevronDown, GripVertical,
  FolderPlus, Pencil, Check, X, Trash2, MoreVertical, Copy, FolderInput,
} from 'lucide-react'
import toast from 'react-hot-toast'
import TopBar from '../../components/layout/TopBar'
import Card from '../../components/ui/Card'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import Modal from '../../components/ui/Modal'
import Button from '../../components/ui/Button'
import {
  useProducts, useToggleProduct, useProductCategories,
  useCreateCategory, useUpdateCategory, useDeleteCategory, useReorderCategories, useReorderProducts,
  useDeleteProduct, useDuplicateProduct,
} from '../../hooks/useProducts'
import { formatCurrency } from '../../utils/format'
import api from '../../config/api'
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
} from '@dnd-kit/core'
import {
  SortableContext, verticalListSortingStrategy, useSortable, arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

// ─── Produto arrastável, com menu de ações ─────────────────────────────────

function ProdutoArrastavel({ product, navigate, toggleProduct, onExcluir, onMover, onDuplicar }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: product._id })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }
  const [menuAberto, setMenuAberto] = useState(false)

  const precoExibido = product.pricingMode === 'variants'
    ? (product.variantGroups?.[0]?.options?.length
        ? `A partir de ${formatCurrency(Math.min(...product.variantGroups[0].options.map((o) => o.price)))}`
        : 'Sem preço definido')
    : formatCurrency(product.price)

  return (
    <div ref={setNodeRef} style={style}>
      <Card className={!product.isAvailable ? 'opacity-50' : ''}>
        <div className="flex items-center gap-2">
          <button {...attributes} {...listeners} className="touch-none text-gray-300 hover:text-gray-400 shrink-0 cursor-grab active:cursor-grabbing">
            <GripVertical size={16} />
          </button>

          <div
            className="w-12 h-12 rounded-xl bg-bg flex items-center justify-center flex-shrink-0 overflow-hidden cursor-pointer"
            onClick={() => navigate(`/products/${product._id}`)}
          >
            {(product.imageBase64 || product.imageUrl)
              ? <img src={product.imageBase64 || product.imageUrl} alt="" className="w-full h-full object-cover" />
              : <ImageOff size={18} className="text-gray-300" />
            }
          </div>

          <div className="flex-1 min-w-0 cursor-pointer" onClick={() => navigate(`/products/${product._id}`)}>
            <p className="font-medium text-sm truncate" translate="no">{product.name}</p>
            <p className="text-xs text-gray-400">{precoExibido}</p>
          </div>

          <button
            onClick={(e) => { e.stopPropagation(); toggleProduct.mutate(product._id) }}
            className="relative w-11 h-6 rounded-full transition-colors flex-shrink-0 cursor-pointer"
          >
            <span className={`absolute inset-0 rounded-full transition-colors ${product.isAvailable ? 'bg-success' : 'bg-gray-300'}`} />
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                product.isAvailable ? 'translate-x-5' : ''
              }`}
            />
          </button>

          {/* Lixeira direto na lista — antes só dava pra apagar abrindo o produto */}
          <button
            onClick={(e) => { e.stopPropagation(); onExcluir() }}
            className="p-1.5 text-gray-300 hover:text-danger shrink-0 cursor-pointer"
          >
            <Trash2 size={16} />
          </button>

          <div className="relative shrink-0">
            <button
              onClick={(e) => { e.stopPropagation(); setMenuAberto((v) => !v) }}
              className="p-1.5 text-gray-300 hover:text-gray-500 cursor-pointer"
            >
              <MoreVertical size={16} />
            </button>
            {menuAberto && (
              <>
                <div className="fixed inset-0 z-10" onClick={(e) => { e.stopPropagation(); setMenuAberto(false) }} />
                <div className="absolute right-0 top-8 z-20 w-52 bg-white rounded-xl shadow-lg border border-gray-100 py-1">
                  <button
                    onClick={(e) => { e.stopPropagation(); setMenuAberto(false); onMover() }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-secondary hover:bg-bg cursor-pointer"
                  >
                    <FolderInput size={14} /> Mover de categoria
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setMenuAberto(false); onDuplicar() }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-secondary hover:bg-bg cursor-pointer"
                  >
                    <Copy size={14} /> Duplicar em categorias
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </Card>
    </div>
  )
}

// ─── Categoria arrastável, com renomear e apagar ───────────────────────────

function CategoriaArrastavel({ categoria, produtos, expandida, onToggleExpandir, navigate, toggleProduct, onReorderProdutos, onRenomear, onApagar, onExcluirProduto, onMoverProduto, onDuplicarProduto }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: categoria.name })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }

  const [editando, setEditando] = useState(false)
  const [nomeEditado, setNomeEditado] = useState(categoria.name)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const handleDragEndProdutos = (event) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = produtos.findIndex((p) => p._id === active.id)
    const newIndex = produtos.findIndex((p) => p._id === over.id)
    const novaOrdem = arrayMove(produtos, oldIndex, newIndex)
    onReorderProdutos(novaOrdem)
  }

  const abrirEdicao = (e) => {
    e.stopPropagation()
    setNomeEditado(categoria.name)
    setEditando(true)
  }

  const salvarEdicao = () => {
    const nome = nomeEditado.trim()
    if (nome && nome !== categoria.name) onRenomear(nome)
    setEditando(false)
  }

  return (
    <div ref={setNodeRef} style={style}>
      <div className="flex items-center gap-2 mb-2">
        <button {...attributes} {...listeners} className="touch-none text-gray-300 hover:text-gray-400 cursor-grab active:cursor-grabbing">
          <GripVertical size={16} />
        </button>

        {editando ? (
          <div className="flex-1 flex items-center gap-2 bg-white rounded-xl px-3 py-2 border border-primary/40">
            <input
              autoFocus
              value={nomeEditado}
              onChange={(e) => setNomeEditado(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') salvarEdicao(); if (e.key === 'Escape') setEditando(false) }}
              className="flex-1 text-sm font-semibold text-secondary outline-none"
            />
            <button onClick={salvarEdicao} className="text-primary shrink-0 cursor-pointer">
              <Check size={16} />
            </button>
            <button onClick={() => setEditando(false)} className="text-gray-300 hover:text-gray-400 shrink-0 cursor-pointer">
              <X size={16} />
            </button>
          </div>
        ) : (
          <button
            onClick={onToggleExpandir}
            className="flex-1 flex items-center justify-between bg-white rounded-xl px-4 py-3 border border-gray-100 hover:bg-bg transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-1.5 font-semibold text-secondary text-sm">
              {categoria.name}
              <span onClick={abrirEdicao} className="text-gray-300 hover:text-primary p-1 -m-1 cursor-pointer">
                <Pencil size={12} />
              </span>
            </span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400 bg-bg px-2 py-0.5 rounded-full">{produtos.length}</span>
              <span
                onClick={(e) => { e.stopPropagation(); onApagar() }}
                className="text-gray-300 hover:text-danger p-1 -m-1 cursor-pointer"
              >
                <Trash2 size={14} />
              </span>
              <ChevronDown size={16} className={`text-gray-400 transition-transform ${expandida ? 'rotate-180' : ''}`} />
            </div>
          </button>
        )}
      </div>

      {expandida && (
        <div className="pl-6 space-y-2 mb-2">
          {produtos.length === 0 ? (
            <p className="text-xs text-gray-400 py-2">Nenhum produto nessa categoria ainda.</p>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEndProdutos}>
              <SortableContext items={produtos.map((p) => p._id)} strategy={verticalListSortingStrategy}>
                {produtos.map((product) => (
                  <ProdutoArrastavel
                    key={product._id}
                    product={product}
                    navigate={navigate}
                    toggleProduct={toggleProduct}
                    onExcluir={() => onExcluirProduto(product)}
                    onMover={() => onMoverProduto(product)}
                    onDuplicar={() => onDuplicarProduto(product)}
                  />
                ))}
              </SortableContext>
            </DndContext>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Modal: mover produto pra outra categoria ──────────────────────────────

function MoverProdutoModal({ produto, categorias, onClose, onConfirmar, salvando }) {
  const [destino, setDestino] = useState('')

  // Sem isso, a seleção de uma abertura anterior ficava "grudada" — o
  // componente não é recriado do zero a cada vez que abre pra um produto
  // diferente, só o prop muda. Reseta toda vez que muda de produto.
  useEffect(() => { setDestino('') }, [produto?._id])

  if (!produto) return null

  return (
    <Modal open={!!produto} onClose={onClose} title="Mover de categoria">
      <div className="space-y-4">
        <p className="text-sm text-gray-500">
          Mover <span className="font-semibold text-secondary" translate="no">{produto.name}</span> pra qual categoria?
        </p>
        <div className="flex flex-wrap gap-2">
          {categorias.filter((c) => c.name !== produto.category).map((c) => (
            <button
              key={c.name}
              onClick={() => setDestino(c.name)}
              className={`text-xs font-medium px-3 py-2 rounded-xl border cursor-pointer ${
                destino === c.name ? 'bg-primary text-white border-primary' : 'border-gray-200 text-secondary hover:bg-bg'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
        <Button full disabled={!destino} loading={salvando} onClick={() => onConfirmar(destino)}>
          Mover
        </Button>
      </div>
    </Modal>
  )
}

// ─── Modal: duplicar produto em outras categorias ──────────────────────────

function DuplicarProdutoModal({ produto, categorias, onClose, onConfirmar, salvando }) {
  const [selecionadas, setSelecionadas] = useState([])

  // Mesmo problema, e é exatamente o bug que você reportou: sem isso, a
  // categoria marcada numa duplicação anterior ficava selecionada pra
  // sempre, mesmo sem aparecer marcada na tela, e ia junto em toda
  // duplicação seguinte.
  useEffect(() => { setSelecionadas([]) }, [produto?._id])

  if (!produto) return null

  const toggle = (nome) => setSelecionadas((s) => (s.includes(nome) ? s.filter((n) => n !== nome) : [...s, nome]))

  return (
    <Modal open={!!produto} onClose={onClose} title="Duplicar em categorias">
      <div className="space-y-4">
        <p className="text-sm text-gray-500">
          Cria uma cópia independente de <span className="font-semibold text-secondary" translate="no">{produto.name}</span> em cada categoria marcada — depois cada cópia pode ser editada separadamente.
        </p>
        <div className="space-y-2">
          {categorias.filter((c) => c.name !== produto.category).map((c) => (
            <label key={c.name} className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-gray-200 cursor-pointer hover:bg-bg">
              <span
                onClick={() => toggle(c.name)}
                className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 cursor-pointer ${
                  selecionadas.includes(c.name) ? 'bg-primary border-primary' : 'border-gray-300'
                }`}
              >
                {selecionadas.includes(c.name) && <Check size={13} className="text-white" />}
              </span>
              <span className="text-sm" onClick={() => toggle(c.name)}>{c.name}</span>
            </label>
          ))}
        </div>
        <Button full disabled={selecionadas.length === 0} loading={salvando} onClick={() => onConfirmar(selecionadas)}>
          Duplicar em {selecionadas.length || ''} categoria{selecionadas.length !== 1 ? 's' : ''}
        </Button>
      </div>
    </Modal>
  )
}

// ─── Modal: apagar categoria (com realocação se tiver produto) ────────────

function ApagarCategoriaModal({ categoria, categorias, onClose, onConfirmar, salvando }) {
  const [modo, setModo] = useState(null) // null | 'coletivo' | 'individual'
  const [destinoColetivo, setDestinoColetivo] = useState('')
  const [destinosIndividuais, setDestinosIndividuais] = useState({}) // { produtoId: categoriaNome }

  // Mesmo cuidado dos outros 2 modais — reseta tudo sempre que muda de
  // categoria, senão escolha antiga fica grudada silenciosamente.
  useEffect(() => {
    setModo(null)
    setDestinoColetivo('')
    setDestinosIndividuais({})
  }, [categoria?.name])

  if (!categoria) return null

  const produtos = categoria.produtos || []
  const outrasCategorias = categorias.filter((c) => c.name !== categoria.name)
  const semProdutos = produtos.length === 0

  const confirmar = () => {
    if (semProdutos) return onConfirmar({})
    if (modo === 'coletivo') return onConfirmar({ moveAllTo: destinoColetivo })
    if (modo === 'individual') {
      const reassignments = produtos.map((p) => ({ productId: p._id, category: destinosIndividuais[p._id] }))
      return onConfirmar({ reassignments })
    }
  }

  const individualCompleto = produtos.every((p) => destinosIndividuais[p._id])

  return (
    <Modal open={!!categoria} onClose={onClose} title={`Apagar "${categoria.name}"`}>
      <div className="space-y-4">
        {semProdutos ? (
          <>
            <p className="text-sm text-gray-500">Essa categoria não tem nenhum produto — pode apagar direto.</p>
            <Button full variant="danger" loading={salvando} onClick={confirmar}>
              <Trash2 size={16} /> Apagar categoria
            </Button>
          </>
        ) : (
          <>
            <p className="text-sm text-gray-500">
              Essa categoria tem <span className="font-semibold text-secondary">{produtos.length} produto{produtos.length !== 1 ? 's' : ''}</span>. Diga pra onde mover antes de apagar.
            </p>

            {!modo && (
              <div className="space-y-2">
                <button onClick={() => setModo('coletivo')} className="w-full text-left px-4 py-3 rounded-xl border border-gray-200 hover:bg-bg cursor-pointer">
                  <p className="text-sm font-semibold text-secondary">Mover todos pra uma categoria só</p>
                  <p className="text-xs text-gray-400 mt-0.5">Todos os {produtos.length} produtos vão pro mesmo lugar</p>
                </button>
                <button onClick={() => setModo('individual')} className="w-full text-left px-4 py-3 rounded-xl border border-gray-200 hover:bg-bg cursor-pointer">
                  <p className="text-sm font-semibold text-secondary">Mover um por um</p>
                  <p className="text-xs text-gray-400 mt-0.5">Escolhe uma categoria diferente pra cada produto</p>
                </button>
              </div>
            )}

            {modo === 'coletivo' && (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {outrasCategorias.map((c) => (
                    <button
                      key={c.name}
                      onClick={() => setDestinoColetivo(c.name)}
                      className={`text-xs font-medium px-3 py-2 rounded-xl border cursor-pointer ${
                        destinoColetivo === c.name ? 'bg-primary text-white border-primary' : 'border-gray-200 text-secondary hover:bg-bg'
                      }`}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={() => setModo(null)}>Voltar</Button>
                  <Button full disabled={!destinoColetivo} loading={salvando} onClick={confirmar}>Mover e apagar</Button>
                </div>
              </div>
            )}

            {modo === 'individual' && (
              <div className="space-y-3">
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {produtos.map((p) => (
                    <div key={p._id} className="flex items-center justify-between gap-2 py-1.5">
                      <span className="text-sm truncate flex-1" translate="no">{p.name}</span>
                      <select
                        value={destinosIndividuais[p._id] || ''}
                        onChange={(e) => setDestinosIndividuais((d) => ({ ...d, [p._id]: e.target.value }))}
                        className="text-xs px-2 py-1.5 rounded-lg border border-gray-200 cursor-pointer"
                      >
                        <option value="">Escolher...</option>
                        {outrasCategorias.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
                      </select>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={() => setModo(null)}>Voltar</Button>
                  <Button full disabled={!individualCompleto} loading={salvando} onClick={confirmar}>Mover e apagar</Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  )
}

// ─── Página principal ───────────────────────────────────────────────────────

export default function ProductsPage() {
  const navigate = useNavigate()
  const { data: grouped, isLoading } = useProducts()
  const { data: categoriasApi } = useProductCategories()
  const toggleProduct = useToggleProduct()
  const createCategory = useCreateCategory()
  const updateCategory = useUpdateCategory()
  const deleteCategory = useDeleteCategory()
  const reorderCategories = useReorderCategories()
  const reorderProducts = useReorderProducts()
  const deleteProduct = useDeleteProduct()
  const duplicateProduct = useDuplicateProduct()

  const [downloadingSign, setDownloadingSign] = useState(false)
  const [expandidas, setExpandidas] = useState({})
  const [novaCategoriaAberta, setNovaCategoriaAberta] = useState(false)
  const [nomeNovaCategoria, setNomeNovaCategoria] = useState('')

  const [categoriaParaApagar, setCategoriaParaApagar] = useState(null)
  const [produtoParaMover, setProdutoParaMover] = useState(null)
  const [produtoParaDuplicar, setProdutoParaDuplicar] = useState(null)

  const categoriasOrdenadas = useMemo(() => {
    if (!categoriasApi) return []
    return categoriasApi.map((c) => ({ ...c, produtos: grouped?.[c.name] || [] }))
  }, [categoriasApi, grouped])

  const totalProdutos = useMemo(
    () => categoriasOrdenadas.reduce((sum, c) => sum + c.produtos.length, 0),
    [categoriasOrdenadas]
  )

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const toggleExpandir = (nome) => setExpandidas((prev) => ({ ...prev, [nome]: !prev[nome] }))

  const handleDragEndCategorias = async (event) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = categoriasOrdenadas.findIndex((c) => c.name === active.id)
    const newIndex = categoriasOrdenadas.findIndex((c) => c.name === over.id)
    const novaOrdem = arrayMove(categoriasOrdenadas, oldIndex, newIndex)

    const items = await Promise.all(
      novaOrdem.map(async (c, index) => {
        if (c.id) return { id: c.id, sortOrder: index }
        const resposta = await api.post('/products/categories', { name: c.name })
        return { id: resposta.data.data._id, sortOrder: index }
      })
    )
    reorderCategories.mutate(items)
  }

  const handleReorderProdutosDaCategoria = (categoriaNome, novaOrdemProdutos) => {
    const items = novaOrdemProdutos.map((p, index) => ({ id: p._id, sortOrder: index }))
    reorderProducts.mutate(items)
  }

  const handleCriarCategoria = () => {
    const nome = nomeNovaCategoria.trim()
    if (!nome) return
    createCategory.mutate(nome, {
      onSuccess: () => { setNomeNovaCategoria(''); setNovaCategoriaAberta(false) },
    })
  }

  const handleRenomearCategoria = async (categoria, novoNome) => {
    let categoryId = categoria.id
    if (!categoryId) {
      const resposta = await api.post('/products/categories', { name: categoria.name })
      categoryId = resposta.data.data._id
    }
    updateCategory.mutate({ id: categoryId, name: novoNome })
  }

  const handleApagarCategoria = async (payload) => {
    let categoryId = categoriaParaApagar.id
    if (!categoryId) {
      const resposta = await api.post('/products/categories', { name: categoriaParaApagar.name })
      categoryId = resposta.data.data._id
    }
    deleteCategory.mutate({ id: categoryId, ...payload }, {
      onSuccess: () => setCategoriaParaApagar(null),
    })
  }

  const handleExcluirProduto = (produto) => {
    if (!confirm(`Apagar "${produto.name}"? Essa ação não pode ser desfeita.`)) return
    deleteProduct.mutate(produto._id)
  }

  const handleMoverProduto = (destino) => {
    api.patch(`/products/${produtoParaMover._id}`, { category: destino })
      .then(() => {
        toast.success('Produto movido!')
        setProdutoParaMover(null)
        window.location.reload()
      })
      .catch((err) => toast.error(err.response?.data?.error?.message || 'Erro ao mover produto'))
  }

  const handleDuplicarProduto = (categorias) => {
    duplicateProduct.mutate({ id: produtoParaDuplicar._id, categories: categorias }, {
      onSuccess: () => setProdutoParaDuplicar(null),
    })
  }

  const downloadMesaSign = async () => {
    setDownloadingSign(true)
    try {
      const response = await api.get('/restaurants/me/mesa-sign.pdf', { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', 'qrcode-mesa.pdf')
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      toast.error('Erro ao gerar o PDF. Tente novamente.')
    } finally {
      setDownloadingSign(false)
    }
  }

  return (
    <div>
      <TopBar
        title="Cardápio"
        right={
          <button onClick={() => navigate('/products/new')} className="p-2.5 rounded-2xl bg-primary text-white shadow-[0_6px_16px_-6px_rgba(255,107,44,0.6)] hover:brightness-105 active:scale-95 transition-all cursor-pointer">
            <Plus size={20} />
          </button>
        }
      />

      <div className="page">
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => navigate('/products/opcionais-adicionais')}
            className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium py-2.5 rounded-xl bg-bg text-secondary hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <SlidersHorizontal size={14} /> Opcionais e adicionais
          </button>
          <button
            onClick={() => navigate('/products/favoritos')}
            className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium py-2.5 rounded-xl bg-bg text-secondary hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <Star size={14} /> Favoritos
          </button>
          <button
            onClick={() => navigate('/products/banners')}
            className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium py-2.5 rounded-xl bg-bg text-secondary hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <Image size={14} /> Banners
          </button>
        </div>

        <button
          onClick={downloadMesaSign}
          disabled={downloadingSign}
          className="w-full flex items-center justify-center gap-2 text-sm font-semibold py-3 rounded-xl border border-primary/30 text-primary hover:bg-primary/5 transition-colors mb-4 disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed"
        >
          <QrCode size={16} /> {downloadingSign ? 'Gerando PDF...' : 'Imprimir QR Code de mesa'}
        </button>

        {isLoading ? (
          <LoadingSpinner />
        ) : (
          <>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-gray-400">
                {categoriasOrdenadas.length} categoria{categoriasOrdenadas.length !== 1 ? 's' : ''} · {totalProdutos} produto{totalProdutos !== 1 ? 's' : ''}
              </p>
              <button
                onClick={() => setNovaCategoriaAberta((v) => !v)}
                className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary-dark transition-colors cursor-pointer"
              >
                <FolderPlus size={14} /> Adicionar categoria
              </button>
            </div>

            {novaCategoriaAberta && (
              <div className="flex gap-2 mb-4">
                <input
                  autoFocus
                  value={nomeNovaCategoria}
                  onChange={(e) => setNomeNovaCategoria(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCriarCategoria()}
                  placeholder="Nome da categoria"
                  className="flex-1 text-sm px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <button
                  onClick={handleCriarCategoria}
                  disabled={createCategory.isPending}
                  className="px-4 py-2 rounded-xl bg-primary text-white text-sm font-semibold disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed"
                >
                  Criar
                </button>
              </div>
            )}

            {categoriasOrdenadas.length === 0 ? (
              <Card>
                <p className="text-gray-400 text-sm text-center py-8">
                  Nenhuma categoria ainda.<br />Toque em "Adicionar categoria" pra começar.
                </p>
              </Card>
            ) : (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEndCategorias}>
                <SortableContext items={categoriasOrdenadas.map((c) => c.name)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-3">
                    {categoriasOrdenadas.map((categoria) => (
                      <CategoriaArrastavel
                        key={categoria.name}
                        categoria={categoria}
                        produtos={categoria.produtos}
                        expandida={!!expandidas[categoria.name]}
                        onToggleExpandir={() => toggleExpandir(categoria.name)}
                        navigate={navigate}
                        toggleProduct={toggleProduct}
                        onReorderProdutos={(novaOrdem) => handleReorderProdutosDaCategoria(categoria.name, novaOrdem)}
                        onRenomear={(novoNome) => handleRenomearCategoria(categoria, novoNome)}
                        onApagar={() => setCategoriaParaApagar(categoria)}
                        onExcluirProduto={handleExcluirProduto}
                        onMoverProduto={setProdutoParaMover}
                        onDuplicarProduto={setProdutoParaDuplicar}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </>
        )}
      </div>

      <ApagarCategoriaModal
        categoria={categoriaParaApagar}
        categorias={categoriasOrdenadas}
        onClose={() => setCategoriaParaApagar(null)}
        onConfirmar={handleApagarCategoria}
        salvando={deleteCategory.isPending}
      />

      <MoverProdutoModal
        produto={produtoParaMover}
        categorias={categoriasOrdenadas}
        onClose={() => setProdutoParaMover(null)}
        onConfirmar={handleMoverProduto}
        salvando={false}
      />

      <DuplicarProdutoModal
        produto={produtoParaDuplicar}
        categorias={categoriasOrdenadas}
        onClose={() => setProdutoParaDuplicar(null)}
        onConfirmar={handleDuplicarProduto}
        salvando={duplicateProduct.isPending}
      />
    </div>
  )
}
