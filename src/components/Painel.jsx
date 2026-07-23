import { useMemo } from 'react'
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

export default function Painel({ pedidos }) {
  const metrics = useMemo(() => {
    const entregues = pedidos.filter((p) => p.status === 'entregue')

    const custosConhecidos = entregues.map((p) => pedidoCustoTotal(p)).filter((c) => c != null)
    const gastoTotal = custosConhecidos.reduce((s, c) => s + c, 0)
    const temCustoCompleto = custosConhecidos.length === entregues.length
    const gastoMedio = custosConhecidos.length ? gastoTotal / custosConhecidos.length : 0
    const emAberto = pedidos.filter((p) => p.status !== 'entregue').length

    const porMes = {}
    entregues.forEach((p) => {
      const mes = (p.data_entrega || p.data_pedido || '').slice(0, 7)
      if (!mes) return
      const custo = pedidoCustoTotal(p)
      if (custo == null) return
      porMes[mes] = (porMes[mes] || 0) + custo
    })
    const gastoPorMes = Object.entries(porMes)
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([mes, gasto]) => ({ mes, gasto }))

    const porProduto = {}
    entregues.forEach((p) =>
      (p.pedido_itens || []).forEach((it) => {
        const custo = itemCustoTotal(it)
        if (custo == null) return
        porProduto[it.produto] = (porProduto[it.produto] || 0) + custo
      })
    )
    const topProdutos = Object.entries(porProduto)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 6)
      .map(([produto, total]) => ({ produto, total }))

    const statusCount = STATUS.map((s) => ({
      status: s,
      qtd: pedidos.filter((p) => p.status === s).length,
    })).filter((s) => s.qtd > 0)

    return {
      gastoTotal,
      temCustoCompleto,
      gastoMedio,
      emAberto,
      entreguesCount: entregues.length,
      gastoPorMes,
      topProdutos,
      statusCount,
      total: pedidos.length,
    }
  }, [pedidos])

  return (
    <div className="painel-grid">
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
          <EmptyChart text="Nenhum pedido entregue ainda." />
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
            <EmptyChart text="Nenhum pedido entregue ainda." />
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
          <h3 className="chart-title">Pedidos por status</h3>
          {metrics.statusCount.length === 0 ? (
            <EmptyChart text="Sem pedidos registrados." />
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
    </div>
  )
}
