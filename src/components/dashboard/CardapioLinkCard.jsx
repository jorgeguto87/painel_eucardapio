import toast from 'react-hot-toast'
import { Link2, Copy, Share2, MessageCircle } from 'lucide-react'
import Card from '../ui/Card'

/**
 * Link do cardápio de DELIVERY para o restaurante divulgar (redes sociais,
 * WhatsApp, bio do Instagram). O endereço /r/<slug> já gera a prévia com
 * logo e nome quando é colado no WhatsApp/redes (função share da Vercel).
 */
export default function CardapioLinkCard({ baseUrl, slug, restaurantName }) {
  if (!baseUrl || !slug) return null

  const link = `${baseUrl}/r/${encodeURIComponent(slug)}`
  const texto = `Faça seu pedido${restaurantName ? ` no ${restaurantName}` : ''} pelo nosso cardápio digital:`

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(link)
      toast.success('Link copiado!')
    } catch {
      // Navegador sem permissão de área de transferência — fallback manual.
      const ta = document.createElement('textarea')
      ta.value = link
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      try {
        document.execCommand('copy')
        toast.success('Link copiado!')
      } catch {
        toast.error('Não foi possível copiar. Copie o link manualmente.')
      } finally {
        document.body.removeChild(ta)
      }
    }
  }

  const compartilhar = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: restaurantName || 'Cardápio digital', text: texto, url: link })
      } catch (err) {
        if (err?.name !== 'AbortError') await copiar()
      }
      return
    }
    await copiar()
  }

  const whatsapp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(`${texto} ${link}`)}`, '_blank', 'noopener')
  }

  const botao = 'flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold py-2.5 rounded-xl transition-colors cursor-pointer'

  return (
    <Card>
      <div className="flex items-center gap-2 mb-2">
        <Link2 size={15} className="text-primary" />
        <p className="text-xs font-semibold text-gray-400">Link do cardápio (delivery)</p>
      </div>
      <button
        type="button"
        onClick={copiar}
        title="Copiar link"
        className="w-full text-left text-sm font-medium text-secondary bg-bg rounded-xl px-3 py-2.5 truncate cursor-pointer"
        translate="no"
      >
        {link.replace(/^https?:\/\//, '')}
      </button>
      <div className="flex gap-2 mt-3">
        <button type="button" onClick={copiar} className={`${botao} bg-bg text-secondary hover:bg-gray-100`}>
          <Copy size={14} /> Copiar
        </button>
        <button type="button" onClick={compartilhar} className={`${botao} bg-primary/10 text-primary hover:bg-primary/15`}>
          <Share2 size={14} /> Compartilhar
        </button>
        <button type="button" onClick={whatsapp} className={`${botao} bg-success/10 text-success hover:bg-success/15`}>
          <MessageCircle size={14} /> WhatsApp
        </button>
      </div>
    </Card>
  )
}
