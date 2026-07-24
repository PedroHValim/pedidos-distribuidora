import { useMemo, useState } from 'react'
import { PackageCheck, ShoppingCart } from 'lucide-react'
import { PriceIndicator } from './ui.jsx'
import { currency, formatData, normalizaProduto, itemCustoTotal } from '../utils.js'

// Calcula a média histórica de preço de compra por produto, a partir de
// todos os itens já comprados em qualquer pedido (exceto o próprio item).
function useMediaHistorica(todosPedidos) {
  return useMemo(() => {
    const todosItens = todosPedidos.flatMap((p) => p.pedido_itens || [])
    return (produto, excluirItemId) => {
      const nome = normalizaProduto(produto)
      const valores = todosItens
        .filter(
          (it) =>
            normalizaProduto(it.produto) === nome &&
            it.comprado &&
            it.preco_compra != null &&
            it.id !== excluirItemId
        )
        .map((it) => it.preco_compra)
      if (!valores.length) return null
      return valores.reduce((a, b) => a + b, 0) / valores.length
    }
  }, [todosPedidos])
}

function ItemCompraRow({ item, mediaAnterior, metodosPagamento, onAtualizarItem }) {
  const [precoLocal, setPrecoLocal] = useState(item.preco_compra ?? '')
  const [metodoLocal, setMetodoLocal] = useState(item.metodo_pagamento_id ?? '')

  function commitPreco() {
    const valor = precoLocal === '' ? null : Number(precoLocal)
    if (valor !== item.preco_compra) {
      onAtualizarItem(item.id, { preco_compra: valor })
    }
  }

  function commitMetodo(valor) {
    setMetodoLocal(valor)
    onAtualizarItem(item.id, { metodo_pagamento_id: valor || null })
  }

  const faltaInfo = precoLocal === '' || precoLocal == null || !metodoLocal

  function toggleComprado() {
    const proximo = !item.comprado
    // marcar como comprado exige preço e forma de pagamento já preenchidos
    if (proximo && faltaInfo) return
    onAtualizarItem(item.id, { comprado: proximo })
  }

  return (
    <div className={`compra-item-row ${item.comprado ? 'is-comprado' : ''}`}>
      <button
        type="button"
        className="check-btn"
        onClick={toggleComprado}
        aria-label={item.comprado ? 'Desmarcar como comprado' : 'Marcar como comprado'}
        title={faltaInfo ? 'Informe o preço e a forma de pagamento antes de marcar como comprado' : undefined}
      >
        <PackageCheck size={16} />
      </button>

      <div className="compra-item-info">
        <div className="compra-item-nome">
          {item.quantidade} {item.unidade?.nome?.toLowerCase() || ''} × {item.produto}
        </div>
        {precoLocal !== '' && (
          <div className="compra-item-meta">total: {currency(itemCustoTotal({ ...item, preco_compra: Number(precoLocal) }))}</div>
        )}
      </div>

      <input
        type="number"
        min="0"
        step="0.01"
        className="item-preco-compra"
        placeholder="R$/un"
        value={precoLocal}
        onChange={(e) => setPrecoLocal(e.target.value)}
        onBlur={commitPreco}
        title="Preço pago por unidade"
      />

      <select
        className="item-metodo-compra"
        value={metodoLocal}
        onChange={(e) => commitMetodo(e.target.value)}
        title="Como a empresa pagou este item"
      >
        <option value="">Forma pgto.</option>
        {metodosPagamento.map((m) => (
          <option key={m.id} value={m.id}>
            {m.nome}
          </option>
        ))}
      </select>

      <PriceIndicator atual={precoLocal === '' ? null : Number(precoLocal)} media={mediaAnterior} />
    </div>
  )
}

export default function Compras({ pedidos, metodosPagamento, onAtualizarItem, onCompletarPedido }) {
  const pedidosComprando = pedidos.filter((p) => p.status === 'comprando')
  const mediaHistorica = useMediaHistorica(pedidos)

  if (pedidosComprando.length === 0) {
    return (
      <div className="card empty-state">
        <ShoppingCart size={28} color="#B7BCB4" />
        <p>Nenhuma compra pendente. Assim que um pedido novo entrar, ele aparece aqui.</p>
      </div>
    )
  }

  return (
    <div className="pedidos-list">
      {pedidosComprando.map((pedido) => {
        const itens = pedido.pedido_itens || []
        const todosComprados = itens.length > 0 && itens.every((it) => it.comprado)
        return (
          <div key={pedido.id} className="pedido-card">
            <div className="pedido-top">
              <div>
                <div className="pedido-cliente">{pedido.cliente?.nome}</div>
                <div className="pedido-datas">
                  Pedido em {formatData(pedido.data_pedido)}
                  {pedido.data_entrega && ` · entrega ${formatData(pedido.data_entrega)}`}
                </div>
              </div>
              <div className="compra-progresso">
                {itens.filter((it) => it.comprado).length}/{itens.length} comprados
              </div>
            </div>

            <div className="compra-itens">
              {itens.map((item) => (
                <ItemCompraRow
                  key={item.id}
                  item={item}
                  mediaAnterior={mediaHistorica(item.produto, item.id)}
                  metodosPagamento={metodosPagamento}
                  onAtualizarItem={onAtualizarItem}
                />
              ))}
            </div>

            {pedido.obs && <div className="pedido-obs">{pedido.obs}</div>}

            <button
              type="button"
              className="completo-btn"
              disabled={!todosComprados}
              onClick={() => onCompletarPedido(pedido.id)}
            >
              Pedido completo
            </button>
          </div>
        )
      })}
    </div>
  )
}
