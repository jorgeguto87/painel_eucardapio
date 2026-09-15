import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, ImageOff, SlidersHorizontal, Star, Image, QrCode, ChevronDown, GripVertical, FolderPlus } from 'lucide-react'
import toast from 'react-hot-toast'
import TopBar from '../../components/layout/TopBar'
import Card from '../../components/ui/Card'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import {
  useProducts, useToggleProduct, useProductCategories,
  useCreateCategory, useReorderCategories, useReorderProducts,
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

function ProdutoArrastavel({ product, navigate, toggleProduct }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: product._id })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }

  const precoExibido = product.pricingMode === 'variants'
    ? `A partir de ${formatCurrency(
        Math.min(...(product.variantGroupIds?.[0]?.options?.map((o) => o.price) || [product.price]))
      )}`
    : formatCurrency(product.price)

  return (
    <div ref={setNodeRef} style={style}>
      <Card className={!product.isAvailable ? 'opacity-50' : ''}>
        <div className="flex items-center gap-2">
          <button {...attributes} {...listeners} className="touch-none text-gray-300 hover:text-gray-400 shrink-0 cursor-grab active:cursor-grabbing">
            <GripVertical size={16} />
          </button>

          <div
            className="w-12 h-12 rounded-xl bg-bg flex items-center justify-center flex-shrink-0 overflow-hidden"
            onClick={() => navigate(`/products/${product._id}`)}
          >
            {(product.imageBase64 || product.imageUrl)
              ? <img src={product.imageBase64 || product.imageUrl} alt="" className="w-full h-full object-cover" />
              : <ImageOff size={18} className="text-gray-300" />
            }
          </div>

          <div className="flex-1 min-w-0" onClick={() => navigate(`/products/${product._id}`)}>
            <p className="font-medium text-sm truncate" translate="no">{product.name}</p>
            <p className="text-xs text-gray-400">{precoExibido}</p>
          </div>

          <button
            onClick={(e) => { e.stopPropagation(); toggleProduct.mutate(product._id) }}
            className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${
              product.isAvailable ? 'bg-success' : 'bg-gray-300'
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                product.isAvailable ? 'translate-x-5' : ''
              }`}
            />
          </button>
        </div>
      </Card>
    </div>
  )
}

function CategoriaArrastavel({ categoria, produtos, expandida, onToggleExpandir, navigate, toggleProduct, onReorderProdutos }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: categoria.name })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const handleDragEndProdutos = (event) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = produtos.findIndex((p) => p._id === active.id)
    const newIndex = produtos.findIndex((p) => p._id === over.id)
    const novaOrdem = arrayMove(produtos, oldIndex, newIndex)
    onReorderProdutos(novaOrdem)
  }

  return (
    <div ref={setNodeRef} style={style}>
      <div className="flex items-center gap-2 mb-2">
        <button {...attributes} {...listeners} className="touch-none text-gray-300 hover:text-gray-400 cursor-grab active:cursor-grabbing">
          <GripVertical size={16} />
        </button>
        <button
          onClick={onToggleExpandir}
          className="flex-1 flex items-center justify-between bg-white rounded-xl px-4 py-3 border border-gray-100 hover:bg-bg transition-colors"
        >
          <span className="font-semibold text-secondary text-sm">{categoria.name}</span>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 bg-bg px-2 py-0.5 rounded-full">{produtos.length}</span>
            <ChevronDown size={16} className={`text-gray-400 transition-transform ${expandida ? 'rotate-180' : ''}`} />
          </div>
        </button>
      </div>

      {expandida && (
        <div className="pl-6 space-y-2 mb-2">
          {produtos.length === 0 ? (
            <p className="text-xs text-gray-400 py-2">Nenhum produto nessa categoria ainda.</p>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEndProdutos}>
              <SortableContext items={produtos.map((p) => p._id)} strategy={verticalListSortingStrategy}>
                {produtos.map((product) => (
                  <ProdutoArrastavel key={product._id} product={product} navigate={navigate} toggleProduct={toggleProduct} />
                ))}
              </SortableContext>
            </DndContext>
          )}
        </div>
      )}
    </div>
  )
}

export default function ProductsPage() {
  const navigate = useNavigate()
  const { data: grouped, isLoading } = useProducts()
  const { data: categoriasApi } = useProductCategories()
  const toggleProduct = useToggleProduct()
  const createCategory = useCreateCategory()
  const reorderCategories = useReorderCategories()
  const reorderProducts = useReorderProducts()

  const [downloadingSign, setDownloadingSign] = useState(false)
  const [expandidas, setExpandidas] = useState({})
  const [novaCategoriaAberta, setNovaCategoriaAberta] = useState(false)
  const [nomeNovaCategoria, setNomeNovaCategoria] = useState('')

  // Ordem "oficial" das categorias vem da API (já ordenada) — os produtos
  // vêm agrupados à parte; junta os dois aqui, categoria sem produto
  // nenhum ainda aparece mesmo assim (lista vazia), pronta pra receber.
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

    // Categoria "antiga" (dado de antes dessa funcionalidade existir)
    // ainda não tem registro próprio — cria agora, na hora, em vez de só
    // descartar ela da lista (que fazia o arrastar nunca salvar nada,
    // se TODAS as categorias fossem desse tipo).
    const items = await Promise.all(
      novaOrdem.map(async (c, index) => {
        if (c.id) return { id: c.id, sortOrder: index }
        // Chamada direta (sem o hook) — evita disparar vários toasts de
        // "Categoria criada!" de uma vez, o que ficaria estranho durante
        // um simples arrastar.
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
          <button onClick={() => navigate('/products/new')} className="p-2.5 rounded-2xl bg-primary text-white shadow-[0_6px_16px_-6px_rgba(255,107,44,0.6)] hover:brightness-105 active:scale-95 transition-all">
            <Plus size={20} />
          </button>
        }
      />

      <div className="page">
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => navigate('/products/opcionais-adicionais')}
            className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium py-2.5 rounded-xl bg-bg text-secondary hover:bg-gray-100 transition-colors"
          >
            <SlidersHorizontal size={14} /> Opcionais e adicionais
          </button>
          <button
            onClick={() => navigate('/products/favoritos')}
            className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium py-2.5 rounded-xl bg-bg text-secondary hover:bg-gray-100 transition-colors"
          >
            <Star size={14} /> Favoritos
          </button>
          <button
            onClick={() => navigate('/products/banners')}
            className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium py-2.5 rounded-xl bg-bg text-secondary hover:bg-gray-100 transition-colors"
          >
            <Image size={14} /> Banners
          </button>
        </div>

        <button
          onClick={downloadMesaSign}
          disabled={downloadingSign}
          className="w-full flex items-center justify-center gap-2 text-sm font-semibold py-3 rounded-xl border border-primary/30 text-primary hover:bg-primary/5 transition-colors mb-4 disabled:opacity-60"
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
                className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary-dark transition-colors"
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
                  className="px-4 py-2 rounded-xl bg-primary text-white text-sm font-semibold disabled:opacity-60"
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
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </>
        )}
      </div>
    </div>
  )
}
