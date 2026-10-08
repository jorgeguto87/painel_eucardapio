import { useEffect, useRef } from 'react'

export const UNSAVED_CHANGES_MESSAGE = 'Você tem alterações não salvas. Sair mesmo assim e perder as alterações?'

/**
 * Avisa antes de perder alterações não salvas.
 *
 * O app usa <BrowserRouter> (não um "data router"), então o useBlocker do
 * react-router NÃO funciona aqui. Cobrimos os caminhos reais de saída:
 *   - fechar/recarregar a aba → `beforeunload` (aviso nativo do navegador);
 *   - clicar em qualquer link interno (menu lateral, barra inferior, etc.)
 *     → interceptado na fase de captura, antes do <Link> navegar;
 *   - botão "voltar" do TopBar → use `confirmLeave()` no `onBack`.
 *
 * Retorna `confirmLeave()` → true se pode sair (sem alterações, ou o
 * usuário confirmou).
 */
export default function useUnsavedChangesGuard(isDirty) {
  const dirtyRef = useRef(isDirty)
  dirtyRef.current = isDirty

  useEffect(() => {
    if (!isDirty) return undefined

    const onBeforeUnload = (e) => {
      e.preventDefault()
      e.returnValue = '' // necessário pro Chrome mostrar o aviso
      return ''
    }

    const onClickCapture = (e) => {
      if (!dirtyRef.current) return
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      const anchor = e.target?.closest?.('a[href]')
      if (!anchor || anchor.target === '_blank' || anchor.hasAttribute('download')) return

      let url
      try { url = new URL(anchor.href, window.location.href) } catch { return }
      if (url.origin !== window.location.origin) return
      // Âncoras dentro da própria página (ex: navegação lateral "#preco") não saem da tela
      if (url.pathname === window.location.pathname && url.search === window.location.search) return

      if (!window.confirm(UNSAVED_CHANGES_MESSAGE)) {
        e.preventDefault()
        e.stopPropagation()
      }
    }

    window.addEventListener('beforeunload', onBeforeUnload)
    document.addEventListener('click', onClickCapture, true)
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload)
      document.removeEventListener('click', onClickCapture, true)
    }
  }, [isDirty])

  return () => !dirtyRef.current || window.confirm(UNSAVED_CHANGES_MESSAGE)
}
