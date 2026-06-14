// hms-react/src/components/charts/MovementChart.jsx
// No outer card/border here — the parent (DashboardPage ChartCard) provides the container.

import {
  Bar, BarChart, CartesianGrid, Cell,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "#0f172a", borderRadius: 8, padding: "8px 12px",
      fontSize: 12, color: "#fff", boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
    }}>
      <div style={{ fontWeight: 600, marginBottom: 2 }}>{label}</div>
      <div style={{ color: "#94a3b8" }}>Qty: <span style={{ color: "#fff", fontWeight: 700 }}>{payload[0].value}</span></div>
    </div>
  );
};

const MovementChart = ({ data = [], color = "#0d9488" }) => {
  const chartData = data.map(item => ({ name: item.name, quantity: item.quantity }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={chartData} margin={{ top: 4, right: 4, left: -18, bottom: 40 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 11, fill: "#94a3b8", fontWeight: 500 }}
          interval={0}
          angle={-30}
          textAnchor="end"
          height={60}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: "#94a3b8" }}
          axisLine={false}
          tickLine={false}
          allowDecimals={false}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(0,0,0,0.04)", radius: 6 }} />
        <Bar dataKey="quantity" radius={[6, 6, 0, 0]} maxBarSize={56}>
          {chartData.map((_, i) => (
            <Cell key={i} fill={color} fillOpacity={0.85 - i * 0.04} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};

export default MovementChart;