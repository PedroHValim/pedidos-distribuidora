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
import { currency, STATUS, STATUS_LABEL, STATUS_COLOR, pedidoVendaTotal, pedidoCustoTotal, itemVendaTotal } from '../utils.js'

export default function Painel({ pedidos }) {
  const metrics = useMemo(() => {
    const entregues = pedidos.filter((p) => p.status === 'entregue')

    const receita = entregues.reduce((s, p) => s + pedidoVendaTotal(p), 0)
    const custosConhecidos = entregues.map((p) => pedidoCustoTotal(p)).filter((c) => c != null)
    const custoTotal = custosConhecidos.reduce((s, c) => s + c, 0)
    const lucro = receita - custoTotal
    const ticketMedio = entregues.length ? receita / entregues.length : 0
    const emAberto = pedidos.filter((p) => p.status !== 'entregue').length

    const porMes = {}
    entregues.forEach((p) => {
      const mes = (p.data_entrega || p.data_pedido || '').slice(0, 7)
      if (!mes) return
      porMes[mes] = porMes[mes] || { receita: 0, custo: 0, temCusto: true }
      porMes[mes].receita += pedidoVendaTotal(p)
      const c = pedidoCustoTotal(p)
      if (c == null) porMes[mes].temCusto = false
      else porMes[mes].custo += c
    })
    const receitaPorMes = Object.entries(porMes)
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([mes, v]) => ({ mes, receita: v.receita, lucro: v.temCusto ? v.receita - v.custo : null }))

    const porProduto = {}
    entregues.forEach((p) =>
      (p.pedido_itens || []).forEach((it) => {
        porProduto[it.produto] = (porProduto[it.produto] || 0) + itemVendaTotal(it)
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

    return { receita, lucro, temCustoCompleto: custosConhecidos.length === entregues.length, ticketMedio, emAberto, receitaPorMes, topProdutos, statusCount, total: pedidos.length }
  }, [pedidos])

  return (
    <div className="painel-grid">
      <div className="stats-row">
        <StatCard label="Receita entregue" value={currency(metrics.receita)} />
        <StatCard
          label="Lucro estimado"
          value={metrics.temCustoCompleto ? currency(metrics.lucro) : `~${currency(metrics.lucro)}`}
          accent="#2F6F62"
        />
        <StatCard label="Ticket médio" value={currency(metrics.ticketMedio)} />
        <StatCard label="Pedidos em aberto" value={metrics.emAberto} accent="#D98E04" />
      </div>

      <div className="chart-card">
        <h3 className="chart-title">Receita e lucro entregues por mês</h3>
        {metrics.receitaPorMes.length === 0 ? (
          <EmptyChart text="Nenhum pedido entregue ainda." />
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={metrics.receitaPorMes} margin={{ left: 8, right: 8 }}>
              <CartesianGrid stroke="#E6E4DC" vertical={false} />
              <XAxis dataKey="mes" tick={{ fontSize: 12, fill: '#6B7268' }} axisLine={{ stroke: '#D8D6CC' }} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#6B7268' }} axisLine={false} tickLine={false} width={72} tickFormatter={(v) => currency(v)} />
              <Tooltip formatter={(v) => currency(v)} contentStyle={{ border: '1px solid #E6E4DC', borderRadius: 8, fontSize: 12.5 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="receita" name="Receita" fill="#2F6F62" radius={[4, 4, 0, 0]} maxBarSize={40} />
              <Bar dataKey="lucro" name="Lucro" fill="#D98E04" radius={[4, 4, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="chart-row">
        <div className="chart-card">
          <h3 className="chart-title">Produtos mais vendidos</h3>
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
