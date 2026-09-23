import { X } from 'lucide-react'
import { useEffect } from 'react'
import { createPortal } from 'react-dom'

export default function Modal({ open, onClose, title, children }) {
  // Trava o scroll do body quando aberto
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  // Renderiza direto em document.body (portal) em vez de na posição normal
  // da árvore React — sem isso, um Modal aberto de dentro de um elemento
  // que tem ANY `transform` aplicado (mesmo só no :hover, como o
  // `hover:-translate-y-0.5` do card de pedido) fica "preso" dentro dele:
  // pela especificação de CSS, um ancestral com transform vira o
  // "containing block" de um filho `position: fixed`, então o modal para
  // de se posicionar relativo à tela inteira e passa a ficar cortado pelo
  // tamanho/overflow do card. Foi exatamente esse bug que fazia o modal de
  // "Atribuir entregador" (aberto de dentro do card do pedido) piscar sem
  // abrir direito, e o clique "fora dele" cair no card por baixo (que abre
  // o pedido) em vez de fechar o modal.
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Sheet */}
      <div className="relative w-full sm:max-w-md bg-surface rounded-t-2xl sm:rounded-2xl shadow-xl z-10 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-secondary text-lg">{title}</h2>
          <button onClick={onClose} className="p-2 rounded-xl active:bg-gray-100">
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 px-4 py-4">
          {children}
        </div>
      </div>
    </div>,
    document.body,
  )
}
