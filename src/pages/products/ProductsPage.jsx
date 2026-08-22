import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, ImageOff, SlidersHorizontal, Star, Image, QrCode } from 'lucide-react'
import toast from 'react-hot-toast'
import TopBar from '../../components/layout/TopBar'
import Card from '../../components/ui/Card'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import { useProducts, useToggleProduct } from '../../hooks/useProducts'
import { formatCurrency } from '../../utils/format'
import api from '../../config/api'

export default function ProductsPage() {
  const navigate = useNavigate()
  const { data: grouped, isLoading } = useProducts()
  const toggleProduct = useToggleProduct()
  const [downloadingSign, setDownloadingSign] = useState(false)

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
            onClick={() => navigate('/products/opcionais')}
            className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium py-2.5 rounded-xl bg-bg text-secondary hover:bg-gray-100 transition-colors"
          >
            <SlidersHorizontal size={14} /> Opcionais
          </button>
          <button
            onClick={() => navigate('/products/adicionais')}
            className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium py-2.5 rounded-xl bg-bg text-secondary hover:bg-gray-100 transition-colors"
          >
            <Plus size={14} /> Adicionais
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
        ) : !grouped || Object.keys(grouped).length === 0 ? (
          <Card>
            <p className="text-gray-400 text-sm text-center py-8">
              Nenhum produto cadastrado.<br />Toque em + para adicionar o primeiro item.
            </p>
          </Card>
        ) : (
          <div className="space-y-6">
            {Object.entries(grouped).map(([category, products]) => (
              <div key={category}>
                <h2 className="font-semibold text-secondary mb-2 text-sm uppercase tracking-wide text-gray-400">
                  {category}
                </h2>
                <div className="space-y-2">
                  {products.map((product) => (
                    <Card key={product._id} className={!product.isAvailable ? 'opacity-50' : ''}>
                      <div className="flex items-center gap-3">
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
                          <p className="font-medium text-sm truncate">{product.name}</p>
                          <p className="text-xs text-gray-400">{formatCurrency(product.price)}</p>
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
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
