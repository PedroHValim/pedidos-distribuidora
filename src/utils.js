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

// Converte um Date pra "AAAA-MM-DD" usando o fuso do celular, não UTC.
// Usar toISOString() aqui fazia um pedido registrado depois das 21h (horário
// de Brasília) nascer com a data do dia seguinte, porque nesse horário já é
// o outro dia em UTC.
function isoLocal(d) {
  const mes = String(d.getMonth() + 1).padStart(2, '0')
  const dia = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mes}-${dia}`
}

export function todayISO() {
  return isoLocal(new Date())
}

// "AAAA-MM-DD" de n dias atrás, contando hoje como o primeiro dia
export function diasAtrasISO(n) {
  const d = new Date()
  d.setDate(d.getDate() - n + 1)
  return isoLocal(d)
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

// Só quando a forma de pagamento é "Crédito" faz sentido perguntar qual
// cartão e em quantas vezes foi parcelado.
export function metodoEhCredito(metodoId, metodosPagamento) {
  const metodo = metodosPagamento.find((m) => m.id === metodoId)
  return metodo?.nome?.toLowerCase() === 'crédito'
}

// Unidade padrão pra item novo/sem info: a unidade genérica "UNIDADES",
// nunca a primeira da lista — como a lista vem em ordem alfabética,
// `unidades[0]` seria "CAIXAS", o que preenchia item novo com a unidade errada.
export function unidadePadraoId(unidades) {
  return unidades.find((u) => u.nome?.toUpperCase() === 'UNIDADES')?.id || unidades[0]?.id || ''
}

// Normaliza pra comparar nomes (produto, empresa...): ignora maiúscula/
// minúscula, acento (peça = peca) e espaços extras. Só usado pra comparar —
// o nome digitado continua sendo salvo do jeito que a pessoa escreveu.
export function normalizaTexto(nome) {
  return (nome || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
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
  return isoLocal(new Date(ano, mes - 1, 1))
}

export function ultimoDiaDoMes({ ano, mes }) {
  return isoLocal(new Date(ano, mes, 0))
}

// "2026-07" — pra comparar direto com o começo de uma data ISO (data.slice(0,7))
export function mesRefISO({ ano, mes }) {
  return `${ano}-${String(mes).padStart(2, '0')}`
}
