import { useEffect, useState } from 'react'
import { Plus, ClipboardList, LayoutDashboard, ShoppingCart, AlertCircle, X, Store } from 'lucide-react'
import { supabase, supabaseConfigurado } from './supabaseClient.js'
import { normalizaTexto, metodoEhCredito, todayISO } from './utils.js'
import { ConfirmDialog, Toast } from './components/ui.jsx'
import NovoPedido from './components/NovoPedido.jsx'
import Compras from './components/Compras.jsx'
import Pedidos from './components/Pedidos.jsx'
import Painel from './components/Painel.jsx'
import PortalCliente from './components/PortalCliente.jsx'

// Rota do portal do cliente. É por "#" (e não por caminho) porque o site é
// estático no GitHub Pages: um caminho de verdade daria 404 ao recarregar a
// página, já que não existe servidor pra redirecionar.
const ROTA_PORTAL = '#/portal'

// As abas aparecem em dois lugares: no topo (telas grandes) e numa barra
// fixa embaixo no celular, onde o polegar alcança sem esticar a mão.
// O CSS esconde uma ou outra conforme o tamanho da tela.
const ABAS = [
  { id: 'novo', label: 'Novo pedido', labelCurto: 'Novo', icone: Plus },
  { id: 'compras', label: 'Compras', labelCurto: 'Compras', icone: ShoppingCart },
  { id: 'pedidos', label: 'Pedidos', labelCurto: 'Pedidos', icone: ClipboardList },
  { id: 'painel', label: 'Painel', labelCurto: 'Painel', icone: LayoutDashboard },
]

function TabButton({ icon, label, active, onClick }) {
  return (
    <button onClick={onClick} className={`tab-btn ${active ? 'tab-btn-active' : ''}`}>
      {icon} {label}
    </button>
  )
}

const PEDIDO_SELECT =
  '*, cliente:clientes(id,nome), pedido_itens(*, unidade:unidades(id,nome), metodo_pagamento:metodos_pagamento(id,nome), cartao:cartoes(id,nome))'

export default function App() {
  const [pedidos, setPedidos] = useState([])
  const [clientes, setClientes] = useState([])
  const [unidades, setUnidades] = useState([])
  const [metodosPagamento, setMetodosPagamento] = useState([])
  const [cartoes, setCartoes] = useState([])
  const [produtos, setProdutos] = useState([])
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [salvandoEdicao, setSalvandoEdicao] = useState(false)
  const [erro, setErro] = useState('')
  const [tab, setTab] = useState('novo')
  const [aviso, setAviso] = useState('')
  // Exclusão nunca acontece direto: guarda o que fazer aqui e mostra a
  // confirmação. No celular é fácil demais encostar sem querer num botão.
  const [confirmacao, setConfirmacao] = useState(null)
  const [confirmando, setConfirmando] = useState(false)
  const [rota, setRota] = useState(() => window.location.hash)

  async function fetchPedidos() {
    const { data, error } = await supabase
      .from('pedidos')
      .select(PEDIDO_SELECT)
      .order('created_at', { ascending: false })
      // sem isso os itens voltam em ordem imprevisível a cada consulta, e a
      // lista da aba Compras trocava de ordem no meio do preenchimento
      .order('created_at', { referencedTable: 'pedido_itens', ascending: true })

    if (error) setErro(error.message)
    else {
      setErro('')
      setPedidos(data || [])
    }
  }

  async function fetchListasFixas() {
    const [clientesRes, unidadesRes, metodosRes, cartoesRes, produtosRes] = await Promise.all([
      supabase.from('clientes').select('*').eq('ativo', true).order('nome'),
      supabase.from('unidades').select('*').eq('ativo', true).order('nome'),
      supabase.from('metodos_pagamento').select('*').eq('ativo', true).order('nome'),
      supabase.from('cartoes').select('*').eq('ativo', true).order('nome'),
      supabase.from('produtos').select('*').eq('ativo', true).order('nome'),
    ])
    if (clientesRes.error) setErro(clientesRes.error.message)
    else setClientes(clientesRes.data || [])

    if (unidadesRes.error) setErro(unidadesRes.error.message)
    else setUnidades(unidadesRes.data || [])

    if (metodosRes.error) setErro(metodosRes.error.message)
    else setMetodosPagamento(metodosRes.data || [])

    if (cartoesRes.error) setErro(cartoesRes.error.message)
    else setCartoes(cartoesRes.data || [])

    if (produtosRes.error) setErro(produtosRes.error.message)
    else setProdutos(produtosRes.data || [])
  }

  // Cadastra automaticamente produtos digitados que ainda não existem na
  // lista (comparando sem diferenciar maiúsculas/minúsculas), pra virarem
  // sugestão de autocompletar da próxima vez. Isso é um "bônus" da gravação
  // do pedido — se falhar, não deve travar nem assustar com o banner de erro.
  async function registrarProdutosNovos(nomes, produtosConhecidos) {
    const conhecidos = new Set(produtosConhecidos.map((p) => normalizaTexto(p.nome)))
    const novos = [...new Set(nomes.map((n) => n.trim()).filter(Boolean))].filter(
      (nome) => !conhecidos.has(normalizaTexto(nome))
    )
    if (novos.length === 0) return

    const { data, error } = await supabase
      .from('produtos')
      .insert(novos.map((nome) => ({ nome })))
      .select()

    if (!error && data) setProdutos((prev) => [...prev, ...data])
    // erro aqui normalmente é só uma corrida de digitação (alguém cadastrou
    // o mesmo produto ao mesmo tempo) — não vale a pena mostrar pro usuário
  }

  useEffect(() => {
    Promise.all([fetchPedidos(), fetchListasFixas()]).then(() => setLoading(false))
  }, [])

  useEffect(() => {
    const aoTrocarHash = () => setRota(window.location.hash)
    window.addEventListener('hashchange', aoTrocarHash)
    return () => window.removeEventListener('hashchange', aoTrocarHash)
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
      setAviso('Pedido registrado')
      setTab('compras')
      await registrarProdutosNovos(form.itens.map((it) => it.produto), produtos)
    }

    await fetchPedidos()
    setSalvando(false)
  }

  // Descobre a qual cliente cadastrado um nome digitado se refere. O cliente
  // escreve do jeito dele, então comparamos ignorando acento/maiúscula. Só
  // cadastra um cliente novo quando realmente não existe nenhum parecido —
  // é isso que mantém os filtros e o painel agrupando certo.
  async function resolverClienteId(nomeDigitado) {
    const alvo = normalizaTexto(nomeDigitado)
    const existente = clientes.find((c) => normalizaTexto(c.nome) === alvo)
    if (existente) return existente.id

    const { data, error } = await supabase.from('clientes').insert({ nome: nomeDigitado }).select().single()
    // confere o id de verdade: sem isso, uma resposta fora do formato
    // esperado seguia adiante e o pedido era gravado sem cliente_id
    if (!error && data?.id) {
      setClientes((prev) => [...prev, data].sort((a, b) => (a.nome || '').localeCompare(b.nome || '')))
      return data.id
    }

    // o nome é único no banco: se deu conflito, alguém já cadastrou esse
    // mesmo cliente enquanto isso — então é só buscar o registro existente
    const { data: achado } = await supabase.from('clientes').select('id').ilike('nome', nomeDigitado).maybeSingle()
    if (achado) return achado.id

    throw new Error('Não consegui registrar a empresa. Confira o nome e tente de novo.')
  }

  // Grava um pedido vindo do portal do cliente. Cai como "comprando", igual a
  // um pedido digitado internamente, então aparece na aba Compras na hora.
  async function criarPedidoPortal(dadosPortal) {
    const clienteId = await resolverClienteId(dadosPortal.empresa)
    if (!clienteId) throw new Error('Não consegui identificar a empresa. Tente de novo.')

    const { data: pedido, error: erroPedido } = await supabase
      .from('pedidos')
      .insert({
        cliente_id: clienteId,
        data_pedido: todayISO(),
        data_entrega: dadosPortal.entrega || null,
        obs: dadosPortal.obs || null,
        status: 'comprando',
        origem: 'portal',
        empresa_digitada: dadosPortal.empresa,
        contato_nome: dadosPortal.responsavel,
        contato_telefone: dadosPortal.telefone,
        contato_email: dadosPortal.email || null,
      })
      .select()
      .single()

    if (erroPedido) throw new Error(erroPedido.message)

    const { error: erroItens } = await supabase.from('pedido_itens').insert(
      dadosPortal.itens.map((it) => ({
        pedido_id: pedido.id,
        produto: it.produto,
        quantidade: it.quantidade,
        unidade_id: it.unidade_id,
      }))
    )
    if (erroItens) throw new Error(erroItens.message)

    await registrarProdutosNovos(dadosPortal.itens.map((it) => it.produto), produtos)
    await fetchPedidos()
  }

  // Aplica a mudança na tela na hora e só depois grava. Antes cada toque
  // (marcar comprado, escolher parcela, sair do campo de preço) recarregava
  // a lista inteira de pedidos do banco — no celular com sinal fraco isso
  // dava um engasgo visível a cada interação. Se a gravação falhar, recarrega
  // do banco pra desfazer o que foi mostrado.
  async function atualizarItem(itemId, patch) {
    setPedidos((prev) =>
      prev.map((p) => ({
        ...p,
        pedido_itens: (p.pedido_itens || []).map((it) => (it.id === itemId ? { ...it, ...patch } : it)),
      }))
    )

    const { error } = await supabase.from('pedido_itens').update(patch).eq('id', itemId)
    if (error) {
      setErro(error.message)
      await fetchPedidos()
    } else {
      setErro('')
    }
  }

  async function excluirItem(itemId) {
    const { error } = await supabase.from('pedido_itens').delete().eq('id', itemId)
    if (error) setErro(error.message)
    else {
      setErro('')
      setAviso('Item excluído')
    }
    await fetchPedidos()
  }

  // Edita cliente/datas/obs/itens de um pedido em qualquer status. Preço e
  // forma de pagamento de cada item também são editáveis aqui — mudar um
  // preço reflete em tudo que depende dele (Pedidos, Painel) porque esses
  // valores são sempre lidos direto do banco, não guardados em outro lugar.
  // Um item só continua marcado como "comprado" se, depois da edição, ainda
  // tiver preço E forma de pagamento preenchidos — se algum dos dois for
  // apagado, o item volta a precisar ser comprado de novo.
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
            preco_compra: it.preco_compra,
            metodo_pagamento_id: it.metodo_pagamento_id,
            cartao_id: it.cartao_id,
            parcelas: it.parcelas,
          }))
        )
      )
    }

    for (const it of itensExistentes) {
      const itemOriginal = itensOriginais.find((o) => o.id === it.id)
      const precisaCartao = metodoEhCredito(it.metodo_pagamento_id, metodosPagamento)
      const compradoFinal =
        itemOriginal.comprado &&
        it.preco_compra != null &&
        it.metodo_pagamento_id != null &&
        (!precisaCartao || it.cartao_id != null)

      const patch = {
        produto: it.produto,
        quantidade: it.quantidade,
        unidade_id: it.unidade_id,
        preco_compra: it.preco_compra,
        metodo_pagamento_id: it.metodo_pagamento_id,
        cartao_id: it.cartao_id,
        parcelas: it.parcelas,
        comprado: compradoFinal,
      }
      operacoes.push(supabase.from('pedido_itens').update(patch).eq('id', it.id))
    }

    const resultados = await Promise.all(operacoes)
    const erroOperacao = resultados.find((r) => r.error)?.error
    if (erroOperacao) setErro(erroOperacao.message)
    else {
      setErro('')
      await registrarProdutosNovos(form.itens.map((it) => it.produto), produtos)
    }

    await fetchPedidos()
    setSalvandoEdicao(false)
  }

  async function completarPedido(pedidoId) {
    const { error } = await supabase.from('pedidos').update({ status: 'separado' }).eq('id', pedidoId)
    if (error) setErro(error.message)
    else {
      setErro('')
      setAviso('Pedido movido pra aba Pedidos')
    }
    await fetchPedidos()
  }

  async function avancarStatus(pedido) {
    const proximo = pedido.status === 'separado' ? 'entregue' : pedido.status
    const { error } = await supabase.from('pedidos').update({ status: proximo }).eq('id', pedido.id)
    if (error) setErro(error.message)
    else {
      setErro('')
      setAviso('Pedido marcado como entregue')
    }
    await fetchPedidos()
  }

  async function excluirPedido(id) {
    const { error } = await supabase.from('pedidos').delete().eq('id', id)
    if (error) setErro(error.message)
    else {
      setErro('')
      setAviso('Pedido excluído')
    }
    await fetchPedidos()
  }

  // As telas chamam estas funções no lugar de excluir direto — elas só abrem
  // a confirmação, e a exclusão de verdade só roda se a pessoa confirmar.
  function pedirExclusaoPedido(id) {
    const pedido = pedidos.find((p) => p.id === id)
    const cliente = pedido?.cliente?.nome
    setConfirmacao({
      titulo: 'Excluir este pedido?',
      descricao: `${cliente ? `O pedido de ${cliente}` : 'O pedido'} e todos os seus itens serão apagados. Não dá pra desfazer.`,
      acao: () => excluirPedido(id),
    })
  }

  function pedirExclusaoItem(itemId) {
    const item = pedidos.flatMap((p) => p.pedido_itens || []).find((it) => it.id === itemId)
    setConfirmacao({
      titulo: 'Excluir este item?',
      descricao: item ? `"${item.produto}" sai deste pedido. Não dá pra desfazer.` : 'Não dá pra desfazer.',
      acao: () => excluirItem(itemId),
    })
  }

  async function executarConfirmacao() {
    if (!confirmacao) return
    setConfirmando(true)
    try {
      await confirmacao.acao()
    } finally {
      setConfirmando(false)
      setConfirmacao(null)
    }
  }

  // O portal vem antes das telas de "carregando" e de configuração pendente
  // de propósito: ele é a página do cliente, não deve depender do estado do
  // app interno pra poder ser aberta.
  if (rota === ROTA_PORTAL) {
    return (
      <PortalCliente
        clientes={clientes}
        unidades={unidades}
        produtos={produtos}
        onEnviarPedido={criarPedidoPortal}
        onVoltar={() => {
          window.location.hash = ''
          window.scrollTo({ top: 0 })
        }}
      />
    )
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
          <button
            type="button"
            className="portal-link"
            onClick={() => {
              window.location.hash = ROTA_PORTAL
              window.scrollTo({ top: 0 })
            }}
          >
            <Store size={13} /> Portal do cliente
          </button>
          <div className="eyebrow">controle de pedidos</div>
          <h1 className="title">Distribuidora</h1>
        </div>
        <nav className="tabs">
          {ABAS.map(({ id, label, icone: Icone }) => (
            <TabButton
              key={id}
              icon={<Icone size={16} />}
              label={label}
              active={tab === id}
              onClick={() => setTab(id)}
            />
          ))}
        </nav>
      </header>

      {erro && (
        <div className="banner banner-erro">
          <AlertCircle size={15} />
          <span className="banner-texto">{erro}</span>
          <button type="button" className="banner-fechar" onClick={() => setErro('')} aria-label="Fechar aviso de erro">
            <X size={15} />
          </button>
        </div>
      )}

      <main className="main">
        {tab === 'novo' && (
          <NovoPedido
            onCriarPedido={criarPedido}
            salvando={salvando}
            clientes={clientes}
            unidades={unidades}
            produtos={produtos}
          />
        )}
        {tab === 'compras' && (
          <Compras
            pedidos={pedidos}
            clientes={clientes}
            unidades={unidades}
            metodosPagamento={metodosPagamento}
            cartoes={cartoes}
            produtos={produtos}
            salvandoEdicao={salvandoEdicao}
            onAtualizarItem={atualizarItem}
            onExcluirItem={pedirExclusaoItem}
            onCompletarPedido={completarPedido}
            onExcluirPedido={pedirExclusaoPedido}
            onEditarPedido={editarPedido}
          />
        )}
        {tab === 'pedidos' && (
          <Pedidos
            pedidos={pedidos}
            clientes={clientes}
            unidades={unidades}
            metodosPagamento={metodosPagamento}
            cartoes={cartoes}
            produtos={produtos}
            salvandoEdicao={salvandoEdicao}
            onAvancarStatus={avancarStatus}
            onExcluirPedido={pedirExclusaoPedido}
            onEditarPedido={editarPedido}
          />
        )}
        {tab === 'painel' && <Painel pedidos={pedidos} clientes={clientes} metodosPagamento={metodosPagamento} />}
      </main>

      <nav className="bottom-nav">
        {ABAS.map(({ id, labelCurto, icone: Icone }) => (
          <button
            key={id}
            type="button"
            className={`bottom-nav-btn ${tab === id ? 'bottom-nav-btn-active' : ''}`}
            onClick={() => setTab(id)}
            aria-current={tab === id ? 'page' : undefined}
          >
            <Icone size={20} />
            <span>{labelCurto}</span>
          </button>
        ))}
      </nav>

      <Toast mensagem={aviso} onFechar={() => setAviso('')} />

      {confirmacao && (
        <ConfirmDialog
          titulo={confirmacao.titulo}
          descricao={confirmacao.descricao}
          ocupado={confirmando}
          onConfirmar={executarConfirmacao}
          onCancelar={() => setConfirmacao(null)}
        />
      )}
    </div>
  )
}
