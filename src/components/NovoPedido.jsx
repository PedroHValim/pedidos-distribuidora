import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Field } from './ui.jsx'
import { currency, todayISO, itemVendaTotal } from '../utils.js'

const novoItem = () => ({ produto: '', quantidade: 1, preco_venda: 0, desconto: 0 })
const pedidoVazio = () => ({
  cliente: '',
  data_pedido: todayISO(),
  data_entrega: '',
  obs: '',
  itens: [novoItem()],
})

export default function NovoPedido({ onCriarPedido, salvando }) {
  const [form, setForm] = useState(pedidoVazio())

  function updateItem(idx, field, value) {
    setForm((f) => {
      const itens = [...f.itens]
      itens[idx] = { ...itens[idx], [field]: field === 'produto' ? value : Number(value) }
      return { ...f, itens }
    })
  }
  function addItem() {
    setForm((f) => ({ ...f, itens: [...f.itens, novoItem()] }))
  }
  function removeItem(idx) {
    setForm((f) => ({ ...f, itens: f.itens.filter((_, i) => i !== idx) }))
  }

  async function salvar(e) {
    e.preventDefault()
    if (!form.cliente.trim()) return
    const itensValidos = form.itens.filter((it) => it.produto.trim() && it.quantidade > 0)
    if (itensValidos.length === 0) return

    await onCriarPedido({ ...form, itens: itensValidos })
    setForm(pedidoVazio())
  }

  const totalVenda = form.itens.reduce((s, it) => s + itemVendaTotal(it), 0)

  return (
    <form onSubmit={salvar} className="card">
      <h2 className="card-title">Registrar pedido</h2>
      <p className="card-subtitle">
        Anote o que o cliente pediu. O preço de compra e a separação dos itens ficam para a aba "Compras".
      </p>

      <div className="row-fields">
        <Field label="Cliente">
          <input
            className="input"
            value={form.cliente}
            onChange={(e) => setForm({ ...form, cliente: e.target.value })}
            placeholder="Nome do cliente"
          />
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
        <span className="itens-header-total">Total venda</span>
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
            <input
              type="number"
              min="0"
              className="item-qtd"
              value={item.quantidade}
              onChange={(e) => updateItem(idx, 'quantidade', e.target.value)}
              title="Quantidade"
            />
            <span className="item-x">×</span>
            <input
              type="number"
              min="0"
              step="0.01"
              className="item-preco"
              value={item.preco_venda}
              onChange={(e) => updateItem(idx, 'preco_venda', e.target.value)}
              title="Preço de venda (unidade)"
            />
            <input
              type="number"
              min="0"
              step="0.01"
              className="item-desc"
              value={item.desconto}
              onChange={(e) => updateItem(idx, 'desconto', e.target.value)}
              title="Desconto (R$)"
            />
            <span className="item-dots" />
            <span className="item-total mono">{currency(itemVendaTotal(item))}</span>
            <button type="button" className="item-remove" onClick={() => removeItem(idx)}>
              <Trash2 size={14} />
            </button>
          </div>
        ))}
        <button type="button" className="add-item-btn" onClick={addItem}>
          <Plus size={14} /> Adicionar item
        </button>
        <div className="slip-total-row">
          <span>Total do pedido</span>
          <span className="mono">{currency(totalVenda)}</span>
        </div>
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
