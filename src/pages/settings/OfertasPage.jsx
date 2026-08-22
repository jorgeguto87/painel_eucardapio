import { useState, useEffect } from 'react'
import { Plus, Trash2, Ticket, Wallet, Settings2, ChevronRight } from 'lucide-react'
import TopBar from '../../components/layout/TopBar'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Modal from '../../components/ui/Modal'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import EmptyState from '../../components/ui/EmptyState'
import CategoryProductPicker from '../../components/ui/CategoryProductPicker'
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
  code: '', description: '', type: 'percentage', discountValue: '', freeProductId: '', freeProductName: '',
  usesCategories: false, applicableCategories: [],
  usesProducts: false, applicableProducts: [], applicableProductNames: [],
  usesMinOrder: false, minOrderValue: '',
  stackableWithCashback: true,
  expiresAt: '', maxUses: '',
}

const emptyRule = { type: 'global', percent: '', categoryName: '', productId: '', productName: '', excludedCategories: '', description: '' }

const defaultConfigForm = {
  cashbackEnabled: false,
  cashbackValidityMode: 'rolling_months',
  cashbackFixedExpirationMonth: 12,
  cashbackFixedExpirationDay: 31,
  cashbackRollingMonths: 6,
  cashbackStackingMode: 'sum',
}

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

// ─── Cupons — EXATAMENTE como já estava, nenhuma mudança de comportamento ──

function CouponsTab() {
  const createCoupon = useCreateCoupon()
  const updateCoupon = useUpdateCoupon()
  const deleteCoupon = useDeleteCoupon()

  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyCoupon)
  const [pickerOpen, setPickerOpen] = useState(null) // 'freeProduct' | 'categories' | 'products' | null

  const allProducts = Object.values(products || {}).flat()
  const productsById = Object.fromEntries(allProducts.map((p) => [p._id, p]))

  const openNew = () => { setForm(emptyCoupon); setEditingId(null); setModalOpen(true) }
  const openEdit = (c) => {
    setForm({
      code: c.code, description: c.description || '', type: c.type,
      discountValue: c.type === 'percentage' ? c.discountValue : toReais(c.discountValue),
      freeProductId: c.freeProductId || '',
      freeProductName: productsById[c.freeProductId]?.name || '',
      usesCategories: (c.applicableCategories || []).length > 0,
      applicableCategories: c.applicableCategories || [],
      usesProducts: (c.applicableProducts || []).length > 0,
      applicableProducts: c.applicableProducts || [],
      usesMinOrder: !!c.minOrderValue,
      minOrderValue: c.minOrderValue ? toReais(c.minOrderValue) : '',
      stackableWithCashback: c.stackableWithCashback,
      expiresAt: c.expiresAt ? c.expiresAt.slice(0, 10) : '',
      maxUses: c.maxUses || '',
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
      applicableCategories: form.usesCategories ? form.applicableCategories : [],
      applicableProducts: form.usesProducts ? form.applicableProducts : [],
      stackableWithCashback: form.stackableWithCashback,
      minOrderValue: form.usesMinOrder && form.minOrderValue ? toCents(form.minOrderValue) : 0,
      expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
      maxUses: form.maxUses ? Number(form.maxUses) : null,
    }
    const onSuccess = () => setModalOpen(false)
    if (editingId) updateCoupon.mutate({ id: editingId, ...payload }, { onSuccess })
    else createCoupon.mutate(payload, { onSuccess })
  }

  const toggleActive = (c, e) => {
    e.stopPropagation()
    updateCoupon.mutate({ id: c._id, isActive: !c.isActive })
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
                  <p className="text-xs text-gray-400 mt-0.5">{c.usedCount} uso(s)</p>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <button
                    type="button"
                    onClick={(e) => toggleActive(c, e)}
                    className={`relative w-10 h-5.5 rounded-full transition-colors ${c.isActive ? 'bg-success' : 'bg-gray-300'}`}
                    title={c.isActive ? 'Ativo — toque para desativar' : 'Inativo — toque para ativar'}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-4.5 h-4.5 bg-white rounded-full shadow transition-transform ${c.isActive ? 'translate-x-4.5' : ''}`} />
                  </button>
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
              <button
                type="button"
                onClick={() => setPickerOpen('freeProduct')}
                className="input flex items-center justify-between text-left"
              >
                <span className={form.freeProductName ? 'text-secondary' : 'text-gray-400'}>
                  {form.freeProductName || 'Selecione o produto...'}
                </span>
                <ChevronRight size={16} className="text-gray-300" />
              </button>
            </div>
          )}

          <div className="space-y-2">
            <label className="label">Regras do cupom (opcional — combine quantas quiser)</label>

            <button
              type="button"
              onClick={() => setForm({ ...form, usesCategories: !form.usesCategories })}
              className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition-colors ${form.usesCategories ? 'border-primary bg-primary/5' : 'border-gray-200'}`}
            >
              <span className="text-sm font-medium">Categorias específicas</span>
              <span className={`grid size-5 shrink-0 place-items-center rounded-md border-2 ${form.usesCategories ? 'border-primary bg-primary' : 'border-gray-300'}`}>
                {form.usesCategories && <span className="size-2 rounded-sm bg-white" />}
              </span>
            </button>
            {form.usesCategories && (
              <button
                type="button"
                onClick={() => setPickerOpen('categories')}
                className="ml-2 w-[calc(100%-8px)] rounded-lg bg-bg px-4 py-2.5 text-left text-xs font-medium text-gray-500"
              >
                {form.applicableCategories.length > 0
                  ? `${form.applicableCategories.length} categoria(s): ${form.applicableCategories.join(', ')}`
                  : 'Toque para escolher as categorias...'}
              </button>
            )}

            <button
              type="button"
              onClick={() => setForm({ ...form, usesProducts: !form.usesProducts })}
              className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition-colors ${form.usesProducts ? 'border-primary bg-primary/5' : 'border-gray-200'}`}
            >
              <span className="text-sm font-medium">Produtos específicos</span>
              <span className={`grid size-5 shrink-0 place-items-center rounded-md border-2 ${form.usesProducts ? 'border-primary bg-primary' : 'border-gray-300'}`}>
                {form.usesProducts && <span className="size-2 rounded-sm bg-white" />}
              </span>
            </button>
            {form.usesProducts && (
              <button
                type="button"
                onClick={() => setPickerOpen('products')}
                className="ml-2 w-[calc(100%-8px)] rounded-lg bg-bg px-4 py-2.5 text-left text-xs font-medium text-gray-500"
              >
                {form.applicableProducts.length > 0
                  ? `${form.applicableProducts.length} produto(s) selecionado(s)`
                  : 'Toque para escolher os produtos...'}
              </button>
            )}

            <button
              type="button"
              onClick={() => setForm({ ...form, usesMinOrder: !form.usesMinOrder })}
              className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition-colors ${form.usesMinOrder ? 'border-primary bg-primary/5' : 'border-gray-200'}`}
            >
              <span className="text-sm font-medium">Valor mínimo da compra</span>
              <span className={`grid size-5 shrink-0 place-items-center rounded-md border-2 ${form.usesMinOrder ? 'border-primary bg-primary' : 'border-gray-300'}`}>
                {form.usesMinOrder && <span className="size-2 rounded-sm bg-white" />}
              </span>
            </button>
            {form.usesMinOrder && (
              <div className="ml-2">
                <Input type="number" step="0.01" min="0" placeholder="R$ 0,00" value={form.minOrderValue} onChange={(e) => setForm({ ...form, minOrderValue: e.target.value })} />
              </div>
            )}
          </div>

          <Input label="Validade (opcional — some sozinho depois de vencer)" type="date" value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} />
          <Input label="Limite total de usos (opcional)" type="number" min="1" value={form.maxUses} onChange={(e) => setForm({ ...form, maxUses: e.target.value })} />

          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Pode ser usado junto com cashback?</span>
            <button type="button" onClick={() => setForm({ ...form, stackableWithCashback: !form.stackableWithCashback })}
              className={`relative w-11 h-6 rounded-full transition-colors ${form.stackableWithCashback ? 'bg-success' : 'bg-gray-300'}`}>
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.stackableWithCashback ? 'translate-x-5' : ''}`} />
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

      <CategoryProductPicker
        open={pickerOpen === 'freeProduct'}
        onClose={() => setPickerOpen(null)}
        title="Escolher item grátis"
        mode="products"
        multiple={false}
        categories={Object.keys(products || {})}
        productsByCategory={products || {}}
        selected={form.freeProductId ? [form.freeProductId] : []}
        onConfirm={(picked) => setForm({ ...form, freeProductId: picked[0] || '', freeProductName: productsById[picked[0]]?.name || '' })}
      />
      <CategoryProductPicker
        open={pickerOpen === 'categories'}
        onClose={() => setPickerOpen(null)}
        title="Escolher categorias"
        mode="categories"
        categories={categories || []}
        selected={form.applicableCategories}
        onConfirm={(picked) => setForm({ ...form, applicableCategories: picked })}
      />
      <CategoryProductPicker
        open={pickerOpen === 'products'}
        onClose={() => setPickerOpen(null)}
        title="Escolher produtos"
        mode="products"
        categories={Object.keys(products || {})}
        productsByCategory={products || {}}
        selected={form.applicableProducts}
        onConfirm={(picked) => setForm({ ...form, applicableProducts: picked })}
      />
    </>
  )
}

// ─── Cashback — layout limpo: botão + lista, config geral vira ícone separado

function CashbackTab() {
  const { data: config, isLoading: configLoading } = useCashbackConfig()
  const { data: categories } = useProductCategories()
  const { data: products } = useProducts()
  const createRule = useCreateCashbackRule()
  const updateRule = useUpdateCashbackRule()
  const deleteRule = useDeleteCashbackRule()
  const updateConfig = useUpdateCashbackConfig()

  const allProducts = Object.values(products || {}).flat()
  const productsById = Object.fromEntries(allProducts.map((p) => [p._id, p]))

  const [modalOpen, setModalOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyRule)
  const [pickerOpen, setPickerOpen] = useState(null)
  const [configForm, setConfigForm] = useState(null)

  // Antes, se a config ainda não existisse pro restaurante (ou a busca
  // falhasse por qualquer motivo), configForm nunca era preenchido e a
  // tela ficava presa em "carregando" pra sempre. Agora, assim que a
  // busca termina (sucesso OU erro), preenche com o que veio, ou com
  // valores padrão sensatos se não veio nada.
  useEffect(() => {
    if (!configLoading && !configForm) setConfigForm({ ...defaultConfigForm, ...(config || {}) })
  }, [config, configLoading])

  const openNew = () => { setForm(emptyRule); setEditingId(null); setModalOpen(true) }
  const openEdit = (r) => {
    setForm({
      type: r.type, percent: r.percent, categoryName: r.categoryName || '',
      productId: r.productId || '', productName: productsById[r.productId]?.name || '',
      excludedCategories: (r.excludedCategories || []).join(', '),
      description: r.description || '',
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
    }
    const onSuccess = () => setModalOpen(false)
    if (editingId) updateRule.mutate({ id: editingId, ...payload }, { onSuccess })
    else createRule.mutate(payload, { onSuccess })
  }

  const toggleRuleActive = (r, e) => {
    e.stopPropagation()
    updateRule.mutate({ id: r._id, isActive: !r.isActive })
  }

  const saveConfig = () => {
    updateConfig.mutate({
      cashbackEnabled: configForm.cashbackEnabled,
      cashbackValidityMode: configForm.cashbackValidityMode,
      cashbackFixedExpirationMonth: Number(configForm.cashbackFixedExpirationMonth),
      cashbackFixedExpirationDay: Number(configForm.cashbackFixedExpirationDay),
      cashbackRollingMonths: Number(configForm.cashbackRollingMonths),
      cashbackStackingMode: configForm.cashbackStackingMode,
    }, { onSuccess: () => setSettingsOpen(false) })
  }

  if (isLoading || configLoading || !configForm) return <LoadingSpinner />

  return (
    <>
      <div className="flex items-center justify-between -mt-1 mb-1">
        <p className="text-xs text-gray-400">Regras de acúmulo de cashback</p>
        <button
          type="button"
          onClick={() => setSettingsOpen(true)}
          className="p-2 rounded-xl text-gray-500 hover:bg-gray-100"
          title="Configurações gerais de cashback"
        >
          <Settings2 size={18} />
        </button>
      </div>

      <>
        {!configForm.cashbackEnabled && (
          <Card className="border border-warning/30 bg-warning/5">
            <p className="text-sm text-warning font-medium">Cashback desativado</p>
            <p className="text-xs text-gray-500 mt-0.5">Toque no ícone de engrenagem acima pra ativar antes de criar regras.</p>
          </Card>
        )}

        <Button full onClick={openNew}><Plus size={16} /> Criar novo cashback</Button>

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
                      {r.type === 'product' && productsById[r.productId] && ` — ${productsById[r.productId].name}`}
                    </p>
                    {r.description && <p className="text-xs text-gray-400 mt-0.5">{r.description}</p>}
                  </div>
                  <button
                    type="button"
                    onClick={(e) => toggleRuleActive(r, e)}
                    className={`relative w-10 h-5.5 rounded-full transition-colors shrink-0 ${r.isActive ? 'bg-success' : 'bg-gray-300'}`}
                    title={r.isActive ? 'Ativa — toque para desativar' : 'Inativa — toque para ativar'}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-4.5 h-4.5 bg-white rounded-full shadow transition-transform ${r.isActive ? 'translate-x-4.5' : ''}`} />
                  </button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </>

      {/* Criar/editar uma regra — só o que define ESSA regra específica */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Editar cashback' : 'Criar novo cashback'}>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="label">Vale para</label>
            <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              <option value="global">Todo o cardápio</option>
              <option value="category">Categoria específica</option>
              <option value="product">Produto específico</option>
            </select>
          </div>

          <Input label="Percentual de cashback" type="number" step="1" min="0" max="100" value={form.percent} onChange={(e) => setForm({ ...form, percent: e.target.value })} required />

          {form.type === 'category' && (
            <div>
              <label className="label">Categoria</label>
              <button type="button" onClick={() => setPickerOpen('category')} className="input flex items-center justify-between text-left">
                <span className={form.categoryName ? 'text-secondary' : 'text-gray-400'}>{form.categoryName || 'Selecione a categoria...'}</span>
                <ChevronRight size={16} className="text-gray-300" />
              </button>
            </div>
          )}

          {form.type === 'product' && (
            <div>
              <label className="label">Produto</label>
              <button type="button" onClick={() => setPickerOpen('product')} className="input flex items-center justify-between text-left">
                <span className={form.productName ? 'text-secondary' : 'text-gray-400'}>{form.productName || 'Selecione o produto...'}</span>
                <ChevronRight size={16} className="text-gray-300" />
              </button>
            </div>
          )}

          {form.type === 'global' && (
            <Input label="Categorias excluídas (opcional)" value={form.excludedCategories} onChange={(e) => setForm({ ...form, excludedCategories: e.target.value })} placeholder="Ex: Bebidas" />
          )}

          <Input label="Descrição (só pra você lembrar)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />

          <Button type="submit" full loading={createRule.isPending || updateRule.isPending}>
            {editingId ? 'Salvar' : 'Criar cashback'}
          </Button>

          {editingId && (
            <Button type="button" variant="ghost" full className="text-danger" onClick={() => {
              if (window.confirm('Remover esse cashback?')) deleteRule.mutate(editingId, { onSuccess: () => setModalOpen(false) })
            }}>
              <Trash2 size={15} /> Remover
            </Button>
          )}
        </form>
      </Modal>

      {/* Configurações gerais — validade e empilhamento, separado da criação de regras */}
      <Modal open={settingsOpen} onClose={() => setSettingsOpen(false)} title="Configurações gerais de cashback">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Cashback ativo</span>
            <button type="button" onClick={() => setConfigForm({ ...configForm, cashbackEnabled: !configForm.cashbackEnabled })}
              className={`relative w-11 h-6 rounded-full transition-colors ${configForm.cashbackEnabled ? 'bg-success' : 'bg-gray-300'}`}>
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${configForm.cashbackEnabled ? 'translate-x-5' : ''}`} />
            </button>
          </div>

          <div>
            <label className="label">Se o pedido bater em mais de uma regra</label>
            <select className="input" value={configForm.cashbackStackingMode} onChange={(e) => setConfigForm({ ...configForm, cashbackStackingMode: e.target.value })}>
              <option value="sum">Soma todas as regras que bateram</option>
              <option value="highest">Usa só a de maior percentual</option>
            </select>
          </div>

          <div>
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

          <Button full onClick={saveConfig} loading={updateConfig.isPending}>Salvar configuração</Button>
        </div>
      </Modal>

      <CategoryProductPicker
        open={pickerOpen === 'category'}
        onClose={() => setPickerOpen(null)}
        title="Escolher categoria"
        mode="categories"
        multiple={false}
        categories={categories || []}
        selected={form.categoryName ? [form.categoryName] : []}
        onConfirm={(picked) => setForm({ ...form, categoryName: picked[0] || '' })}
      />
      <CategoryProductPicker
        open={pickerOpen === 'product'}
        onClose={() => setPickerOpen(null)}
        title="Escolher produto"
        mode="products"
        multiple={false}
        categories={Object.keys(products || {})}
        productsByCategory={products || {}}
        selected={form.productId ? [form.productId] : []}
        onConfirm={(picked) => setForm({ ...form, productId: picked[0] || '', productName: productsById[picked[0]]?.name || '' })}
      />
    </>
  )
}
