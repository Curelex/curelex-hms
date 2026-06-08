// hms-react/src/pages/StockTransactions.jsx
import React, { useEffect, useState } from 'react';
import inventoryService from '../services/inventoryService';

export default function StockTransactions() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);
  const [transactionForm, setTransactionForm] = useState({ type: 'IN', quantity: 1, reason: '', unitPrice: '', referenceNumber: '', notes: '' });
  const [history, setHistory] = useState(null);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');

  const fetchItems = async () => {
    setLoading(true);
    try {
      let params = { limit: 50 };
      if (search) params.search = search;
      if (filterCategory) params.category = filterCategory;
      const { data } = await inventoryService.getItems(params);
      setItems(data.items);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchItems(); }, [search, filterCategory]);

  const handleTransaction = async (e) => {
    e.preventDefault();
    try {
      await inventoryService.addTransaction(selectedItem._id, transactionForm);
      alert(`${transactionForm.type === 'IN' ? 'Stock added' : 'Stock removed'} successfully`);
      setSelectedItem(null);
      setTransactionForm({ type: 'IN', quantity: 1, reason: '', unitPrice: '', referenceNumber: '', notes: '' });
      fetchItems();
    } catch (err) {
      alert(err.response?.data?.message || 'Transaction failed');
    }
  };

  const handleViewHistory = async (item) => {
    try {
      const { data } = await inventoryService.getTransactions(item._id, 50);
      setHistory({ item: data.item, transactions: data.transactions });
    } catch (err) {
      alert('Failed to load history');
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Stock Transactions</h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Left: Item List */}
        <div className="card">
          <h3 style={{ marginBottom: 16 }}>Inventory Items</h3>
          <div className="filter-bar" style={{ marginBottom: 12 }}>
            <div className="search-wrap">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input className="search-input" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <select className="form-control" value={filterCategory} onChange={e => setFilterCategory(e.target.value)} style={{ width: 130 }}>
              <option value="">All</option>
              <option>Medicine</option><option>Equipment</option><option>Consumable</option><option>Surgical</option>
            </select>
          </div>
          <div style={{ maxHeight: 500, overflowY: 'auto' }}>
            {loading ? <div className="spinner" /> : items.map(item => {
              const isLow = item.quantity <= item.reorderLevel;
              return (
                <div key={item._id} style={{ padding: '12px', borderBottom: '1px solid var(--border)', cursor: 'pointer', background: selectedItem?._id === item._id ? '#eff6ff' : 'transparent' }} onClick={() => { setSelectedItem(item); setHistory(null); }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div><strong>{item.name}</strong><br/><span className="text-muted text-small">{item.itemCode}</span></div>
                    <div style={{ textAlign: 'right' }}><div style={{ fontSize: 20, fontWeight: 700, color: isLow ? 'var(--danger)' : '#1e293b' }}>{item.quantity} {item.unit}</div>
                    <div className="text-muted text-small">Reorder: {item.reorderLevel}</div></div>
                  </div>
                  <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                    <button className="btn btn-sm btn-success" onClick={(e) => { e.stopPropagation(); setSelectedItem(item); setTransactionForm({ type: 'IN', quantity: 1, reason: '', unitPrice: '', referenceNumber: '', notes: '' }); }}>+ Stock IN</button>
                    <button className="btn btn-sm btn-danger" onClick={(e) => { e.stopPropagation(); setSelectedItem(item); setTransactionForm({ type: 'OUT', quantity: 1, reason: '', unitPrice: '', referenceNumber: '', notes: '' }); }}>- Stock OUT</button>
                    <button className="btn btn-sm btn-ghost" onClick={(e) => { e.stopPropagation(); handleViewHistory(item); }}>History</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Transaction Form or History */}
        <div>
          {history ? (
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={{ margin: 0 }}>Transaction History - {history.item?.name}</h3>
                <button className="btn btn-sm btn-ghost" onClick={() => setHistory(null)}>← Back</button>
              </div>
              <div className="table-wrapper">
                <table><thead><tr><th>Date</th><th>Type</th><th>Qty</th><th>Unit Price</th><th>Total</th><th>Reason</th><th>Reference</th></tr></thead>
                <tbody>{history.transactions?.length === 0 ? (<tr><td colSpan="7" className="empty-state">No transactions</td></tr>) : history.transactions.map((t, i) => (
                  <tr key={i}><td>{new Date(t.date).toLocaleString()}</td><td><span className={`badge ${t.type === 'IN' ? 'badge-success' : 'badge-danger'}`}>{t.type}</span></td><td>{t.quantity}</td><td>₹{t.unitPrice}</td><td>₹{t.totalPrice}</td><td>{t.reason || '—'}</td><td>{t.referenceNumber || '—'}</td></tr>
                ))}</tbody></table>
              </div>
            </div>
          ) : selectedItem ? (
            <div className="card">
              <h3 style={{ marginBottom: 16 }}>{transactionForm.type === 'IN' ? '➕ Stock IN' : '➖ Stock OUT'} - {selectedItem.name}</h3>
              <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, marginBottom: 16 }}>
                <div>Current Stock: <strong>{selectedItem.quantity} {selectedItem.unit}</strong></div>
                <div>Reorder Level: {selectedItem.reorderLevel} {selectedItem.unit}</div>
              </div>
              <form onSubmit={handleTransaction}>
                <div className="form-group"><label className="form-label">Quantity *</label><input className="form-control" type="number" min="1" value={transactionForm.quantity} onChange={e => setTransactionForm({...transactionForm, quantity: parseInt(e.target.value)})} required /></div>
                {transactionForm.type === 'IN' && (<div className="form-group"><label className="form-label">Unit Price (₹) - Optional</label><input className="form-control" type="number" value={transactionForm.unitPrice} onChange={e => setTransactionForm({...transactionForm, unitPrice: parseFloat(e.target.value)})} /></div>)}
                <div className="form-group"><label className="form-label">Reason / Reference</label><input className="form-control" value={transactionForm.reason} onChange={e => setTransactionForm({...transactionForm, reason: e.target.value})} placeholder={transactionForm.type === 'IN' ? 'Purchase Order #, Supplier name' : 'Department, Patient name, etc.'} /></div>
                <div className="form-group"><label className="form-label">Reference Number (PO/Invoice)</label><input className="form-control" value={transactionForm.referenceNumber} onChange={e => setTransactionForm({...transactionForm, referenceNumber: e.target.value})} /></div>
                <div className="form-group"><label className="form-label">Notes</label><textarea className="form-control" rows={2} value={transactionForm.notes} onChange={e => setTransactionForm({...transactionForm, notes: e.target.value})} /></div>
                <div className="flex gap-2"><button type="button" className="btn btn-ghost" onClick={() => setSelectedItem(null)}>Cancel</button><button type="submit" className={`btn ${transactionForm.type === 'IN' ? 'btn-success' : 'btn-danger'}`}>Confirm {transactionForm.type === 'IN' ? 'Stock IN' : 'Stock OUT'}</button></div>
              </form>
            </div>
          ) : (
            <div className="card" style={{ textAlign: 'center', padding: 60, color: '#94a3b8' }}><div style={{ fontSize: 48, marginBottom: 12 }}>📦</div><div>Select an item from the left to manage stock</div></div>
          )}
        </div>
      </div>
    </div>
  );
}