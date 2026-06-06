const DataTable = ({ columns, rows }) => {
  return (
    <div className="overflow-x-auto rounded-xl border border-brand-100 bg-white shadow-sm">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-brand-50 text-slate-700">
          <tr>
            {columns.map((column) => (
              <th key={column.key} className="px-4 py-3 font-semibold">
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-6 text-center text-slate-500">
                No records found
              </td>
            </tr>
          ) : (
            rows.map((row, rowIndex) => (
              <tr key={row.id || rowIndex} className="border-t border-brand-100/70">
                {columns.map((column) => (
                  <td key={`${row.id || rowIndex}-${column.key}`} className="px-4 py-3 text-slate-700">
                    {column.render ? column.render(row) : row[column.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default DataTable;
