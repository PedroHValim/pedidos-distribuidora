import { useRef, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Field, ProdutoAutocomplete } from './ui.jsx'

// Formulário de edição de um pedido já criado — cliente, datas, observação e
// itens (produto, quantidade, unidade, preço pago e forma de pagamento).
// Usado tanto na aba Compras (pedido ainda "comprando") quanto na aba
// Pedidos (pedido "separado" ou "entregue"): editar o preço de um item aqui
// atualiza o custo em qualquer lugar que dependa dele (Pedidos, Painel),
// porque tudo é calculado a partir do preco_compra salvo no banco.
export default function EditarPedidoForm({ pedido, clientes, unidades, metodosPagamento, produtos, salvando, onSalvar, onCancelar }) {
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
      preco_compra: it.preco_compra ?? '',
      metodo_pagamento_id: it.metodo_pagamento_id || '',
    })),
  }))
  // guarda síncrona contra duplo toque (o `disabled` do botão só reflete no
  // próximo render; sem isso, um segundo toque rápido reenvia o mesmo item
  // "novo" — sem id — e ele acaba sendo inserido duas vezes)
  const enviandoRef = useRef(false)

  function updateItem(idx, field, value) {
    setForm((f) => {
      const itens = [...f.itens]
      itens[idx] = { ...itens[idx], [field]: value }
      return { ...f, itens }
    })
  }
  function addItem() {
    setForm((f) => ({
      ...f,
      itens: [...f.itens, { produto: '', quantidade: '', unidade_id: unidades[0]?.id || '', preco_compra: '', metodo_pagamento_id: '' }],
    }))
  }
  function removeItem(idx) {
    setForm((f) => ({ ...f, itens: f.itens.filter((_, i) => i !== idx) }))
  }

  async function salvar(e) {
    e.preventDefault()
    if (enviandoRef.current) return
    if (!form.cliente_id) return
    const itensValidos = form.itens
      .filter((it) => it.produto.trim() && Number(it.quantidade) > 0 && it.unidade_id)
      .map((it) => ({
        ...it,
        quantidade: Number(it.quantidade),
        preco_compra: it.preco_compra === '' ? null : Number(it.preco_compra),
        metodo_pagamento_id: it.metodo_pagamento_id || null,
      }))
    if (itensValidos.length === 0) return

    enviandoRef.current = true
    try {
      await onSalvar({ ...form, itens: itensValidos })
    } finally {
      enviandoRef.current = false
    }
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
            <ProdutoAutocomplete
              className="item-produto"
              placeholder="Produto"
              value={item.produto}
              onChange={(v) => updateItem(idx, 'produto', v)}
              produtos={produtos}
            />
            <span className="item-x">×</span>
            <input
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              placeholder="Qtd"
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
            <input
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              placeholder="R$/un"
              className="item-preco-compra"
              value={item.preco_compra}
              onChange={(e) => updateItem(idx, 'preco_compra', e.target.value)}
              title="Preço pago por unidade"
            />
            <select
              className="item-metodo-compra"
              value={item.metodo_pagamento_id}
              onChange={(e) => updateItem(idx, 'metodo_pagamento_id', e.target.value)}
              title="Como a empresa pagou este item"
            >
              <option value="">Forma pgto.</option>
              {metodosPagamento.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nome}
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
