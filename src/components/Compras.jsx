import { useMemo, useState } from 'react'
import { PackageCheck, Pencil, ShoppingCart, Trash2, Plus } from 'lucide-react'
import { Field, PriceIndicator } from './ui.jsx'
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

function EditarPedidoForm({ pedido, clientes, unidades, salvando, onSalvar, onCancelar }) {
  const [form, setForm] = useState(() => ({
    cliente_id: pedido.cliente?.id || '',
    data_pedido: pedido.data_pedido || '',
    data_entrega: pedido.data_entrega || '',
    obs: pedido.obs || '',
    itens: (pedido.pedido_itens || []).map((it) => ({
      id: it.id,
      produto: it.produto,
      quantidade: it.quantidade,
      unidade_id: it.unidade_id || it.unidade?.id || '',
    })),
  }))

  function updateItem(idx, field, value) {
    setForm((f) => {
      const itens = [...f.itens]
      itens[idx] = { ...itens[idx], [field]: field === 'quantidade' ? Number(value) : value }
      return { ...f, itens }
    })
  }
  function addItem() {
    setForm((f) => ({ ...f, itens: [...f.itens, { produto: '', quantidade: 1, unidade_id: unidades[0]?.id || '' }] }))
  }
  function removeItem(idx) {
    setForm((f) => ({ ...f, itens: f.itens.filter((_, i) => i !== idx) }))
  }

  async function salvar(e) {
    e.preventDefault()
    if (!form.cliente_id) return
    const itensValidos = form.itens.filter((it) => it.produto.trim() && it.quantidade > 0 && it.unidade_id)
    if (itensValidos.length === 0) return
    await onSalvar({ ...form, itens: itensValidos })
  }

  return (
    <form onSubmit={salvar} className="edit-pedido-form">
      <div className="row-fields">
        <Field label="Cliente">
          <select
            className="input"
            value={form.cliente_id}
            onChange={(e) => setForm({ ...form, cliente_id: e.target.value })}
          >
            <option value="" disabled>
              Selecione o cliente
            </option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Data do pedido">
          <input
            type="date"
            className="input"
            value={form.data_pedido}
            onChange={(e) => setForm({ ...form, data_pedido: e.target.value })}
          />
        </Field>
        <Field label="Previsão de entrega">
          <input
            type="date"
            className="input"
            value={form.data_entrega}
            onChange={(e) => setForm({ ...form, data_entrega: e.target.value })}
          />
        </Field>
      </div>

      <div className="itens-header">
        <span>Itens do pedido</span>
      </div>

      <div className="slip">
        {form.itens.map((item, idx) => (
          <div key={item.id ?? `novo-${idx}`} className="item-row">
            <input
              className="item-produto"
              placeholder="Produto"
              value={item.produto}
              onChange={(e) => updateItem(idx, 'produto', e.target.value)}
            />
            <span className="item-x">×</span>
            <input
              type="number"
              min="0"
              className="item-qtd"
              value={item.quantidade}
              onChange={(e) => updateItem(idx, 'quantidade', e.target.value)}
              title="Quantidade"
            />
            <select
              className="item-unidade"
              value={item.unidade_id}
              onChange={(e) => updateItem(idx, 'unidade_id', e.target.value)}
              title="Unidade"
            >
              {unidades.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nome}
                </option>
              ))}
            </select>
            <button type="button" className="item-remove" onClick={() => removeItem(idx)}>
              <Trash2 size={14} />
            </button>
          </div>
        ))}
        <button type="button" className="add-item-btn" onClick={addItem}>
          <Plus size={14} /> Adicionar item
        </button>
      </div>

      <Field label="Observações (opcional)">
        <input
          className="input"
          value={form.obs}
          onChange={(e) => setForm({ ...form, obs: e.target.value })}
          placeholder="Ex: entregar pela manhã"
        />
      </Field>

      <div className="form-actions">
        <button type="button" className="text-btn" onClick={onCancelar}>
          Cancelar
        </button>
        <button type="submit" className="primary-btn" disabled={salvando}>
          {salvando ? 'Salvando…' : 'Salvar alterações'}
        </button>
      </div>
    </form>
  )
}

export default function Compras({
  pedidos,
  clientes,
  unidades,
  metodosPagamento,
  salvandoEdicao,
  onAtualizarItem,
  onCompletarPedido,
  onEditarPedido,
}) {
  const [editandoId, setEditandoId] = useState(null)
  const pedidosComprando = pedidos.filter((p) => p.status === 'comprando')
  const mediaHistorica = useMediaHistorica(pedidos)

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
                  <button type="button" className="edit-pedido-btn" onClick={() => setEditandoId(pedido.id)}>
                    <Pencil size={13} /> Editar
                  </button>
                </div>
              )}
            </div>

            {editando ? (
              <EditarPedidoForm
                pedido={pedido}
                clientes={clientes}
                unidades={unidades}
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
              </>
            )}
          </div>
        )
      })}
    </div>
  )
}
