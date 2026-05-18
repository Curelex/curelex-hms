// hms-react/src/pages/Pharmacy.jsx
import React, { useEffect, useState, useRef } from 'react';
import API from '../utils/api';

const emptyMed  = { name: '', dosage: '', quantity: 1, unitPrice: 0, total: 0, instructions: '', inventoryId: '' };
const emptyForm = { patient: '', medicines: [{ ...emptyMed }], totalAmount: 0, notes: '' };

// ── tiny helpers ──────────────────────────────────────────────────────────────
const fmt = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');

const StatusBadge = ({ s }) => {
  const map = {
    Pending:   { bg: '#fef3c7', color: '#b45309', border: '#fcd34d' },
    Dispensed: { bg: '#d1fae5', color: '#065f46', border: '#6ee7b7' },
    Cancelled: { bg: '#fee2e2', color: '#b91c1c', border: '#fca5a5' },
  };
  const c = map[s] || { bg: '#f1f5f9', color: '#64748b', border: '#cbd5e1' };
  return (
    <span style={{
      fontSize: 11, padding: '3px 10px', borderRadius: 20, fontWeight: 700,
      background: c.bg, color: c.color, border: `1px solid ${c.border}`,
    }}>{s}</span>
  );
};

export default function Pharmacy() {
  const [prescriptions, setPrescriptions] = useState([]);
  const [total,         setTotal]         = useState(0);
  const [loading,       setLoading]       = useState(true);
  const [modal,         setModal]         = useState(false);
  const [form,          setForm]          = useState(emptyForm);
  const [editId,        setEditId]        = useState(null);
  const [filterStatus,  setFilterStatus]  = useState('');
  const [page,          setPage]          = useState(1);
  const [saving,        setSaving]        = useState(false);

  // Patient search
  const [patSearch,    setPatSearch]    = useState('');
  const [patResults,   setPatResults]   = useState([]);
  const [patLoading,   setPatLoading]   = useState(false);
  const [showPatDrop,  setShowPatDrop]  = useState(false);
  const [selectedPat,  setSelectedPat]  = useState(null);
  const [isIPD,        setIsIPD]        = useState(false);   // is patient admitted?
  const patRef  = useRef(null);
  const patTimer = useRef(null);

  // Medicine inventory autocomplete (per row)
  const [medSuggestions, setMedSuggestions] = useState({});  // idx -> []
  const [showMedDrop,    setShowMedDrop]    = useState({});  // idx -> bool
  const medTimers = useRef({});

  // Dispense payment modal
  const [dispenseModal,  setDispenseModal]  = useState(null);  // holds rx object
  const [payMethod,      setPayMethod]      = useState('Cash');
  const [dispensing,     setDispensing]     = useState(false);

  // Receipt modal (after dispense)
  const [receipt, setReceipt] = useState(null);

  // ── Fetch prescriptions ───────────────────────────────────────────────────
  const fetchRx = async () => {
    setLoading(true);
    try {
      let url = `/pharmacy?page=${page}&limit=15`;
      if (filterStatus) url += `&status=${filterStatus}`;
      const { data } = await API.get(url);
      setPrescriptions(data.prescriptions);
      setTotal(data.total);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRx(); }, [page, filterStatus]);

  // Close patient dropdown on outside click
  useEffect(() => {
    const h = (e) => { if (patRef.current && !patRef.current.contains(e.target)) setShowPatDrop(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  // ── Patient search ────────────────────────────────────────────────────────
  const handlePatSearch = (val) => {
    setPatSearch(val);
    setShowPatDrop(true);
    clearTimeout(patTimer.current);
    if (!val.trim()) { setPatResults([]); return; }
    patTimer.current = setTimeout(async () => {
      setPatLoading(true);
      try {
        const { data } = await API.get(`/patients?search=${encodeURIComponent(val)}&limit=8`);
        setPatResults(data.patients || []);
      } finally { setPatLoading(false); }
    }, 300);
  };

  const handleSelectPat = async (p) => {
    setPatSearch(p.name);
    setShowPatDrop(false);
    setPatResults([]);
    setSelectedPat(p);
    setForm(f => ({ ...f, patient: p._id }));

    // Check if admitted
    try {
      const { data } = await API.get('/admissions/active');
      const admitted = (data.admissions || []).some(a => String(a.patient?._id || a.patient) === String(p._id));
      setIsIPD(admitted);
    } catch { setIsIPD(false); }
  };

  // ── Medicine autocomplete per row ─────────────────────────────────────────
  const handleMedNameChange = (idx, val) => {
    updateMed(idx, 'name', val);
    clearTimeout(medTimers.current[idx]);
    if (!val.trim()) {
      setMedSuggestions(s => ({ ...s, [idx]: [] }));
      setShowMedDrop(s => ({ ...s, [idx]: false }));
      return;
    }
    medTimers.current[idx] = setTimeout(async () => {
      try {
        const { data } = await API.get(`/pharmacy/inventory/search?q=${encodeURIComponent(val)}`);
        setMedSuggestions(s => ({ ...s, [idx]: data }));
        setShowMedDrop(s => ({ ...s, [idx]: true }));
      } catch { }
    }, 300);
  };

  const handleSelectMed = (idx, item) => {
    const medicines = [...form.medicines];
    medicines[idx] = {
      ...medicines[idx],
      name:        item.name,
      unitPrice:   item.unitPrice || 0,
      total:       (medicines[idx].quantity || 1) * (item.unitPrice || 0),
      inventoryId: item._id,
    };
    const totalAmount = medicines.reduce((s, m) => s + (m.total || 0), 0);
    setForm(f => ({ ...f, medicines, totalAmount }));
    setShowMedDrop(s => ({ ...s, [idx]: false }));
    setMedSuggestions(s => ({ ...s, [idx]: [] }));
  };

  // ── Medicine row update ───────────────────────────────────────────────────
  const updateMed = (idx, field, val) => {
    const medicines = [...form.medicines];
    medicines[idx] = { ...medicines[idx], [field]: val };
    if (field === 'quantity' || field === 'unitPrice') {
      medicines[idx].total = (parseFloat(medicines[idx].quantity) || 0) * (parseFloat(medicines[idx].unitPrice) || 0);
    }
    const totalAmount = medicines.reduce((s, m) => s + (m.total || 0), 0);
    setForm(f => ({ ...f, medicines, totalAmount }));
  };

  const addMedRow    = () => setForm(f => ({ ...f, medicines: [...f.medicines, { ...emptyMed }] }));
  const removeMedRow = (idx) => {
    const medicines = form.medicines.filter((_, i) => i !== idx);
    const totalAmount = medicines.reduce((s, m) => s + (m.total || 0), 0);
    setForm(f => ({ ...f, medicines, totalAmount }));
  };

  // ── Save prescription (without dispensing) ────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.patient) return alert('Please select a patient.');
    setSaving(true);
    try {
      if (editId) {
        await API.put(`/pharmacy/${editId}`, form);
      } else {
        await API.post('/pharmacy', form);
      }
      closeModal();
      fetchRx();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  // ── Open dispense modal ───────────────────────────────────────────────────
  const openDispense = (rx) => {
    setDispenseModal(rx);
    setPayMethod('Cash');
  };

  // ── Confirm dispense ──────────────────────────────────────────────────────
  const handleDispense = async () => {
    if (!dispenseModal) return;
    setDispensing(true);
    try {
      const { data } = await API.post(`/pharmacy/${dispenseModal._id}/dispense`, {
        paymentMethod: payMethod,
      });

      setDispenseModal(null);
      fetchRx();
      setReceipt(data);   // show receipt

    } catch (err) {
      const errData = err.response?.data;
      if (errData?.stockErrors) {
        alert('Stock issues:\n' + errData.stockErrors.join('\n'));
      } else {
        alert(errData?.message || 'Dispense failed');
      }
    } finally {
      setDispensing(false);
    }
  };

  // ── Modal helpers ─────────────────────────────────────────────────────────
  const openAdd = () => {
    setForm(emptyForm);
    setEditId(null);
    setPatSearch('');
    setSelectedPat(null);
    setIsIPD(false);
    setModal(true);
  };

  const openEdit = (rx) => {
    setForm({
      ...rx,
      patient: rx.patient?._id || rx.patient,
    });
    setPatSearch(rx.patient?.name || '');
    setSelectedPat(rx.patient);
    setEditId(rx._id);
    setModal(true);
  };

  const closeModal = () => {
    setModal(false);
    setForm(emptyForm);
    setEditId(null);
    setPatSearch('');
    setSelectedPat(null);
    setIsIPD(false);
    setMedSuggestions({});
    setShowMedDrop({});
  };

  const pages = Math.ceil(total / 15);

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div>
      {/* ── Page header ── */}
      <div className="page-header">
        <h1 className="page-title">💊 Pharmacy</h1>
        <button className="btn btn-primary" onClick={openAdd}>+ New Prescription</button>
      </div>

      {/* ── Table card ── */}
      <div className="card">
        <div className="filter-bar">
          <select className="form-control" value={filterStatus}
            onChange={e => { setFilterStatus(e.target.value); setPage(1); }}
            style={{ width: 160 }}>
            <option value="">All Status</option>
            <option>Pending</option>
            <option>Dispensed</option>
            <option>Cancelled</option>
          </select>
          <div className="text-muted text-small">{total} prescriptions</div>
        </div>

        {loading ? <div className="spinner" /> : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Rx ID</th><th>Patient</th><th>Medicines</th>
                  <th>Total</th><th>Type</th><th>Status</th><th>Date</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {prescriptions.length === 0 ? (
                  <tr><td colSpan="8" className="empty-state">No prescriptions found</td></tr>
                ) : prescriptions.map(rx => (
                  <tr key={rx._id}>
                    <td><strong style={{ color: 'var(--primary)' }}>{rx.prescriptionId}</strong></td>
                    <td>
                      <strong>{rx.patient?.name}</strong><br />
                      <span className="text-muted text-small">{rx.patient?.patientId}</span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 600 }}>{rx.medicines?.length} item(s)</span><br />
                      <span className="text-muted text-small" style={{ fontSize: 11 }}>
                        {rx.medicines?.map(m => m.name).join(', ')}
                      </span>
                    </td>
                    <td><strong>{fmt(rx.totalAmount)}</strong></td>
                    <td>
                      <span style={{
                        fontSize: 11, padding: '2px 8px', borderRadius: 20, fontWeight: 600,
                        background: rx.isIPD ? '#fef3c7' : '#dbeafe',
                        color:      rx.isIPD ? '#92400e' : '#1e40af',
                      }}>
                        {rx.isIPD ? '🏥 IPD' : '🚶 OPD'}
                      </span>
                    </td>
                    <td><StatusBadge s={rx.status} /></td>
                    <td style={{ fontSize: 12 }}>{new Date(rx.createdAt).toLocaleDateString('en-IN')}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {rx.status === 'Pending' && (
                          <button
                            className="btn btn-sm"
                            style={{ background: '#16a34a', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                            onClick={() => openDispense(rx)}
                          >
                            💊 Dispense
                          </button>
                        )}
                        <button className="btn btn-sm btn-outline" onClick={() => openEdit(rx)}>Edit</button>
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

      {/* ── Add / Edit Prescription Modal ──────────────────────────────────── */}
      {modal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{editId ? 'Edit Prescription' : '💊 New Prescription'}</h3>
              <button className="modal-close" onClick={closeModal}>×</button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="modal-body">

                {/* ── Patient search ── */}
                <div className="form-group" ref={patRef} style={{ position: 'relative' }}>
                  <label className="form-label">Patient *</label>
                  <input
                    className="form-control"
                    placeholder="Search by name, ID or phone…"
                    value={patSearch}
                    onChange={e => handlePatSearch(e.target.value)}
                    onFocus={() => patSearch && setShowPatDrop(true)}
                    autoComplete="off"
                    readOnly={!!editId}
                    style={editId ? { background: '#f8fafc', color: '#475569' } : {}}
                  />
                  {patLoading && (
                    <span style={{ position: 'absolute', right: 12, top: 38, fontSize: 12, color: '#94a3b8' }}>Searching…</span>
                  )}

                  {showPatDrop && !editId && patResults.length > 0 && (
                    <div style={{
                      position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
                      background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8,
                      boxShadow: '0 4px 16px rgba(0,0,0,.10)', maxHeight: 220, overflowY: 'auto',
                    }}>
                      {patResults.map(p => (
                        <div key={p._id}
                          style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9' }}
                          onMouseEnter={e => e.currentTarget.style.background = '#f0f9ff'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                          onClick={() => handleSelectPat(p)}
                        >
                          <div style={{ fontWeight: 600 }}>{p.name}</div>
                          <div style={{ fontSize: 12, color: '#64748b' }}>{p.patientId} · {p.phone}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* ── IPD / OPD notice ── */}
                {selectedPat && (
                  <div style={{
                    borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 13,
                    background: isIPD ? '#fef3c7' : '#f0f9ff',
                    border: isIPD ? '1px solid #fcd34d' : '1px solid #bae6fd',
                    color: isIPD ? '#92400e' : '#0369a1',
                    display: 'flex', alignItems: 'center', gap: 10,
                  }}>
                    <span style={{ fontSize: 18 }}>{isIPD ? '🏥' : '🚶'}</span>
                    <div>
                      <strong>{isIPD ? 'IPD Patient (Currently Admitted)' : 'OPD Patient'}</strong>
                      <div style={{ fontSize: 12, marginTop: 2 }}>
                        {isIPD
                          ? 'Medicines will be dispensed and a billing request sent to billing dept for approval.'
                          : 'Medicines will be dispensed and bill generated immediately at pharmacy counter.'}
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Medicines ── */}
                <div style={{ marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <label className="form-label" style={{ margin: 0 }}>Medicines</label>
                    <button type="button" className="btn btn-sm btn-ghost" onClick={addMedRow}>+ Add Medicine</button>
                  </div>

                  {form.medicines.map((med, idx) => (
                    <div key={idx} style={{
                      background: '#f8fafc', border: '1px solid #e2e8f0',
                      borderRadius: 8, padding: 12, marginBottom: 8,
                    }}>
                      {/* Medicine name with autocomplete */}
                      <div style={{ position: 'relative', marginBottom: 8 }}>
                        <input
                          className="form-control"
                          placeholder="Medicine name (type to search inventory)…"
                          value={med.name}
                          onChange={e => handleMedNameChange(idx, e.target.value)}
                          onBlur={() => setTimeout(() => setShowMedDrop(s => ({ ...s, [idx]: false })), 200)}
                        />
                        {showMedDrop[idx] && medSuggestions[idx]?.length > 0 && (
                          <div style={{
                            position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
                            background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8,
                            boxShadow: '0 4px 16px rgba(0,0,0,.10)', maxHeight: 180, overflowY: 'auto',
                          }}>
                            {medSuggestions[idx].map(item => (
                              <div key={item._id}
                                style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9', fontSize: 13 }}
                                onMouseDown={() => handleSelectMed(idx, item)}
                              >
                                <div style={{ fontWeight: 600 }}>{item.name}</div>
                                <div style={{ fontSize: 11, color: '#64748b' }}>
                                  Stock: {item.quantity} {item.unit} · {fmt(item.unitPrice)}/unit
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Dosage / Qty / Price / Instructions row */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 100px 100px auto', gap: 8, alignItems: 'center' }}>
                        <input className="form-control" placeholder="Dosage (e.g. 500mg)" value={med.dosage}
                          onChange={e => updateMed(idx, 'dosage', e.target.value)} />
                        <input className="form-control" type="number" min="1" placeholder="Qty"
                          value={med.quantity} onChange={e => updateMed(idx, 'quantity', e.target.value)} />
                        <input className="form-control" type="number" min="0" placeholder="₹ Price"
                          value={med.unitPrice} onChange={e => updateMed(idx, 'unitPrice', e.target.value)} />
                        <div style={{ fontWeight: 700, color: '#0f4c81', textAlign: 'right', fontSize: 14 }}>
                          {fmt(med.total)}
                        </div>
                        {form.medicines.length > 1 && (
                          <button type="button" onClick={() => removeMedRow(idx)}
                            style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 18, lineHeight: 1 }}>×</button>
                        )}
                      </div>

                      <input className="form-control" placeholder="Instructions (e.g. After meals, twice daily)"
                        value={med.instructions} onChange={e => updateMed(idx, 'instructions', e.target.value)}
                        style={{ marginTop: 8 }} />
                    </div>
                  ))}
                </div>

                {/* ── Total ── */}
                <div style={{
                  background: '#0f4c81', color: '#fff', borderRadius: 8,
                  padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  marginBottom: 12,
                }}>
                  <span style={{ fontWeight: 600 }}>Total Amount</span>
                  <span style={{ fontSize: 22, fontWeight: 800 }}>{fmt(form.totalAmount)}</span>
                </div>

                {/* Notes */}
                <div className="form-group">
                  <label className="form-label">Notes (optional)</label>
                  <textarea className="form-control" rows={2} value={form.notes}
                    onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                    placeholder="Doctor's instructions, special notes…" />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={closeModal}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving || !form.patient}>
                  {saving ? 'Saving…' : (editId ? 'Update Prescription' : 'Save Prescription')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Dispense + Payment Modal ────────────────────────────────────────── */}
      {dispenseModal && (
        <div className="modal-overlay" onClick={() => setDispenseModal(null)}>
          <div className="modal" style={{ maxWidth: 460 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">💊 Dispense Medicines</h3>
              <button className="modal-close" onClick={() => setDispenseModal(null)}>×</button>
            </div>
            <div className="modal-body">
              {/* Patient info */}
              <div style={{
                background: '#f0f9ff', border: '1px solid #bae6fd',
                borderRadius: 8, padding: '10px 14px', marginBottom: 16,
              }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{dispenseModal.patient?.name}</div>
                <div style={{ fontSize: 12, color: '#0369a1' }}>{dispenseModal.patient?.patientId} · {dispenseModal.prescriptionId}</div>
              </div>

              {/* Medicines list */}
              <div style={{ marginBottom: 16 }}>
                {dispenseModal.medicines?.map((m, i) => (
                  <div key={i} style={{
                    display: 'flex', justifyContent: 'space-between',
                    padding: '7px 0', borderBottom: '1px solid #f1f5f9', fontSize: 13,
                  }}>
                    <div>
                      <strong>{m.name}</strong>
                      {m.dosage && <span style={{ color: '#64748b' }}> · {m.dosage}</span>}
                      <div style={{ fontSize: 11, color: '#94a3b8' }}>{m.instructions}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div>{m.quantity} × {fmt(m.unitPrice)}</div>
                      <strong style={{ color: '#0f4c81' }}>{fmt(m.total)}</strong>
                    </div>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, fontWeight: 800, fontSize: 16 }}>
                  <span>Total</span>
                  <span style={{ color: '#0f4c81' }}>{fmt(dispenseModal.totalAmount)}</span>
                </div>
              </div>

              {/* Payment method — only for OPD */}
              <div style={{
                background: '#f8fafc', border: '1px solid #e2e8f0',
                borderRadius: 8, padding: '12px 14px', marginBottom: 14,
              }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', marginBottom: 10, textTransform: 'uppercase' }}>
                  Payment Method
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  {['Cash', 'UPI', 'Card'].map(method => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setPayMethod(method)}
                      style={{
                        flex: 1, padding: '10px 0', borderRadius: 8, cursor: 'pointer',
                        border: payMethod === method ? '2px solid #0f4c81' : '1px solid #e2e8f0',
                        background: payMethod === method ? '#eff6ff' : '#fff',
                        color: payMethod === method ? '#0f4c81' : '#64748b',
                        fontWeight: payMethod === method ? 700 : 500, fontSize: 13,
                        transition: 'all .15s',
                      }}
                    >
                      {method === 'Cash' ? '💵' : method === 'UPI' ? '📱' : '💳'} {method}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ fontSize: 12, color: '#64748b', padding: '6px 10px', borderRadius: 6, background: '#f8fafc' }}>
                ⚠️ Dispensing will deduct medicines from inventory and generate a bill automatically.
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-ghost" onClick={() => setDispenseModal(null)}>Cancel</button>
              <button
                className="btn btn-primary"
                onClick={handleDispense}
                disabled={dispensing}
                style={{ background: '#16a34a', minWidth: 140 }}
              >
                {dispensing ? 'Dispensing…' : `✓ Confirm Dispense`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Receipt Modal ───────────────────────────────────────────────────── */}
      {receipt && (
        <div className="modal-overlay" onClick={() => setReceipt(null)}>
          <div className="modal" style={{ maxWidth: 400, textAlign: 'center' }} onClick={e => e.stopPropagation()}>
            <div className="modal-body" style={{ padding: '28px 24px' }}>
              <div style={{ fontSize: 50, marginBottom: 10 }}>
                {receipt.flow === 'IPD' ? '📋' : '✅'}
              </div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#1e293b', marginBottom: 6 }}>
                {receipt.flow === 'IPD' ? 'Billing Request Sent' : 'Dispensed & Paid!'}
              </div>
              <div style={{ fontSize: 13, color: '#475569', marginBottom: 18, lineHeight: 1.6 }}>
                {receipt.message}
              </div>

              {receipt.flow === 'OPD' && receipt.bill && (
                <div style={{
                  background: '#f0fdf4', border: '1px solid #bbf7d0',
                  borderRadius: 8, padding: '10px 14px', marginBottom: 16,
                  fontSize: 13, color: '#166534',
                }}>
                  <div>Bill ID: <strong>{receipt.bill.billId}</strong></div>
                  <div>Amount: <strong>{fmt(receipt.bill.totalAmount)}</strong></div>
                  <div>Method: <strong>{receipt.bill.paymentMethod}</strong></div>
                </div>
              )}

              {receipt.flow === 'IPD' && receipt.billingRequest && (
                <div style={{
                  background: '#fef3c7', border: '1px solid #fcd34d',
                  borderRadius: 8, padding: '10px 14px', marginBottom: 16,
                  fontSize: 13, color: '#92400e',
                }}>
                  Request ID: <strong>{receipt.billingRequest.requestId}</strong><br />
                  Pending billing dept approval.
                </div>
              )}
            </div>
            <div className="modal-footer" style={{ justifyContent: 'center' }}>
              <button className="btn btn-primary" onClick={() => setReceipt(null)}>Done</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}