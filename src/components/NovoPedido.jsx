import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Field } from './ui.jsx'
import { todayISO } from '../utils.js'

const novoItem = (unidadeIdPadrao) => ({ produto: '', quantidade: 1, unidade_id: unidadeIdPadrao || '' })
const pedidoVazio = (unidadeIdPadrao) => ({
  cliente_id: '',
  data_pedido: todayISO(),
  data_entrega: '',
  obs: '',
  itens: [novoItem(unidadeIdPadrao)],
})

export default function NovoPedido({ onCriarPedido, salvando, clientes, unidades }) {
  const unidadeIdPadrao = unidades[0]?.id || ''
  const [form, setForm] = useState(() => pedidoVazio(unidadeIdPadrao))

  function updateItem(idx, field, value) {
    setForm((f) => {
      const itens = [...f.itens]
      itens[idx] = { ...itens[idx], [field]: field === 'quantidade' ? Number(value) : value }
      return { ...f, itens }
    })
  }
  function addItem() {
    setForm((f) => ({ ...f, itens: [...f.itens, novoItem(unidadeIdPadrao)] }))
  }
  function removeItem(idx) {
    setForm((f) => ({ ...f, itens: f.itens.filter((_, i) => i !== idx) }))
  }

  async function salvar(e) {
    e.preventDefault()
    if (!form.cliente_id) return
    const itensValidos = form.itens.filter((it) => it.produto.trim() && it.quantidade > 0 && it.unidade_id)
    if (itensValidos.length === 0) return

    await onCriarPedido({ ...form, itens: itensValidos })
    setForm(pedidoVazio(unidadeIdPadrao))
  }

  return (
    <form onSubmit={salvar} className="card">
      <h2 className="card-title">Registrar pedido</h2>
      <p className="card-subtitle">
        Anote o que o cliente pediu. O preço de compra e a separação dos itens ficam para a aba "Compras".
      </p>

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
          <div key={idx} className="item-row">
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
        <button type="submit" className="primary-btn" disabled={salvando}>
          {salvando ? 'Salvando…' : 'Salvar pedido'}
        </button>
      </div>
    </form>
  )
}
