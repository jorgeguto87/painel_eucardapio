import { useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { Upload, Link2, X, ImageIcon } from 'lucide-react'
import { fileToBase64 } from '../../utils/imageUpload'

/**
 * Campo de imagem com duas fontes possíveis, que o usuário escolhe:
 *  - Upload de arquivo → salvo como base64 (imageBase64), comprimido
 *    de verdade no backend antes de gravar (ver imageCompression.js)
 *  - URL externa       → salvo como texto (imageUrl)
 * Sempre um exclui o outro (só um fica preenchido por vez), evitando
 * ambiguidade de qual imagem exibir.
 */
export default function ImageUploadField({ label, imageUrl, imageBase64, onChange }) {
  const [mode, setMode] = useState(imageUrl ? 'url' : 'upload')
  const [arrastando, setArrastando] = useState(false)
  const inputRef = useRef(null)
  const preview = imageBase64 || imageUrl

  const processarArquivo = async (file) => {
    if (!file) return
    try {
      const base64 = await fileToBase64(file)
      onChange({ imageBase64: base64, imageUrl: null })
    } catch (err) {
      toast.error(err.message)
    }
  }

  const handleFile = async (e) => {
    await processarArquivo(e.target.files?.[0])
    e.target.value = ''
  }

  const handleDrop = async (e) => {
    e.preventDefault()
    setArrastando(false)
    await processarArquivo(e.dataTransfer.files?.[0])
  }

  const clearImage = () => onChange({ imageBase64: null, imageUrl: null })

  return (
    <div>
      {label && <label className="label">{label}</label>}

      {preview ? (
        <div className="relative w-full h-36 rounded-xl overflow-hidden border border-gray-200 mb-2">
          <img src={preview} alt="Pré-visualização" className="w-full h-full object-cover" />
          <button type="button" onClick={clearImage} className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1">
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
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setArrastando(true) }}
            onDragLeave={() => setArrastando(false)}
            onDrop={handleDrop}
            className={`w-full flex items-center gap-3 px-4 py-4 rounded-xl border-2 border-dashed transition-colors text-left ${
              arrastando ? 'border-primary bg-primary/10' : 'border-primary/30 bg-primary/5 hover:bg-primary/10'
            }`}
          >
            <span className="w-11 h-11 rounded-xl bg-white border border-primary/20 flex items-center justify-center flex-shrink-0">
              <ImageIcon size={18} className="text-primary" />
            </span>
            <span>
              <span className="block text-sm font-semibold text-primary">Selecionar imagem</span>
              <span className="block text-xs text-gray-400">Clique para importar uma foto JPG ou PNG</span>
            </span>
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
