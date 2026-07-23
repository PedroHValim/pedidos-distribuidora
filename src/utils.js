export const STATUS = ['comprando', 'separado', 'entregue']

export const STATUS_LABEL = {
  comprando: 'Comprando',
  separado: 'Separado',
  entregue: 'Entregue',
}

export const STATUS_COLOR = {
  comprando: '#C1443A',
  separado: '#D98E04',
  entregue: '#3B7A57',
}

export function currency(n) {
  return (Number(n) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function formatData(iso) {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

// Total de custo de um item (o que foi pago na compra), null se ainda não comprado
export function itemCustoTotal(item) {
  if (item.preco_compra == null) return null
  return (item.quantidade || 0) * item.preco_compra
}

export function pedidoCustoTotal(pedido) {
  const itens = pedido.pedido_itens || []
  if (itens.some((it) => it.preco_compra == null)) return null
  return itens.reduce((soma, it) => soma + itemCustoTotal(it), 0)
}

export function normalizaProduto(nome) {
  return (nome || '').trim().toLowerCase()
}
