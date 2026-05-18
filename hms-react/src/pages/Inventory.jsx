import React, { useEffect, useState } from 'react';
import API from '../utils/api';

const emptyForm = { name:'', category:'Medicine', description:'', quantity:0, unit:'units', unitPrice:0, reorderLevel:10, location:'' };

export default function Inventory() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [lowStock, setLowStock] = useState(false);
  const [page, setPage] = useState(1);
  const [txModal, setTxModal] = useState(null);
  const [tx, setTx] = useState({ type:'IN', quantity:1, reason:'' });

  const fetchItems = async () => {
    setLoading(true);
    try {
      let url = `/inventory?page=${page}&limit=15`;
      if (search) url += `&search=${search}`;
      if (filterCategory) url += `&category=${filterCategory}`;
      if (lowStock) url += `&lowStock=true`;
      const { data } = await API.get(url);
      setItems(data.items); setTotal(data.total);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchItems(); }, [page, search, filterCategory, lowStock]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (editId) await API.put(`/inventory/${editId}`, form);
    else await API.post('/inventory', form);
    setModal(false); setForm(emptyForm); setEditId(null); fetchItems();
  };

  const handleTransaction = async (e) => {
    e.preventDefault();
    await API.post(`/inventory/${txModal}/transaction`, tx);
    setTxModal(null); setTx({ type:'IN', quantity:1, reason:'' }); fetchItems();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this item?')) return;
    await API.delete(`/inventory/${id}`); fetchItems();
  };

  const pages = Math.ceil(total/15);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Inventory</h1>
        <button className="btn btn-primary" onClick={() => { setForm(emptyForm); setEditId(null); setModal(true); }}>+ Add Item</button>
      </div>

      <div className="card">
        <div className="filter-bar">
          <div className="search-wrap">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input className="search-input" placeholder="Search items..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
          </div>
          <select className="form-control" value={filterCategory} onChange={e => { setFilterCategory(e.target.value); setPage(1); }} style={{ width:160 }}>
            <option value="">All Categories</option>
            <option>Medicine</option><option>Equipment</option><option>Consumable</option><option>Surgical</option><option>Other</option>
          </select>
          <label style={{ display:'flex', alignItems:'center', gap:6, fontSize:13, cursor:'pointer' }}>
            <input type="checkbox" checked={lowStock} onChange={e => setLowStock(e.target.checked)} />
            Low Stock Only
          </label>
        </div>

        {loading ? <div className="spinner" /> : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr><th>Code</th><th>Name</th><th>Category</th><th>Qty / Unit</th><th>Unit Price</th><th>Total Value</th><th>Reorder</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr><td colSpan="8" className="empty-state">No items found</td></tr>
                ) : items.map(item => {
                  const isLow = item.quantity <= item.reorderLevel;
                  return (
                    <tr key={item._id}>
                      <td><strong style={{ color:'var(--primary)' }}>{item.itemCode}</strong></td>
                      <td><strong>{item.name}</strong><br/><span className="text-muted text-small">{item.location}</span></td>
                      <td><span className="badge badge-info">{item.category}</span></td>
                      <td style={{ color: isLow ? 'var(--danger)' : undefined, fontWeight: isLow ? 700 : undefined }}>
                        {item.quantity} {item.unit} {isLow && '⚠️'}
                      </td>
                      <td>₹{item.unitPrice}</td>
                      <td>₹{item.totalValue?.toLocaleString()}</td>
                      <td>{item.reorderLevel} {item.unit}</td>
                      <td>
                        <div className="flex gap-2">
                          <button className="btn btn-sm btn-success" onClick={() => setTxModal(item._id)}>Stock</button>
                          <button className="btn btn-sm btn-outline" onClick={() => { setForm({...item}); setEditId(item._id); setModal(true); }}>Edit</button>
                          <button className="btn btn-sm btn-danger" onClick={() => handleDelete(item._id)}>Del</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {pages > 1 && (
          <div className="pagination">
            <button className="page-btn" onClick={() => setPage(p=>Math.max(1,p-1))} disabled={page===1}>‹</button>
            {Array.from({length:pages},(_,i)=>(<button key={i+1} className={`page-btn ${page===i+1?'active':''}`} onClick={()=>setPage(i+1)}>{i+1}</button>))}
            <button className="page-btn" onClick={() => setPage(p=>Math.min(pages,p+1))} disabled={page===pages}>›</button>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {modal && (
        <div className="modal-overlay" onClick={() => setModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{editId ? 'Edit Item' : 'Add Inventory Item'}</h3>
              <button className="modal-close" onClick={() => setModal(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Item Name *</label>
                    <input className="form-control" value={form.name} onChange={e => setForm({...form,name:e.target.value})} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Category *</label>
                    <select className="form-control" value={form.category} onChange={e => setForm({...form,category:e.target.value})}>
                      <option>Medicine</option><option>Equipment</option><option>Consumable</option><option>Surgical</option><option>Other</option>
                    </select>
                  </div>
                </div>
                <div className="form-row-3">
                  <div className="form-group">
                    <label className="form-label">Quantity</label>
                    <input className="form-control" type="number" value={form.quantity} onChange={e => setForm({...form,quantity:e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Unit</label>
                    <input className="form-control" value={form.unit} onChange={e => setForm({...form,unit:e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Unit Price (₹)</label>
                    <input className="form-control" type="number" value={form.unitPrice} onChange={e => setForm({...form,unitPrice:e.target.value})} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Reorder Level</label>
                    <input className="form-control" type="number" value={form.reorderLevel} onChange={e => setForm({...form,reorderLevel:e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Location</label>
                    <input className="form-control" value={form.location} onChange={e => setForm({...form,location:e.target.value})} placeholder="e.g. Ward A, Shelf 3" />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <input className="form-control" value={form.description} onChange={e => setForm({...form,description:e.target.value})} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editId ? 'Update Item' : 'Add Item'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Transaction Modal */}
      {txModal && (
        <div className="modal-overlay" onClick={() => setTxModal(null)}>
          <div className="modal" style={{ maxWidth:400 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Stock Transaction</h3>
              <button className="modal-close" onClick={() => setTxModal(null)}>×</button>
            </div>
            <form onSubmit={handleTransaction}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Transaction Type</label>
                  <select className="form-control" value={tx.type} onChange={e => setTx({...tx,type:e.target.value})}>
                    <option value="IN">Stock IN (Add)</option>
                    <option value="OUT">Stock OUT (Remove)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Quantity</label>
                  <input className="form-control" type="number" min="1" value={tx.quantity} onChange={e => setTx({...tx,quantity:parseInt(e.target.value)})} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Reason</label>
                  <input className="form-control" value={tx.reason} onChange={e => setTx({...tx,reason:e.target.value})} placeholder="e.g. Purchase, Expired, Used" />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setTxModal(null)}>Cancel</button>
                <button type="submit" className={`btn ${tx.type === 'IN' ? 'btn-success' : 'btn-danger'}`}>
                  {tx.type === 'IN' ? '+ Add Stock' : '- Remove Stock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}