import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const MovementChart = ({ data, title = "Fast Moving Products", color = "#0d9488" }) => {
  const chartData = data.map((item) => ({
    name: item.name,
    quantity: item.quantity
  }));

  return (
    <div className="h-72 rounded-xl border border-brand-100 bg-white p-4 shadow-sm">
      <h3 className="mb-3 text-sm font-semibold text-slate-800">{title}</h3>
      <ResponsiveContainer width="100%" height="90%">
        <BarChart data={chartData} margin={{ top: 8, right: 10, left: -20, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#ecf0f7" />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 12 }}
            interval={0}
            angle={-20}
            textAnchor="end"
            height={60}
          />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip />
          <Bar dataKey="quantity" fill={color} radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default MovementChart;