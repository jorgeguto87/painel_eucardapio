import { useState, useEffect } from 'react'
import { Plus, Trash2, Ticket, Wallet, Settings2 } from 'lucide-react'
import TopBar from '../../components/layout/TopBar'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Modal from '../../components/ui/Modal'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import EmptyState from '../../components/ui/EmptyState'
import {
  useCoupons, useCreateCoupon, useUpdateCoupon, useDeleteCoupon,
  useCashbackRules, useCreateCashbackRule, useUpdateCashbackRule, useDeleteCashbackRule,
  useCashbackConfig, useUpdateCashbackConfig,
} from '../../hooks/useLoyalty'
import { useProducts, useProductCategories } from '../../hooks/useProducts'
import { formatCurrency, toCents, toReais } from '../../utils/format'

const TABS = [
  { key: 'coupons',  label: 'Cupons',  icon: Ticket },
  { key: 'cashback', label: 'Cashback', icon: Wallet },
]

const COUPON_TYPE_LABELS = { percentage: 'Desconto %', fixed: 'Desconto fixo', free_item: 'Item grátis' }
const RULE_TYPE_LABELS = { global: 'Todo o cardápio', category: 'Categoria específica', product: 'Produto específico' }

const emptyCoupon = {
  code: '', description: '', type: 'percentage', discountValue: '', freeProductId: '',
  applicableCategories: '', excludedCategories: '', stackableWithCashback: true,
  minOrderValue: '', expiresAt: '', maxUses: '', isActive: true,
}

const emptyRule = { type: 'global', percent: '', categoryName: '', productId: '', excludedCategories: '', description: '', isActive: true }

export default function OfertasPage() {
  const [tab, setTab] = useState('coupons')

  return (
    <div>
      <TopBar title="Ofertas" subtitle="Cupons e cashback" />

      <div className="page space-y-4">
        <div className="flex gap-2">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                tab === key ? 'bg-primary text-white' : 'bg-surface text-gray-500 border border-gray-200'
              }`}
            >
              <Icon size={15} /> {label}
            </button>
          ))}
        </div>

        {tab === 'coupons' ? <CouponsTab /> : <CashbackTab />}
      </div>
    </div>
  )
}

// ─── Cupons ─────────────────────────────────────────────────────────────

function CouponsTab() {
  const { data: coupons, isLoading } = useCoupons()
  const { data: products } = useProducts()
  const { data: categories } = useProductCategories()
  const createCoupon = useCreateCoupon()
  const updateCoupon = useUpdateCoupon()
  const deleteCoupon = useDeleteCoupon()

  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyCoupon)

  const allProducts = Object.values(products || {}).flat()

  const openNew = () => { setForm(emptyCoupon); setEditingId(null); setModalOpen(true) }
  const openEdit = (c) => {
    setForm({
      code: c.code, description: c.description || '', type: c.type,
      discountValue: c.type === 'percentage' ? c.discountValue : toReais(c.discountValue),
      freeProductId: c.freeProductId || '',
      applicableCategories: (c.applicableCategories || []).join(', '),
      excludedCategories: (c.excludedCategories || []).join(', '),
      stackableWithCashback: c.stackableWithCashback,
      minOrderValue: c.minOrderValue ? toReais(c.minOrderValue) : '',
      expiresAt: c.expiresAt ? c.expiresAt.slice(0, 10) : '',
      maxUses: c.maxUses || '',
      isActive: c.isActive,
    })
    setEditingId(c._id)
    setModalOpen(true)
  }

  const submit = (e) => {
    e.preventDefault()
    const payload = {
      code: form.code.trim(),
      description: form.description || null,
      type: form.type,
      discountValue: form.type === 'free_item' ? 0 : (form.type === 'percentage' ? Number(form.discountValue) : toCents(form.discountValue)),
      freeProductId: form.type === 'free_item' ? (form.freeProductId || null) : null,
      applicableCategories: form.applicableCategories.split(',').map((s) => s.trim()).filter(Boolean),
      excludedCategories: form.excludedCategories.split(',').map((s) => s.trim()).filter(Boolean),
      stackableWithCashback: form.stackableWithCashback,
      minOrderValue: form.minOrderValue ? toCents(form.minOrderValue) : 0,
      expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
      maxUses: form.maxUses ? Number(form.maxUses) : null,
      isActive: form.isActive,
    }
    const onSuccess = () => setModalOpen(false)
    if (editingId) updateCoupon.mutate({ id: editingId, ...payload }, { onSuccess })
    else createCoupon.mutate(payload, { onSuccess })
  }

  if (isLoading) return <LoadingSpinner />

  return (
    <>
      <Button full onClick={openNew}><Plus size={16} /> Novo cupom</Button>

      {(!coupons || coupons.length === 0) ? (
        <EmptyState title="Nenhum cupom criado ainda" description="Crie um cupom de desconto ou item grátis pros seus clientes." />
      ) : (
        <div className="space-y-2">
          {coupons.map((c) => (
            <Card key={c._id} onClick={() => openEdit(c)}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-mono font-bold text-sm">{c.code}</p>
                  <p className="text-xs text-gray-400">{COUPON_TYPE_LABELS[c.type]}
                    {c.type === 'percentage' && ` — ${c.discountValue}%`}
                    {c.type === 'fixed' && ` — ${formatCurrency(c.discountValue)}`}
                  </p>
                  {c.expiresAt && <p className="text-xs text-gray-400 mt-0.5">Vence em {new Date(c.expiresAt).toLocaleDateString('pt-BR')}</p>}
                </div>
                <div className="text-right">
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${c.isActive ? 'bg-success/10 text-success' : 'bg-gray-100 text-gray-400'}`}>
                    {c.isActive ? 'Ativo' : 'Inativo'}
                  </span>
                  <p className="text-xs text-gray-400 mt-1">{c.usedCount} uso(s)</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Editar cupom' : 'Novo cupom'}>
        <form onSubmit={submit} className="space-y-4">
          <Input label="Código (o cliente digita esse texto)" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} required placeholder="Ex: NATAL10" />
          <Input label="Descrição (só pra você lembrar)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Ex: promoção de Natal" />

          <div>
            <label className="label">Tipo de benefício</label>
            <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              <option value="percentage">Desconto em %</option>
              <option value="fixed">Desconto em R$</option>
              <option value="free_item">Item grátis</option>
            </select>
          </div>

          {form.type !== 'free_item' && (
            <Input
              label={form.type === 'percentage' ? 'Percentual de desconto' : 'Valor do desconto (R$)'}
              type="number" step={form.type === 'percentage' ? '1' : '0.01'} min="0"
              value={form.discountValue} onChange={(e) => setForm({ ...form, discountValue: e.target.value })} required
            />
          )}

          {form.type === 'free_item' && (
            <div>
              <label className="label">Produto liberado grátis</label>
              <select className="input" value={form.freeProductId} onChange={(e) => setForm({ ...form, freeProductId: e.target.value })} required>
                <option value="">Selecione...</option>
                {allProducts.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
              </select>
            </div>
          )}

          <Input
            label="Categorias que valem (vazio = cardápio inteiro)"
            value={form.applicableCategories}
            onChange={(e) => setForm({ ...form, applicableCategories: e.target.value })}
            placeholder="Ex: Família, Pizzas (separado por vírgula)"
          />
          <Input
            label="Categorias excluídas (opcional)"
            value={form.excludedCategories}
            onChange={(e) => setForm({ ...form, excludedCategories: e.target.value })}
            placeholder="Ex: Bebidas"
          />
          <Input label="Valor mínimo do pedido (R$, opcional)" type="number" step="0.01" min="0" value={form.minOrderValue} onChange={(e) => setForm({ ...form, minOrderValue: e.target.value })} />
          <Input label="Validade (opcional — some sozinho depois de vencer)" type="date" value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} />
          <Input label="Limite total de usos (opcional)" type="number" min="1" value={form.maxUses} onChange={(e) => setForm({ ...form, maxUses: e.target.value })} />

          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Pode ser usado junto com cashback?</span>
            <button type="button" onClick={() => setForm({ ...form, stackableWithCashback: !form.stackableWithCashback })}
              className={`relative w-11 h-6 rounded-full transition-colors ${form.stackableWithCashback ? 'bg-success' : 'bg-gray-300'}`}>
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.stackableWithCashback ? 'translate-x-5' : ''}`} />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Ativo</span>
            <button type="button" onClick={() => setForm({ ...form, isActive: !form.isActive })}
              className={`relative w-11 h-6 rounded-full transition-colors ${form.isActive ? 'bg-success' : 'bg-gray-300'}`}>
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.isActive ? 'translate-x-5' : ''}`} />
            </button>
          </div>

          <Button type="submit" full loading={createCoupon.isPending || updateCoupon.isPending}>
            {editingId ? 'Salvar' : 'Criar cupom'}
          </Button>

          {editingId && (
            <Button type="button" variant="ghost" full className="text-danger" onClick={() => {
              if (window.confirm('Remover esse cupom?')) deleteCoupon.mutate(editingId, { onSuccess: () => setModalOpen(false) })
            }}>
              <Trash2 size={15} /> Remover cupom
            </Button>
          )}
        </form>
      </Modal>
    </>
  )
}

// ─── Cashback ───────────────────────────────────────────────────────────

function CashbackTab() {
  const { data: rules, isLoading } = useCashbackRules()
  const { data: config } = useCashbackConfig()
  const { data: categories } = useProductCategories()
  const { data: products } = useProducts()
  const createRule = useCreateCashbackRule()
  const updateRule = useUpdateCashbackRule()
  const deleteRule = useDeleteCashbackRule()
  const updateConfig = useUpdateCashbackConfig()

  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyRule)
  const [configForm, setConfigForm] = useState(null)

  const allProducts = Object.values(products || {}).flat()

  useEffect(() => { if (config && !configForm) setConfigForm(config) }, [config])

  const openNew = () => { setForm(emptyRule); setEditingId(null); setModalOpen(true) }
  const openEdit = (r) => {
    setForm({
      type: r.type, percent: r.percent, categoryName: r.categoryName || '',
      productId: r.productId || '', excludedCategories: (r.excludedCategories || []).join(', '),
      description: r.description || '', isActive: r.isActive,
    })
    setEditingId(r._id)
    setModalOpen(true)
  }

  const submit = (e) => {
    e.preventDefault()
    const payload = {
      type: form.type,
      percent: Number(form.percent),
      categoryName: form.type === 'category' ? form.categoryName : null,
      productId: form.type === 'product' ? form.productId : null,
      excludedCategories: form.type === 'global' ? form.excludedCategories.split(',').map((s) => s.trim()).filter(Boolean) : [],
      description: form.description || null,
      isActive: form.isActive,
    }
    const onSuccess = () => setModalOpen(false)
    if (editingId) updateRule.mutate({ id: editingId, ...payload }, { onSuccess })
    else createRule.mutate(payload, { onSuccess })
  }

  const saveConfig = () => {
    updateConfig.mutate({
      cashbackEnabled: configForm.cashbackEnabled,
      cashbackValidityMode: configForm.cashbackValidityMode,
      cashbackFixedExpirationMonth: Number(configForm.cashbackFixedExpirationMonth),
      cashbackFixedExpirationDay: Number(configForm.cashbackFixedExpirationDay),
      cashbackRollingMonths: Number(configForm.cashbackRollingMonths),
      cashbackStackingMode: configForm.cashbackStackingMode,
    })
  }

  if (isLoading || !configForm) return <LoadingSpinner />

  return (
    <>
      {/* Configuração geral */}
      <Card>
        <h3 className="font-semibold text-sm mb-3 flex items-center gap-2"><Settings2 size={15} /> Configuração geral</h3>

        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium">Cashback ativo</span>
          <button type="button" onClick={() => setConfigForm({ ...configForm, cashbackEnabled: !configForm.cashbackEnabled })}
            className={`relative w-11 h-6 rounded-full transition-colors ${configForm.cashbackEnabled ? 'bg-success' : 'bg-gray-300'}`}>
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${configForm.cashbackEnabled ? 'translate-x-5' : ''}`} />
          </button>
        </div>

        <div className="mb-3">
          <label className="label">Se o pedido bater em mais de uma regra</label>
          <select className="input" value={configForm.cashbackStackingMode} onChange={(e) => setConfigForm({ ...configForm, cashbackStackingMode: e.target.value })}>
            <option value="sum">Soma todas as regras que bateram</option>
            <option value="highest">Usa só a de maior percentual</option>
          </select>
        </div>

        <div className="mb-3">
          <label className="label">Validade do saldo acumulado</label>
          <select className="input" value={configForm.cashbackValidityMode} onChange={(e) => setConfigForm({ ...configForm, cashbackValidityMode: e.target.value })}>
            <option value="rolling_months">Expira X meses depois do último ganho</option>
            <option value="fixed_date">Expira numa data fixa todo ano</option>
          </select>
        </div>

        {configForm.cashbackValidityMode === 'rolling_months' ? (
          <Input label="Meses até expirar" type="number" min="1" max="36" value={configForm.cashbackRollingMonths} onChange={(e) => setConfigForm({ ...configForm, cashbackRollingMonths: e.target.value })} />
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <Input label="Mês (1-12)" type="number" min="1" max="12" value={configForm.cashbackFixedExpirationMonth} onChange={(e) => setConfigForm({ ...configForm, cashbackFixedExpirationMonth: e.target.value })} />
            <Input label="Dia (1-31)" type="number" min="1" max="31" value={configForm.cashbackFixedExpirationDay} onChange={(e) => setConfigForm({ ...configForm, cashbackFixedExpirationDay: e.target.value })} />
          </div>
        )}

        <Button full className="mt-3" onClick={saveConfig} loading={updateConfig.isPending}>Salvar configuração</Button>
      </Card>

      <Button full onClick={openNew}><Plus size={16} /> Nova regra de cashback</Button>

      {(!rules || rules.length === 0) ? (
        <EmptyState title="Nenhuma regra criada ainda" description="Crie uma regra pra seus clientes começarem a acumular cashback." />
      ) : (
        <div className="space-y-2">
          {rules.map((r) => (
            <Card key={r._id} onClick={() => openEdit(r)}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-sm">{RULE_TYPE_LABELS[r.type]}</p>
                  <p className="text-xs text-gray-400">
                    {r.percent}% de cashback
                    {r.type === 'category' && r.categoryName && ` — ${r.categoryName}`}
                  </p>
                  {r.description && <p className="text-xs text-gray-400 mt-0.5">{r.description}</p>}
                </div>
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full h-fit ${r.isActive ? 'bg-success/10 text-success' : 'bg-gray-100 text-gray-400'}`}>
                  {r.isActive ? 'Ativa' : 'Inativa'}
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Editar regra' : 'Nova regra de cashback'}>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="label">Tipo de regra</label>
            <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              <option value="global">Todo o cardápio</option>
              <option value="category">Categoria específica</option>
              <option value="product">Produto específico</option>
            </select>
          </div>

          <Input label="Percentual de cashback" type="number" step="1" min="0" max="100" value={form.percent} onChange={(e) => setForm({ ...form, percent: e.target.value })} required />

          {form.type === 'category' && (
            <Input label="Nome da categoria" value={form.categoryName} onChange={(e) => setForm({ ...form, categoryName: e.target.value })} required placeholder="Ex: Pizzas" list="categorias-cashback" />
          )}
          <datalist id="categorias-cashback">
            {(categories || []).map((c) => <option key={c} value={c} />)}
          </datalist>

          {form.type === 'product' && (
            <div>
              <label className="label">Produto</label>
              <select className="input" value={form.productId} onChange={(e) => setForm({ ...form, productId: e.target.value })} required>
                <option value="">Selecione...</option>
                {allProducts.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
              </select>
            </div>
          )}

          {form.type === 'global' && (
            <Input label="Categorias excluídas (opcional)" value={form.excludedCategories} onChange={(e) => setForm({ ...form, excludedCategories: e.target.value })} placeholder="Ex: Bebidas" />
          )}

          <Input label="Descrição (só pra você lembrar)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />

          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Ativa</span>
            <button type="button" onClick={() => setForm({ ...form, isActive: !form.isActive })}
              className={`relative w-11 h-6 rounded-full transition-colors ${form.isActive ? 'bg-success' : 'bg-gray-300'}`}>
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.isActive ? 'translate-x-5' : ''}`} />
            </button>
          </div>

          <Button type="submit" full loading={createRule.isPending || updateRule.isPending}>
            {editingId ? 'Salvar' : 'Criar regra'}
          </Button>

          {editingId && (
            <Button type="button" variant="ghost" full className="text-danger" onClick={() => {
              if (window.confirm('Remover essa regra?')) deleteRule.mutate(editingId, { onSuccess: () => setModalOpen(false) })
            }}>
              <Trash2 size={15} /> Remover regra
            </Button>
          )}
        </form>
      </Modal>
    </>
  )
}
