import { useState } from 'react'
import { ChevronDown, Check } from 'lucide-react'
import Modal from './Modal'
import Button from './Button'

/**
 * Seletor de categorias OU produtos, usado em qualquer lugar que precise
 * escolher escopo (cupom, regra de cashback, item grátis). No modo
 * "products", cada categoria expande mostrando os produtos dela — evita
 * uma lista solta gigante quando o restaurante tem muitos itens.
 */
export default function CategoryProductPicker({
  open, onClose, title, mode = 'categories', // 'categories' | 'products'
  categories = [], productsByCategory = {}, // { categoryName: [{ _id, name }] }
  selected = [], onConfirm, multiple = true,
}) {
  const [picked, setPicked] = useState(selected)
  const [openCategories, setOpenCategories] = useState({})

  const toggleCategoryOpen = (cat) => setOpenCategories((s) => ({ ...s, [cat]: !s[cat] }))

  const toggleValue = (value) => {
    setPicked((prev) => {
      if (multiple) {
        return prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
      }
      return [value]
    })
  }

  const handleConfirm = () => {
    onConfirm(picked)
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <div className="max-h-[50vh] space-y-2 overflow-y-auto">
        {mode === 'categories' ? (
          categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => toggleValue(cat)}
              className="flex w-full items-center justify-between rounded-xl border border-gray-200 px-4 py-3 text-left text-sm font-medium"
            >
              {cat}
              <span className={`grid size-5 shrink-0 place-items-center rounded-md border-2 ${picked.includes(cat) ? 'border-primary bg-primary' : 'border-gray-300'}`}>
                {picked.includes(cat) && <Check size={12} className="text-white" />}
              </span>
            </button>
          ))
        ) : (
          categories.map((cat) => {
            const items = productsByCategory[cat] || []
            if (items.length === 0) return null
            const isOpen = !!openCategories[cat]
            const selectedInCat = items.filter((p) => picked.includes(p._id)).length
            return (
              <div key={cat} className="rounded-xl border border-gray-200 overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleCategoryOpen(cat)}
                  className="flex w-full items-center justify-between bg-bg px-4 py-3 text-left"
                >
                  <span className="flex items-center gap-2 text-sm font-semibold">
                    {cat}
                    {selectedInCat > 0 && (
                      <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">{selectedInCat}</span>
                    )}
                  </span>
                  <ChevronDown size={16} className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>
                {isOpen && (
                  <div className="space-y-1 p-2">
                    {items.map((p) => (
                      <button
                        key={p._id}
                        type="button"
                        onClick={() => toggleValue(p._id)}
                        className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm hover:bg-bg"
                      >
                        {p.name}
                        <span className={`grid size-5 shrink-0 place-items-center rounded-md border-2 ${picked.includes(p._id) ? 'border-primary bg-primary' : 'border-gray-300'}`}>
                          {picked.includes(p._id) && <Check size={12} className="text-white" />}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      <Button full className="mt-4" onClick={handleConfirm}>
        Confirmar {picked.length > 0 && `(${picked.length})`}
      </Button>
    </Modal>
  )
}
