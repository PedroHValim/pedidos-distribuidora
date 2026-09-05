import { useMemo, useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ClipboardList,
  Clock,
  Mail,
  MapPin,
  Phone,
  Plus,
  ShieldCheck,
  Trash2,
  Truck,
  UserRound,
} from 'lucide-react'
import { todayISO } from '../utils.js'
import '../portal.css'

// Página voltada pro CLIENTE fazer o próprio pedido, em vez de mandar
// mensagem no WhatsApp pra alguém digitar depois. É outro produto visual do
// app interno: azul/branco, tom institucional, e o formulário é o centro da
// página. Por enquanto é só protótipo — o envio ainda não grava no banco.

const UNIDADES_FALLBACK = ['UNIDADES', 'KILO', 'PACOTES', 'CAIXAS', 'SACOS', 'FARDOS']

const ETAPAS = [
  { n: 1, titulo: 'Seus dados', icone: UserRound },
  { n: 2, titulo: 'Itens do pedido', icone: ClipboardList },
  { n: 3, titulo: 'Revisão', icone: CheckCircle2 },
]

const itemVazio = (unidade) => ({ produto: '', quantidade: '', unidade })

export default function PortalCliente({ unidades = [], produtos = [], onVoltar }) {
  const listaUnidades = unidades.length ? unidades.map((u) => u.nome) : UNIDADES_FALLBACK
  const unidadePadrao = listaUnidades.includes('UNIDADES') ? 'UNIDADES' : listaUnidades[0]

  const [etapa, setEtapa] = useState(1)
  const [dados, setDados] = useState({
    empresa: '',
    responsavel: '',
    telefone: '',
    email: '',
    entrega: '',
  })
  const [itens, setItens] = useState(() => [itemVazio(unidadePadrao)])
  const [obs, setObs] = useState('')
  const [enviado, setEnviado] = useState(false)
  const [tentouAvancar, setTentouAvancar] = useState(false)

  function setCampo(campo, valor) {
    setDados((d) => ({ ...d, [campo]: valor }))
  }
  function setItem(idx, campo, valor) {
    setItens((lista) => lista.map((it, i) => (i === idx ? { ...it, [campo]: valor } : it)))
  }
  function addItem() {
    setItens((lista) => [...lista, itemVazio(unidadePadrao)])
  }
  function removeItem(idx) {
    setItens((lista) => (lista.length > 1 ? lista.filter((_, i) => i !== idx) : lista))
  }

  const dadosOk = dados.empresa.trim() && dados.responsavel.trim() && dados.telefone.trim()
  const itensValidos = useMemo(
    () => itens.filter((it) => it.produto.trim() && Number(it.quantidade) > 0),
    [itens]
  )
  const itensOk = itensValidos.length > 0

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
    setEtapa((e) => Math.max(1, e - 1))
    document.getElementById('pedido')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function enviar() {
    // protótipo: ainda não grava nada, só mostra a confirmação
    setEnviado(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function novoPedido() {
    setEnviado(false)
    setEtapa(1)
    setItens([itemVazio(unidadePadrao)])
    setObs('')
    setDados({ empresa: '', responsavel: '', telefone: '', email: '', entrega: '' })
  }

  function irPara(id) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="rav">
      <header className="rav-topbar">
        <div className="rav-container rav-topbar-inner">
          <button type="button" className="rav-logo" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <span className="rav-logo-marca">RAV</span>
            <span className="rav-logo-sub">Distribuidora</span>
          </button>

          <nav className="rav-nav">
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
            <button type="button" className="rav-btn rav-btn-primario rav-btn-sm" onClick={() => irPara('pedido')}>
              Fazer pedido
            </button>
            {onVoltar && (
              <button type="button" className="rav-voltar-app" onClick={onVoltar} title="Voltar para o app interno">
                <ArrowLeft size={15} /> App
              </button>
            )}
          </div>
        </div>
      </header>

      {enviado ? (
        <main className="rav-container rav-sucesso">
          <div className="rav-sucesso-icone">
            <Check size={30} />
          </div>
          <h1>Pedido enviado!</h1>
          <p className="rav-sucesso-texto">
            Recebemos o pedido de <strong>{dados.empresa}</strong> com {itensValidos.length}{' '}
            {itensValidos.length === 1 ? 'item' : 'itens'}. Nossa equipe vai conferir a disponibilidade e entrar em
            contato pelo telefone <strong>{dados.telefone}</strong> para confirmar prazo e valores.
          </p>
          <div className="rav-sucesso-resumo">
            <span className="rav-resumo-titulo">Resumo do pedido</span>
            <ul>
              {itensValidos.map((it, i) => (
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
              <h2 className="rav-secao-titulo">Uma distribuidora de bairro, com jeito de operação grande</h2>
              <p className="rav-secao-texto">
                A RAV nasceu como um negócio de família e cresceu junto com seus clientes. Hoje atendemos cozinhas
                industriais, cafeterias e lounges corporativos, cuidando de cada pedido com a mesma atenção do primeiro
                dia: conferindo item por item antes de sair para a entrega.
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
                <h2 className="rav-secao-titulo">Monte seu pedido</h2>
                <p className="rav-secao-texto">
                  Leva menos de dois minutos. Não precisa de cadastro nem senha.
                </p>
              </div>

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
                {etapa === 1 && (
                  <div className="rav-etapa">
                    <div className="rav-grid-2">
                      <label className="rav-campo">
                        <span>
                          Empresa <em>*</em>
                        </span>
                        <input
                          className="rav-input"
                          value={dados.empresa}
                          onChange={(e) => setCampo('empresa', e.target.value)}
                          placeholder="Nome do estabelecimento"
                        />
                      </label>
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
                            value={item.unidade}
                            onChange={(e) => setItem(idx, 'unidade', e.target.value)}
                            aria-label={`Unidade do item ${idx + 1}`}
                          >
                            {listaUnidades.map((u) => (
                              <option key={u} value={u}>
                                {u.charAt(0) + u.slice(1).toLowerCase()}
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

                    <button type="button" className="rav-add" onClick={addItem}>
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
                      <p className="rav-erro">Informe pelo menos um produto com quantidade maior que zero.</p>
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
                            <dd>{dados.empresa}</dd>
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
                                {it.quantidade} {it.unidade.toLowerCase()}
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
                  </div>
                )}

                <div className="rav-form-acoes">
                  {etapa > 1 ? (
                    <button type="button" className="rav-btn rav-btn-fantasma" onClick={voltarEtapa}>
                      <ArrowLeft size={16} /> Voltar
                    </button>
                  ) : (
                    <span />
                  )}
                  {etapa < 3 ? (
                    <button type="button" className="rav-btn rav-btn-primario" onClick={avancar}>
                      Continuar <ArrowRight size={16} />
                    </button>
                  ) : (
                    <button type="button" className="rav-btn rav-btn-primario" onClick={enviar}>
                      Enviar pedido <Check size={16} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </section>
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
