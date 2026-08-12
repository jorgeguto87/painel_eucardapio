import { useState } from 'react'
import { QrCode, CheckCircle2, RefreshCw, Unplug } from 'lucide-react'
import TopBar from '../../components/layout/TopBar'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import { useWhatsappStatus, useQRCode, useConnectWhatsapp, useDisconnectWhatsapp } from '../../hooks/useWhatsapp'

export default function WhatsappPage() {
  const [connecting, setConnecting] = useState(false)

  const { data: status, isLoading: statusLoading } = useWhatsappStatus({ refetchInterval: 10000 })
  const { data: qr } = useQRCode(connecting && !status?.connected)
  const connect    = useConnectWhatsapp()
  const disconnect = useDisconnectWhatsapp()

  const handleConnect = async () => {
    setConnecting(true)
    await connect.mutateAsync()
  }

  const handleDisconnect = async () => {
    if (!confirm('Desconectar o WhatsApp? O bot deixará de responder os clientes.')) return
    await disconnect.mutateAsync()
    setConnecting(false)
  }

  if (statusLoading) return <LoadingSpinner />

  return (
    <div>
      <TopBar title="WhatsApp" subtitle="Conexão do atendente virtual" />

      <div className="page">
        {status?.connected ? (
          <Card className="text-center py-8">
            <CheckCircle2 size={48} className="text-success mx-auto mb-3" />
            <p className="font-semibold text-secondary">WhatsApp conectado</p>
            {status.phoneNumber && <p className="text-sm text-gray-400 mt-1">+{status.phoneNumber}</p>}
            <Button variant="danger" full onClick={handleDisconnect} loading={disconnect.isPending} className="mt-6">
              <Unplug size={16} />
              Desconectar
            </Button>
          </Card>
        ) : (
          <Card className="text-center py-8">
            {connecting && qr?.qrCode ? (
              <>
                <img src={qr.qrCode} alt="QR Code WhatsApp" className="w-56 h-56 mx-auto rounded-xl border border-gray-100" />
                <p className="text-sm text-gray-500 mt-4">
                  Abra o WhatsApp no celular do restaurante → Aparelhos conectados → Conectar um aparelho
                </p>
                <Button variant="ghost" full onClick={() => setConnecting(false)} className="mt-4">
                  Cancelar
                </Button>
              </>
            ) : connecting ? (
              <>
                <RefreshCw size={32} className="animate-spin text-primary mx-auto mb-3" />
                <p className="text-sm text-gray-400">Gerando QR Code...</p>
              </>
            ) : (
              <>
                <QrCode size={48} className="text-gray-300 mx-auto mb-3" />
                <p className="font-semibold text-secondary mb-1">WhatsApp desconectado</p>
                <p className="text-sm text-gray-400 mb-6">Conecte para começar a receber pedidos automaticamente</p>
                <Button full onClick={handleConnect} loading={connect.isPending}>
                  Conectar WhatsApp
                </Button>
              </>
            )}
          </Card>
        )}
      </div>
    </div>
  )
}
