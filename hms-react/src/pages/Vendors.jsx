// hms-react/src/pages/Vendors.jsx
import React, { useEffect, useState } from 'react';
import vendorService from '../services/vendorService';

const emptyForm = {
  name: '',
  contactPerson: '',
  email: '',
  phone: '',
  address: { street: '', city: '', state: '', pincode: '', country: 'India' },
  gstNumber: '',
  category: 'Medical Supplies',
  paymentTerms: 'Net 30',
  rating: 3,
  notes: '',
};

const categoryOptions = ['Medical Supplies', 'Equipment', 'Pharmaceuticals', 'General', 'Other'];
const paymentTermsOptions = ['Immediate', 'Net 15', 'Net 30', 'Net 45', 'Net 60'];

export default function Vendors() {
  const [vendors, setVendors] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [page, setPage] = useState(1);
  const [viewVendor, setViewVendor] = useState(null);
  const [stats, setStats] = useState(null);

  const fetchVendors = async () => {
    setLoading(true);
    try {
      let params = { page, limit: 15 };
      if (search) params.search = search;
      if (filterCategory) params.category = filterCategory;
      const { data } = await vendorService.getVendors(params);
      setVendors(data.vendors);
      setTotal(data.total);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const { data } = await vendorService.getVendorStats();
      setStats(data);
    } catch {}
  };

  useEffect(() => { fetchVendors(); }, [search, filterCategory, page]);
  useEffect(() => { fetchStats(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editId) {
        await vendorService.updateVendor(editId, form);
      } else {
        await vendorService.createVendor(form);
      }
      setModal(false);
      setForm(emptyForm);
      setEditId(null);
      fetchVendors();
      fetchStats();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save vendor');
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete vendor "${name}"? This will fail if items are linked.`)) return;
    try {
      await vendorService.deleteVendor(id);
      fetchVendors();
      fetchStats();
    } catch (err) {
      alert(err.response?.data?.message || 'Delete failed');
    }
  };

  const openEdit = (v) => {
    setForm({
      ...v,
      address: v.address || emptyForm.address,
    });
    setEditId(v._id);
    setModal(true);
  };

  const pages = Math.ceil(total / 15);

  const RatingStars = ({ rating }) => (
    <div style={{ display: 'flex', gap: 2 }}>
      {[1, 2, 3, 4, 5].map(r => (
        <span key={r} style={{ color: r <= rating ? '#f59e0b' : '#e2e8f0', fontSize: 14 }}>★</span>
      ))}
    </div>
  );

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Vendor Management</h1>
        <button className="btn btn-primary" onClick={() => { setForm(emptyForm); setEditId(null); setModal(true); }}>
          + Add Vendor
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="stat-grid" style={{ marginBottom: 20 }}>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: '#dbeafe' }}>🏢</div>
            <div><div className="stat-label">Active Vendors</div><div className="stat-value">{stats.totalVendors || 0}</div></div>
          </div>
          {stats.byCategory?.map(cat => (
            <div key={cat._id} className="stat-card">
              <div className="stat-icon" style={{ background: '#fef3c7' }}>📦</div>
              <div><div className="stat-label">{cat._id}</div><div className="stat-value">{cat.count}</div></div>
            </div>
          ))}
        </div>
      )}

      <div className="card">
        <div className="filter-bar">
          <div className="search-wrap">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input className="search-input" placeholder="Search vendors..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
          </div>
          <select className="form-control" value={filterCategory} onChange={e => { setFilterCategory(e.target.value); setPage(1); }} style={{ width: 160 }}>
            <option value="">All Categories</option>
            {categoryOptions.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>

        {loading ? <div className="spinner" /> : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr><th>Vendor ID</th><th>Name</th><th>Contact</th><th>Phone/Email</th><th>Category</th><th>Rating</th><th>Status</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {vendors.length === 0 ? (
                  <tr><td colSpan="8" className="empty-state">No vendors found</td></tr>
                ) : vendors.map(v => (
                  <tr key={v._id}>
                    <td><strong style={{ color: 'var(--primary)' }}>{v.vendorId}</strong></td>
                    <td><strong>{v.name}</strong><br/><span className="text-muted text-small">{v.contactPerson || '—'}</span></td>
                    <td>{v.contactPerson || '—'}</td>
                    <td>{v.phone}<br/><span className="text-muted text-small">{v.email}</span></td>
                    <td><span className="badge badge-info">{v.category}</span></td>
                    <td><RatingStars rating={v.rating} /></td>
                    <td><span className={`badge ${v.status === 'Active' ? 'badge-success' : 'badge-danger'}`}>{v.status}</span></td>
                    <td>
                      <div className="flex gap-2">
                        <button className="btn btn-sm btn-outline" onClick={() => setViewVendor(v)}>View</button>
                        <button className="btn btn-sm btn-outline" onClick={() => openEdit(v)}>Edit</button>
                        <button className="btn btn-sm btn-danger" onClick={() => handleDelete(v._id, v.name)}>Del</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {pages > 1 && (
          <div className="pagination">
            <button className="page-btn" onClick={() => setPage(p => Math.max(1, p-1))} disabled={page===1}>‹</button>
            {Array.from({ length: pages }, (_, i) => (
              <button key={i+1} className={`page-btn ${page===i+1?'active':''}`} onClick={() => setPage(i+1)}>{i+1}</button>
            ))}
            <button className="page-btn" onClick={() => setPage(p => Math.min(pages, p+1))} disabled={page===pages}>›</button>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {modal && (
        <div className="modal-overlay" onClick={() => setModal(false)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{editId ? 'Edit Vendor' : 'Add New Vendor'}</h3>
              <button className="modal-close" onClick={() => setModal(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Vendor Name *</label><input className="form-control" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required /></div>
                  <div className="form-group"><label className="form-label">Contact Person</label><input className="form-control" value={form.contactPerson} onChange={e => setForm({...form, contactPerson: e.target.value})} /></div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Phone</label><input className="form-control" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} /></div>
                  <div className="form-group"><label className="form-label">Email</label><input className="form-control" type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} /></div>
                </div>
                <div className="form-group"><label className="form-label">Address</label>
                  <div className="form-row">
                    <input className="form-control" placeholder="Street" value={form.address.street} onChange={e => setForm({...form, address: {...form.address, street: e.target.value}})} />
                    <input className="form-control" placeholder="City" value={form.address.city} onChange={e => setForm({...form, address: {...form.address, city: e.target.value}})} />
                    <input className="form-control" placeholder="State" value={form.address.state} onChange={e => setForm({...form, address: {...form.address, state: e.target.value}})} />
                    <input className="form-control" placeholder="Pincode" value={form.address.pincode} onChange={e => setForm({...form, address: {...form.address, pincode: e.target.value}})} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">GST Number</label><input className="form-control" value={form.gstNumber} onChange={e => setForm({...form, gstNumber: e.target.value})} /></div>
                  <div className="form-group"><label className="form-label">Category</label><select className="form-control" value={form.category} onChange={e => setForm({...form, category: e.target.value})}>{categoryOptions.map(c => <option key={c}>{c}</option>)}</select></div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Payment Terms</label><select className="form-control" value={form.paymentTerms} onChange={e => setForm({...form, paymentTerms: e.target.value})}>{paymentTermsOptions.map(t => <option key={t}>{t}</option>)}</select></div>
                  <div className="form-group"><label className="form-label">Rating</label><select className="form-control" value={form.rating} onChange={e => setForm({...form, rating: parseInt(e.target.value)})}>{[1,2,3,4,5].map(r => <option key={r}>{r} Star{r !== 1 ? 's' : ''}</option>)}</select></div>
                  <div className="form-group"><label className="form-label">Status</label><select className="form-control" value={form.status || 'Active'} onChange={e => setForm({...form, status: e.target.value})}><option>Active</option><option>Inactive</option><option>Blacklisted</option></select></div>
                </div>
                <div className="form-group"><label className="form-label">Notes</label><textarea className="form-control" rows={2} value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} /></div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editId ? 'Update Vendor' : 'Add Vendor'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Vendor Modal */}
      {viewVendor && (
        <div className="modal-overlay" onClick={() => setViewVendor(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h3 className="modal-title">{viewVendor.name}</h3><button className="modal-close" onClick={() => setViewVendor(null)}>×</button></div>
            <div className="modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div><div className="text-muted text-small">Vendor ID</div><strong>{viewVendor.vendorId}</strong></div>
                <div><div className="text-muted text-small">Contact Person</div><strong>{viewVendor.contactPerson || '—'}</strong></div>
                <div><div className="text-muted text-small">Phone</div><strong>{viewVendor.phone || '—'}</strong></div>
                <div><div className="text-muted text-small">Email</div><strong>{viewVendor.email || '—'}</strong></div>
                <div><div className="text-muted text-small">GST Number</div><strong>{viewVendor.gstNumber || '—'}</strong></div>
                <div><div className="text-muted text-small">Category</div><strong>{viewVendor.category}</strong></div>
                <div><div className="text-muted text-small">Payment Terms</div><strong>{viewVendor.paymentTerms}</strong></div>
                <div><div className="text-muted text-small">Rating</div><RatingStars rating={viewVendor.rating} /></div>
                {viewVendor.address && (viewVendor.address.street || viewVendor.address.city) && (
                  <div style={{ gridColumn: 'span 2' }}><div className="text-muted text-small">Address</div><strong>{[viewVendor.address.street, viewVendor.address.city, viewVendor.address.state, viewVendor.address.pincode].filter(Boolean).join(', ')}</strong></div>
                )}
                {viewVendor.notes && <div style={{ gridColumn: 'span 2' }}><div className="text-muted text-small">Notes</div><strong>{viewVendor.notes}</strong></div>}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}