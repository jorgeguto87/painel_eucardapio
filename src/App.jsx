import { useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import toast, { Toaster } from 'react-hot-toast'
import { authEvents } from './config/authEvents'
import { SUBSCRIPTION_NOTICE_KEY } from './config/api'

import AppShell from './components/layout/AppShell'
import ProtectedRoute from './components/layout/ProtectedRoute'
import RequireAdmin from './components/layout/RequireAdmin'

import LoginPage from './pages/auth/LoginPage'
import FromSignupPage from './pages/auth/FromSignupPage'
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage'
import ResetPasswordPage from './pages/auth/ResetPasswordPage'
import DashboardPage from './pages/dashboard/DashboardPage'
import OrdersPage from './pages/orders/OrdersPage'
import OrderDetailPage from './pages/orders/OrderDetailPage'
import ProductsPage from './pages/products/ProductsPage'
import ProductFormPage from './pages/products/ProductFormPage'
import OpcionaisAdicionaisPage from './pages/products/OpcionaisAdicionaisPage'
import FavoritosPage from './pages/products/FavoritosPage'
import WhatsappPage from './pages/whatsapp/WhatsappPage'
import SettingsPage from './pages/settings/SettingsPage'
import RestaurantProfilePage from './pages/settings/RestaurantProfilePage'
import BotConfigPage from './pages/settings/BotConfigPage'
import BannersPage from './pages/settings/BannersPage'
import OfertasPage from './pages/settings/OfertasPage'
import BusinessHoursPage from './pages/settings/BusinessHoursPage'
import DeliveryPage from './pages/settings/DeliveryPage'
import ImportMenuPage from './pages/products/ImportMenuPage'
import PaymentsPage from './pages/settings/PaymentsPage'
import PrintersPage from './pages/settings/PrintersPage'
import DeliverersPage from './pages/settings/DeliverersPage'
import TeamPage from './pages/settings/TeamPage'
import MyProfilePage from './pages/settings/MyProfilePage'
import DelivererQueuePage from './pages/deliverers/DelivererQueuePage'
import DeliverersListPage from './pages/deliverers/DeliverersListPage'
import DelivererHistoryPage from './pages/deliverers/DelivererHistoryPage'
import NoticesPage from './pages/notices/NoticesPage'
import ReportsPage from './pages/reports/ReportsPage'
import FinanceiroPage from './pages/billing/FinanceiroPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})


/**
 * Aviso de assinatura bloqueada (HTTP 402 SUBSCRIPTION_REQUIRED). O
 * interceptor (config/api.js) leva o admin para /financeiro e guarda a
 * mensagem aqui pra exibir depois do redirecionamento; para a equipe
 * (operator), que não acessa o financeiro, só mostra o aviso.
 */
function SubscriptionNotice() {
  useEffect(() => {
    try {
      const pending = window.sessionStorage.getItem(SUBSCRIPTION_NOTICE_KEY)
      if (pending) {
        window.sessionStorage.removeItem(SUBSCRIPTION_NOTICE_KEY)
        toast.error(pending, { id: 'subscription-required', duration: 8000 })
      }
    } catch { /* sem storage */ }

    return authEvents.onSubscriptionRequired(({ message }) => {
      toast.error(message, { id: 'subscription-required', duration: 8000 })
    })
  }, [])
  return null
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/auth/from-signup" element={<FromSignupPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          <Route element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
            <Route path="/" element={<DashboardPage />} />

            <Route path="/orders" element={<OrdersPage />} />
            <Route path="/orders/:id" element={<OrderDetailPage />} />

            <Route path="/products" element={<RequireAdmin><ProductsPage /></RequireAdmin>} />
            <Route path="/products/new" element={<RequireAdmin><ProductFormPage /></RequireAdmin>} />
            <Route path="/products/opcionais-adicionais" element={<RequireAdmin><OpcionaisAdicionaisPage /></RequireAdmin>} />
            <Route path="/products/favoritos" element={<RequireAdmin><FavoritosPage /></RequireAdmin>} />
            <Route path="/products/importar" element={<RequireAdmin><ImportMenuPage /></RequireAdmin>} />
            <Route path="/products/banners" element={<RequireAdmin><BannersPage /></RequireAdmin>} />
            <Route path="/ofertas" element={<RequireAdmin><OfertasPage /></RequireAdmin>} />
            <Route path="/products/:id" element={<RequireAdmin><ProductFormPage /></RequireAdmin>} />

            <Route path="/whatsapp" element={<RequireAdmin><WhatsappPage /></RequireAdmin>} />

            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/settings/profile" element={<RequireAdmin><RestaurantProfilePage /></RequireAdmin>} />
            <Route path="/settings/bot" element={<RequireAdmin><BotConfigPage /></RequireAdmin>} />
            <Route path="/settings/hours" element={<RequireAdmin><BusinessHoursPage /></RequireAdmin>} />
            <Route path="/settings/delivery" element={<RequireAdmin><DeliveryPage /></RequireAdmin>} />
            <Route path="/settings/payments" element={<RequireAdmin><PaymentsPage /></RequireAdmin>} />
            <Route path="/settings/printers" element={<RequireAdmin><PrintersPage /></RequireAdmin>} />
            <Route path="/settings/deliverers" element={<DeliverersPage />} />
            <Route path="/settings/team" element={<RequireAdmin><TeamPage /></RequireAdmin>} />
            <Route path="/settings/my-profile" element={<MyProfilePage />} />
            <Route path="/deliverers" element={<DeliverersListPage />} />
            <Route path="/deliverers/:delivererId/queue" element={<DelivererQueuePage />} />
            <Route path="/deliverers/:delivererId/history" element={<DelivererHistoryPage />} />

            <Route path="/notices" element={<NoticesPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/financeiro" element={<RequireAdmin><FinanceiroPage /></RequireAdmin>} />
          </Route>
        </Routes>
      </BrowserRouter>

      <Toaster position="top-center" toastOptions={{ duration: 3000 }} />
      <SubscriptionNotice />
    </QueryClientProvider>
  )
}
