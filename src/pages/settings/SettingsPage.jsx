import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Store, MessageSquare, Clock, CreditCard, Bike, LogOut, ChevronRight, Bell, BarChart3, Wallet, UserCircle, Users, LifeBuoy, Ticket } from 'lucide-react'
import TopBar from '../../components/layout/TopBar'
import Card from '../../components/ui/Card'
import useAuthStore from '../../stores/authStore'
import SupportModal from '../../components/support/SupportModal'

const ITEMS = [
  { to: '/settings/my-profile', icon: UserCircle,    label: 'Meu perfil' },
  { to: '/settings/team',       icon: Users,         label: 'Equipe',    adminOnly: true },
  { to: '/financeiro',           icon: Wallet,        label: 'Minha assinatura', adminOnly: true },
  { to: '/reports',             icon: BarChart3,     label: 'Relatórios de faturamento', adminOnly: true },
  { to: '/settings/profile',    icon: Store,         label: 'Dados do restaurante', adminOnly: true },
  { to: '/settings/bot',        icon: MessageSquare, label: 'Mensagens do bot', adminOnly: true },
  { to: '/settings/hours',      icon: Clock,         label: 'Horário de funcionamento' },
  { to: '/settings/payments',   icon: CreditCard,    label: 'Pagamentos', adminOnly: true },
  { to: '/settings/deliverers', icon: Bike,          label: 'Entregadores' },
  { to: '/notices',             icon: Bell,          label: 'Avisos' },
]

export default function SettingsPage() {
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()
  const [showSupport, setShowSupport] = useState(false)
  const isOperator = user?.role === 'operator'

  const items = ITEMS.filter((item) => !(isOperator && item.adminOnly))

  const handleLogout = async () => {
    if (!confirm('Deseja sair da sua conta?')) return
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <div>
      <TopBar title="Configurações" subtitle={user?.name} />

      <div className="page space-y-2">
        {items.map(({ to, icon: Icon, label }) => (
          <Card key={to} onClick={() => navigate(to)}>
            <div className="flex items-center gap-3">
              <Icon size={20} className="text-primary flex-shrink-0" />
              <span className="flex-1 font-medium text-sm">{label}</span>
              <ChevronRight size={18} className="text-gray-300" />
            </div>
          </Card>
        ))}

        <Card onClick={() => setShowSupport(true)} className="mt-6">
          <div className="flex items-center gap-3">
            <LifeBuoy size={20} className="text-primary flex-shrink-0" />
            <span className="flex-1 font-medium text-sm">Fale com o suporte</span>
            <ChevronRight size={18} className="text-gray-300" />
          </div>
        </Card>

        <Card onClick={handleLogout}>
          <div className="flex items-center gap-3 text-danger">
            <LogOut size={20} className="flex-shrink-0" />
            <span className="flex-1 font-medium text-sm">Sair</span>
          </div>
        </Card>
      </div>

      <SupportModal open={showSupport} onClose={() => setShowSupport(false)} />
    </div>
  )
}
