import { Outlet } from 'react-router-dom'
import BottomNav from './BottomNav'
import Sidebar from './Sidebar'

export default function AppShell() {
  return (
    <div className="min-h-screen bg-bg md:flex">
      <Sidebar />
      <div className="min-w-0 flex-1 md:pl-64">
        <Outlet />
      </div>
      <div className="md:hidden">
        <BottomNav />
      </div>
    </div>
  )
}
