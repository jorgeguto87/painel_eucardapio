import { useState } from 'react'
import { MapPin, Star, Plus, Pencil, Check } from 'lucide-react'
import Card from '../ui/Card'
import Button from '../ui/Button'
import AddressFormModal from './AddressFormModal'
import { useCustomerAddresses, useSetDefaultAddress } from '../../hooks/useCustomerAddresses'

const MAX_ADDRESSES = 5

/**
 * Lista os endereços do cliente (até 5), permite selecionar um,
 * trocar o principal e editar/adicionar.
 *
 * Uso:
 *   <AddressPicker customerId={id} selectedId={x} onSelect={(addr) => ...} />
 */
export default function AddressPicker({ customerId, selectedId, onSelect }) {
  const { data: addresses, isLoading } = useCustomerAddresses(customerId)
  const setDefault = useSetDefaultAddress(customerId)

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing]     = useState(null)

  if (isLoading) return <p className="text-sm text-gray-400">Carregando endereços...</p>

  const list = addresses || []
  const canAddMore = list.length < MAX_ADDRESSES

  const openCreate = () => { setEditing(null); setModalOpen(true) }
  const openEdit   = (addr) => { setEditing(addr); setModalOpen(true) }

  return (
    <div className="space-y-2">
      {list.length === 0 ? (
        <Card><p className="text-gray-400 text-sm text-center py-4">Nenhum endereço cadastrado.</p></Card>
      ) : (
        list.map((addr) => (
          <Card
            key={addr._id}
            onClick={() => onSelect?.(addr)}
            className={selectedId === addr._id ? 'ring-2 ring-primary' : ''}
          >
            <div className="flex items-start gap-3">
              <MapPin size={18} className="text-primary flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{addr.label}</span>
                  {addr.isDefault && <Star size={12} className="text-warning fill-warning" />}
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  {addr.street}, {addr.number} — {addr.neighborhood}
                </p>
                {addr.referencePoint && (
                  <p className="text-xs text-gray-400">{addr.referencePoint}</p>
                )}
              </div>

              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                {selectedId === addr._id && <Check size={18} className="text-primary" />}
                <div className="flex gap-1">
                  {!addr.isDefault && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setDefault.mutate(addr._id) }}
                      className="p-1.5 rounded-lg active:bg-gray-100"
                      title="Tornar principal"
                    >
                      <Star size={14} className="text-gray-300" />
                    </button>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); openEdit(addr) }}
                    className="p-1.5 rounded-lg active:bg-gray-100"
                  >
                    <Pencil size={14} className="text-gray-300" />
                  </button>
                </div>
              </div>
            </div>
          </Card>
        ))
      )}

      {canAddMore && (
        <Button variant="ghost" full onClick={openCreate}>
          <Plus size={16} />
          Adicionar endereço
        </Button>
      )}

      <AddressFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        customerId={customerId}
        address={editing}
      />
    </div>
  )
}
