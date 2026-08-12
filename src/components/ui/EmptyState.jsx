import { Inbox } from 'lucide-react'

export default function EmptyState({ icon: Icon = Inbox, title = 'Nada por aqui', subtitle }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-10 px-4">
      <div className="w-12 h-12 rounded-2xl bg-bg flex items-center justify-center mb-3">
        <Icon size={20} className="text-gray-300" />
      </div>
      <p className="font-medium text-secondary text-sm">{title}</p>
      {subtitle && <p className="text-gray-400 text-xs mt-1 max-w-xs">{subtitle}</p>}
    </div>
  )
}
