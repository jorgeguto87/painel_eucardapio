import { Loader2 } from 'lucide-react'

const variants = {
  primary:   'btn-primary',
  secondary: 'btn-secondary',
  ghost:     'btn-ghost',
  danger:    'btn-danger',
}

export default function Button({
  children,
  variant = 'primary',
  loading = false,
  full = false,
  className = '',
  ...props
}) {
  return (
    <button
      className={`${variants[variant]} ${full ? 'w-full' : ''} ${className}`}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading ? <Loader2 size={18} className="animate-spin" /> : children}
    </button>
  )
}
