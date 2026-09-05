import { useMemo, useState } from 'react'
import { PackageCheck, Pencil, ShoppingCart, Trash2 } from 'lucide-react'
import EditarPedidoForm from './EditarPedidoForm.jsx'
import { currency, formatData, normalizaProduto, itemCustoTotal, metodoEhCredito } from '../utils.js'

const PARCELAS_OPCOES = [1, 2, 3, 4, 6, 10, 12]

// Estatísticas de preço pago historicamente por produto (menor preço, preço
// médio e quantas vezes já foi comprado), a partir de todos os itens já
// comprados em qualquer pedido (exceto o próprio item sendo editado agora).
function useEstatisticasPreco(todosPedidos) {
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
      return {
        minimo: Math.min(...valores),
        media: valores.reduce((a, b) => a + b, 0) / valores.length,
        qtd: valores.length,
      }
    }
  }, [todosPedidos])
}

function ItemCompraRow({ item, estatisticas, metodosPagamento, cartoes, podeExcluir, onAtualizarItem, onExcluirItem }) {
  const [precoLocal, setPrecoLocal] = useState(item.preco_compra ?? '')
  const [metodoLocal, setMetodoLocal] = useState(item.metodo_pagamento_id ?? '')
  const [cartaoLocal, setCartaoLocal] = useState(item.cartao_id ?? '')
  const [parcelasLocal, setParcelasLocal] = useState(item.parcelas ?? 1)

  const ehCredito = metodoEhCredito(metodoLocal, metodosPagamento)

  function commitPreco() {
    const valor = precoLocal === '' ? null : Number(precoLocal)
    if (valor !== item.preco_compra) {
      onAtualizarItem(item.id, { preco_compra: valor })
    }
  }

  function commitMetodo(valor) {
    setMetodoLocal(valor)
    const viraCredito = metodoEhCredito(valor, metodosPagamento)
    const patch = { metodo_pagamento_id: valor || null }
    // trocar pra uma forma que não é Crédito limpa cartão/parcelas
    if (!viraCredito) {
      setCartaoLocal('')
      patch.cartao_id = null
      patch.parcelas = null
    }
    onAtualizarItem(item.id, patch)
  }

  function commitCartao(valor) {
    setCartaoLocal(valor)
    onAtualizarItem(item.id, { cartao_id: valor || null })
  }

  function commitParcelas(valor) {
    setParcelasLocal(valor)
    onAtualizarItem(item.id, { parcelas: valor })
  }

  const faltaInfo = precoLocal === '' || precoLocal == null || !metodoLocal || (ehCredito && !cartaoLocal)

  function toggleComprado() {
    const proximo = !item.comprado
    // marcar como comprado exige preço e forma de pagamento já preenchidos
    // (e cartão também, se a forma escolhida for Crédito)
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
        {estatisticas && (
          <div className="compra-item-historico">
            {estatisticas.qtd}× antes · mín {currency(estatisticas.minimo)} · média {currency(estatisticas.media)}
          </div>
        )}
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

      {ehCredito && (
        <div className="item-credito-extra">
          <select
            className="item-cartao"
            value={cartaoLocal}
            onChange={(e) => commitCartao(e.target.value)}
            title="Qual cartão"
          >
            <option value="">Qual cartão?</option>
            {cartoes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
          <div className="parcelas-chips">
            {PARCELAS_OPCOES.map((n) => (
              <button
                key={n}
                type="button"
                className={`chip chip-parcela ${Number(parcelasLocal) === n ? 'chip-active' : ''}`}
                onClick={() => commitParcelas(n)}
              >
                {n}x
              </button>
            ))}
          </div>
        </div>
      )}

      <button
        type="button"
        className="item-excluir-compra"
        onClick={() => podeExcluir && onExcluirItem(item.id)}
        disabled={!podeExcluir}
        title={podeExcluir ? 'Excluir item' : 'Use "Editar" pra excluir o último item do pedido'}
        aria-label="Excluir item"
      >
        <Trash2 size={14} />
      </button>
    </div>
  )
}

export default function Compras({
  pedidos,
  clientes,
  unidades,
  metodosPagamento,
  cartoes,
  produtos,
  salvandoEdicao,
  onAtualizarItem,
  onExcluirItem,
  onCompletarPedido,
  onExcluirPedido,
  onEditarPedido,
}) {
  const [editandoId, setEditandoId] = useState(null)
  const pedidosComprando = pedidos.filter((p) => p.status === 'comprando')
  const estatisticasPreco = useEstatisticasPreco(pedidos)

  async function salvarEdicao(pedidoId, form) {
    await onEditarPedido(pedidoId, form)
    setEditandoId(null)
  }

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
        const editando = editandoId === pedido.id

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
              {!editando && (
                <div className="pedido-top-right">
                  <div className="compra-progresso">
                    {itens.filter((it) => it.comprado).length}/{itens.length} comprados
                  </div>
                  <div className="pedido-top-acoes">
                    <button type="button" className="edit-pedido-btn" onClick={() => setEditandoId(pedido.id)}>
                      <Pencil size={13} /> Editar
                    </button>
                    <button
                      type="button"
                      className="text-btn danger"
                      onClick={() => onExcluirPedido(pedido.id)}
                    >
                      Excluir
                    </button>
                  </div>
                </div>
              )}
            </div>

            {editando ? (
              <EditarPedidoForm
                pedido={pedido}
                clientes={clientes}
                unidades={unidades}
                metodosPagamento={metodosPagamento}
                cartoes={cartoes}
                produtos={produtos}
                salvando={salvandoEdicao}
                onSalvar={(form) => salvarEdicao(pedido.id, form)}
                onCancelar={() => setEditandoId(null)}
              />
            ) : (
              <>
                <div className="compra-itens">
                  {itens.map((item) => (
                    <ItemCompraRow
                      key={item.id}
                      item={item}
                      estatisticas={estatisticasPreco(item.produto, item.id)}
                      metodosPagamento={metodosPagamento}
                      cartoes={cartoes}
                      podeExcluir={itens.length > 1}
                      onAtualizarItem={onAtualizarItem}
                      onExcluirItem={onExcluirItem}
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
              </>
            )}
          </div>
        )
      })}
    </div>
  )
}
