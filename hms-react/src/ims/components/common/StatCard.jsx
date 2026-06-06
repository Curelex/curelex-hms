const StatCard = ({ title, value, subtitle, valueClass = "text-slate-900" }) => {
  return (
    <div className="rounded-xl border border-brand-100 bg-white p-4 shadow-sm">
      <p className="text-xs uppercase tracking-widest text-brand-600">{title}</p>
      <p className={`mt-2 text-2xl font-semibold ${valueClass}`}>{value}</p>
      {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
    </div>
  );
};

export default StatCard;