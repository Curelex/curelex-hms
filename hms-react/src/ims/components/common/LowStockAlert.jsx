const LowStockAlert = ({ items }) => {
  if (!items || items.length === 0) return null;

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 text-amber-600">⚠</span>
        <div>
          <p className="text-sm font-semibold text-amber-800">
            Low / Out of Stock Alert — {items.length} product{items.length !== 1 ? "s" : ""} need attention
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {items.map((entry, i) => {
              const product = entry.product || {};
              const isOut = entry.quantity === 0;
              return (
                <span
                  key={i}
                  className={`rounded-full px-3 py-0.5 text-xs font-medium ${
                    isOut
                      ? "bg-red-100 text-red-700"
                      : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {product.name || "Unknown"} — {entry.quantity} left
                  {isOut ? " (OUT)" : ""}
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LowStockAlert;