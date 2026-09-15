import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, ShoppingBag, UtensilsCrossed, MessageCircle, Settings, LogOut, Ticket } from 'lucide-react'
import useAuthStore from '../../stores/authStore'
import useRestaurantStore from '../../stores/restaurantStore'


const NAV_ITEMS = [
  { to: '/',          icon: LayoutDashboard, label: 'Início'   },
  { to: '/orders',    icon: ShoppingBag,     label: 'Pedidos'  },
  { to: '/products',  icon: UtensilsCrossed, label: 'Cardápio', hideForOperator: true },
  { to: '/whatsapp',  icon: MessageCircle,   label: 'WhatsApp', hideForOperator: true },
  { to: '/ofertas',   icon: Ticket,          label: 'Ofertas',  hideForOperator: true },
  { to: '/settings',  icon: Settings,        label: 'Configurações' },   
  
]

/**
 * Navegação lateral fixa — só aparece em telas grandes (md+). No celular
 * continua sendo a BottomNav de sempre. Sem isso, o painel desperdiçava
 * praticamente toda a largura de um monitor.
 */
export default function Sidebar() {
  const role = useAuthStore((s) => s.user?.role)
  const restaurant = useRestaurantStore((s) => s.restaurant)
  const isOperator = role === 'operator'
  const items = NAV_ITEMS.filter((item) => !(isOperator && item.hideForOperator))
  const navigate = useNavigate()
const logout = useAuthStore((s) => s.logout)

const handleLogoutClick = async () => {
  await logout()
  navigate('/login')
}

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-gray-100 bg-surface md:flex">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary text-white font-bold">
          {restaurant?.name?.[0]?.toUpperCase() || 'E'}
        </div>
        <span className="truncate font-bold text-secondary" translate="no">{restaurant?.name || 'Eu Cardápio'}</span>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-2">
        {items.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive ? 'bg-primary/10 text-primary' : 'text-gray-500 hover:bg-bg hover:text-secondary'
              }`
            }
          >
            <Icon size={19} strokeWidth={2} />
            {label}
          </NavLink>
        ))}
      </nav> 
      <div className="px-3 py-3 border-t border-gray-100">
        <button type="button" onClick={handleLogoutClick} className="flex items-center gap-3 w-full rounded-xl px-3 py-2.5 text-sm font-medium text-gray-500 hover:bg-danger/10 hover:text-danger transition-colors">
          <LogOut size={19} strokeWidth={2} color={'red'}/>
          Sair
        </button>
      </div>
    </aside>
    
  )
}
