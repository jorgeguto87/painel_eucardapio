import { useNavigate } from 'react-router-dom'
import { Bike, ChevronRight, History } from 'lucide-react'
import TopBar from '../../components/layout/TopBar'
import Card from '../../components/ui/Card'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import Button from '../../components/ui/Button'
import { useDeliverers } from '../../hooks/useDeliverers'

/**
 * Ponto de entrada rápido: escolher um entregador e ir direto pra fila dele
 * ou pro histórico de entregas já concluídas — sem precisar abrir um
 * pedido específico primeiro.
 */
export default function DeliverersListPage() {
  const navigate = useNavigate()
  const { data: deliverers, isLoading } = useDeliverers()

  return (
    <div>
      <TopBar title="Entregadores" subtitle="Fila e histórico de entregas" back />

      <div className="page">
        {isLoading ? (
          <LoadingSpinner />
        ) : !deliverers || deliverers.length === 0 ? (
          <div className="text-center py-12">
            <Bike size={32} className="text-gray-300 mx-auto mb-3" />
            <p className="font-medium text-sm mb-1">Nenhum entregador cadastrado</p>
            <p className="text-xs text-gray-400 mb-4">Cadastre entregadores em Configurações &gt; Entregadores.</p>
            <Button onClick={() => navigate('/settings/deliverers')}>Cadastrar entregador</Button>
          </div>
        ) : (
          <div className="space-y-2">
            {deliverers.map((d) => (
              <Card key={d._id} className="!p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-sm">{d.name}</p>
                    <p className="text-xs text-gray-400">{d.phone} · {d.vehicleType}</p>
                  </div>
                  {!d.isActive && (
                    <span className="text-[10px] bg-danger/10 text-danger px-2 py-0.5 rounded-full">Inativo</span>
                  )}
                </div>

                <div className="flex gap-2 mt-3">
                  <Button
                    variant="secondary"
                    className="!min-h-0 !h-9 text-xs flex-1"
                    onClick={() => navigate(`/deliverers/${d._id}/queue`)}
                  >
                    <Bike size={14} />
                    Fila de entregas
                    <ChevronRight size={14} />
                  </Button>
                  <Button
                    variant="ghost"
                    className="!min-h-0 !h-9 text-xs flex-1"
                    onClick={() => navigate(`/deliverers/${d._id}/history`)}
                  >
                    <History size={14} />
                    Histórico
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
