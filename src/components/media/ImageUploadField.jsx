import { useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { Upload, Link2, X } from 'lucide-react'
import { fileToBase64 } from '../../utils/imageUpload'

/**
 * Campo de imagem com duas fontes possíveis, que o usuário escolhe:
 *  - Upload de arquivo → salvo como base64 (imageBase64)
 *  - URL externa       → salvo como texto (imageUrl)
 * Sempre um exclui o outro (só um fica preenchido por vez), evitando
 * ambiguidade de qual imagem exibir.
 */
export default function ImageUploadField({ label, imageUrl, imageBase64, onChange }) {
  const [mode, setMode] = useState(imageUrl ? 'url' : 'upload')
  const inputRef = useRef(null)
  const preview = imageBase64 || imageUrl

  const handleFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const base64 = await fileToBase64(file)
      onChange({ imageBase64: base64, imageUrl: null })
    } catch (err) {
      toast.error(err.message)
    } finally {
      e.target.value = ''
    }
  }

  const clearImage = () => onChange({ imageBase64: null, imageUrl: null })

  return (
    <div>
      {label && <label className="label">{label}</label>}

      {preview ? (
        <div className="relative w-full h-36 rounded-xl overflow-hidden border border-gray-200 mb-2">
          <img src={preview} alt="Pré-visualização" className="w-full h-full object-cover" />
          <button
            type="button"
            onClick={clearImage}
            className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1"
          >
            <X size={14} />
          </button>
        </div>
      ) : (
        <div className="flex gap-2 mb-2">
          <button
            type="button"
            onClick={() => setMode('upload')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl border text-sm ${mode === 'upload' ? 'border-primary text-primary bg-primary/5' : 'border-gray-200 text-gray-400'}`}
          >
            <Upload size={14} /> Enviar arquivo
          </button>
          <button
            type="button"
            onClick={() => setMode('url')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl border text-sm ${mode === 'url' ? 'border-primary text-primary bg-primary/5' : 'border-gray-200 text-gray-400'}`}
          >
            <Link2 size={14} /> Usar URL
          </button>
        </div>
      )}

      {!preview && mode === 'upload' && (
        <>
          <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={handleFile} className="hidden" />
          <button type="button" onClick={() => inputRef.current?.click()} className="input text-left text-gray-400">
            Escolher imagem (até 1.5MB)...
          </button>
        </>
      )}

      {!preview && mode === 'url' && (
        <input
          className="input"
          placeholder="https://..."
          value={imageUrl || ''}
          onChange={(e) => onChange({ imageUrl: e.target.value, imageBase64: null })}
        />
      )}
    </div>
  )
}
