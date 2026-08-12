import { useState, useEffect } from 'react'
import Modal from '../ui/Modal'
import Input from '../ui/Input'
import Button from '../ui/Button'
import CepLookup from './CepLookup'
import { useCreateAddress, useUpdateAddress } from '../../hooks/useCustomerAddresses'

const LABEL_OPTIONS = ['Casa', 'Trabalho', 'Outro']

const EMPTY_FORM = {
  label: 'Casa', street: '', number: '', neighborhood: '',
  city: '', state: '', zipCode: '', referencePoint: '',
}

export default function AddressFormModal({ open, onClose, customerId, address = null }) {
  const isEditing = !!address
  const [form, setForm] = useState(EMPTY_FORM)

  const createAddress = useCreateAddress(customerId)
  const updateAddress = useUpdateAddress(customerId)

  useEffect(() => {
    if (open) setForm(address ? { ...EMPTY_FORM, ...address } : EMPTY_FORM)
  }, [open, address])

  const handleChange = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

  const handleCepResult = (result) => setForm((f) => ({ ...f, ...result }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (isEditing) {
      await updateAddress.mutateAsync({ addressId: address._id, ...form })
    } else {
      await createAddress.mutateAsync(form)
    }
    onClose()
  }

  const isSaving = createAddress.isPending || updateAddress.isPending

  return (
    <Modal open={open} onClose={onClose} title={isEditing ? 'Editar endereço' : 'Novo endereço'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Apelido</label>
          <div className="flex gap-2">
            {LABEL_OPTIONS.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setForm((f) => ({ ...f, label: opt }))}
                className={`flex-1 h-10 rounded-xl text-sm font-medium transition-colors ${
                  form.label === opt ? 'bg-primary text-white' : 'bg-bg text-gray-500'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        <CepLookup onResult={handleCepResult} />

        <Input label="Rua" value={form.street} onChange={handleChange('street')} required />

        <div className="grid grid-cols-2 gap-3">
          <Input label="Número" value={form.number} onChange={handleChange('number')} required />
          <Input label="Bairro" value={form.neighborhood} onChange={handleChange('neighborhood')} required />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <Input label="Cidade" value={form.city} onChange={handleChange('city')} />
          </div>
          <Input label="UF" value={form.state} onChange={handleChange('state')} maxLength={2} />
        </div>

        <Input
          label="Ponto de referência (opcional)"
          value={form.referencePoint}
          onChange={handleChange('referencePoint')}
          placeholder="Ex: Próximo à padaria"
        />

        <Button type="submit" full loading={isSaving}>
          {isEditing ? 'Salvar alterações' : 'Adicionar endereço'}
        </Button>
      </form>
    </Modal>
  )
}
