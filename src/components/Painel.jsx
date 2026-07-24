import { useMemo, useState } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'
import { StatCard, EmptyChart } from './ui.jsx'
import { currency, STATUS, STATUS_LABEL, STATUS_COLOR, pedidoCustoTotal, itemCustoTotal } from '../utils.js'

const METODO_COLORS = ['#2F6F62', '#D98E04', '#3B82C4', '#8A5FBF', '#C1443A', '#B58A1E']

function hoje() {
  return new Date().toISOString().slice(0, 10)
}

function diasAtras(n) {
  const d = new Date()
  d.setDate(d.getDate() - n + 1)
  return d.toISOString().slice(0, 10)
}

function inicioDoMes() {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10)
}

export default function Painel({ pedidos, clientes, metodosPagamento }) {
  const [clienteId, setClienteId] = useState('')
  const [presetPeriodo, setPresetPeriodo] = useState('tudo')
  const [dataDe, setDataDe] = useState('')
  const [dataAte, setDataAte] = useState('')
  const [valorDe, setValorDe] = useState('')
  const [valorAte, setValorAte] = useState('')
  const [metodosSelecionados, setMetodosSelecionados] = useState([])

  function aplicarPreset(preset) {
    setPresetPeriodo(preset)
    if (preset === 'tudo') {
      setDataDe('')
      setDataAte('')
    } else if (preset === '7d') {
      setDataDe(diasAtras(7))
      setDataAte(hoje())
    } else if (preset === '30d') {
      setDataDe(diasAtras(30))
      setDataAte(hoje())
    } else if (preset === 'mes') {
      setDataDe(inicioDoMes())
      setDataAte(hoje())
    }
  }

  function onDataManual(campo, valor) {
    setPresetPeriodo(null)
    if (campo === 'de') setDataDe(valor)
    else setDataAte(valor)
  }

  function toggleMetodo(id) {
    setMetodosSelecionados((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  function limparFiltros() {
    setClienteId('')
    setPresetPeriodo('tudo')
    setDataDe('')
    setDataAte('')
    setValorDe('')
    setValorAte('')
    setMetodosSelecionados([])
  }

  const temFiltroAtivo =
    clienteId || dataDe || dataAte || valorDe || valorAte || metodosSelecionados.length > 0

  const metrics = useMemo(() => {
    const dateRef = (p) => p.data_entrega || p.data_pedido || ''

    const baseFiltrados = pedidos.filter((p) => {
      if (clienteId && p.cliente?.id !== clienteId) return false
      const ref = dateRef(p)
      if (dataDe && ref < dataDe) return false
      if (dataAte && ref > dataAte) return false
      return true
    })

    // Formas de pagamento e faixa de valor só fazem sentido para pedidos já
    // entregues (custo completo e conhecido).
    const entreguesFiltrados = baseFiltrados.filter((p) => {
      if (p.status !== 'entregue') return false
      const custo = pedidoCustoTotal(p)
      if (valorDe && (custo == null || custo < Number(valorDe))) return false
      if (valorAte && (custo == null || custo > Number(valorAte))) return false
      if (metodosSelecionados.length > 0) {
        const metodosDoPedido = (p.pedido_itens || []).map((it) => it.metodo_pagamento_id).filter(Boolean)
        if (!metodosSelecionados.some((id) => metodosDoPedido.includes(id))) return false
      }
      return true
    })

    const custosConhecidos = entreguesFiltrados.map((p) => pedidoCustoTotal(p)).filter((c) => c != null)
    const gastoTotal = custosConhecidos.reduce((s, c) => s + c, 0)
    const temCustoCompleto = custosConhecidos.length === entreguesFiltrados.length
    const gastoMedio = custosConhecidos.length ? gastoTotal / custosConhecidos.length : 0

    const emAberto = baseFiltrados.filter((p) => p.status !== 'entregue').length

    const porMes = {}
    entreguesFiltrados.forEach((p) => {
      const mes = dateRef(p).slice(0, 7)
      if (!mes) return
      const c = pedidoCustoTotal(p)
      if (c == null) return
      porMes[mes] = (porMes[mes] || 0) + c
    })
    const gastoPorMes = Object.entries(porMes)
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([mes, gasto]) => ({ mes, gasto }))

    const porProduto = {}
    entreguesFiltrados.forEach((p) =>
      (p.pedido_itens || []).forEach((it) => {
        const c = itemCustoTotal(it)
        if (c == null) return
        porProduto[it.produto] = (porProduto[it.produto] || 0) + c
      })
    )
    const topProdutos = Object.entries(porProduto)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 6)
      .map(([produto, total]) => ({ produto, total }))

    const porMetodo = {}
    entreguesFiltrados.forEach((p) =>
      (p.pedido_itens || []).forEach((it) => {
        const c = itemCustoTotal(it)
        if (c == null) return
        const nome = it.metodo_pagamento?.nome || 'Não informado'
        porMetodo[nome] = (porMetodo[nome] || 0) + c
      })
    )
    const porMetodoArr = Object.entries(porMetodo)
      .map(([metodo, total]) => ({ metodo, total }))
      .sort((a, b) => b.total - a.total)

    const statusCount = STATUS.map((s) => ({
      status: s,
      qtd: baseFiltrados.filter((p) => p.status === s).length,
    })).filter((s) => s.qtd > 0)

    return {
      gastoTotal,
      temCustoCompleto,
      gastoMedio,
      emAberto,
      entreguesCount: entreguesFiltrados.length,
      gastoPorMes,
      topProdutos,
      porMetodoArr,
      statusCount,
    }
  }, [pedidos, clienteId, dataDe, dataAte, valorDe, valorAte, metodosSelecionados])

  return (
    <div className="painel-grid">
      <div className="card filtros-painel">
        <div className="filtros-header">
          <h3 className="card-title filtros-title">Filtros</h3>
          {temFiltroAtivo && (
            <button type="button" className="text-btn" onClick={limparFiltros}>
              Limpar filtros
            </button>
          )}
        </div>

        <div className="filtro-grupo">
          <span className="filtro-label">Cliente</span>
          <select className="input" value={clienteId} onChange={(e) => setClienteId(e.target.value)}>
            <option value="">Todos os clientes</option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </div>

        <div className="filtro-grupo">
          <span className="filtro-label">Período</span>
          <div className="filter-chips">
            <button className={`chip ${presetPeriodo === 'tudo' ? 'chip-active' : ''}`} onClick={() => aplicarPreset('tudo')}>
              Tudo
            </button>
            <button className={`chip ${presetPeriodo === '7d' ? 'chip-active' : ''}`} onClick={() => aplicarPreset('7d')}>
              Últimos 7 dias
            </button>
            <button className={`chip ${presetPeriodo === '30d' ? 'chip-active' : ''}`} onClick={() => aplicarPreset('30d')}>
              Últimos 30 dias
            </button>
            <button className={`chip ${presetPeriodo === 'mes' ? 'chip-active' : ''}`} onClick={() => aplicarPreset('mes')}>
              Este mês
            </button>
          </div>
          <div className="filtro-range">
            <input type="date" className="input" value={dataDe} onChange={(e) => onDataManual('de', e.target.value)} />
            <span className="filtro-range-ate">até</span>
            <input type="date" className="input" value={dataAte} onChange={(e) => onDataManual('ate', e.target.value)} />
          </div>
        </div>

        <div className="filtro-grupo">
          <span className="filtro-label">Gasto do pedido (R$)</span>
          <div className="filtro-range">
            <input
              type="number"
              min="0"
              className="input"
              placeholder="de"
              value={valorDe}
              onChange={(e) => setValorDe(e.target.value)}
            />
            <span className="filtro-range-ate">até</span>
            <input
              type="number"
              min="0"
              className="input"
              placeholder="até"
              value={valorAte}
              onChange={(e) => setValorAte(e.target.value)}
            />
          </div>
        </div>

        <div className="filtro-grupo">
          <span className="filtro-label">Forma de pagamento (compra)</span>
          <div className="filter-chips">
            {metodosPagamento.map((m) => (
              <button
                key={m.id}
                className={`chip ${metodosSelecionados.includes(m.id) ? 'chip-active' : ''}`}
                onClick={() => toggleMetodo(m.id)}
              >
                {m.nome}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="stats-row">
        <StatCard
          label="Total gasto"
          value={metrics.temCustoCompleto ? currency(metrics.gastoTotal) : `~${currency(metrics.gastoTotal)}`}
          accent="#C1443A"
        />
        <StatCard label="Gasto médio por pedido" value={currency(metrics.gastoMedio)} />
        <StatCard label="Pedidos entregues" value={metrics.entreguesCount} />
        <StatCard label="Pedidos em aberto" value={metrics.emAberto} accent="#D98E04" />
      </div>

      <div className="chart-card">
        <h3 className="chart-title">Gasto por mês</h3>
        {metrics.gastoPorMes.length === 0 ? (
          <EmptyChart text="Nenhum pedido entregue no período filtrado." />
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={metrics.gastoPorMes} margin={{ left: 8, right: 8 }}>
              <CartesianGrid stroke="#E6E4DC" vertical={false} />
              <XAxis dataKey="mes" tick={{ fontSize: 12, fill: '#6B7268' }} axisLine={{ stroke: '#D8D6CC' }} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#6B7268' }} axisLine={false} tickLine={false} width={72} tickFormatter={(v) => currency(v)} />
              <Tooltip formatter={(v) => currency(v)} contentStyle={{ border: '1px solid #E6E4DC', borderRadius: 8, fontSize: 12.5 }} />
              <Bar dataKey="gasto" name="Gasto" fill="#C1443A" radius={[4, 4, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="chart-row">
        <div className="chart-card">
          <h3 className="chart-title">Produtos com maior gasto</h3>
          {metrics.topProdutos.length === 0 ? (
            <EmptyChart text="Nenhum pedido entregue no período filtrado." />
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={metrics.topProdutos} layout="vertical" margin={{ left: 8, right: 16 }}>
                <CartesianGrid stroke="#E6E4DC" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 12, fill: '#6B7268' }} axisLine={false} tickLine={false} tickFormatter={(v) => currency(v)} />
                <YAxis type="category" dataKey="produto" tick={{ fontSize: 12, fill: '#3A3F38' }} axisLine={false} tickLine={false} width={140} />
                <Tooltip formatter={(v) => currency(v)} contentStyle={{ border: '1px solid #E6E4DC', borderRadius: 8, fontSize: 12.5 }} />
                <Bar dataKey="total" fill="#D98E04" radius={[0, 4, 4, 0]} maxBarSize={20} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="chart-card">
          <h3 className="chart-title">Gasto por forma de pagamento</h3>
          {metrics.porMetodoArr.length === 0 ? (
            <EmptyChart text="Nenhum pedido entregue no período filtrado." />
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={metrics.porMetodoArr} layout="vertical" margin={{ left: 8, right: 16 }}>
                <CartesianGrid stroke="#E6E4DC" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 12, fill: '#6B7268' }} axisLine={false} tickLine={false} tickFormatter={(v) => currency(v)} />
                <YAxis type="category" dataKey="metodo" tick={{ fontSize: 12, fill: '#3A3F38' }} axisLine={false} tickLine={false} width={90} />
                <Tooltip formatter={(v) => currency(v)} contentStyle={{ border: '1px solid #E6E4DC', borderRadius: 8, fontSize: 12.5 }} />
                <Bar dataKey="total" radius={[0, 4, 4, 0]} maxBarSize={22}>
                  {metrics.porMetodoArr.map((_, i) => (
                    <Cell key={i} fill={METODO_COLORS[i % METODO_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="chart-card">
        <h3 className="chart-title">Pedidos por status</h3>
        {metrics.statusCount.length === 0 ? (
          <EmptyChart text="Sem pedidos no período filtrado." />
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={metrics.statusCount} dataKey="qtd" nameKey="status" cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={2}>
                {metrics.statusCount.map((s) => (
                  <Cell key={s.status} fill={STATUS_COLOR[s.status]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(v, n, entry) => [v, STATUS_LABEL[entry.payload.status]]}
                contentStyle={{ border: '1px solid #E6E4DC', borderRadius: 8, fontSize: 12.5 }}
              />
              <Legend
                iconType="circle"
                formatter={(value, entry) => STATUS_LABEL[entry.payload.status] || value}
                wrapperStyle={{ fontSize: 12, color: '#6B7268' }}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
