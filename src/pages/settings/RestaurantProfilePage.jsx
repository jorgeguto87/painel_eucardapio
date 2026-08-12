import { useState, useEffect } from 'react'
import { MapPin, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import TopBar from '../../components/layout/TopBar'
import Input from '../../components/ui/Input'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import useRestaurantStore from '../../stores/restaurantStore'

export default function RestaurantProfilePage() {
  const { restaurant, fetchRestaurant, updateRestaurant } = useRestaurantStore()
  const [form, setForm] = useState({
    name: '', phone: '', document: '',
    averagePreparationTime: '', askForDisposables: true,
    latitude: null, longitude: null,
  })
  const [locating, setLocating] = useState(false)
  const [saving, setSaving]     = useState(false)

  useEffect(() => { if (!restaurant) fetchRestaurant() }, [restaurant, fetchRestaurant])

  useEffect(() => {
    if (restaurant) {
      setForm({
        name:     restaurant.name || '',
        phone:    restaurant.phone || '',
        document: restaurant.document || '',
        averagePreparationTime: restaurant.averagePreparationTime ?? '',
        askForDisposables: restaurant.askForDisposables !== false,
        latitude:  restaurant.latitude ?? null,
        longitude: restaurant.longitude ?? null,
      })
    }
  }, [restaurant])

  const handleChange = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

  /**
   * Captura a localização atual via geolocalização do navegador.
   * Usada para definir o ponto de origem do restaurante (cálculo de distância de entrega).
   */
  const captureLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocalização não suportada neste navegador.')
      return
    }

    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((f) => ({
          ...f,
          latitude:  pos.coords.latitude,
          longitude: pos.coords.longitude,
        }))
        setLocating(false)
        toast.success('Localização capturada!')
      },
      () => {
        setLocating(false)
        toast.error('Não foi possível obter sua localização. Verifique as permissões.')
      },
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await updateRestaurant({
        name:     form.name,
        phone:    form.phone,
        document: form.document,
        averagePreparationTime: form.averagePreparationTime ? Number(form.averagePreparationTime) : null,
        askForDisposables: form.askForDisposables,
        latitude:  form.latitude,
        longitude: form.longitude,
      })
      toast.success('Dados atualizados!')
    } catch {
      toast.error('Erro ao salvar.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <TopBar title="Dados do restaurante" back />

      <form onSubmit={handleSubmit} className="page space-y-4">
        <Input label="Nome do restaurante" value={form.name} onChange={handleChange('name')} required />
        <Input label="Telefone" value={form.phone} onChange={handleChange('phone')} placeholder="(21) 99999-9999" />
        <Input label="CNPJ ou CPF" value={form.document} onChange={handleChange('document')} />

        <Input
          label="Tempo médio de preparo (minutos)"
          type="number"
          min="0"
          value={form.averagePreparationTime}
          onChange={handleChange('averagePreparationTime')}
          placeholder="Ex: 30"
        />

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">Perguntar sobre descartáveis</p>
              <p className="text-xs text-gray-400">Na finalização do pedido, perguntar se o cliente quer talheres/descartáveis.</p>
            </div>
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, askForDisposables: !f.askForDisposables }))}
              className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${form.askForDisposables ? 'bg-success' : 'bg-gray-300'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.askForDisposables ? 'translate-x-5' : ''}`} />
            </button>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-2 mb-2">
            <MapPin size={16} className="text-primary" />
            <span className="font-medium text-sm">Localização do restaurante</span>
          </div>

          {form.latitude && form.longitude ? (
            <p className="text-xs text-gray-500 mb-3">
              📍 {form.latitude.toFixed(6)}, {form.longitude.toFixed(6)}
            </p>
          ) : (
            <p className="text-xs text-gray-400 mb-3">Localização ainda não definida.</p>
          )}

          <Button type="button" variant="secondary" full onClick={captureLocation} loading={locating}>
            {locating ? <Loader2 size={16} className="animate-spin" /> : <MapPin size={16} />}
            Usar localização atual
          </Button>
        </Card>

        <Button type="submit" full loading={saving}>Salvar alterações</Button>
      </form>
    </div>
  )
}
