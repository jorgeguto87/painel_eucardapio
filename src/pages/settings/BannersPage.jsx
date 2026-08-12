import { useState } from 'react'
import { Plus, Pencil, Trash2, ImageOff } from 'lucide-react'
import TopBar from '../../components/layout/TopBar'
import Card from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Modal from '../../components/ui/Modal'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import ImageUploadField from '../../components/media/ImageUploadField'
import { useBanners, useCreateBanner, useUpdateBanner, useDeleteBanner } from '../../hooks/useBanners'

const TYPES = [
  { value: 'dish_of_day', label: 'Prato do dia' },
  { value: 'suggestion',  label: 'Sugestão da casa' },
  { value: 'promotion',   label: 'Promoção' },
]

const emptyForm = () => ({
  type: 'dish_of_day', title: '', description: '', imageUrl: '', imageBase64: '', isActive: true, sortOrder: 0,
})

export default function BannersPage() {
  const { data: banners, isLoading } = useBanners()
  const createBanner = useCreateBanner()
  const updateBanner  = useUpdateBanner()
  const deleteBanner  = useDeleteBanner()

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing]     = useState(null)
  const [form, setForm]           = useState(emptyForm())

  const openCreate = () => { setEditing(null); setForm(emptyForm()); setModalOpen(true) }
  const openEdit = (banner) => {
    setEditing(banner)
    setForm({
      type: banner.type, title: banner.title, description: banner.description || '',
      imageUrl: banner.imageUrl || '', imageBase64: banner.imageBase64 || '',
      isActive: banner.isActive, sortOrder: banner.sortOrder || 0,
    })
    setModalOpen(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const payload = {
      type: form.type,
      title: form.title,
      description: form.description,
      imageUrl: form.imageBase64 ? null : (form.imageUrl || null),
      imageBase64: form.imageBase64 || null,
      isActive: form.isActive,
      sortOrder: Number(form.sortOrder) || 0,
    }
    if (editing) {
      await updateBanner.mutateAsync({ id: editing._id, ...payload })
    } else {
      await createBanner.mutateAsync(payload)
    }
    setModalOpen(false)
  }

  const handleDelete = async (banner) => {
    if (!confirm(`Remover o banner "${banner.title}"?`)) return
    await deleteBanner.mutateAsync(banner._id)
  }

  const isSaving = createBanner.isPending || updateBanner.isPending

  return (
    <div>
      <TopBar title="Banners do cardápio" subtitle="Prato do dia, sugestões e promoções exibidos no topo do cardápio digital" back />

      <div className="page space-y-3">
        <Button full onClick={openCreate}><Plus size={16} />Novo banner</Button>

        {isLoading ? (
          <LoadingSpinner />
        ) : !banners || banners.length === 0 ? (
          <p className="text-center text-sm text-gray-400 py-8">Nenhum banner cadastrado ainda.</p>
        ) : (
          banners.map((banner) => (
            <Card key={banner._id} className={!banner.isActive ? 'opacity-50' : ''}>
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-xl bg-bg flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {(banner.imageBase64 || banner.imageUrl)
                    ? <img src={banner.imageBase64 || banner.imageUrl} alt="" className="w-full h-full object-cover" />
                    : <ImageOff size={18} className="text-gray-300" />}
                </div>
                <div className="flex-1 min-w-0">
                  <Badge label={TYPES.find((t) => t.value === banner.type)?.label} className="mb-1" />
                  <p className="font-medium text-sm truncate">{banner.title}</p>
                  {!banner.isActive && <p className="text-xs text-gray-400">Inativo</p>}
                </div>
                <button onClick={() => openEdit(banner)} className="p-2 rounded-xl hover:bg-gray-100">
                  <Pencil size={15} className="text-gray-400" />
                </button>
                <button onClick={() => handleDelete(banner)} className="p-2 rounded-xl hover:bg-gray-100">
                  <Trash2 size={15} className="text-danger" />
                </button>
              </div>
            </Card>
          ))
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar banner' : 'Novo banner'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Tipo</label>
            <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>

          <Input label="Título" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required maxLength={80} />

          <div>
            <label className="label">Descrição (opcional)</label>
            <textarea
              className="input min-h-[70px] py-3"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              maxLength={200}
            />
          </div>

          <ImageUploadField
            label="Imagem do banner"
            imageUrl={form.imageUrl}
            imageBase64={form.imageBase64}
            onChange={({ imageUrl, imageBase64 }) => setForm((f) => ({
              ...f,
              imageUrl: imageUrl !== undefined ? imageUrl : f.imageUrl,
              imageBase64: imageBase64 !== undefined ? imageBase64 : f.imageBase64,
            }))}
          />

          <Input label="Ordem de exibição" type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: e.target.value })} />

          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
            Ativo (visível no cardápio digital)
          </label>

          <Button type="submit" full loading={isSaving}>{editing ? 'Salvar alterações' : 'Criar banner'}</Button>
        </form>
      </Modal>
    </div>
  )
}
