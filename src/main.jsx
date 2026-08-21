import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App.jsx'

// Sem isso, o navegador só verifica se existe uma versão nova do app a
// cada ~24h (comportamento padrão de Service Worker) — era exatamente
// por isso que só um Ctrl+Shift+R (que ignora tudo) resolvia, um F5
// comum não bastava. Agora verifica de verdade, com frequência, e recarrega
// sozinho assim que encontra uma versão nova.
registerSW({
  immediate: true,
  onRegisteredSW(swUrl, registration) {
    if (!registration) return
    // Confere a cada 60s se existe versão nova — bem mais rápido que o
    // padrão do navegador, sem precisar de ação manual do usuário.
    setInterval(() => {
      registration.update()
    }, 60 * 1000)
  },
  onNeedRefresh() {
    // Versão nova já ativada nos bastidores (registerType: autoUpdate) —
    // só falta recarregar a página pra usar ela de verdade.
    window.location.reload()
  },
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
