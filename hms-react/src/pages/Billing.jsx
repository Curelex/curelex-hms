// hms-react/src/pages/Billing.jsx
import React, { useEffect, useState, useRef, useCallback } from 'react';
import API from '../utils/api';
import { generateBillPDF } from '../utils/BillPDF';

const ROOM_RATES = {
  'General Ward': 800,
  'Semi-Private': 1500,
  'Private Room': 2500,
  'ICU':          4000,
};

const emptyItem = {
  description: '', category: 'Other', addedByName: '',
  quantity: 1, unitPrice: 0, total: 0,
};

const emptyForm = {
  patient: '', patientName: '', items: [],
  admissionDate: '', dischargeDate: '', daysAdmitted: 0,
  roomType: 'General Ward', roomRatePerDay: 800, roomRent: 0,
  subtotal: 0, discount: 0, tax: 0, totalAmount: 0,
  paidAmount: 0, paymentMethod: 'Pending', paymentStatus: 'Pending', notes: '',
};

function recalcTotals(items, roomRent, discount, tax) {
  const itemsSubtotal = items.reduce((s, i) => s + (Number(i.total) || 0), 0);
  const subtotal      = itemsSubtotal + Number(roomRent || 0);
  const disc          = Number(discount) || 0;
  const taxPct        = Number(tax) || 0;
  const totalAmount   = subtotal - disc + (subtotal * taxPct / 100);
  return { subtotal, totalAmount };
}

export default function Billing() {
  const [bills,        setBills]        = useState([]);
  const [total,        setTotal]        = useState(0);
  const [loading,      setLoading]      = useState(true);
  const [modal,        setModal]        = useState(false);
  const [form,         setForm]         = useState(emptyForm);
  const [editId,       setEditId]       = useState(null);
  const [filterStatus, setFilterStatus] = useState('');
  const [page,         setPage]         = useState(1);
  const [pdfLoading,   setPdfLoading]   = useState('');

  // ── NEW: tracks items that existed before this edit session ──
  // so we only append genuinely new items, not re-add old ones
  const [existingItemCount, setExistingItemCount] = useState(0);

  // patient search
  const [patientSearch,  setPatientSearch]  = useState('');
  const [patientResults, setPatientResults] = useState([]);
  const [patientLoading, setPatientLoading] = useState(false);
  const [showDropdown,   setShowDropdown]   = useState(false);
  const [fetchingItems,  setFetchingItems]  = useState(false);
  const [checkingBill,   setCheckingBill]   = useState(false); // checking for existing bill
  const searchRef   = useRef(null);
  const searchTimer = useRef(null);

  // pending lab billing requests
  const [pendingLabItems, setPendingLabItems] = useState([]);
  const [labItemsLoading, setLabItemsLoading] = useState(false);
  const [usedLabRequests, setUsedLabRequests] = useState([]);

  // ── Fetch bill list ──────────────────────────────────────────
  const fetchBills = async () => {
    setLoading(true);
    try {
      let url = `/billing?page=${page}&limit=15`;
      if (filterStatus) url += `&status=${filterStatus}`;
      const { data } = await API.get(url);
      setBills(data.bills);
      setTotal(data.total);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBills(); }, [page, filterStatus]);

  useEffect(() => {
    const handler = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target))
        setShowDropdown(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── PDF ───────────────────────────────────────────────────────
  const handleDownloadPDF = async (billId) => {
    setPdfLoading(billId);
    try {
      const { data } = await API.get(`/billing/${billId}`);
      generateBillPDF(data);
    } catch {
      alert('Could not load bill data for PDF.');
    } finally {
      setPdfLoading('');
    }
  };

  // ── Pending lab billing requests ──────────────────────────────
  const fetchPendingLabItems = useCallback(async (patientMongoId) => {
    if (!patientMongoId) { setPendingLabItems([]); return; }
    setLabItemsLoading(true);
    try {
      const { data } = await API.get(`/billing-requests/patient/${patientMongoId}`);
      setPendingLabItems(data);
    } catch {
      setPendingLabItems([]);
    } finally {
      setLabItemsLoading(false);
    }
  }, []);

  const addLabItemsToBill = (req) => {
    const newItems = req.tests.map(t => ({
      description: t.testName, category: 'Lab',
      addedByName: req.requestedByName || '',
      quantity: 1, unitPrice: t.price, total: t.price, sourceRef: req.labId,
    }));
    setForm(f => {
      const items = [...f.items, ...newItems];
      const { subtotal, totalAmount } = recalcTotals(items, f.roomRent, f.discount, f.tax);
      return { ...f, items, subtotal, totalAmount };
    });
    setPendingLabItems(prev => prev.filter(r => r._id !== req._id));
    setUsedLabRequests(prev => [...prev, req]);
  };

  // ── KEY FUNCTION: load an existing bill into the edit form ────
  const loadExistingBill = useCallback((bill) => {
    const items = bill.items || [];
    setForm({
      ...emptyForm,
      ...bill,
      patient:     bill.patient?._id || bill.patient,
      patientName: bill.patient?.name || '',
      items,
    });
    setExistingItemCount(items.length); // remember how many items existed
    setPatientSearch(bill.patient?.name || '');
    setEditId(bill._id);
  }, []);

  // ── Patient search ────────────────────────────────────────────
  const handlePatientSearch = (val) => {
    setPatientSearch(val);
    setShowDropdown(true);
    clearTimeout(searchTimer.current);
    if (!val.trim()) { setPatientResults([]); return; }
    searchTimer.current = setTimeout(async () => {
      setPatientLoading(true);
      try {
        const { data } = await API.get(`/patients?search=${encodeURIComponent(val)}&limit=8`);
        setPatientResults(data.patients || []);
      } catch {
        setPatientResults([]);
      } finally {
        setPatientLoading(false);
      }
    }, 300);
  };

  // ── Patient selected ──────────────────────────────────────────
  // 1. Check if a bill already exists for this patient
  // 2. If yes  → load that bill into edit mode + append new items
  // 3. If no   → fresh create mode
  const handleSelectPatient = async (patient) => {
    setPatientSearch(patient.name);
    setShowDropdown(false);
    setPatientResults([]);
    setPendingLabItems([]);
    setUsedLabRequests([]);

    // Step 1: check for existing bill
    setCheckingBill(true);
    try {
      const { data: check } = await API.get(`/billing/check-patient/${patient._id}`);

      if (check.exists) {
        // ── Existing bill found → load it in edit mode ─────────
        const existingBill = check.bill;
        loadExistingBill(existingBill);

        // Fetch new medicines/lab items to append
        setFetchingItems(true);
        try {
          const { data: itemsData } = await API.get(`/billing/patient-items/${patient._id}`);
          const newItems = (itemsData.items || []).filter(newItem =>
            // Only add items not already in the bill (match by sourceRef)
            !(existingBill.items || []).some(ei => ei.sourceRef && ei.sourceRef === newItem.sourceRef)
          );
          if (newItems.length > 0) {
            setForm(f => {
              const items = [...f.items, ...newItems];
              const { subtotal, totalAmount } = recalcTotals(items, f.roomRent, f.discount, f.tax);
              return { ...f, items, subtotal, totalAmount };
            });
          }
        } catch { } finally {
          setFetchingItems(false);
        }

        // Fetch pending lab requests
        fetchPendingLabItems(patient._id);

      } else {
        // ── No existing bill → fresh create mode ───────────────
        setForm(f => ({ ...f, patient: patient._id, patientName: patient.name, items: [] }));
        setEditId(null);
        setExistingItemCount(0);

        setFetchingItems(true);
        try {
          const { data: itemsData } = await API.get(`/billing/patient-items/${patient._id}`);
          const fetchedItems = itemsData.items || [];
          setForm(f => {
            const { subtotal, totalAmount } = recalcTotals(fetchedItems, f.roomRent, f.discount, f.tax);
            return { ...f, items: fetchedItems, subtotal, totalAmount };
          });
        } catch { } finally {
          setFetchingItems(false);
        }

        fetchPendingLabItems(patient._id);
      }
    } catch {
      // If check fails, fall back to create mode
      setForm(f => ({ ...f, patient: patient._id, patientName: patient.name, items: [] }));
      setEditId(null);
    } finally {
      setCheckingBill(false);
    }
  };

  // ── Item updates ──────────────────────────────────────────────
  const updateItem = (idx, field, val) => {
    setForm(f => {
      const items = [...f.items];
      items[idx] = { ...items[idx], [field]: val };
      if (field === 'quantity' || field === 'unitPrice') {
        items[idx].total = (Number(items[idx].quantity) || 0) * (Number(items[idx].unitPrice) || 0);
      }
      const { subtotal, totalAmount } = recalcTotals(items, f.roomRent, f.discount, f.tax);
      return { ...f, items, subtotal, totalAmount };
    });
  };

  const addItem    = () => setForm(f => ({ ...f, items: [...f.items, { ...emptyItem }] }));
  const removeItem = (idx) => {
    setForm(f => {
      const items = f.items.filter((_, i) => i !== idx);
      const { subtotal, totalAmount } = recalcTotals(items, f.roomRent, f.discount, f.tax);
      return { ...f, items, subtotal, totalAmount };
    });
  };

  // ── Room rent ─────────────────────────────────────────────────
  const updateRoom = (field, val) => {
    setForm(f => {
      const next = { ...f, [field]: val };
      if (field === 'roomType') next.roomRatePerDay = ROOM_RATES[val] || 800;
      next.roomRent = Number(next.daysAdmitted || 0) * Number(next.roomRatePerDay || 0);
      if (field === 'admissionDate' || field === 'dischargeDate') {
        const a = new Date(field === 'admissionDate' ? val : next.admissionDate);
        const d = new Date(field === 'dischargeDate' ? val : next.dischargeDate);
        if (!isNaN(a) && !isNaN(d) && d >= a) {
          const diff = Math.round((d - a) / (1000 * 60 * 60 * 24));
          next.daysAdmitted = diff;
          next.roomRent     = diff * next.roomRatePerDay;
        }
      }
      const { subtotal, totalAmount } = recalcTotals(next.items, next.roomRent, next.discount, next.tax);
      return { ...next, subtotal, totalAmount };
    });
  };

  const updateFinancial = (field, val) => {
    setForm(f => {
      const next = { ...f, [field]: val };
      const { subtotal, totalAmount } = recalcTotals(next.items, next.roomRent, next.discount, next.tax);
      return { ...next, subtotal, totalAmount };
    });
  };

  // ── Submit ────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.patient) return alert('Please select a patient.');

    let savedBill;
    try {
      if (editId) {
        // Always PUT when we have an editId (existing bill)
        const { data } = await API.put(`/billing/${editId}`, form);
        savedBill = data;
      } else {
        const { data } = await API.post('/billing', form);

        // Backend returned 409 duplicate → switch to edit mode seamlessly
        if (data.duplicate) {
          loadExistingBill(data.bill);
          alert(`Switched to existing bill ${data.bill.billId} for this patient. Please review and save again.`);
          return;
        }
        savedBill = data;
      }
    } catch (err) {
      // Axios throws on 4xx — handle 409 duplicate from catch too
      const errData = err.response?.data;
      if (errData?.duplicate) {
        loadExistingBill(errData.bill);
        alert(`Switched to existing bill ${errData.bill.billId} for this patient. Please review and save again.`);
        return;
      }
      alert(errData?.message || 'Failed to save bill. Please try again.');
      return;
    }

    // Mark used lab billing requests as approved + link to this bill
    if (savedBill?._id && usedLabRequests.length > 0) {
      await Promise.allSettled(
        usedLabRequests.map(req =>
          API.post(`/billing-requests/${req._id}/approve`, { billingId: savedBill._id })
        )
      );
    }

    setModal(false);
    resetModal();
    fetchBills();
  };

  const resetModal = () => {
    setForm(emptyForm);
    setEditId(null);
    setPatientSearch('');
    setPatientResults([]);
    setPendingLabItems([]);
    setUsedLabRequests([]);
    setExistingItemCount(0);
  };

  const openCreate = () => { resetModal(); setModal(true); };
  const openEdit   = (b) => {
    loadExistingBill(b);
    setModal(true);
  };

  const statusBadge = (s) => {
    const map = { Paid: 'badge-success', Partial: 'badge-warning', Pending: 'badge-info', Cancelled: 'badge-danger' };
    return <span className={`badge ${map[s] || 'badge-gray'}`}>{s}</span>;
  };

  const pages = Math.ceil(total / 15);

  // ─────────────────────────────────────────────────────────────
  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Billing</h1>
        <button className="btn btn-primary" onClick={openCreate}>+ Create Bill</button>
      </div>

      <div className="card">
        <div className="filter-bar">
          <select className="form-control" value={filterStatus}
            onChange={e => { setFilterStatus(e.target.value); setPage(1); }} style={{ width: 160 }}>
            <option value="">All Status</option>
            <option>Paid</option><option>Partial</option>
            <option>Pending</option><option>Cancelled</option>
          </select>
          <div className="text-muted text-small">{total} bills</div>
        </div>

        {loading ? <div className="spinner" /> : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Bill ID</th><th>Patient</th><th>Items</th>
                  <th>Room Rent</th><th>Total</th><th>Paid</th>
                  <th>Method</th><th>Status</th><th>Date</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {bills.length === 0 ? (
                  <tr><td colSpan="10" className="empty-state">No bills found</td></tr>
                ) : bills.map(b => (
                  <tr key={b._id}>
                    <td><strong style={{ color: 'var(--primary)' }}>{b.billId}</strong></td>
                    <td>
                      <strong>{b.patient?.name}</strong><br />
                      <span className="text-muted text-small">{b.patient?.patientId}</span>
                    </td>
                    <td className="text-small">{b.items?.length || 0} item(s)</td>
                    <td className="text-small">
                      {b.daysAdmitted > 0
                        ? `${b.daysAdmitted}d × ₹${(b.roomRatePerDay||0).toLocaleString()} = ₹${(b.roomRent||0).toLocaleString()}`
                        : '—'}
                    </td>
                    <td><strong>₹{(b.totalAmount||0).toLocaleString()}</strong></td>
                    <td>₹{(b.paidAmount||0).toLocaleString()}</td>
                    <td>{b.paymentMethod}</td>
                    <td>{statusBadge(b.paymentStatus)}</td>
                    <td>{new Date(b.createdAt).toLocaleDateString()}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-sm btn-outline" onClick={() => openEdit(b)}>Edit</button>
                        <button
                          className="btn btn-sm btn-primary"
                          onClick={() => handleDownloadPDF(b._id)}
                          disabled={pdfLoading === b._id}
                          title="Download Invoice PDF"
                          style={{ minWidth: 36 }}
                        >
                          {pdfLoading === b._id ? '…' : '🖨'}
                        </button>
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

      {/* ── Modal ─────────────────────────────────────────────── */}
      {modal && (
        <div className="modal-overlay" onClick={() => { setModal(false); resetModal(); }}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3 className="modal-title" style={{ margin: 0 }}>
                  {editId ? `Edit Bill` : 'Create Bill'}
                </h3>
                {/* Show bill ID + existing item count when editing */}
                {editId && (
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                    {form.billId} ·
                    <span style={{ color: '#0f4c81', fontWeight: 600 }}>
                      {' '}{existingItemCount} existing item(s)
                    </span>
                    {form.items.length > existingItemCount && (
                      <span style={{ color: '#16a34a', fontWeight: 600 }}>
                        {' '}+ {form.items.length - existingItemCount} new
                      </span>
                    )}
                  </div>
                )}
              </div>
              <button className="modal-close" onClick={() => { setModal(false); resetModal(); }}>×</button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="modal-body">

                {/* ── Existing bill notice ────────────────────── */}
                {editId && (
                  <div style={{
                    background: '#eff6ff', border: '1px solid #bfdbfe',
                    borderRadius: 10, padding: '11px 16px', marginBottom: 14,
                    display: 'flex', alignItems: 'center', gap: 10, fontSize: 13,
                  }}>
                    <span style={{ fontSize: 18 }}>📋</span>
                    <div>
                      <strong style={{ color: '#1e40af' }}>Existing bill loaded — {form.billId}</strong>
                      <div style={{ color: '#3b82f6', fontSize: 12, marginTop: 1 }}>
                        Any new items you add will be appended to this bill. Only one bill per patient.
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Patient Search ──────────────────────────── */}
                <div className="form-group" ref={searchRef} style={{ position: 'relative' }}>
                  <label className="form-label">Patient *</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      className="form-control"
                      placeholder="Type patient name to search…"
                      value={patientSearch}
                      onChange={e => handlePatientSearch(e.target.value)}
                      onFocus={() => patientSearch && setShowDropdown(true)}
                      autoComplete="off"
                      // Lock patient field when editing existing bill
                      readOnly={!!editId}
                      style={editId ? { background: '#f8fafc', color: '#475569' } : {}}
                    />
                    {(patientLoading || checkingBill) && (
                      <span style={{
                        position: 'absolute', right: 12, top: '50%',
                        transform: 'translateY(-50%)', fontSize: 12, color: 'var(--text-muted)',
                      }}>
                        {checkingBill ? 'Checking bill…' : 'Searching…'}
                      </span>
                    )}
                  </div>

                  {showDropdown && !editId && patientResults.length > 0 && (
                    <div style={{
                      position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
                      background: '#fff', border: '1px solid var(--border)',
                      borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.10)',
                      maxHeight: 220, overflowY: 'auto',
                    }}>
                      {patientResults.map(p => (
                        <div key={p._id}
                          style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid var(--border)' }}
                          onMouseEnter={e => e.currentTarget.style.background = '#f0f9ff'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                          onClick={() => handleSelectPatient(p)}
                        >
                          <div style={{ fontWeight: 600, fontSize: 14 }}>{p.name}</div>
                          <div style={{ fontSize: 12, color: '#64748b' }}>
                            {p.patientId} · {p.phone}
                            {p.assignedDoctor?.name ? ` · Dr. ${p.assignedDoctor.name}` : ''}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {showDropdown && !editId && !patientLoading && patientSearch && patientResults.length === 0 && (
                    <div style={{
                      position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
                      background: '#fff', border: '1px solid var(--border)',
                      borderRadius: 8, padding: '12px 14px', fontSize: 13, color: '#94a3b8',
                    }}>
                      No patients found
                    </div>
                  )}
                </div>

                {/* ── Pending Lab Billing Requests Banner ──────── */}
                {labItemsLoading && (
                  <div style={{
                    background: '#eff6ff', border: '1px solid #bfdbfe',
                    borderRadius: 10, padding: '12px 16px', marginBottom: 14,
                    fontSize: 13, color: '#1d4ed8',
                  }}>⏳ Checking for approved lab tests…</div>
                )}

                {!labItemsLoading && pendingLabItems.length > 0 && (
                  <div style={{
                    background: '#f0fdf4', border: '1px solid #86efac',
                    borderRadius: 10, padding: '14px 18px', marginBottom: 14,
                  }}>
                    <div style={{ fontWeight: 700, color: '#15803d', marginBottom: 10, fontSize: 14 }}>
                      🧪 {pendingLabItems.length} approved lab test{pendingLabItems.length > 1 ? 's' : ''} ready to add
                    </div>
                    {pendingLabItems.map(req => (
                      <div key={req._id} style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        marginBottom: 8, background: '#dcfce7', borderRadius: 8, padding: '8px 12px',
                      }}>
                        <div>
                          <span style={{ fontWeight: 600, fontSize: 13, color: '#166534' }}>{req.labId}</span>
                          <span style={{ fontSize: 12, color: '#4ade80', margin: '0 6px' }}>·</span>
                          <span style={{ fontSize: 13, color: '#166534' }}>{req.tests.map(t => t.testName).join(', ')}</span>
                          <span style={{ fontSize: 13, color: '#15803d', fontWeight: 700, marginLeft: 8 }}>₹{req.totalAmount}</span>
                        </div>
                        <button type="button" onClick={() => addLabItemsToBill(req)} style={{
                          padding: '5px 14px', borderRadius: 6, border: 'none',
                          background: '#16a34a', color: '#fff', fontWeight: 600,
                          fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap',
                          flexShrink: 0, marginLeft: 12,
                        }}>+ Add to Bill</button>
                      </div>
                    ))}
                  </div>
                )}

                {/* ── Bill Items ──────────────────────────────── */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <label className="form-label" style={{ margin: 0 }}>
                    Bill Items
                    {fetchingItems && (
                      <span style={{ marginLeft: 10, fontSize: 12, color: '#0369a1', fontWeight: 400 }}>
                        ⏳ Fetching new items…
                      </span>
                    )}
                    {!fetchingItems && form.items.length > 0 && (
                      <span style={{
                        marginLeft: 10, fontSize: 11, background: '#d1fae5', color: '#065f46',
                        padding: '2px 8px', borderRadius: 20, fontWeight: 500,
                      }}>
                        ✓ {form.items.length} item(s)
                      </span>
                    )}
                  </label>
                  <button type="button" className="btn btn-sm btn-ghost" onClick={addItem}>+ Add item</button>
                </div>

                <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden', marginBottom: 16 }}>
                  {form.items.length === 0 ? (
                    <div style={{ padding: 20, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
                      {form.patient
                        ? fetchingItems ? 'Loading items…'
                          : 'No items yet. Add manually or use the lab banner above.'
                        : 'Select a patient to load their bill.'}
                    </div>
                  ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead>
                        <tr style={{ background: '#f8fafc' }}>
                          <th style={th}>Description</th>
                          <th style={th}>Category</th>
                          <th style={th}>Added by</th>
                          <th style={{ ...th, width: 70 }}>Qty</th>
                          <th style={{ ...th, width: 90 }}>Price (₹)</th>
                          <th style={{ ...th, width: 90 }}>Total (₹)</th>
                          <th style={{ ...th, width: 36 }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {form.items.map((item, idx) => (
                          <tr key={idx} style={{
                            borderBottom: '1px solid var(--border)',
                            // Highlight newly added items with a subtle green tint
                            background: idx >= existingItemCount ? '#f0fdf4' : '#fff',
                          }}>
                            <td style={td}>
                              <input className="form-control" style={{ fontSize: 13, padding: '4px 8px' }}
                                value={item.description}
                                onChange={e => updateItem(idx, 'description', e.target.value)}
                                placeholder="Description" />
                            </td>
                            <td style={td}>
                              <select className="form-control" style={{ fontSize: 12, padding: '4px 6px' }}
                                value={item.category || 'Other'}
                                onChange={e => updateItem(idx, 'category', e.target.value)}>
                                {['Medicine','Lab','Procedure','Consultation','Other'].map(c => (
                                  <option key={c}>{c}</option>
                                ))}
                              </select>
                            </td>
                            <td style={{ ...td, fontSize: 12, color: '#64748b' }}>{item.addedByName || '—'}</td>
                            <td style={td}>
                              <input className="form-control" type="number" min="1"
                                style={{ fontSize: 13, padding: '4px 6px', textAlign: 'center' }}
                                value={item.quantity}
                                onChange={e => updateItem(idx, 'quantity', e.target.value)} />
                            </td>
                            <td style={td}>
                              <input className="form-control" type="number" min="0"
                                style={{ fontSize: 13, padding: '4px 6px', textAlign: 'right' }}
                                value={item.unitPrice}
                                onChange={e => updateItem(idx, 'unitPrice', e.target.value)} />
                            </td>
                            <td style={{ ...td, fontWeight: 600, textAlign: 'right', paddingRight: 12 }}>
                              ₹{(Number(item.total)||0).toLocaleString()}
                            </td>
                            <td style={td}>
                              <button type="button" onClick={() => removeItem(idx)}
                                style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 16 }}>
                                ×
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                {/* ── Room / Bed Rent ─────────────────────────── */}
                <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden', marginBottom: 16 }}>
                  <div style={{
                    background: '#fef3c7', padding: '8px 14px',
                    borderBottom: '1px solid var(--border)',
                    fontSize: 13, fontWeight: 600, color: '#92400e',
                  }}>🏥 Room / Bed Rent</div>
                  <div style={{ padding: 14 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label">Admission Date</label>
                        <input className="form-control" type="date"
                          value={form.admissionDate ? form.admissionDate.substring(0,10) : ''}
                          onChange={e => updateRoom('admissionDate', e.target.value)} />
                      </div>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label">Discharge Date</label>
                        <input className="form-control" type="date"
                          value={form.dischargeDate ? form.dischargeDate.substring(0,10) : ''}
                          onChange={e => updateRoom('dischargeDate', e.target.value)} />
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 12 }}>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label">Room Type</label>
                        <select className="form-control" value={form.roomType}
                          onChange={e => updateRoom('roomType', e.target.value)}>
                          {Object.entries(ROOM_RATES).map(([type, rate]) => (
                            <option key={type} value={type}>{type} — ₹{rate.toLocaleString()}/day</option>
                          ))}
                        </select>
                      </div>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label">Days Admitted</label>
                        <input className="form-control" type="number" min="0"
                          value={form.daysAdmitted}
                          onChange={e => updateRoom('daysAdmitted', e.target.value)} />
                      </div>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label">Room Rent (₹)</label>
                        <input className="form-control" readOnly
                          value={`₹${Number(form.roomRent||0).toLocaleString()}`}
                          style={{ fontWeight: 700, background: '#f8fafc', color: '#92400e' }} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── Discount / Tax / Payment ────────────────── */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Discount (₹)</label>
                    <input className="form-control" type="number" min="0"
                      value={form.discount}
                      onChange={e => updateFinancial('discount', e.target.value)} />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Tax (%)</label>
                    <input className="form-control" type="number" min="0"
                      value={form.tax}
                      onChange={e => updateFinancial('tax', e.target.value)} />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Payment Method</label>
                    <select className="form-control" value={form.paymentMethod}
                      onChange={e => setForm(f => ({ ...f, paymentMethod: e.target.value }))}>
                      <option>Pending</option><option>Cash</option>
                      <option>Card</option><option>Insurance</option><option>UPI</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Payment Status</label>
                    <select className="form-control" value={form.paymentStatus}
                      onChange={e => setForm(f => ({ ...f, paymentStatus: e.target.value }))}>
                      <option>Pending</option><option>Partial</option>
                      <option>Paid</option><option>Cancelled</option>
                    </select>
                  </div>
                  {form.paymentStatus === 'Partial' && (
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Paid Amount (₹)</label>
                      <input className="form-control" type="number" min="0"
                        value={form.paidAmount || ''}
                        onChange={e => setForm(f => ({ ...f, paidAmount: e.target.value }))} />
                    </div>
                  )}
                </div>

                {/* ── Bill Summary ────────────────────────────── */}
                <div style={{
                  background: '#f8fafc', border: '1px solid var(--border)',
                  borderRadius: 8, padding: '14px 16px',
                }}>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, color: '#1e293b' }}>Bill Summary</div>
                  {[
                    ['Items subtotal', `₹${form.items.reduce((s,i)=>s+Number(i.total||0),0).toLocaleString()}`],
                    [`Room rent (${form.daysAdmitted||0}d × ₹${(form.roomRatePerDay||0).toLocaleString()})`, `₹${Number(form.roomRent||0).toLocaleString()}`],
                    ['Discount', `- ₹${Number(form.discount||0).toLocaleString()}`],
                    [`Tax (${form.tax||0}%)`, `₹${((form.subtotal||0)*Number(form.tax||0)/100).toFixed(2)}`],
                  ].map(([label, value]) => (
                    <div key={label} style={{ display:'flex', justifyContent:'space-between', fontSize:13, marginBottom:6 }}>
                      <span style={{ color:'#475569' }}>{label}</span>
                      <span>{value}</span>
                    </div>
                  ))}
                  <div style={{
                    display: 'flex', justifyContent: 'space-between',
                    fontWeight: 700, fontSize: 16,
                    borderTop: '1px solid var(--border)', marginTop: 8, paddingTop: 10,
                    color: 'var(--primary)',
                  }}>
                    <span>Total Amount</span>
                    <span>₹{Number(form.totalAmount||0).toFixed(2)}</span>
                  </div>
                </div>

                <div className="form-group" style={{ marginTop: 12 }}>
                  <label className="form-label">Notes (optional)</label>
                  <textarea className="form-control" rows={2}
                    value={form.notes}
                    onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                    placeholder="Any additional notes…" />
                </div>

              </div>

              {/* ── Modal Footer ──────────────────────────────── */}
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost"
                  onClick={() => { setModal(false); resetModal(); }}>
                  Cancel
                </button>
                {editId && (
                  <button type="button"
                    onClick={() => handleDownloadPDF(editId)}
                    disabled={pdfLoading === editId}
                    style={{
                      padding: '9px 20px', borderRadius: 8,
                      border: '1px solid #0f4c81', background: '#fff',
                      color: '#0f4c81', fontWeight: 700, fontSize: 13,
                      cursor: pdfLoading === editId ? 'not-allowed' : 'pointer',
                      display: 'flex', alignItems: 'center', gap: 6,
                      opacity: pdfLoading === editId ? .6 : 1,
                    }}>
                    {pdfLoading === editId ? '⏳ Generating…' : '🖨 Download PDF'}
                  </button>
                )}
                <button type="submit" className="btn btn-primary" disabled={!form.patient}>
                  {editId ? 'Update Bill' : 'Create Bill'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const th = {
  padding: '8px 10px', textAlign: 'left', fontSize: 12,
  fontWeight: 600, color: '#64748b',
  borderBottom: '1px solid var(--border)',
};
const td = { padding: '6px 8px', verticalAlign: 'middle' };