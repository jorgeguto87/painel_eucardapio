import { useState } from 'react'
import { Search, Loader2 } from 'lucide-react'
import api from '../../config/api'
import toast from 'react-hot-toast'

/**
 * Input de CEP que consulta o backend (que por sua vez consulta o ViaCEP)
 * e retorna os campos preenchidos via onResult.
 */
export default function CepLookup({ onResult }) {
  const [cep, setCep] = useState('')
  const [loading, setLoading] = useState(false)

  const formatCep = (value) => {
    const digits = value.replace(/\D/g, '').slice(0, 8)
    return digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits
  }

  const handleChange = (e) => setCep(formatCep(e.target.value))

  const handleLookup = async () => {
    const digits = cep.replace(/\D/g, '')
    if (digits.length !== 8) {
      toast.error('CEP inválido.')
      return
    }

    setLoading(true)
    try {
      const { data } = await api.get(`/utils/cep/${digits}`)
      onResult({
        street:       data.data.street       || data.data.logradouro || '',
        neighborhood: data.data.neighborhood  || data.data.bairro    || '',
        city:         data.data.city          || data.data.localidade || '',
        state:        data.data.state         || data.data.uf        || '',
        zipCode:      cep,
      })
    } catch {
      toast.error('CEP não encontrado.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <label className="label">CEP</label>
      <div className="flex gap-2">
        <input
          className="input flex-1"
          value={cep}
          onChange={handleChange}
          placeholder="00000-000"
          inputMode="numeric"
        />
        <button
          type="button"
          onClick={handleLookup}
          disabled={loading}
          className="btn-secondary !min-h-0 h-12 w-12 !px-0 flex-shrink-0"
        >
          {loading ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
        </button>
      </div>
    </div>
  )
}
