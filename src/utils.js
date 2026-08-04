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

const NOMES_MES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
]

export function nomeMes(mes) {
  return NOMES_MES[mes - 1] || ''
}

// { ano, mes } do mês atual — mes vai de 1 a 12
export function mesAtual() {
  const d = new Date()
  return { ano: d.getFullYear(), mes: d.getMonth() + 1 }
}

export function somarMeses({ ano, mes }, delta) {
  const d = new Date(ano, mes - 1 + delta, 1)
  return { ano: d.getFullYear(), mes: d.getMonth() + 1 }
}

export function primeiroDiaDoMes({ ano, mes }) {
  return new Date(ano, mes - 1, 1).toISOString().slice(0, 10)
}

export function ultimoDiaDoMes({ ano, mes }) {
  return new Date(ano, mes, 0).toISOString().slice(0, 10)
}

// "2026-07" — pra comparar direto com o começo de uma data ISO (data.slice(0,7))
export function mesRefISO({ ano, mes }) {
  return `${ano}-${String(mes).padStart(2, '0')}`
}
