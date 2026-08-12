// Helpers para upload de imagem convertida em base64 (data URI), usados em
// Produtos, Configuração do bot e Banners — todos aceitam imagem via
// upload (base64 salvo no Mongo) OU via URL externa.

export const MAX_IMAGE_BYTES = 1.5 * 1024 * 1024 // ~1.5MB (arquivo original)

const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif']

/**
 * Lê um <input type="file"> e devolve uma Promise com o data URI base64.
 * Lança erro com mensagem amigável se o arquivo for grande demais ou de
 * tipo não suportado.
 */
export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    if (!file) return reject(new Error('Nenhum arquivo selecionado.'))
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return reject(new Error('Formato não suportado. Use PNG, JPG, WEBP ou GIF.'))
    }
    if (file.size > MAX_IMAGE_BYTES) {
      return reject(new Error('Imagem muito grande. O limite é de 1.5MB.'))
    }

    const reader = new FileReader()
    reader.onload = () => resolve(reader.result) // já vem como "data:image/...;base64,...."
    reader.onerror = () => reject(new Error('Não foi possível ler o arquivo.'))
    reader.readAsDataURL(file)
  })
}
