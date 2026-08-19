import { NavLink } from 'react-router-dom'
import { LayoutDashboard, ShoppingBag, UtensilsCrossed, MessageCircle, Settings, LogOut } from 'lucide-react'
import useAuthStore from '../../stores/authStore'
import handleLogout from '../../pages/settings/SettingsPage'
import Card from '../../components/ui/Card'

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
      </div>
    </nav>
    <Card onClick={handleLogout}>
        <div className="flex-1 space-y-1 px-3 py-2">
        <LogOut size={19} strokeWidth={2} />
          <span className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive ? 'bg-primary/10 text-primary' : 'text-gray-500 hover:bg-bg hover:text-secondary'
              }`
            }
          >Sair
          </span>
        </Card>
        </div>
  )
}
