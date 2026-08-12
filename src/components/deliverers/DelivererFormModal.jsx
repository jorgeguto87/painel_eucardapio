import { useState, useEffect } from 'react'
import { Trash2 } from 'lucide-react'
import Modal from '../ui/Modal'
import Input from '../ui/Input'
import Button from '../ui/Button'
import { useCreateDeliverer, useUpdateDeliverer, useDeleteDeliverer } from '../../hooks/useDeliverers'

const VEHICLE_TYPES = [
  { value: 'moto',      label: 'Moto' },
  { value: 'bicicleta', label: 'Bicicleta' },
  { value: 'carro',     label: 'Carro' },
  { value: 'a_pe',      label: 'A pé' },
]

const EMPTY_FORM = { name: '', phone: '', document: '', vehiclePlate: '', vehicleType: 'moto' }

export default function DelivererFormModal({ open, onClose, deliverer = null }) {
  const isEditing = !!deliverer
  const [form, setForm] = useState(EMPTY_FORM)

  const createDeliverer = useCreateDeliverer()
  const updateDeliverer = useUpdateDeliverer()
  const deleteDeliverer = useDeleteDeliverer()

  useEffect(() => {
    if (open) {
      setForm(deliverer ? {
        name: deliverer.name, phone: deliverer.phone,
        document: deliverer.document || '', vehiclePlate: deliverer.vehiclePlate || '',
        vehicleType: deliverer.vehicleType || 'moto',
      } : EMPTY_FORM)
    }
  }, [open, deliverer])

  const handleChange = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (isEditing) {
      await updateDeliverer.mutateAsync({ id: deliverer._id, ...form })
    } else {
      await createDeliverer.mutateAsync(form)
    }
    onClose()
  }

  const isSaving = createDeliverer.isPending || updateDeliverer.isPending

  const handleDelete = async () => {
    const confirmed = window.confirm(
      `Excluir ${deliverer.name} definitivamente?\n\n` +
      'Essa ação não pode ser desfeita. Se ele já tiver entregas no histórico, ' +
      'o nome dele será substituído por "Entregador removido" nos relatórios ' +
      '(o valor da taxa de entrega continua contabilizado normalmente).'
    )
    if (!confirmed) return
    await deleteDeliverer.mutateAsync(deliverer._id)
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={isEditing ? 'Editar entregador' : 'Novo entregador'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Nome" value={form.name} onChange={handleChange('name')} required />
        <Input label="Telefone (WhatsApp)" value={form.phone} onChange={handleChange('phone')} placeholder="5521999990000" required />
        <Input label="Documento (CPF, opcional)" value={form.document} onChange={handleChange('document')} />

        <div>
          <label className="label">Tipo de veículo</label>
          <select className="input" value={form.vehicleType} onChange={handleChange('vehicleType')}>
            {VEHICLE_TYPES.map((v) => <option key={v.value} value={v.value}>{v.label}</option>)}
          </select>
        </div>

        {form.vehicleType === 'moto' || form.vehicleType === 'carro' ? (
          <Input label="Placa" value={form.vehiclePlate} onChange={handleChange('vehiclePlate')} placeholder="ABC1D23" />
        ) : null}

        <Button type="submit" full loading={isSaving}>
          {isEditing ? 'Salvar alterações' : 'Cadastrar entregador'}
        </Button>

        {isEditing && (
          <Button
            type="button"
            full
            variant="danger"
            onClick={handleDelete}
            loading={deleteDeliverer.isPending}
          >
            <Trash2 size={16} />
            Excluir entregador
          </Button>
        )}
      </form>
    </Modal>
  )
}
