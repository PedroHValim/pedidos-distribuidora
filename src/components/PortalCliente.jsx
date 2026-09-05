import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  CheckCircle2,
  ClipboardList,
  Clock,
  Heart,
  History,
  PackageCheck,
  RefreshCw,
  Lock,
  LogOut,
  Mail,
  MapPin,
  Phone,
  Plus,
  ShieldCheck,
  Sparkles,
  Trash2,
  Truck,
  UserRound,
} from 'lucide-react'
import { normalizaTexto, todayISO, unidadePadraoId } from '../utils.js'
import '../portal.css'

// Página voltada pro CLIENTE fazer o próprio pedido, em vez de mandar
// mensagem no WhatsApp pra alguém digitar depois. É outro produto visual do
// app interno: azul/branco, tom institucional, e o formulário é o centro da
// página. O pedido gravado aqui cai direto na aba "Compras" do app interno.

const ETAPAS = [
  { n: 1, titulo: 'Seus dados', icone: UserRound },
  { n: 2, titulo: 'Itens do pedido', icone: ClipboardList },
  { n: 3, titulo: 'Revisão', icone: CheckCircle2 },
]

const itemVazio = (unidadeId) => ({ produto: '', quantidade: '', unidade_id: unidadeId })

// Tela de entrar / criar acesso. Fica no lugar do formulário enquanto a
// empresa não estiver identificada: sem isso, qualquer visitante mandaria
// pedido em nome de quem quisesse. Antes existia um autocompletar do nome da
// empresa aqui, que foi removido de propósito — ele sugeria os clientes já
// cadastrados e acabava mostrando a carteira de clientes pra quem digitasse
// qualquer letra.
function AcessoPortal({ onAutenticar }) {
  const [modo, setModo] = useState('entrar')
  const [empresa, setEmpresa] = useState('')
  const [empresaConfirma, setEmpresaConfirma] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [ocupado, setOcupado] = useState(false)
  // trava síncrona contra toque duplo: o `ocupado` do estado só vale no
  // próximo render, então dois toques rápidos passavam os dois pela checagem
  // e disparavam duas requisições (dois cadastros, no pior caso)
  const enviandoRef = useRef(false)

  const ehCadastro = modo === 'cadastrar'

  function trocarModo(novo) {
    setModo(novo)
    setErro('')
    setEmpresaConfirma('')
    setSenha('')
  }

  async function enviar(e) {
    e.preventDefault()
    if (enviandoRef.current) return
    setErro('')

    if (!empresa.trim()) return setErro('Informe o nome da empresa.')
    if (ehCadastro && normalizaTexto(empresa) !== normalizaTexto(empresaConfirma)) {
      return setErro('Os dois nomes de empresa precisam ser iguais.')
    }
    if (senha.length < 6) return setErro('A senha precisa ter pelo menos 6 caracteres.')

    enviandoRef.current = true
    setOcupado(true)
    try {
      await onAutenticar(ehCadastro ? 'cadastrar' : 'entrar', empresa.trim(), senha)
    } catch (err) {
      setErro(err?.message || 'Não consegui completar. Tente de novo.')
    } finally {
      enviandoRef.current = false
      setOcupado(false)
    }
  }

  return (
    <form className="rav-card-form rav-acesso" onSubmit={enviar}>
      <div className="rav-acesso-abas">
        <button
          type="button"
          className={`rav-acesso-aba ${!ehCadastro ? 'rav-acesso-aba-ativa' : ''}`}
          onClick={() => trocarModo('entrar')}
        >
          Entrar
        </button>
        <button
          type="button"
          className={`rav-acesso-aba ${ehCadastro ? 'rav-acesso-aba-ativa' : ''}`}
          onClick={() => trocarModo('cadastrar')}
        >
          Criar acesso
        </button>
      </div>

      <p className="rav-acesso-texto">
        {ehCadastro
          ? 'Cadastre o nome da sua empresa e uma senha. Você vai usar os dois sempre que for fazer um pedido.'
          : 'Entre com o nome da sua empresa e a senha que você cadastrou.'}
      </p>

      <label className="rav-campo">
        <span>
          Nome da empresa <em>*</em>
        </span>
        <input
          className="rav-input"
          value={empresa}
          onChange={(e) => setEmpresa(e.target.value)}
          placeholder="Como sua empresa é conhecida"
          autoComplete="organization"
        />
      </label>

      {ehCadastro && (
        <label className="rav-campo">
          <span>
            Confirme o nome da empresa <em>*</em>
          </span>
          <input
            className="rav-input"
            value={empresaConfirma}
            onChange={(e) => setEmpresaConfirma(e.target.value)}
            placeholder="Digite de novo, igual"
            autoComplete="off"
          />
        </label>
      )}

      <label className="rav-campo">
        <span>
          Senha <em>*</em>
        </span>
        <input
          className="rav-input"
          type="password"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          placeholder={ehCadastro ? 'Mínimo de 6 caracteres' : 'Sua senha'}
          autoComplete={ehCadastro ? 'new-password' : 'current-password'}
        />
      </label>

      {erro && <p className="rav-erro">{erro}</p>}

      <button type="submit" className="rav-btn rav-btn-primario rav-acesso-btn" disabled={ocupado}>
        {ocupado ? 'Aguarde…' : ehCadastro ? 'Criar acesso' : 'Entrar'}
        {!ocupado && <ArrowRight size={16} />}
      </button>

      <p className="rav-acesso-rodape">
        <Lock size={12} /> Sua senha é guardada criptografada. Não pedimos CNPJ nem dados bancários.
      </p>
    </form>
  )
}

// Histórico da empresa logada. Os valores NÃO aparecem de propósito: os
// únicos preços que o sistema guarda são os de compra (o que a RAV pagou ao
// fornecedor), e isso é margem — não pode chegar ao cliente. A situação
// também vem traduzida pela função, sem o "comprando" interno.
function HistoricoPedidos({ onBuscarPedidos, recarregar }) {
  const [pedidos, setPedidos] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  const carregar = useCallback(async () => {
    setCarregando(true)
    setErro('')
    try {
      setPedidos(await onBuscarPedidos())
    } catch (err) {
      setErro(err?.message || 'Não consegui carregar seus pedidos.')
    } finally {
      setCarregando(false)
    }
  }, [onBuscarPedidos])

  useEffect(() => {
    carregar()
  }, [carregar, recarregar])

  return (
    <section id="historico" className="rav-secao rav-secao-clara">
      <div className="rav-container">
        <div className="rav-historico-topo">
          <div>
            <span className="rav-secao-eyebrow">Seus pedidos</span>
            <h2 className="rav-secao-titulo">Histórico</h2>
          </div>
          <button type="button" className="rav-btn rav-btn-fantasma rav-btn-sm" onClick={carregar} disabled={carregando}>
            <RefreshCw size={15} /> Atualizar
          </button>
        </div>

        {erro && <p className="rav-erro">{erro}</p>}

        {carregando && !erro && <p className="rav-historico-vazio">Carregando seus pedidos…</p>}

        {!carregando && !erro && pedidos.length === 0 && (
          <p className="rav-historico-vazio">
            Você ainda não fez nenhum pedido por aqui. Assim que fizer o primeiro, ele aparece nesta lista.
          </p>
        )}

        {!carregando && pedidos.length > 0 && (
          <ul className="rav-historico">
            {pedidos.map((p) => (
              <li key={p.id} className="rav-historico-card">
                <div className="rav-historico-cabecalho">
                  <div>
                    <strong>{p.data_pedido ? p.data_pedido.split('-').reverse().join('/') : ''}</strong>
                    {p.data_entrega && (
                      <span className="rav-historico-entrega">
                        entrega {p.data_entrega.split('-').reverse().join('/')}
                      </span>
                    )}
                  </div>
                  <span className={`rav-situacao ${p.entregue ? 'rav-situacao-ok' : ''}`}>
                    {p.entregue ? <PackageCheck size={12} /> : <Clock size={12} />} {p.situacao}
                  </span>
                </div>

                <ul className="rav-historico-itens">
                  {p.itens.map((it) => (
                    <li key={it.id}>
                      <span>{it.produto}</span>
                      <span className="rav-resumo-qtd">
                        {it.quantidade} {(it.unidade || '').toLowerCase()}
                      </span>
                    </li>
                  ))}
                </ul>

                {p.obs && <p className="rav-historico-obs">{p.obs}</p>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}

export default function PortalCliente({
  sessao,
  unidades = [],
  produtos = [],
  onAutenticar,
  onSair,
  onBuscarPedidos,
  onEnviarPedido,
}) {
  // O portal e o app interno moram no mesmo endereço, e o manifest do PWA
  // fica na raiz apontando pra lá (start_url "./"). Sem isto, um cliente que
  // aceitasse "Adicionar à Tela de Início" no celular acabaria com um ícone
  // chamado "Pedidos — Distribuidora" que abre o app interno. Enquanto o
  // portal não tiver endereço próprio, tiramos o manifest da página dele —
  // assim o navegador não oferece a instalação — e ajustamos o título da aba.
  useEffect(() => {
    const tituloAnterior = document.title
    document.title = 'RAV Distribuidora — Faça seu pedido'

    const link = document.querySelector('link[rel="manifest"]')
    const pai = link?.parentNode
    if (link && pai) pai.removeChild(link)

    return () => {
      document.title = tituloAnterior
      if (link && pai) pai.appendChild(link)
    }
  }, [])

  // muda depois de cada pedido enviado, pra o histórico recarregar sozinho
  const [versaoHistorico, setVersaoHistorico] = useState(0)
  // trava síncrona contra toque duplo — sem ela, dois toques rápidos no
  // "Enviar pedido" gravavam o mesmo pedido duas vezes
  const enviandoPedidoRef = useRef(false)
  const unidadeIdPadrao = unidadePadraoId(unidades)

  const [etapa, setEtapa] = useState(1)
  const [dados, setDados] = useState({
    responsavel: '',
    telefone: '',
    email: '',
    entrega: '',
  })
  const [itens, setItens] = useState([itemVazio('')])
  const [obs, setObs] = useState('')
  const [enviado, setEnviado] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [erroEnvio, setErroEnvio] = useState('')
  const [tentouAvancar, setTentouAvancar] = useState(false)
  const [resumoEnviado, setResumoEnviado] = useState(null)

  function setCampo(campo, valor) {
    setDados((d) => ({ ...d, [campo]: valor }))
  }
  function setItem(idx, campo, valor) {
    setItens((lista) => lista.map((it, i) => (i === idx ? { ...it, [campo]: valor } : it)))
  }
  function addItem() {
    setItens((lista) => [...lista, itemVazio(unidadeIdPadrao)])
  }
  function removeItem(idx) {
    setItens((lista) => (lista.length > 1 ? lista.filter((_, i) => i !== idx) : lista))
  }

  const dadosOk = dados.responsavel.trim() && dados.telefone.trim()
  const itensValidos = useMemo(
    () => itens.filter((it) => it.produto.trim() && Number(it.quantidade) > 0 && it.unidade_id),
    [itens]
  )
  const itensOk = itensValidos.length > 0

  function nomeUnidade(id) {
    return unidades.find((u) => u.id === id)?.nome || ''
  }

  function avancar() {
    setTentouAvancar(true)
    if (etapa === 1 && !dadosOk) return
    if (etapa === 2 && !itensOk) return
    setTentouAvancar(false)
    setEtapa((e) => Math.min(3, e + 1))
    document.getElementById('pedido')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
  function voltarEtapa() {
    setTentouAvancar(false)
    setErroEnvio('')
    setEtapa((e) => Math.max(1, e - 1))
    document.getElementById('pedido')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  async function enviar() {
    if (enviandoPedidoRef.current) return
    enviandoPedidoRef.current = true
    setErroEnvio('')
    setEnviando(true)
    try {
      await onEnviarPedido({
        responsavel: dados.responsavel.trim(),
        telefone: dados.telefone.trim(),
        email: dados.email.trim(),
        entrega: dados.entrega,
        obs: obs.trim(),
        itens: itensValidos.map((it) => ({
          produto: it.produto.trim(),
          quantidade: Number(it.quantidade),
          unidade_id: it.unidade_id,
        })),
      })
      // guarda o resumo antes de limpar, pra mostrar na tela de confirmação
      setResumoEnviado({
        empresa: sessao?.nome_empresa || '',
        telefone: dados.telefone.trim(),
        itens: itensValidos.map((it) => ({
          produto: it.produto.trim(),
          quantidade: it.quantidade,
          unidade: nomeUnidade(it.unidade_id),
        })),
      })
      setEnviado(true)
      setVersaoHistorico((v) => v + 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err) {
      setErroEnvio(err?.message || 'Não consegui enviar o pedido. Tente de novo em instantes.')
    } finally {
      enviandoPedidoRef.current = false
      setEnviando(false)
    }
  }

  function novoPedido() {
    setEnviado(false)
    setResumoEnviado(null)
    setEtapa(1)
    setItens([itemVazio(unidadeIdPadrao)])
    setObs('')
    setErroEnvio('')
    setDados({ responsavel: '', telefone: '', email: '', entrega: '' })
  }

  function irPara(id) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  // Se as unidades ainda não carregaram, o pedido não tem como ser gravado
  // (a tabela exige a unidade de cada item), então avisamos em vez de deixar
  // a pessoa preencher tudo e falhar no fim.
  const semUnidades = unidades.length === 0

  return (
    <div className="rav">
      <header className="rav-topbar">
        <div className="rav-container rav-topbar-inner">
          <button type="button" className="rav-logo" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <span className="rav-logo-marca">RAV</span>
            <span className="rav-logo-sub">Distribuidora</span>
          </button>

          <nav className="rav-nav">
            {sessao && (
              <button type="button" onClick={() => irPara('historico')}>
                <History size={14} /> Meus pedidos
              </button>
            )}
            <button type="button" onClick={() => irPara('sobre')}>
              A empresa
            </button>
            <button type="button" onClick={() => irPara('como')}>
              Como funciona
            </button>
            <button type="button" onClick={() => irPara('contato')}>
              Contato
            </button>
          </nav>

          <div className="rav-topbar-acoes">
            {sessao ? (
              <>
                <span className="rav-logado" title={sessao.nome_empresa}>
                  <Building2 size={13} /> {sessao.nome_empresa}
                </span>
                <button type="button" className="rav-sair" onClick={onSair} title="Sair da conta">
                  <LogOut size={14} />
                </button>
              </>
            ) : (
              <button type="button" className="rav-btn rav-btn-primario rav-btn-sm" onClick={() => irPara('pedido')}>
                Fazer pedido
              </button>
            )}
          </div>
        </div>
      </header>

      {enviado && resumoEnviado ? (
        <main className="rav-container rav-sucesso">
          <div className="rav-sucesso-icone">
            <Check size={30} />
          </div>
          <h1>Pedido enviado!</h1>
          <p className="rav-sucesso-texto">
            Recebemos o pedido de <strong>{resumoEnviado.empresa}</strong> com {resumoEnviado.itens.length}{' '}
            {resumoEnviado.itens.length === 1 ? 'item' : 'itens'}. Nossa equipe vai conferir a disponibilidade e entrar
            em contato pelo telefone <strong>{resumoEnviado.telefone}</strong> para confirmar prazo e valores.
          </p>
          <div className="rav-sucesso-resumo">
            <span className="rav-resumo-titulo">Resumo do pedido</span>
            <ul>
              {resumoEnviado.itens.map((it, i) => (
                <li key={i}>
                  <span>{it.produto}</span>
                  <span className="rav-resumo-qtd">
                    {it.quantidade} {it.unidade.toLowerCase()}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <button type="button" className="rav-btn rav-btn-primario" onClick={novoPedido}>
            Fazer outro pedido
          </button>
        </main>
      ) : (
        <main>
          <section className="rav-hero">
            <div className="rav-container rav-hero-inner">
              <div className="rav-hero-texto">
                <span className="rav-badge">
                  <span className="rav-ponto" /> Pedidos abertos para {new Date().getFullYear()}
                </span>
                <h1>
                  O seu pedido, <span className="rav-destaque">direto com a gente</span>.
                </h1>
                <p>
                  A RAV abastece restaurantes, cafés, lounges e refeitórios da Grande São Paulo. Monte seu pedido aqui
                  em poucos minutos — sem ligação, sem esperar alguém responder no WhatsApp.
                </p>
                <div className="rav-hero-acoes">
                  <button type="button" className="rav-btn rav-btn-primario" onClick={() => irPara('pedido')}>
                    Fazer meu pedido <ArrowRight size={17} />
                  </button>
                  <button type="button" className="rav-btn rav-btn-fantasma" onClick={() => irPara('sobre')}>
                    Conhecer a RAV
                  </button>
                </div>
                <div className="rav-hero-provas">
                  <div>
                    <strong>+40</strong>
                    <span>clientes atendidos</span>
                  </div>
                  <div>
                    <strong>24h</strong>
                    <span>prazo médio de entrega</span>
                  </div>
                  <div>
                    <strong>15 anos</strong>
                    <span>de estrada</span>
                  </div>
                </div>
              </div>

              {/* prévia do formulário no hero: mostra o produto em si, em vez
                  de só descrever — foi o padrão que mais apareceu na pesquisa */}
              <div className="rav-hero-card" aria-hidden="true">
                <div className="rav-hero-card-topo">
                  <span className="rav-hero-card-titulo">Novo pedido</span>
                  <span className="rav-hero-card-tag">Rascunho</span>
                </div>
                <div className="rav-hero-linha">
                  <span className="rav-hero-produto">Arroz tipo 1</span>
                  <span className="rav-hero-qtd">10 sacos</span>
                </div>
                <div className="rav-hero-linha">
                  <span className="rav-hero-produto">Café em grãos</span>
                  <span className="rav-hero-qtd">4 caixas</span>
                </div>
                <div className="rav-hero-linha">
                  <span className="rav-hero-produto">Leite integral</span>
                  <span className="rav-hero-qtd">12 fardos</span>
                </div>
                <div className="rav-hero-card-rodape">
                  <Check size={14} /> Enviado em 2 minutos
                </div>
              </div>
            </div>
          </section>

          <section id="sobre" className="rav-secao">
            <div className="rav-container">
              <span className="rav-secao-eyebrow">A empresa</span>
              <h2 className="rav-secao-titulo">Abastecimento confiável para operações que não podem parar</h2>
              <p className="rav-secao-texto">
                A RAV atende cozinhas industriais, cafeterias, restaurantes e lounges corporativos em toda a Grande São
                Paulo. Nossa operação é construída em cima de previsibilidade: pedido registrado, disponibilidade
                confirmada e entrega feita por equipe própria, com conferência item a item antes de cada saída.
              </p>

              <div className="rav-bento">
                <div className="rav-bento-card rav-bento-destaque">
                  <Truck size={22} />
                  <h3>Entrega própria</h3>
                  <p>
                    Frota e equipe nossas, sem terceirizar. Se algo mudar no caminho, você fala direto com quem está
                    com o seu pedido na mão.
                  </p>
                </div>
                <div className="rav-bento-card">
                  <ShieldCheck size={20} />
                  <h3>Conferência dupla</h3>
                  <p>Cada item é conferido na separação e na saída.</p>
                </div>
                <div className="rav-bento-card">
                  <Clock size={20} />
                  <h3>Prazo curto</h3>
                  <p>A maior parte dos pedidos sai em até 24 horas.</p>
                </div>
                <div className="rav-bento-card">
                  <ClipboardList size={20} />
                  <h3>Histórico organizado</h3>
                  <p>Guardamos o que você costuma pedir para agilizar a próxima compra.</p>
                </div>
              </div>
            </div>
          </section>

          <section id="como" className="rav-secao rav-secao-clara">
            <div className="rav-container">
              <span className="rav-secao-eyebrow">Como funciona</span>
              <h2 className="rav-secao-titulo">Três passos e pronto</h2>
              <ol className="rav-passos">
                <li>
                  <span className="rav-passo-num">1</span>
                  <h3>Você monta o pedido</h3>
                  <p>Informe seus dados, os produtos, a quantidade e a unidade de medida de cada item.</p>
                </li>
                <li>
                  <span className="rav-passo-num">2</span>
                  <h3>A gente confirma</h3>
                  <p>Conferimos a disponibilidade e retornamos com prazo e valores para você aprovar.</p>
                </li>
                <li>
                  <span className="rav-passo-num">3</span>
                  <h3>Entregamos</h3>
                  <p>Separação conferida, entrega feita pela nossa equipe no dia combinado.</p>
                </li>
              </ol>
            </div>
          </section>

          <section id="pedido" className="rav-secao">
            <div className="rav-container rav-form-wrap">
              <div className="rav-form-cabecalho">
                <span className="rav-secao-eyebrow">Fazer pedido</span>
                <h2 className="rav-secao-titulo">{sessao ? 'Monte seu pedido' : 'Entre para fazer seu pedido'}</h2>
                <p className="rav-secao-texto">
                  {sessao
                    ? 'Leva menos de dois minutos.'
                    : 'Identifique sua empresa para continuar. Se ainda não tem acesso, crie em alguns segundos.'}
                </p>
              </div>

              {!sessao && <AcessoPortal onAutenticar={onAutenticar} />}

              {sessao && (
                <div className="rav-boas-vindas">
                  <Heart size={16} />
                  <div>
                    <strong>Obrigado por ser nosso colaborador, {sessao.nome_empresa}!</strong>
                    <span>Seu pedido já vai registrado no nome da sua empresa.</span>
                  </div>
                </div>
              )}

              {sessao && (
                <>
              <ol className="rav-stepper">
                {ETAPAS.map(({ n, titulo, icone: Icone }) => (
                  <li
                    key={n}
                    className={`rav-step ${etapa === n ? 'rav-step-ativo' : ''} ${etapa > n ? 'rav-step-feito' : ''}`}
                  >
                    <span className="rav-step-bolha">{etapa > n ? <Check size={15} /> : <Icone size={15} />}</span>
                    <span className="rav-step-texto">
                      <span className="rav-step-n">Etapa {n}</span>
                      <span className="rav-step-titulo">{titulo}</span>
                    </span>
                  </li>
                ))}
              </ol>

              <div className="rav-card-form">
                {semUnidades && (
                  <p className="rav-erro">
                    Não consegui carregar as unidades de medida. Recarregue a página antes de montar o pedido.
                  </p>
                )}

                {etapa === 1 && (
                  <div className="rav-etapa">
                    <div className="rav-grid-2">
                      {/* a empresa vem da conta em que a pessoa entrou, não é
                          digitada — é o que garante que o pedido cai no
                          cadastro certo e que ninguém pede em nome de outro */}
                      <div className="rav-campo">
                        <span>Empresa</span>
                        <div className="rav-campo-fixo">
                          <Building2 size={15} /> {sessao?.nome_empresa}
                        </div>
                      </div>
                      <label className="rav-campo">
                        <span>
                          Responsável <em>*</em>
                        </span>
                        <input
                          className="rav-input"
                          value={dados.responsavel}
                          onChange={(e) => setCampo('responsavel', e.target.value)}
                          placeholder="Quem está fazendo o pedido"
                        />
                      </label>
                      <label className="rav-campo">
                        <span>
                          Telefone / WhatsApp <em>*</em>
                        </span>
                        <input
                          className="rav-input"
                          type="tel"
                          inputMode="tel"
                          value={dados.telefone}
                          onChange={(e) => setCampo('telefone', e.target.value)}
                          placeholder="(11) 90000-0000"
                        />
                      </label>
                      <label className="rav-campo">
                        <span>E-mail</span>
                        <input
                          className="rav-input"
                          type="email"
                          inputMode="email"
                          value={dados.email}
                          onChange={(e) => setCampo('email', e.target.value)}
                          placeholder="opcional"
                        />
                      </label>
                      <label className="rav-campo">
                        <span>Data desejada de entrega</span>
                        <input
                          className="rav-input"
                          type="date"
                          min={todayISO()}
                          value={dados.entrega}
                          onChange={(e) => setCampo('entrega', e.target.value)}
                        />
                      </label>
                    </div>
                    {tentouAvancar && !dadosOk && (
                      <p className="rav-erro">Preencha empresa, responsável e telefone para continuar.</p>
                    )}
                  </div>
                )}

                {etapa === 2 && (
                  <div className="rav-etapa">
                    <div className="rav-itens-cabecalho">
                      <span className="rav-col-produto">Produto</span>
                      <span className="rav-col-qtd">Quantidade</span>
                      <span className="rav-col-unidade">Unidade</span>
                      <span className="rav-col-acao" />
                    </div>

                    <datalist id="rav-produtos">
                      {produtos.map((p) => (
                        <option key={p.id} value={p.nome} />
                      ))}
                    </datalist>

                    <div className="rav-itens">
                      {itens.map((item, idx) => (
                        <div key={idx} className="rav-item">
                          <input
                            className="rav-input rav-col-produto"
                            list="rav-produtos"
                            value={item.produto}
                            onChange={(e) => setItem(idx, 'produto', e.target.value)}
                            placeholder="Ex: Arroz tipo 1"
                            aria-label={`Produto do item ${idx + 1}`}
                          />
                          <input
                            className="rav-input rav-col-qtd"
                            type="number"
                            min="0"
                            step="0.01"
                            inputMode="decimal"
                            value={item.quantidade}
                            onChange={(e) => setItem(idx, 'quantidade', e.target.value)}
                            placeholder="0"
                            aria-label={`Quantidade do item ${idx + 1}`}
                          />
                          <select
                            className="rav-input rav-col-unidade"
                            value={item.unidade_id}
                            onChange={(e) => setItem(idx, 'unidade_id', e.target.value)}
                            aria-label={`Unidade do item ${idx + 1}`}
                          >
                            <option value="" disabled>
                              Unidade
                            </option>
                            {unidades.map((u) => (
                              <option key={u.id} value={u.id}>
                                {u.nome.charAt(0) + u.nome.slice(1).toLowerCase()}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            className="rav-remover rav-col-acao"
                            onClick={() => removeItem(idx)}
                            disabled={itens.length === 1}
                            title={itens.length === 1 ? 'O pedido precisa de pelo menos um item' : 'Remover item'}
                            aria-label={`Remover item ${idx + 1}`}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                    </div>

                    <button type="button" className="rav-add" onClick={addItem} disabled={semUnidades}>
                      <Plus size={16} /> Adicionar outro item
                    </button>

                    <label className="rav-campo rav-campo-obs">
                      <span>Observações</span>
                      <textarea
                        className="rav-input"
                        rows={3}
                        value={obs}
                        onChange={(e) => setObs(e.target.value)}
                        placeholder="Ex: entregar pela manhã, marca preferida, etc."
                      />
                    </label>

                    {tentouAvancar && !itensOk && (
                      <p className="rav-erro">
                        Informe pelo menos um produto com quantidade maior que zero e a unidade de medida.
                      </p>
                    )}
                  </div>
                )}

                {etapa === 3 && (
                  <div className="rav-etapa">
                    <div className="rav-revisao">
                      <div className="rav-revisao-bloco">
                        <h3>Dados de contato</h3>
                        <dl>
                          <div>
                            <dt>Empresa</dt>
                            <dd>{sessao?.nome_empresa}</dd>
                          </div>
                          <div>
                            <dt>Responsável</dt>
                            <dd>{dados.responsavel}</dd>
                          </div>
                          <div>
                            <dt>Telefone</dt>
                            <dd>{dados.telefone}</dd>
                          </div>
                          {dados.email && (
                            <div>
                              <dt>E-mail</dt>
                              <dd>{dados.email}</dd>
                            </div>
                          )}
                          <div>
                            <dt>Entrega</dt>
                            <dd>{dados.entrega ? dados.entrega.split('-').reverse().join('/') : 'A combinar'}</dd>
                          </div>
                        </dl>
                        <button type="button" className="rav-link" onClick={() => setEtapa(1)}>
                          Editar dados
                        </button>
                      </div>

                      <div className="rav-revisao-bloco">
                        <h3>
                          Itens <span className="rav-contador">{itensValidos.length}</span>
                        </h3>
                        <ul className="rav-revisao-itens">
                          {itensValidos.map((it, i) => (
                            <li key={i}>
                              <span>{it.produto}</span>
                              <span className="rav-resumo-qtd">
                                {it.quantidade} {nomeUnidade(it.unidade_id).toLowerCase()}
                              </span>
                            </li>
                          ))}
                        </ul>
                        {obs && <p className="rav-revisao-obs">{obs}</p>}
                        <button type="button" className="rav-link" onClick={() => setEtapa(2)}>
                          Editar itens
                        </button>
                      </div>
                    </div>
                    <p className="rav-aviso">
                      Ao enviar, nossa equipe confere a disponibilidade e retorna com prazo e valores. O pedido só é
                      confirmado depois desse retorno.
                    </p>
                    {erroEnvio && <p className="rav-erro">{erroEnvio}</p>}
                  </div>
                )}

                <div className="rav-form-acoes">
                  {etapa > 1 ? (
                    <button type="button" className="rav-btn rav-btn-fantasma" onClick={voltarEtapa} disabled={enviando}>
                      <ArrowLeft size={16} /> Voltar
                    </button>
                  ) : (
                    <span />
                  )}
                  {etapa < 3 ? (
                    <button type="button" className="rav-btn rav-btn-primario" onClick={avancar} disabled={semUnidades}>
                      Continuar <ArrowRight size={16} />
                    </button>
                  ) : (
                    <button type="button" className="rav-btn rav-btn-primario" onClick={enviar} disabled={enviando}>
                      {enviando ? (
                        <>
                          <Sparkles size={16} /> Enviando…
                        </>
                      ) : (
                        <>
                          Enviar pedido <Check size={16} />
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
                </>
              )}
            </div>
          </section>

          {sessao && <HistoricoPedidos onBuscarPedidos={onBuscarPedidos} recarregar={versaoHistorico} />}
        </main>
      )}

      <footer id="contato" className="rav-rodape">
        <div className="rav-container rav-rodape-inner">
          <div>
            <div className="rav-logo-marca rav-logo-rodape">RAV</div>
            <p>Distribuidora de alimentos e insumos para food service.</p>
          </div>
          <ul className="rav-contatos">
            <li>
              <Phone size={15} /> (11) 90000-0000
            </li>
            <li>
              <Mail size={15} /> contato@rav.com.br
            </li>
            <li>
              <MapPin size={15} /> Guarulhos — SP
            </li>
          </ul>
        </div>
        <div className="rav-container rav-rodape-fim">
          <span>© {new Date().getFullYear()} RAV Distribuidora</span>
          <span className="rav-rodape-nota">Página de demonstração</span>
        </div>
      </footer>
    </div>
  )
}
