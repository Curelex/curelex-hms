// hms-react/src/pages/InventoryUnified.jsx
import React, { useEffect, useState } from 'react';
import API from '../utils/api';
import inventoryService from '../services/inventoryService';
import vendorService from '../services/vendorService';

const emptyForm = {
  name: '', category: 'Medicine', description: '', quantity: 0, unit: 'units',
  unitPrice: 0, reorderLevel: 10, location: '', vendor: '',
  // Equipment fields
  equipmentDetails: {
    serialNumber: '', modelNumber: '', manufacturer: '', purchaseDate: '',
    warrantyExpiry: '', condition: 'Good', assignedTo: '', maintenanceIntervalDays: 90
  }
};

const categoryOptions = ['Medicine', 'Equipment', 'Consumable', 'Surgical', 'Other'];
const conditionOptions = ['Excellent', 'Good', 'Fair', 'Poor', 'Under Repair', 'Decommissioned'];
const unitOptions = ['Units', 'Box', 'Pack', 'Vial', 'Strip', 'Bottle', 'Pair', 'Set', 'Kg', 'Liter'];

export default function Inventory() {
  const [activeTab, setActiveTab] = useState('inventory'); // inventory, vendors, equipment, stock
  
  // Inventory state
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [page, setPage] = useState(1);
  
  // Vendor state
  const [vendors, setVendors] = useState([]);
  const [vendorModal, setVendorModal] = useState(false);
  const [vendorForm, setVendorForm] = useState({
    name: '', contactPerson: '', email: '', phone: '',
    address: { street: '', city: '', state: '', pincode: '', country: 'India' },
    gstNumber: '', category: 'Medical Supplies', paymentTerms: 'Net 30', rating: 3
  });
  const [editVendorId, setEditVendorId] = useState(null);
  
  // Stock transaction state
  const [txModal, setTxModal] = useState(null);
  const [tx, setTx] = useState({ type: 'IN', quantity: 1, reason: '', unitPrice: '', referenceNumber: '', notes: '' });
  const [historyItem, setHistoryItem] = useState(null);
  
  // Equipment maintenance state
  const [maintenanceModal, setMaintenanceModal] = useState(null);
  const [maintenanceForm, setMaintenanceForm] = useState({ type: 'Routine', performedBy: '', cost: 0, notes: '', nextDueDate: '' });
  
  // Stats
  const [stats, setStats] = useState({ lowStock: 0, outOfStock: 0, dueMaintenance: 0, totalVendors: 0 });

  // Fetch data based on active tab
  useEffect(() => {
    if (activeTab === 'inventory') fetchItems();
    if (activeTab === 'vendors') fetchVendors();
    if (activeTab === 'equipment') fetchEquipment();
    fetchStats();
  }, [activeTab, search, filterCategory, page]);

  const fetchItems = async () => {
    setLoading(true);
    try {
      let params = { page, limit: 20 };
      if (search) params.search = search;
      if (filterCategory) params.category = filterCategory;
      const { data } = await inventoryService.getItems(params);
      setItems(data.items);
      setTotal(data.total);
    } finally { setLoading(false); }
  };

  const fetchVendors = async () => {
    try {
      const { data } = await vendorService.getVendors({ limit: 100 });
      setVendors(data.vendors);
    } catch {}
  };

  const fetchEquipment = async () => {
    try {
      const { data } = await inventoryService.getEquipment({ limit: 100 });
      setItems(data.items);
    } catch {}
  };

  const fetchStats = async () => {
    try {
      const [lowStock, outOfStock, dueMaintenance, vendorStats] = await Promise.all([
        inventoryService.getLowStock().catch(() => ({ data: [] })),
        inventoryService.getOutOfStock().catch(() => ({ data: [] })),
        inventoryService.getDueMaintenance().catch(() => ({ data: [] })),
        vendorService.getVendorStats().catch(() => ({ data: {} }))
      ]);
      setStats({
        lowStock: lowStock.data?.length || 0,
        outOfStock: outOfStock.data?.length || 0,
        dueMaintenance: dueMaintenance.data?.length || 0,
        totalVendors: vendorStats.data?.totalVendors || 0
      });
    } catch {}
  };

  // Inventory CRUD
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...form };
      if (form.category !== 'Equipment') delete payload.equipmentDetails;
      if (editId) await inventoryService.updateItem(editId, payload);
      else await inventoryService.createItem(payload);
      setModal(false);
      resetForm();
      fetchItems();
      fetchStats();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save');
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete "${name}"?`)) return;
    await inventoryService.deleteItem(id);
    fetchItems();
    fetchStats();
  };

  // Stock transaction
  const handleTransaction = async (e) => {
    e.preventDefault();
    try {
      await inventoryService.addTransaction(txModal._id, tx);
      setTxModal(null);
      setTx({ type: 'IN', quantity: 1, reason: '', unitPrice: '', referenceNumber: '', notes: '' });
      fetchItems();
      fetchStats();
    } catch (err) {
      alert(err.response?.data?.message || 'Transaction failed');
    }
  };

  // Maintenance
  const handleLogMaintenance = async (e) => {
    e.preventDefault();
    try {
      await inventoryService.logMaintenance(maintenanceModal._id, maintenanceForm);
      setMaintenanceModal(null);
      setMaintenanceForm({ type: 'Routine', performedBy: '', cost: 0, notes: '', nextDueDate: '' });
      fetchEquipment();
      fetchStats();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to log maintenance');
    }
  };

  // Vendor CRUD
  const handleVendorSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editVendorId) await vendorService.updateVendor(editVendorId, vendorForm);
      else await vendorService.createVendor(vendorForm);
      setVendorModal(false);
      setVendorForm({
        name: '', contactPerson: '', email: '', phone: '',
        address: { street: '', city: '', state: '', pincode: '', country: 'India' },
        gstNumber: '', category: 'Medical Supplies', paymentTerms: 'Net 30', rating: 3
      });
      setEditVendorId(null);
      fetchVendors();
      fetchStats();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save vendor');
    }
  };

  const resetForm = () => {
    setForm(emptyForm);
    setEditId(null);
  };

  const resetVendorForm = () => {
    setVendorForm({
      name: '', contactPerson: '', email: '', phone: '',
      address: { street: '', city: '', state: '', pincode: '', country: 'India' },
      gstNumber: '', category: 'Medical Supplies', paymentTerms: 'Net 30', rating: 3
    });
    setEditVendorId(null);
  };

  const pages = Math.ceil(total / 20);

  // Get vendor name by ID
  const getVendorName = (vendorId) => {
    const vendor = vendors.find(v => v._id === vendorId);
    return vendor?.name || '—';
  };

  return (
    <div>
      {/* Header with Stats */}
      <div className="page-header">
        <h1 className="page-title">Inventory Management</h1>
        <button className="btn btn-primary" onClick={() => { resetForm(); setModal(true); }}>
          + Add Item
        </button>
      </div>

      {/* Stats Cards */}
      <div className="stat-grid">
        <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => setActiveTab('inventory')}>
          <div className="stat-icon" style={{ background: '#dbeafe' }}>📦</div>
          <div><div className="stat-label">Total Items</div><div className="stat-value">{total}</div></div>
        </div>
        <div className="stat-card" style={{ cursor: 'pointer', background: stats.lowStock > 0 ? '#fef3c7' : 'white' }} onClick={() => setActiveTab('inventory')}>
          <div className="stat-icon" style={{ background: '#fee2e2' }}>⚠️</div>
          <div><div className="stat-label">Low Stock</div><div className="stat-value" style={{ color: stats.lowStock > 0 ? '#dc2626' : '#1e293b' }}>{stats.lowStock}</div></div>
        </div>
        <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => setActiveTab('vendors')}>
          <div className="stat-icon" style={{ background: '#d1fae5' }}>🤝</div>
          <div><div className="stat-label">Vendors</div><div className="stat-value">{stats.totalVendors}</div></div>
        </div>
        <div className="stat-card" style={{ cursor: 'pointer', background: stats.dueMaintenance > 0 ? '#fef3c7' : 'white' }} onClick={() => setActiveTab('equipment')}>
          <div className="stat-icon" style={{ background: '#fef3c7' }}>🩺</div>
          <div><div className="stat-label">Maintenance Due</div><div className="stat-value" style={{ color: stats.dueMaintenance > 0 ? '#d97706' : '#1e293b' }}>{stats.dueMaintenance}</div></div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button className={`tab ${activeTab === 'inventory' ? 'active' : ''}`} onClick={() => setActiveTab('inventory')}>📦 Inventory</button>
        <button className={`tab ${activeTab === 'vendors' ? 'active' : ''}`} onClick={() => setActiveTab('vendors')}>🤝 Vendors</button>
        <button className={`tab ${activeTab === 'equipment' ? 'active' : ''}`} onClick={() => setActiveTab('equipment')}>🩺 Equipment</button>
        <button className={`tab ${activeTab === 'stock' ? 'active' : ''}`} onClick={() => setActiveTab('stock')}>📊 Stock Management</button>
      </div>

      {/* ==================== INVENTORY TAB ==================== */}
      {activeTab === 'inventory' && (
        <div className="card">
          <div className="filter-bar">
            <div className="search-wrap">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input className="search-input" placeholder="Search items..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
            </div>
            <select className="form-control" value={filterCategory} onChange={e => { setFilterCategory(e.target.value); setPage(1); }} style={{ width: 160 }}>
              <option value="">All Categories</option>
              {categoryOptions.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>

          {loading ? <div className="spinner" /> : (
            <div className="table-wrapper">
              <table>
                <thead><tr><th>Code</th><th>Name</th><th>Category</th><th>Qty</th><th>Unit Price</th><th>Total Value</th><th>Vendor</th><th>Actions</th></tr></thead>
                <tbody>
                  {items.length === 0 ? (<tr><td colSpan="8" className="empty-state">No items found</td></tr>) : items.map(item => {
                    const isLow = item.quantity <= item.reorderLevel;
                    return (
                      <tr key={item._id}>
                        <td><strong style={{ color: 'var(--primary)' }}>{item.itemCode}</strong></td>
                        <td><strong>{item.name}</strong><br/><span className="text-muted text-small">{item.location}</span></td>
                        <td><span className="badge badge-info">{item.category}</span></td>
                        <td style={{ color: isLow ? '#dc2626' : undefined, fontWeight: isLow ? 700 : undefined }}>{item.quantity} {item.unit} {isLow && '⚠️'}</td>
                        <td>₹{item.unitPrice}</td>
                        <td>₹{(item.totalValue || 0).toLocaleString()}</td>
                        <td>{item.vendor ? getVendorName(item.vendor) : '—'}</td>
                        <td>
                          <div className="flex gap-2">
                            <button className="btn btn-sm btn-success" onClick={() => { setTxModal(item); setTx({ type: 'IN', quantity: 1, reason: '', unitPrice: '', referenceNumber: '', notes: '' }); }}>Stock</button>
                            <button className="btn btn-sm btn-outline" onClick={() => { setForm({ ...item, equipmentDetails: item.equipmentDetails || emptyForm.equipmentDetails }); setEditId(item._id); setModal(true); }}>Edit</button>
                            <button className="btn btn-sm btn-danger" onClick={() => handleDelete(item._id, item.name)}>Del</button>
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
              <button className="page-btn" onClick={() => setPage(p => Math.max(1, p-1))} disabled={page===1}>‹</button>
              {Array.from({ length: Math.min(pages, 10) }, (_, i) => (<button key={i+1} className={`page-btn ${page===i+1?'active':''}`} onClick={() => setPage(i+1)}>{i+1}</button>))}
              <button className="page-btn" onClick={() => setPage(p => Math.min(pages, p+1))} disabled={page===pages}>›</button>
            </div>
          )}
        </div>
      )}

      {/* ==================== VENDORS TAB ==================== */}
      {activeTab === 'vendors' && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
            <button className="btn btn-primary" onClick={() => { resetVendorForm(); setVendorModal(true); }}>+ Add Vendor</button>
          </div>
          <div className="table-wrapper">
            <table>
              <thead><tr><th>Vendor ID</th><th>Name</th><th>Contact Person</th><th>Phone</th><th>Category</th><th>Rating</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {vendors.length === 0 ? (<tr><td colSpan="8" className="empty-state">No vendors found</td></tr>) : vendors.map(v => (
                  <tr key={v._id}>
                    <td><strong style={{ color: 'var(--primary)' }}>{v.vendorId}</strong></td>
                    <td><strong>{v.name}</strong></td>
                    <td>{v.contactPerson || '—'}</td>
                    <td>{v.phone}</td>
                    <td><span className="badge badge-info">{v.category}</span></td>
                    <td>{'★'.repeat(v.rating)}{'☆'.repeat(5-v.rating)}</td>
                    <td><span className={`badge ${v.status === 'Active' ? 'badge-success' : 'badge-danger'}`}>{v.status}</span></td>
                    <td>
                      <div className="flex gap-2">
                        <button className="btn btn-sm btn-outline" onClick={() => { setVendorForm(v); setEditVendorId(v._id); setVendorModal(true); }}>Edit</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==================== EQUIPMENT TAB ==================== */}
      {activeTab === 'equipment' && (
        <div className="card">
          <div className="table-wrapper">
            <table>
              <thead><tr><th>Code</th><th>Name</th><th>Serial Number</th><th>Model</th><th>Condition</th><th>Assigned To</th><th>Maintenance</th><th>Actions</th></tr></thead>
              <tbody>
                {items.length === 0 ? (<tr><td colSpan="8" className="empty-state">No equipment found</td></tr>) : items.filter(i => i.category === 'Equipment').map(item => {
                  const isDue = item.equipmentDetails?.nextMaintenanceDate && new Date(item.equipmentDetails.nextMaintenanceDate) <= new Date();
                  return (
                    <tr key={item._id}>
                      <td><strong style={{ color: 'var(--primary)' }}>{item.itemCode}</strong></td>
                      <td><strong>{item.name}</strong></td>
                      <td>{item.equipmentDetails?.serialNumber || '—'}</td>
                      <td>{item.equipmentDetails?.modelNumber || '—'}</td>
                      <td><span className={`badge ${item.equipmentDetails?.condition === 'Excellent' ? 'badge-success' : item.equipmentDetails?.condition === 'Good' ? 'badge-info' : 'badge-warning'}`}>{item.equipmentDetails?.condition || '—'}</span></td>
                      <td>{item.equipmentDetails?.assignedTo || '—'}</td>
                      <td>{isDue ? <span className="badge badge-danger">Due</span> : <span className="badge badge-success">OK</span>}</td>
                      <td>
                        <div className="flex gap-2">
                          <button className="btn btn-sm btn-warning" onClick={() => { setMaintenanceModal(item); setMaintenanceForm({ type: 'Routine', performedBy: '', cost: 0, notes: '', nextDueDate: '' }); }}>Maintenance</button>
                          <button className="btn btn-sm btn-outline" onClick={() => { setForm({ ...item, equipmentDetails: item.equipmentDetails || emptyForm.equipmentDetails }); setEditId(item._id); setModal(true); }}>Edit</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==================== STOCK MANAGEMENT TAB ==================== */}
      {activeTab === 'stock' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          {/* Left: Items List */}
          <div className="card">
            <h3 style={{ marginBottom: 16 }}>Items</h3>
            <div className="search-wrap" style={{ marginBottom: 12 }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input className="search-input" placeholder="Search items..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <div style={{ maxHeight: 500, overflowY: 'auto' }}>
              {items.map(item => {
                const isLow = item.quantity <= item.reorderLevel;
                return (
                  <div key={item._id} style={{ padding: 12, borderBottom: '1px solid var(--border)', cursor: 'pointer' }} onClick={() => { setTxModal(item); setTx({ type: 'IN', quantity: 1, reason: '', unitPrice: '', referenceNumber: '', notes: '' }); }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <div><strong>{item.name}</strong><br/><span className="text-muted text-small">{item.itemCode}</span></div>
                      <div style={{ textAlign: 'right' }}><div style={{ fontSize: 20, fontWeight: 700, color: isLow ? '#dc2626' : '#1e293b' }}>{item.quantity} {item.unit}</div></div>
                    </div>
                    <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                      <button className="btn btn-sm btn-success" onClick={(e) => { e.stopPropagation(); setTxModal(item); setTx({ type: 'IN', quantity: 1, reason: '', unitPrice: '', referenceNumber: '', notes: '' }); }}>+ Stock IN</button>
                      <button className="btn btn-sm btn-danger" onClick={(e) => { e.stopPropagation(); setTxModal(item); setTx({ type: 'OUT', quantity: 1, reason: '', unitPrice: '', referenceNumber: '', notes: '' }); }}>- Stock OUT</button>
                      <button className="btn btn-sm btn-ghost" onClick={async (e) => { e.stopPropagation(); const { data } = await inventoryService.getTransactions(item._id, 20); setHistoryItem({ item, transactions: data.transactions }); }}>History</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: Transaction Form or History */}
          <div className="card">
            {historyItem ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                  <h3 style={{ margin: 0 }}>History - {historyItem.item.name}</h3>
                  <button className="btn btn-sm btn-ghost" onClick={() => setHistoryItem(null)}>← Back</button>
                </div>
                <div className="table-wrapper">
                  <table><thead><tr><th>Date</th><th>Type</th><th>Qty</th><th>Reason</th></tr></thead>
                  <tbody>{historyItem.transactions?.map((t, i) => (
                    <tr key={i}><td>{new Date(t.date).toLocaleString()}</td><td><span className={`badge ${t.type === 'IN' ? 'badge-success' : 'badge-danger'}`}>{t.type}</span></td><td>{t.quantity}</td><td>{t.reason || '—'}</td></tr>
                  ))}</tbody></table>
                </div>
              </>
            ) : txModal ? (
              <>
                <h3 style={{ marginBottom: 16 }}>{tx.type === 'IN' ? '➕ Stock IN' : '➖ Stock OUT'} - {txModal.name}</h3>
                <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, marginBottom: 16 }}>
                  Current Stock: <strong>{txModal.quantity} {txModal.unit}</strong>
                </div>
                <form onSubmit={handleTransaction}>
                  <div className="form-group"><label>Quantity *</label><input className="form-control" type="number" min="1" value={tx.quantity} onChange={e => setTx({...tx, quantity: parseInt(e.target.value)})} required /></div>
                  <div className="form-group"><label>Reason</label><input className="form-control" value={tx.reason} onChange={e => setTx({...tx, reason: e.target.value})} placeholder={tx.type === 'IN' ? 'Purchase Order #' : 'Department name'} /></div>
                  <div className="form-group"><label>Reference Number</label><input className="form-control" value={tx.referenceNumber} onChange={e => setTx({...tx, referenceNumber: e.target.value})} /></div>
                  <div className="form-group"><label>Notes</label><textarea className="form-control" rows={2} value={tx.notes} onChange={e => setTx({...tx, notes: e.target.value})} /></div>
                  <div className="flex gap-2"><button type="button" className="btn btn-ghost" onClick={() => setTxModal(null)}>Cancel</button><button type="submit" className={`btn ${tx.type === 'IN' ? 'btn-success' : 'btn-danger'}`}>Confirm {tx.type === 'IN' ? 'Stock IN' : 'Stock OUT'}</button></div>
                </form>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8' }}><div style={{ fontSize: 48, marginBottom: 12 }}>📦</div><div>Select an item to manage stock</div></div>
            )}
          </div>
        </div>
      )}

      {/* ==================== ADD/EDIT ITEM MODAL ==================== */}
      {modal && (
        <div className="modal-overlay" onClick={() => setModal(false)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h3 className="modal-title">{editId ? 'Edit Item' : 'Add Inventory Item'}</h3><button className="modal-close" onClick={() => setModal(false)}>×</button></div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group"><label>Item Name *</label><input className="form-control" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required /></div>
                  <div className="form-group"><label>Category *</label><select className="form-control" value={form.category} onChange={e => setForm({...form, category: e.target.value})}>{categoryOptions.map(c => <option key={c}>{c}</option>)}</select></div>
                </div>
                <div className="form-row-3">
                  <div className="form-group"><label>Quantity</label><input className="form-control" type="number" value={form.quantity} onChange={e => setForm({...form, quantity: parseInt(e.target.value)})} /></div>
                  <div className="form-group"><label>Unit</label><select className="form-control" value={form.unit} onChange={e => setForm({...form, unit: e.target.value})}>{unitOptions.map(u => <option key={u}>{u}</option>)}</select></div>
                  <div className="form-group"><label>Unit Price (₹)</label><input className="form-control" type="number" value={form.unitPrice} onChange={e => setForm({...form, unitPrice: parseFloat(e.target.value)})} /></div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label>Reorder Level</label><input className="form-control" type="number" value={form.reorderLevel} onChange={e => setForm({...form, reorderLevel: parseInt(e.target.value)})} /></div>
                  <div className="form-group"><label>Location</label><input className="form-control" value={form.location} onChange={e => setForm({...form, location: e.target.value})} placeholder="e.g., Shelf A-3" /></div>
                </div>
                <div className="form-group"><label>Vendor</label><select className="form-control" value={form.vendor || ''} onChange={e => setForm({...form, vendor: e.target.value})}><option value="">— Select Vendor —</option>{vendors.map(v => <option key={v._id} value={v._id}>{v.name}</option>)}</select></div>
                
                {/* Equipment-specific fields */}
                {form.category === 'Equipment' && (
                  <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, marginTop: 8 }}>
                    <h4 style={{ fontSize: 13, marginBottom: 12 }}>Equipment Details</h4>
                    <div className="form-row">
                      <div className="form-group"><label>Serial Number</label><input className="form-control" value={form.equipmentDetails?.serialNumber || ''} onChange={e => setForm({...form, equipmentDetails: {...form.equipmentDetails, serialNumber: e.target.value}})} /></div>
                      <div className="form-group"><label>Model Number</label><input className="form-control" value={form.equipmentDetails?.modelNumber || ''} onChange={e => setForm({...form, equipmentDetails: {...form.equipmentDetails, modelNumber: e.target.value}})} /></div>
                    </div>
                    <div className="form-row">
                      <div className="form-group"><label>Manufacturer</label><input className="form-control" value={form.equipmentDetails?.manufacturer || ''} onChange={e => setForm({...form, equipmentDetails: {...form.equipmentDetails, manufacturer: e.target.value}})} /></div>
                      <div className="form-group"><label>Condition</label><select className="form-control" value={form.equipmentDetails?.condition || 'Good'} onChange={e => setForm({...form, equipmentDetails: {...form.equipmentDetails, condition: e.target.value}})}>{conditionOptions.map(c => <option key={c}>{c}</option>)}</select></div>
                    </div>
                    <div className="form-row">
                      <div className="form-group"><label>Purchase Date</label><input className="form-control" type="date" value={form.equipmentDetails?.purchaseDate?.split('T')[0] || ''} onChange={e => setForm({...form, equipmentDetails: {...form.equipmentDetails, purchaseDate: e.target.value}})} /></div>
                      <div className="form-group"><label>Warranty Expiry</label><input className="form-control" type="date" value={form.equipmentDetails?.warrantyExpiry?.split('T')[0] || ''} onChange={e => setForm({...form, equipmentDetails: {...form.equipmentDetails, warrantyExpiry: e.target.value}})} /></div>
                    </div>
                    <div className="form-row">
                      <div className="form-group"><label>Assigned To (Ward)</label><input className="form-control" value={form.equipmentDetails?.assignedTo || ''} onChange={e => setForm({...form, equipmentDetails: {...form.equipmentDetails, assignedTo: e.target.value}})} placeholder="e.g., ICU, OT-2" /></div>
                      <div className="form-group"><label>Maintenance Interval (Days)</label><input className="form-control" type="number" value={form.equipmentDetails?.maintenanceIntervalDays || 90} onChange={e => setForm({...form, equipmentDetails: {...form.equipmentDetails, maintenanceIntervalDays: parseInt(e.target.value)}})} /></div>
                    </div>
                  </div>
                )}
                <div className="form-group"><label>Description</label><textarea className="form-control" rows={2} value={form.description} onChange={e => setForm({...form, description: e.target.value})} /></div>
              </div>
              <div className="modal-footer"><button type="button" className="btn btn-ghost" onClick={() => setModal(false)}>Cancel</button><button type="submit" className="btn btn-primary">{editId ? 'Update' : 'Add'}</button></div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== VENDOR MODAL ==================== */}
      {vendorModal && (
        <div className="modal-overlay" onClick={() => setVendorModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h3 className="modal-title">{editVendorId ? 'Edit Vendor' : 'Add Vendor'}</h3><button className="modal-close" onClick={() => setVendorModal(false)}>×</button></div>
            <form onSubmit={handleVendorSubmit}>
              <div className="modal-body">
                <div className="form-row"><div className="form-group"><label>Vendor Name *</label><input className="form-control" value={vendorForm.name} onChange={e => setVendorForm({...vendorForm, name: e.target.value})} required /></div>
                <div className="form-group"><label>Contact Person</label><input className="form-control" value={vendorForm.contactPerson} onChange={e => setVendorForm({...vendorForm, contactPerson: e.target.value})} /></div></div>
                <div className="form-row"><div className="form-group"><label>Phone</label><input className="form-control" value={vendorForm.phone} onChange={e => setVendorForm({...vendorForm, phone: e.target.value})} /></div>
                <div className="form-group"><label>Email</label><input className="form-control" type="email" value={vendorForm.email} onChange={e => setVendorForm({...vendorForm, email: e.target.value})} /></div></div>
                <div className="form-row"><div className="form-group"><label>GST Number</label><input className="form-control" value={vendorForm.gstNumber} onChange={e => setVendorForm({...vendorForm, gstNumber: e.target.value})} /></div>
                <div className="form-group"><label>Category</label><select className="form-control" value={vendorForm.category} onChange={e => setVendorForm({...vendorForm, category: e.target.value})}><option>Medical Supplies</option><option>Equipment</option><option>Pharmaceuticals</option><option>General</option><option>Other</option></select></div></div>
                <div className="form-row"><div className="form-group"><label>Payment Terms</label><select className="form-control" value={vendorForm.paymentTerms} onChange={e => setVendorForm({...vendorForm, paymentTerms: e.target.value})}><option>Immediate</option><option>Net 15</option><option>Net 30</option><option>Net 45</option><option>Net 60</option></select></div>
                <div className="form-group"><label>Rating</label><select className="form-control" value={vendorForm.rating} onChange={e => setVendorForm({...vendorForm, rating: parseInt(e.target.value)})}><option>1</option><option>2</option><option>3</option><option>4</option><option>5</option></select></div></div>
              </div>
              <div className="modal-footer"><button type="button" className="btn btn-ghost" onClick={() => setVendorModal(false)}>Cancel</button><button type="submit" className="btn btn-primary">{editVendorId ? 'Update' : 'Add'}</button></div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== MAINTENANCE MODAL ==================== */}
      {maintenanceModal && (
        <div className="modal-overlay" onClick={() => setMaintenanceModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h3 className="modal-title">Log Maintenance - {maintenanceModal.name}</h3><button className="modal-close" onClick={() => setMaintenanceModal(null)}>×</button></div>
            <form onSubmit={handleLogMaintenance}>
              <div className="modal-body">
                <div className="form-row"><div className="form-group"><label>Type</label><select className="form-control" value={maintenanceForm.type} onChange={e => setMaintenanceForm({...maintenanceForm, type: e.target.value})}><option>Routine</option><option>Repair</option><option>Calibration</option><option>Emergency</option></select></div>
                <div className="form-group"><label>Performed By</label><input className="form-control" value={maintenanceForm.performedBy} onChange={e => setMaintenanceForm({...maintenanceForm, performedBy: e.target.value})} placeholder="Engineer name" /></div></div>
                <div className="form-row"><div className="form-group"><label>Cost (₹)</label><input className="form-control" type="number" value={maintenanceForm.cost} onChange={e => setMaintenanceForm({...maintenanceForm, cost: parseFloat(e.target.value)})} /></div>
                <div className="form-group"><label>Next Due Date</label><input className="form-control" type="date" value={maintenanceForm.nextDueDate} onChange={e => setMaintenanceForm({...maintenanceForm, nextDueDate: e.target.value})} /></div></div>
                <div className="form-group"><label>Notes</label><textarea className="form-control" rows={3} value={maintenanceForm.notes} onChange={e => setMaintenanceForm({...maintenanceForm, notes: e.target.value})} /></div>
              </div>
              <div className="modal-footer"><button type="button" className="btn btn-ghost" onClick={() => setMaintenanceModal(null)}>Cancel</button><button type="submit" className="btn btn-primary">Log Maintenance</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}