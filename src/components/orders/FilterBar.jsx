import { TYPE_FILTER_LABEL, STATUS_FILTER_LABEL } from './StatusBadge'

function Segmented({ value, options, labels, onChange, ariaLabel }) {
  return (
    <div role="tablist" aria-label={ariaLabel} className="flex gap-2 overflow-x-auto scrollbar-hide">
      {options.map((opt) => {
        const active = opt === value
        return (
          <button
            key={opt || 'todos'}
            role="tab"
            aria-selected={active}
            type="button"
            onClick={() => onChange(opt)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border ${
              active ? 'border-secondary bg-secondary text-white' : 'border-gray-200 bg-surface text-gray-500'
            }`}
          >
            {labels[opt]}
          </button>
        )
      })}
    </div>
  )
}

const TYPE_OPTIONS = ['', 'delivery', 'mesa', 'balcao']
const STATUS_OPTIONS_MAIN = ['', 'recebido', 'preparo', 'saiu_entrega']
export const STATUS_OPTIONS_HISTORY = ['', 'recebido', 'pago', 'preparo', 'saiu_entrega', 'finalizado', 'cancelado']

export function TypeFilterBar({ value, onChange }) {
  return <Segmented value={value} options={TYPE_OPTIONS} labels={TYPE_FILTER_LABEL} onChange={onChange} ariaLabel="Canal" />
}

export function StatusFilterBar({ value, onChange, options = STATUS_OPTIONS_MAIN }) {
  return <Segmented value={value} options={options} labels={STATUS_FILTER_LABEL} onChange={onChange} ariaLabel="Status" />
}
