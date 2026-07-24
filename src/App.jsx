import { useEffect, useState } from 'react'
import { Plus, ClipboardList, LayoutDashboard, ShoppingCart, AlertCircle } from 'lucide-react'
import { supabase, supabaseConfigurado } from './supabaseClient.js'
import NovoPedido from './components/NovoPedido.jsx'
import Compras from './components/Compras.jsx'
import Pedidos from './components/Pedidos.jsx'
import Painel from './components/Painel.jsx'

function TabButton({ icon, label, active, onClick }) {
  return (
    <button onClick={onClick} className={`tab-btn ${active ? 'tab-btn-active' : ''}`}>
      {icon} {label}
    </button>
  )
}

const PEDIDO_SELECT =
  '*, cliente:clientes(id,nome), pedido_itens(*, unidade:unidades(id,nome), metodo_pagamento:metodos_pagamento(id,nome))'

export default function App() {
  const [pedidos, setPedidos] = useState([])
  const [clientes, setClientes] = useState([])
  const [unidades, setUnidades] = useState([])
  const [metodosPagamento, setMetodosPagamento] = useState([])
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [salvandoEdicao, setSalvandoEdicao] = useState(false)
  const [erro, setErro] = useState('')
  const [tab, setTab] = useState('novo')

  async function fetchPedidos() {
    const { data, error } = await supabase
      .from('pedidos')
      .select(PEDIDO_SELECT)
      .order('created_at', { ascending: false })

    if (error) setErro(error.message)
    else {
      setErro('')
      setPedidos(data || [])
    }
  }

  async function fetchListasFixas() {
    const [clientesRes, unidadesRes, metodosRes] = await Promise.all([
      supabase.from('clientes').select('*').eq('ativo', true).order('nome'),
      supabase.from('unidades').select('*').eq('ativo', true).order('nome'),
      supabase.from('metodos_pagamento').select('*').eq('ativo', true).order('nome'),
    ])
    if (clientesRes.error) setErro(clientesRes.error.message)
    else setClientes(clientesRes.data || [])

    if (unidadesRes.error) setErro(unidadesRes.error.message)
    else setUnidades(unidadesRes.data || [])

    if (metodosRes.error) setErro(metodosRes.error.message)
    else setMetodosPagamento(metodosRes.data || [])
  }

  useEffect(() => {
    Promise.all([fetchPedidos(), fetchListasFixas()]).then(() => setLoading(false))
  }, [])

  async function criarPedido(form) {
    setSalvando(true)
    const { data: pedido, error: erroPedido } = await supabase
      .from('pedidos')
      .insert({
        cliente_id: form.cliente_id,
        data_pedido: form.data_pedido,
        data_entrega: form.data_entrega || null,
        obs: form.obs || null,
        status: 'comprando',
      })
      .select()
      .single()

    if (erroPedido) {
      setErro(erroPedido.message)
      setSalvando(false)
      return
    }

    const itensParaInserir = form.itens.map((it) => ({
      pedido_id: pedido.id,
      produto: it.produto,
      quantidade: it.quantidade,
      unidade_id: it.unidade_id,
    }))

    const { error: erroItens } = await supabase.from('pedido_itens').insert(itensParaInserir)
    if (erroItens) setErro(erroItens.message)
    else {
      setErro('')
      setTab('compras')
    }

    await fetchPedidos()
    setSalvando(false)
  }

  async function atualizarItem(itemId, patch) {
    const { error } = await supabase.from('pedido_itens').update(patch).eq('id', itemId)
    if (error) setErro(error.message)
    else setErro('')
    await fetchPedidos()
  }

  // Edita cliente/datas/obs/itens de um pedido ainda em "comprando".
  // Se um item já comprado tiver produto/quantidade/unidade alterados, o
  // preço e a forma de pagamento registrados deixam de valer e são limpos.
  async function editarPedido(pedidoId, form) {
    setSalvandoEdicao(true)

    const { error: erroPedido } = await supabase
      .from('pedidos')
      .update({
        cliente_id: form.cliente_id,
        data_pedido: form.data_pedido,
        data_entrega: form.data_entrega || null,
        obs: form.obs || null,
      })
      .eq('id', pedidoId)

    if (erroPedido) {
      setErro(erroPedido.message)
      setSalvandoEdicao(false)
      return
    }

    const original = pedidos.find((p) => p.id === pedidoId)
    const itensOriginais = original?.pedido_itens || []
    const idsNoForm = new Set(form.itens.filter((it) => it.id).map((it) => it.id))
    const idsRemovidos = itensOriginais.filter((it) => !idsNoForm.has(it.id)).map((it) => it.id)
    const itensNovos = form.itens.filter((it) => !it.id)
    const itensExistentes = form.itens.filter((it) => it.id)

    const operacoes = []

    if (idsRemovidos.length) {
      operacoes.push(supabase.from('pedido_itens').delete().in('id', idsRemovidos))
    }

    if (itensNovos.length) {
      operacoes.push(
        supabase.from('pedido_itens').insert(
          itensNovos.map((it) => ({
            pedido_id: pedidoId,
            produto: it.produto,
            quantidade: it.quantidade,
            unidade_id: it.unidade_id,
          }))
        )
      )
    }

    for (const it of itensExistentes) {
      const itemOriginal = itensOriginais.find((o) => o.id === it.id)
      const mudou =
        itemOriginal.produto !== it.produto ||
        Number(itemOriginal.quantidade) !== Number(it.quantidade) ||
        itemOriginal.unidade_id !== it.unidade_id

      const patch = { produto: it.produto, quantidade: it.quantidade, unidade_id: it.unidade_id }
      if (mudou && itemOriginal.comprado) {
        patch.comprado = false
        patch.preco_compra = null
        patch.metodo_pagamento_id = null
      }
      operacoes.push(supabase.from('pedido_itens').update(patch).eq('id', it.id))
    }

    const resultados = await Promise.all(operacoes)
    const erroOperacao = resultados.find((r) => r.error)?.error
    if (erroOperacao) setErro(erroOperacao.message)
    else setErro('')

    await fetchPedidos()
    setSalvandoEdicao(false)
  }

  async function completarPedido(pedidoId) {
    const { error } = await supabase.from('pedidos').update({ status: 'separado' }).eq('id', pedidoId)
    if (error) setErro(error.message)
    else setErro('')
    await fetchPedidos()
  }

  async function avancarStatus(pedido) {
    const proximo = pedido.status === 'separado' ? 'entregue' : pedido.status
    const { error } = await supabase.from('pedidos').update({ status: proximo }).eq('id', pedido.id)
    if (error) setErro(error.message)
    else setErro('')
    await fetchPedidos()
  }

  async function excluirPedido(id) {
    const { error } = await supabase.from('pedidos').delete().eq('id', id)
    if (error) setErro(error.message)
    else setErro('')
    await fetchPedidos()
  }

  if (!supabaseConfigurado) {
    return (
      <div className="app">
        <div className="card config-warning">
          <AlertCircle size={20} color="#C1443A" />
          <div>
            <h2 className="card-title">Configuração pendente</h2>
            <p>
              Este site ainda não está conectado a um banco de dados. Crie um arquivo <code>.env</code> na raiz do
              projeto (copie de <code>.env.example</code>) com as chaves <code>VITE_SUPABASE_URL</code> e{' '}
              <code>VITE_SUPABASE_ANON_KEY</code> do seu projeto Supabase, ou configure os "Secrets" do repositório
              se estiver publicando pelo GitHub Actions. Veja o <code>README.md</code> para o passo a passo.
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="loading-wrap">
        <div className="loading-text">carregando pedidos…</div>
      </div>
    )
  }

  return (
    <div className="app">
      <header className="header">
        <div>
          <div className="eyebrow">controle de pedidos</div>
          <h1 className="title">Distribuidora</h1>
        </div>
        <nav className="tabs">
          <TabButton icon={<Plus size={16} />} label="Novo pedido" active={tab === 'novo'} onClick={() => setTab('novo')} />
          <TabButton icon={<ShoppingCart size={16} />} label="Compras" active={tab === 'compras'} onClick={() => setTab('compras')} />
          <TabButton icon={<ClipboardList size={16} />} label="Pedidos" active={tab === 'pedidos'} onClick={() => setTab('pedidos')} />
          <TabButton icon={<LayoutDashboard size={16} />} label="Painel" active={tab === 'painel'} onClick={() => setTab('painel')} />
        </nav>
      </header>

      {erro && (
        <div className="banner banner-erro">
          <AlertCircle size={15} /> {erro}
        </div>
      )}

      <main className="main">
        {tab === 'novo' && (
          <NovoPedido onCriarPedido={criarPedido} salvando={salvando} clientes={clientes} unidades={unidades} />
        )}
        {tab === 'compras' && (
          <Compras
            pedidos={pedidos}
            clientes={clientes}
            unidades={unidades}
            metodosPagamento={metodosPagamento}
            salvandoEdicao={salvandoEdicao}
            onAtualizarItem={atualizarItem}
            onCompletarPedido={completarPedido}
            onEditarPedido={editarPedido}
          />
        )}
        {tab === 'pedidos' && (
          <Pedidos pedidos={pedidos} onAvancarStatus={avancarStatus} onExcluirPedido={excluirPedido} />
        )}
        {tab === 'painel' && <Painel pedidos={pedidos} clientes={clientes} metodosPagamento={metodosPagamento} />}
      </main>
    </div>
  )
}
