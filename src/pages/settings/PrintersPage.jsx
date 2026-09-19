import { useEffect, useState } from 'react'
import { Printer, Download, RefreshCw, CheckCircle2, Copy } from 'lucide-react'
import toast from 'react-hot-toast'
import TopBar from '../../components/layout/TopBar'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import { formatDateTime } from '../../utils/format'
import {
  usePrintAgentStatus,
  useGeneratePairingCode,
  PRINTER_ROLE_LABELS,
} from '../../hooks/usePrintAgent'

// Link fixo — sempre o mesmo instalador pra todos os restaurantes. Em
// produção aponta pro domínio público da API (VITE_API_URL); em dev usa o
// caminho relativo (proxy do Vite).
const DOWNLOAD_URL = `${import.meta.env.VITE_API_URL || ''}/downloads/EuCardapioPrint-Setup.exe`

/** Código de pareamento com contagem regressiva até expirar (15 min). */
const useCountdown = (expiresAt) => {
  const [label, setLabel] = useState('')

  useEffect(() => {
    if (!expiresAt) { setLabel(''); return }

    const tick = () => {
      const diffMs = new Date(expiresAt).getTime() - Date.now()
      if (diffMs <= 0) { setLabel('Expirado'); return }
      const min = Math.floor(diffMs / 60000)
      const sec = Math.floor((diffMs % 60000) / 1000)
      setLabel(`${min}:${String(sec).padStart(2, '0')}`)
    }

    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [expiresAt])

  return label
}

export default function PrintersPage() {
  const { data: status, isLoading } = usePrintAgentStatus({ poll: true })
  const generateCode = useGeneratePairingCode()
  const countdown = useCountdown(status?.pairingCodeExpiresAt)

  const copyCode = () => {
    navigator.clipboard.writeText(status.pairingCode)
    toast.success('Código copiado!')
  }

  if (isLoading || !status) return <LoadingSpinner />

  const registeredPrinters = status.printers || []

  return (
    <div>
      <TopBar title="Impressoras" subtitle="Eu Cardápio Print" back />

      <div className="page space-y-4">
        <Card>
          <div className="flex items-center gap-2 mb-1">
            <Printer size={18} className="text-primary" />
            <h3 className="font-semibold text-sm">O que é o Eu Cardápio Print</h3>
          </div>
          <p className="text-xs text-gray-400 mb-3">
            Um programinha pra instalar no computador do restaurante — conecta até 3 impressoras
            (Balcão, Cozinha e Entrega) e imprime os pedidos automaticamente ou sob demanda.
          </p>
          <a href={DOWNLOAD_URL} target="_blank" rel="noreferrer">
            <Button full variant="secondary">
              <Download size={16} className="mr-1.5" /> Baixar Eu Cardápio Print
            </Button>
          </a>
        </Card>

        {status.isLinked ? (
          <>
            <Card>
              <div className="flex items-center gap-2 text-success text-sm mb-3">
                <CheckCircle2 size={16} />
                Programinha conectado
              </div>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Computador</span>
                  <span className="font-medium">{status.deviceName || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Visto pela última vez</span>
                  <span className="font-medium">{status.lastSeenAt ? formatDateTime(status.lastSeenAt) : '—'}</span>
                </div>
              </div>
            </Card>

            <Card>
              <h3 className="font-semibold text-sm mb-3">Impressoras cadastradas</h3>
              {registeredPrinters.length === 0 ? (
                <p className="text-xs text-gray-400">
                  Nenhuma impressora configurada ainda — configure dentro do próprio programinha.
                </p>
              ) : (
                <div className="space-y-2">
                  {registeredPrinters.map((p) => (
                    <div key={p.role} className="flex items-center justify-between text-sm">
                      <span className="font-medium">{PRINTER_ROLE_LABELS[p.role] || p.role}</span>
                      <span className="text-gray-400">{p.label || 'Sem nome'}</span>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-xs text-gray-400 mt-3 pt-3 border-t border-gray-100">
                Qual impressora física é Balcão, Cozinha ou Entrega — e a largura do papel de cada
                uma — se configura dentro do programinha, a qualquer momento.
              </p>
            </Card>

            <Card>
              <h3 className="font-semibold text-sm mb-1">Trocar de computador</h3>
              <p className="text-xs text-gray-400 mb-3">
                Gerar um novo código desconecta o programinha atual — só o próximo a parear com
                esse código fica ativo. Use isso pra trocar de computador, não pra rotina.
              </p>
              <Button
                full variant="secondary" loading={generateCode.isPending}
                onClick={() => generateCode.mutate()}
              >
                <RefreshCw size={16} className="mr-1.5" /> Gerar novo código de pareamento
              </Button>
            </Card>
          </>
        ) : (
          <Card>
            <h3 className="font-semibold text-sm mb-1">Parear o programinha</h3>
            <p className="text-xs text-gray-400 mb-3">
              Depois de instalar, gere um código aqui e digite ele na tela inicial do programinha.
            </p>

            {status.pairingCode ? (
              <div className="text-center py-4">
                <button
                  onClick={copyCode}
                  className="inline-flex items-center gap-2 text-3xl font-bold tracking-[0.3em] text-secondary"
                >
                  {status.pairingCode}
                  <Copy size={18} className="text-gray-300" />
                </button>
                <p className="text-xs text-gray-400 mt-2">
                  Expira em {countdown} — se der tempo, gere outro código.
                </p>
              </div>
            ) : null}

            <Button
              full loading={generateCode.isPending}
              onClick={() => generateCode.mutate()}
            >
              {status.pairingCode ? 'Gerar outro código' : 'Gerar código de pareamento'}
            </Button>
          </Card>
        )}
      </div>
    </div>
  )
}
