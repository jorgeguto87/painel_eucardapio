import { Loader2 } from 'lucide-react'

export default function LoadingSpinner({ text = 'Carregando...' }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-400">
      <Loader2 size={32} className="animate-spin text-primary" />
      <p className="text-sm">{text}</p>
    </div>
  )
}
