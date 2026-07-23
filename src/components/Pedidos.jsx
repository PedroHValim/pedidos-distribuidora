import { useMemo, useState } from 'react'
import { Package, Search, Truck } from 'lucide-react'
import { StatusBadge } from './ui.jsx'
import { currency, formatData, pedidoCustoTotal, pedidoValorPago } from '../utils.js'

function ConfirmarEntregaForm({ metodosPagamento, onConfirmar, onCancelar }) {
  const [valores, setValores] = useState({}) // { [metodoId]: 'valor string' }

  function toggleMetodo(id) {
    setValores((v) => {
      const novo = { ...v }
      if (id in novo) delete novo[id]
      else novo[id] = ''
      return novo
    })
  }

  function setValor(id, valor) {
    setValores((v) => ({ ...v, [id]: valor }))
  }

  const selecionados = Object.entries(valores)
  const total = selecionados.reduce((s, [, v]) => s + (Number(v) || 0), 0)
  const valido = selecionados.length > 0 && selecionados.every(([, v]) => Number(v) > 0)

  function confirmar() {
    if (!valido) return
    onConfirmar(selecionados.map(([metodo_pagamento_id, valor]) => ({ metodo_pagamento_id, valor: Number(valor) })))
  }

  return (
    <div className="entrega-form">
      <div className="entrega-form-label">Como o cliente pagou? (pode marcar mais de uma forma)</div>
      <div className="filter-chips">
        {metodosPagamento.map((m) => (
          <button
            type="button"
            key={m.id}
            className={`chip ${m.id in valores ? 'chip-active' : ''}`}
            onClick={() => toggleMetodo(m.id)}
          >
            {m.nome}
          </button>
        ))}
      </div>

      {selecionados.length > 0 && (
        <div className="entrega-valores">
          {selecionados.map(([id]) => {
            const metodo = metodosPagamento.find((m) => m.id === id)
            return (
              <div key={id} className="entrega-valor-row">
                <span>{metodo?.nome}</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="input entrega-valor-input"
                  placeholder="R$ 0,00"
                  value={valores[id]}
                  onChange={(e) => setValor(id, e.target.value)}
                />
              </div>
            )
          })}
          <div className="entrega-total-row">
            <span>Total recebido</span>
            <span className="mono">{currency(total)}</span>
          </div>
        </div>
      )}

      <div className="entrega-form-actions">
        <button type="button" className="text-btn" onClick={onCancelar}>
          Cancelar
        </button>
        <button type="button" className="primary-btn" disabled={!valido} onClick={confirmar}>
          Confirmar entrega
        </button>
      </div>
    </div>
  )
}

export default function Pedidos({ pedidos, metodosPagamento, onConcluirEntrega, onExcluirPedido }) {
  const [busca, setBusca] = useState('')
  const [filtro, setFiltro] = useState('Todos')
  const [confirmandoId, setConfirmandoId] = useState(null)

  const lista = pedidos.filter((p) => p.status === 'separado' || p.status === 'entregue')

  const filtrados = useMemo(() => {
    return lista
      .filter((p) => filtro === 'Todos' || (filtro === 'Separado' ? p.status === 'separado' : p.status === 'entregue'))
      .filter((p) => (p.cliente?.nome || '').toLowerCase().includes(busca.toLowerCase()))
      .sort((a, b) => ((a.data_entrega || '') < (b.data_entrega || '') ? -1 : 1))
  }, [lista, busca, filtro])

  async function confirmarEntrega(pedidoId, pagamentos) {
    await onConcluirEntrega(pedidoId, pagamentos)
    setConfirmandoId(null)
  }

  return (
    <div className="card">
      <div className="pedidos-toolbar">
        <div className="search-box">
          <Search size={15} color="#8A9089" />
          <input
            className="search-input"
            placeholder="Buscar por cliente…"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
        <div className="filter-chips">
          {['Todos', 'Separado', 'Entregue'].map((s) => (
            <button
              key={s}
              onClick={() => setFiltro(s)}
              className={`chip ${filtro === s ? 'chip-active' : ''}`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {filtrados.length === 0 ? (
        <div className="empty-state">
          <Package size={28} color="#B7BCB4" />
          <p>Nenhum pedido pronto ainda. Eles aparecem aqui assim que todos os itens forem comprados na aba "Compras".</p>
        </div>
      ) : (
        <div className="pedidos-list">
          {filtrados.map((p) => {
            const custo = pedidoCustoTotal(p)
            const recebido = pedidoValorPago(p)
            return (
              <div key={p.id} className="pedido-card">
                <div className="pedido-top">
                  <div>
                    <div className="pedido-cliente">{p.cliente?.nome}</div>
                    <div className="pedido-datas">
                      Pedido em {formatData(p.data_pedido)}
                      {p.data_entrega && ` · entrega ${formatData(p.data_entrega)}`}
                    </div>
                  </div>
                  <div className="pedido-top-right">
                    {custo != null && <div className="pedido-valor mono">{currency(custo)}</div>}
                    <StatusBadge status={p.status} />
                  </div>
                </div>

                <ul className="pedido-itens">
                  {(p.pedido_itens || []).map((it) => (
                    <li key={it.id} className="pedido-item-line">
                      <span>
                        {it.quantidade} {it.unidade?.nome?.toLowerCase()} × {it.produto}
                      </span>
                    </li>
                  ))}
                </ul>

                {p.obs && <div className="pedido-obs">{p.obs}</div>}

                {p.status === 'entregue' && recebido != null && (
                  <div className="pedido-pagamentos">
                    Recebido: {(p.pedido_pagamentos || [])
                      .map((pg) => `${pg.metodo_pagamento?.nome} ${currency(pg.valor)}`)
                      .join(' + ')}{' '}
                    <strong>({currency(recebido)})</strong>
                  </div>
                )}

                {p.status === 'separado' && confirmandoId === p.id && (
                  <ConfirmarEntregaForm
                    metodosPagamento={metodosPagamento}
                    onConfirmar={(pagamentos) => confirmarEntrega(p.id, pagamentos)}
                    onCancelar={() => setConfirmandoId(null)}
                  />
                )}

                <div className="pedido-actions">
                  {p.status === 'separado' && confirmandoId !== p.id && (
                    <button className="advance-btn" onClick={() => setConfirmandoId(p.id)}>
                      <Truck size={13} /> Marcar como Entregue
                    </button>
                  )}
                  <button className="text-btn danger" onClick={() => onExcluirPedido(p.id)}>
                    Excluir
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
