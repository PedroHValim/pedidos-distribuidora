import { CheckCircle2, Circle, Truck, ArrowDownRight, ArrowUpRight, Minus, ChevronLeft, ChevronRight } from 'lucide-react'
import { STATUS_COLOR, STATUS_LABEL, currency, nomeMes, mesAtual } from '../utils.js'

export function StatusBadge({ status }) {
  const Icon = status === 'entregue' ? CheckCircle2 : status === 'separado' ? Truck : Circle
  const color = STATUS_COLOR[status]
  return (
    <span className="badge" style={{ color, borderColor: color }}>
      <Icon size={12} /> {STATUS_LABEL[status]}
    </span>
  )
}

export function Field({ label, children }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
    </label>
  )
}

export function StatCard({ label, value, accent }) {
  return (
    <div className="stat-card">
      <div className="stat-label">{label}</div>
      <div className="stat-value" style={accent ? { color: accent } : undefined}>
        {value}
      </div>
    </div>
  )
}

export function EmptyChart({ text }) {
  return <div className="empty-chart">{text}</div>
}

// Navegador de mês: sempre abre no mês atual, com setas pra ver meses anteriores.
export function MonthNavigator({ ano, mes, onNavegar, onMesAtual }) {
  const atual = mesAtual()
  const ehMesAtual = ano === atual.ano && mes === atual.mes

  return (
    <div className="month-nav">
      <button type="button" className="month-nav-btn" onClick={() => onNavegar(-1)} aria-label="Mês anterior">
        <ChevronLeft size={16} />
      </button>
      <span className="month-nav-label">
        {nomeMes(mes)} de {ano}
      </span>
      <button type="button" className="month-nav-btn" onClick={() => onNavegar(1)} aria-label="Próximo mês">
        <ChevronRight size={16} />
      </button>
      {!ehMesAtual && (
        <button type="button" className="text-btn month-nav-hoje" onClick={onMesAtual}>
          Mês atual
        </button>
      )}
    </div>
  )
}

// Compara o preço pago agora com a média histórica do mesmo produto.
// bom = abaixo da média · médio = até 10% acima · ruim = mais de 10% acima
export function PriceIndicator({ atual, media }) {
  if (media == null || atual == null || atual <= 0) return null
  const diff = (atual - media) / media

  let estado = 'medio'
  let Icon = Minus
  let color = '#B58A1E'
  if (atual < media) {
    estado = 'bom'
    Icon = ArrowDownRight
    color = '#3B7A57'
  } else if (diff > 0.1) {
    estado = 'ruim'
    Icon = ArrowUpRight
    color = '#C1443A'
  }

  const label = estado === 'bom' ? 'abaixo da média' : estado === 'ruim' ? 'acima da média' : 'na média'
  const sinal = diff > 0 ? '+' : ''

  return (
    <span className="price-indicator" style={{ color }} title={`Média histórica: ${currency(media)}`}>
      <Icon size={14} /> {label} ({sinal}
      {(diff * 100).toFixed(0)}%)
    </span>
  )
}
