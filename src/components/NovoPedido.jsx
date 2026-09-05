import { useRef, useState } from 'react'
import { Plus, Trash2, MessageCircle } from 'lucide-react'
import { Field, ProdutoAutocomplete } from './ui.jsx'
import { supabase } from '../supabaseClient.js'
import { todayISO } from '../utils.js'

const novoItem = (unidadeIdPadrao) => ({ produto: '', quantidade: '', unidade_id: unidadeIdPadrao || '' })
const pedidoVazio = (unidadeIdPadrao) => ({
  cliente_id: '',
  data_pedido: todayISO(),
  data_entrega: '',
  obs: '',
  itens: [novoItem(unidadeIdPadrao)],
})

export default function NovoPedido({ onCriarPedido, salvando, clientes, unidades, produtos }) {
  const unidadeIdPadrao = unidades[0]?.id || ''
  const [form, setForm] = useState(() => pedidoVazio(unidadeIdPadrao))
  const [textoWpp, setTextoWpp] = useState('')
  const [gerando, setGerando] = useState(false)
  const [erroGeracao, setErroGeracao] = useState('')
  // guarda síncrona: o estado `salvando` do App só chega no próximo render,
  // então um duplo toque rápido no botão passa pelo `disabled` antes dele
  // atualizar. Essa ref bloqueia o segundo envio na hora, sem esperar o React.
  const enviandoRef = useRef(false)

  function updateItem(idx, field, value) {
    setForm((f) => {
      const itens = [...f.itens]
      itens[idx] = { ...itens[idx], [field]: value }
      return { ...f, itens }
    })
  }
  function addItem() {
    setForm((f) => ({ ...f, itens: [...f.itens, novoItem(unidadeIdPadrao)] }))
  }
  function removeItem(idx) {
    setForm((f) => ({ ...f, itens: f.itens.filter((_, i) => i !== idx) }))
  }

  // Manda o texto colado (ex: mensagem do WhatsApp) pra Edge Function, que
  // usa IA pra extrair cliente/itens/data e devolve pronto pra revisão —
  // só preenche o formulário, não salva nada sozinho. A pessoa ainda confere
  // e clica em "Salvar pedido" como sempre.
  async function gerarPedidoAutomatico() {
    if (!textoWpp.trim() || gerando) return
    setGerando(true)
    setErroGeracao('')

    const { data, error } = await supabase.functions.invoke('gerar-pedido', {
      body: { texto: textoWpp, clientes, produtos, unidades },
    })

    setGerando(false)

    if (error || data?.error || !data?.resultado) {
      setErroGeracao('Não consegui ler essa mensagem. Preencha manualmente abaixo.')
      return
    }

    const r = data.resultado
    setForm({
      cliente_id: r.cliente_id || '',
      data_pedido: todayISO(),
      data_entrega: r.data_entrega || '',
      obs: r.observacao || '',
      itens: r.itens.length
        ? r.itens.map((it) => ({
            produto: (it.produto_id && produtos.find((p) => p.id === it.produto_id)?.nome) || it.produto,
            quantidade: it.quantidade != null ? it.quantidade : '',
            unidade_id: it.unidade_id || unidadeIdPadrao,
          }))
        : [novoItem(unidadeIdPadrao)],
    })
    setTextoWpp('')
  }

  async function salvar(e) {
    e.preventDefault()
    if (enviandoRef.current) return
    if (!form.cliente_id) return
    const itensValidos = form.itens
      .filter((it) => it.produto.trim() && Number(it.quantidade) > 0 && it.unidade_id)
      .map((it) => ({ ...it, quantidade: Number(it.quantidade) }))
    if (itensValidos.length === 0) return

    enviandoRef.current = true
    try {
      await onCriarPedido({ ...form, itens: itensValidos })
      setForm(pedidoVazio(unidadeIdPadrao))
    } finally {
      enviandoRef.current = false
    }
  }

  return (
    <form onSubmit={salvar} className="card">
      <h2 className="card-title">Registrar pedido</h2>
      <p className="card-subtitle">
        Anote o que o cliente pediu. O preço de compra e a separação dos itens ficam para a aba "Compras".
      </p>

      <div className="wpp-import">
        <div className="wpp-import-label">
          <MessageCircle size={14} /> Colar mensagem do WhatsApp (opcional)
        </div>
        <textarea
          className="wpp-import-textarea"
          placeholder="Cole aqui a mensagem do pedido que o cliente mandou..."
          value={textoWpp}
          onChange={(e) => setTextoWpp(e.target.value)}
          rows={3}
        />
        <div className="wpp-import-actions">
          {erroGeracao && <span className="wpp-import-erro">{erroGeracao}</span>}
          <button
            type="button"
            className="wpp-import-btn"
            onClick={gerarPedidoAutomatico}
            disabled={!textoWpp.trim() || gerando}
          >
            {gerando ? 'Lendo mensagem…' : 'Preencher automaticamente'}
          </button>
        </div>
      </div>

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
