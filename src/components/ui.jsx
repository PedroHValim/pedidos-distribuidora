import { useMemo, useState } from 'react'
import { CheckCircle2, Circle, Truck, ChevronLeft, ChevronRight } from 'lucide-react'
import { STATUS_COLOR, STATUS_LABEL, nomeMes, mesAtual, normalizaProduto } from '../utils.js'

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

// Campo de produto com autocompletar: sugere produtos já cadastrados
// enquanto a pessoa digita. Se ela digitar um nome novo, o produto entra
// pra lista automaticamente ao salvar o pedido (isso acontece em App.jsx,
// aqui é só a digitação + sugestão).
export function ProdutoAutocomplete({ value, onChange, produtos, className, placeholder, title }) {
  const [aberto, setAberto] = useState(false)

  const sugestoes = useMemo(() => {
    const termo = normalizaProduto(value)
    if (!termo) return []
    return produtos.filter((p) => normalizaProduto(p.nome).includes(termo)).slice(0, 6)
  }, [value, produtos])

  return (
    <div className="produto-autocomplete">
      <input
        className={className}
        placeholder={placeholder}
        title={title}
        value={value}
        onChange={(e) => {
          onChange(e.target.value)
          setAberto(true)
        }}
        onFocus={() => setAberto(true)}
        onBlur={() => setTimeout(() => setAberto(false), 150)}
      />
      {aberto && sugestoes.length > 0 && (
        <ul className="produto-sugestoes">
          {sugestoes.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onChange(p.nome)
                  setAberto(false)
                }}
              >
                {p.nome}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
