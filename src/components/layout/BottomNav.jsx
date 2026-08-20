import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, ShoppingBag, UtensilsCrossed, MessageCircle, Settings, LogOut } from 'lucide-react'
import useAuthStore from '../../stores/authStore'

const NAV_ITEMS = [
  { to: '/',          icon: LayoutDashboard, label: 'Início'   },
  { to: '/orders',    icon: ShoppingBag,     label: 'Pedidos'  },
  { to: '/products',  icon: UtensilsCrossed, label: 'Cardápio', hideForOperator: true },
  { to: '/whatsapp',  icon: MessageCircle,   label: 'WhatsApp', hideForOperator: true },
  { to: '/settings',  icon: Settings,        label: 'Config'   },
]

export default function BottomNav() {
  const role = useAuthStore((s) => s.user?.role)
  const isOperator = role === 'operator'
  const items = NAV_ITEMS.filter((item) => !(isOperator && item.hideForOperator))
  const navigate = useNavigate()
  const logout = useAuthStore((s) => s.logout)

  const handleLogoutClick = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-surface shadow-nav z-40 safe-area-pb">
      <div className="flex items-center justify-around max-w-lg mx-auto">
        {items.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 py-2 px-3 min-w-[56px] transition-colors ${
                isActive ? 'text-primary' : 'text-gray-600'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={22} strokeWidth={isActive ? 2.5 : 1.8} />
                <span className="text-[10px] font-medium leading-none">{label}</span>
              </>
            )}
          </NavLink>
        ))}

        <button
          type="button"
          onClick={handleLogoutClick}
          className="flex flex-col items-center gap-1 py-2 px-3 min-w-[56px] text-gray-600 transition-colors"
        >
          <LogOut size={22} strokeWidth={1.8} color={'red'}/>
          <span className="text-[10px] font-medium leading-none">Sair</span>
        </button>
      </div>
    </nav>
  )
}
