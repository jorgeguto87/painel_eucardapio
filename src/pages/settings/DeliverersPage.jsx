import { useState } from 'react'
import { Plus } from 'lucide-react'
import TopBar from '../../components/layout/TopBar'
import Card from '../../components/ui/Card'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import DelivererCard from '../../components/deliverers/DelivererCard'
import DelivererFormModal from '../../components/deliverers/DelivererFormModal'
import { useDeliverers, useToggleDelivererStatus } from '../../hooks/useDeliverers'

export default function DeliverersPage() {
  const { data: deliverers, isLoading } = useDeliverers()
  const toggleStatus = useToggleDelivererStatus()

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing]     = useState(null)

  const openCreate = () => { setEditing(null); setModalOpen(true) }
  const openEdit   = (d) => { setEditing(d); setModalOpen(true) }

  return (
    <div>
      <TopBar
        title="Entregadores"
        back
        right={
          <button onClick={openCreate} className="p-2 rounded-xl bg-primary text-white active:bg-primary-dark">
            <Plus size={20} />
          </button>
        }
      />

      <div className="page">
        {isLoading ? (
          <LoadingSpinner />
        ) : !deliverers || deliverers.length === 0 ? (
          <Card>
            <p className="text-gray-400 text-sm text-center py-8">
              Nenhum entregador cadastrado.<br />Toque em + para adicionar o primeiro.
            </p>
          </Card>
        ) : (
          <div className="space-y-2">
            {deliverers.map((d) => (
              <DelivererCard key={d._id} deliverer={d} onClick={() => openEdit(d)} />
            ))}
          </div>
        )}
      </div>

      <DelivererFormModal open={modalOpen} onClose={() => setModalOpen(false)} deliverer={editing} />
    </div>
  )
}
