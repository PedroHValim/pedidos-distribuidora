import { useMemo, useState } from 'react'
import { Package, Search, Truck } from 'lucide-react'
import { StatusBadge } from './ui.jsx'
import { currency, formatData, itemVendaTotal, pedidoVendaTotal, pedidoCustoTotal } from '../utils.js'

export default function Pedidos({ pedidos, onAvancarStatus, onExcluirPedido }) {
  const [busca, setBusca] = useState('')
  const [filtro, setFiltro] = useState('Todos')

  const lista = pedidos.filter((p) => p.status === 'separado' || p.status === 'entregue')

  const filtrados = useMemo(() => {
    return lista
      .filter((p) => filtro === 'Todos' || (filtro === 'Separado' ? p.status === 'separado' : p.status === 'entregue'))
      .filter((p) => p.cliente.toLowerCase().includes(busca.toLowerCase()))
      .sort((a, b) => ((a.data_entrega || '') < (b.data_entrega || '') ? -1 : 1))
  }, [lista, busca, filtro])

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
            const venda = pedidoVendaTotal(p)
            return (
              <div key={p.id} className="pedido-card">
                <div className="pedido-top">
                  <div>
                    <div className="pedido-cliente">{p.cliente}</div>
                    <div className="pedido-datas">
                      Pedido em {formatData(p.data_pedido)}
                      {p.data_entrega && ` · entrega ${formatData(p.data_entrega)}`}
                    </div>
                  </div>
                  <div className="pedido-top-right">
                    <div className="pedido-valor mono">{currency(venda)}</div>
                    <StatusBadge status={p.status} />
                  </div>
                </div>

                <ul className="pedido-itens">
                  {(p.pedido_itens || []).map((it) => (
                    <li key={it.id} className="pedido-item-line">
                      <span>
                        {it.quantidade}× {it.produto}
                      </span>
                      <span className="mono">{currency(itemVendaTotal(it))}</span>
                    </li>
                  ))}
                </ul>

                {custo != null && (
                  <div className="pedido-margem">Margem estimada: {currency(venda - custo)}</div>
                )}

                {p.obs && <div className="pedido-obs">{p.obs}</div>}

                <div className="pedido-actions">
                  {p.status === 'separado' && (
                    <button className="advance-btn" onClick={() => onAvancarStatus(p)}>
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
