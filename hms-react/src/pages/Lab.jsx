// hms-react/src/pages/Lab.jsx
import React, { useEffect, useState } from 'react';
import API from '../utils/api';

const emptyTest = {
  testName: '', testCode: '', category: 'Blood',
  price: '', result: '', referenceRange: '', unit: '', status: 'Pending',
};

const emptyForm = {
  patient: '', tests: [{ ...emptyTest }],
  totalAmount: 0, priority: 'Normal', status: 'Ordered', remarks: '',
};

// ── Recalculate total from tests array ────────────────────────────────────────
const calcTotal = (tests) =>
  tests.reduce((s, t) => s + (parseFloat(t.price) || 0), 0);

export default function Lab() {
  const [labs,         setLabs]         = useState([]);
  const [total,        setTotal]        = useState(0);
  const [loading,      setLoading]      = useState(true);
  const [modal,        setModal]        = useState(false);
  const [form,         setForm]         = useState(emptyForm);
  const [editId,       setEditId]       = useState(null);
  const [patients,     setPatients]     = useState([]);
  const [filterStatus, setFilterStatus] = useState('');
  const [page,         setPage]         = useState(1);
  const [submitting,   setSubmitting]   = useState(false);
  const [error,        setError]        = useState('');

  // ── Fetch lab list ─────────────────────────────────────────────────────────
  // Backend automatically scopes by clinicId from JWT — no extra param needed
  const fetchLabs = async () => {
    setLoading(true);
    try {
      let url = `/lab?page=${page}&limit=15`;
      if (filterStatus) url += `&status=${filterStatus}`;
      const { data } = await API.get(url);
      setLabs(data.labs);
      setTotal(data.total);
    } catch (err) {
      console.error('Failed to fetch labs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLabs(); }, [page, filterStatus]);

  // ── Fetch patients — backend scopes by clinicId from JWT automatically ─────
  useEffect(() => {
    API.get('/patients?limit=200')
      .then(r => setPatients(r.data.patients || []))
      .catch(() => {});
  }, []);

  // ── Update a single test field ─────────────────────────────────────────────
  const updateTest = (idx, field, val) => {
    setForm(f => {
      const tests = [...f.tests];
      tests[idx] = { ...tests[idx], [field]: val };
      return { ...f, tests, totalAmount: calcTotal(tests) };
    });
  };

  // ── Add a blank test row ───────────────────────────────────────────────────
  const addTest = () => {
    setForm(f => ({
      ...f,
      tests: [...f.tests, { ...emptyTest }],
    }));
  };

  // ── Remove a test row + recalculate total ──────────────────────────────────
  const removeTest = (idx) => {
    setForm(f => {
      const tests     = f.tests.filter((_, i) => i !== idx);
      const safeTests = tests.length > 0 ? tests : [{ ...emptyTest }];
      return { ...f, tests: safeTests, totalAmount: calcTotal(safeTests) };
    });
  };

  // ── Open modal for creating ────────────────────────────────────────────────
  const openCreate = () => {
    setForm(emptyForm);
    setEditId(null);
    setError('');
    setModal(true);
  };

  // ── Open modal for editing ─────────────────────────────────────────────────
  const openEdit = (lab) => {
    const tests = (lab.tests || []).map(t => ({
      ...emptyTest,
      ...t,
      price: t.price ?? '',
    }));
    setForm({
      ...emptyForm,
      ...lab,
      patient:     lab.patient?._id || lab.patient || '',
      tests,
      totalAmount: calcTotal(tests),
    });
    setEditId(lab._id);
    setError('');
    setModal(true);
  };

  // ── Close modal ────────────────────────────────────────────────────────────
  const closeModal = () => {
    setModal(false);
    setForm(emptyForm);
    setEditId(null);
    setError('');
  };

  // ── Submit (create or update) ──────────────────────────────────────────────
  // clinicId is injected by the backend from req.user.clinicId — not sent from frontend
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (form.tests.some(t => !t.testName.trim())) {
      setError('Please enter a test name for every test row.');
      return;
    }
    if (!form.patient) {
      setError('Please select a patient.');
      return;
    }

    const payload = {
      ...form,
      tests: form.tests.map(t => ({
        ...t,
        price: parseFloat(t.price) || 0,
      })),
    };

    setSubmitting(true);
    try {
      if (editId) {
        await API.put(`/lab/${editId}`, payload);
      } else {
        await API.post('/lab', payload);
      }
      closeModal();
      fetchLabs();
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Quick status change from table row ─────────────────────────────────────
  const handleStatusChange = async (id, status) => {
    try {
      await API.put(`/lab/${id}`, { status });
      fetchLabs();
    } catch (err) {
      alert(err.response?.data?.message || 'Status update failed.');
    }
  };

  // ── Badges ─────────────────────────────────────────────────────────────────
  const statusBadge = (s) => {
    const map = {
      Ordered:            'badge-info',
      'Sample Collected': 'badge-warning',
      Processing:         'badge-purple',
      Completed:          'badge-success',
      Cancelled:          'badge-danger',
    };
    return <span className={`badge ${map[s] || 'badge-gray'}`}>{s}</span>;
  };

  const priorityBadge = (p) => {
    const map = { Normal: 'badge-gray', Urgent: 'badge-warning', STAT: 'badge-danger' };
    return <span className={`badge ${map[p] || 'badge-gray'}`}>{p}</span>;
  };

  const pages = Math.ceil(total / 15);

  // ──────────────────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Page header */}
      <div className="page-header">
        <h1 className="page-title">Lab Tests</h1>
        <button className="btn btn-primary" onClick={openCreate}>+ Order Lab Test</button>
      </div>

      {/* Lab list */}
      <div className="card">
        <div className="filter-bar">
          <select
            className="form-control"
            value={filterStatus}
            onChange={e => { setFilterStatus(e.target.value); setPage(1); }}
            style={{ width: 180 }}
          >
            <option value="">All Status</option>
            <option>Ordered</option>
            <option>Sample Collected</option>
            <option>Processing</option>
            <option>Completed</option>
            <option>Cancelled</option>
          </select>
          <div className="text-muted text-small">{total} tests</div>
        </div>

        {loading ? <div className="spinner" /> : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Lab ID</th><th>Patient</th><th>Tests</th>
                  <th>Total</th><th>Priority</th><th>Status</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {labs.length === 0 ? (
                  <tr><td colSpan="7" className="empty-state">No lab tests found</td></tr>
                ) : labs.map(lab => (
                  <tr key={lab._id}>
                    <td>
                      <strong style={{ color: 'var(--primary)' }}>{lab.labId}</strong>
                    </td>
                    <td>
                      <strong>{lab.patient?.name}</strong><br />
                      <span className="text-muted text-small">{lab.patient?.patientId}</span>
                    </td>
                    <td>
                      {lab.tests?.length} test(s)<br />
                      <span className="text-muted text-small">
                        {lab.tests?.map(t => t.testName).join(', ')}
                      </span>
                    </td>
                    <td>₹{(lab.totalAmount || 0).toLocaleString()}</td>
                    <td>{priorityBadge(lab.priority)}</td>
                    <td>{statusBadge(lab.status)}</td>
                    <td>
                      <div className="flex gap-2">
                        {lab.status === 'Ordered' && (
                          <button
                            className="btn btn-sm btn-warning"
                            onClick={() => handleStatusChange(lab._id, 'Sample Collected')}
                          >
                            Collect
                          </button>
                        )}
                        {lab.status === 'Sample Collected' && (
                          <button
                            className="btn btn-sm btn-ghost"
                            onClick={() => handleStatusChange(lab._id, 'Processing')}
                          >
                            Process
                          </button>
                        )}
                        {lab.status === 'Processing' && (
                          <button
                            className="btn btn-sm btn-success"
                            onClick={() => handleStatusChange(lab._id, 'Completed')}
                          >
                            Complete
                          </button>
                        )}
                        <button className="btn btn-sm btn-outline" onClick={() => openEdit(lab)}>
                          Edit
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
            <button
              className="page-btn"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >‹</button>
            {Array.from({ length: pages }, (_, i) => (
              <button
                key={i + 1}
                className={`page-btn ${page === i + 1 ? 'active' : ''}`}
                onClick={() => setPage(i + 1)}
              >
                {i + 1}
              </button>
            ))}
            <button
              className="page-btn"
              onClick={() => setPage(p => Math.min(pages, p + 1))}
              disabled={page === pages}
            >›</button>
          </div>
        )}
      </div>

      {/* ── Order / Edit Modal ──────────────────────────────────────────────── */}
      {modal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{editId ? 'Edit Lab Test' : 'Order Lab Test'}</h3>
              <button className="modal-close" onClick={closeModal}>×</button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="modal-body">

                {/* Error banner */}
                {error && (
                  <div style={{
                    background: '#fef2f2', border: '1px solid #fca5a5',
                    borderRadius: 8, padding: '10px 14px', marginBottom: 14,
                    color: '#b91c1c', fontSize: 13, fontWeight: 500,
                  }}>
                    ⚠ {error}
                  </div>
                )}

                {/* Patient + Priority */}
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Patient *</label>
                    {/*
                      Patients list is already clinic-scoped:
                      backend GET /patients filters by req.user.clinicId from JWT.
                      No extra query param needed here.
                    */}
                    <select
                      className="form-control"
                      value={form.patient}
                      onChange={e => setForm(f => ({ ...f, patient: e.target.value }))}
                      required
                    >
                      <option value="">Select Patient</option>
                      {patients.map(p => (
                        <option key={p._id} value={p._id}>
                          {p.name} — {p.patientId}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Priority</label>
                    <select
                      className="form-control"
                      value={form.priority}
                      onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
                    >
                      <option>Normal</option>
                      <option>Urgent</option>
                      <option>STAT</option>
                    </select>
                  </div>
                </div>

                {/* Tests */}
                <label className="form-label">Tests</label>
                {form.tests.map((test, idx) => (
                  <div
                    key={idx}
                    style={{ background: 'var(--surface2)', padding: 12, borderRadius: 8, marginBottom: 8 }}
                  >
                    {/* Row 1: name / category / price / ref range / remove */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: '2fr 1fr 1fr 1fr auto',
                      gap: 8, marginBottom: editId ? 8 : 0,
                    }}>
                      <input
                        className="form-control"
                        placeholder="Test name *"
                        value={test.testName}
                        onChange={e => updateTest(idx, 'testName', e.target.value)}
                      />
                      <select
                        className="form-control"
                        value={test.category}
                        onChange={e => updateTest(idx, 'category', e.target.value)}
                      >
                        <option>Blood</option>
                        <option>Urine</option>
                        <option>Imaging</option>
                        <option>Microbiology</option>
                        <option>Other</option>
                      </select>
                      <input
                        className="form-control"
                        type="number"
                        min="0"
                        placeholder="Price ₹"
                        value={test.price}
                        onChange={e => updateTest(idx, 'price', e.target.value)}
                      />
                      <input
                        className="form-control"
                        placeholder="Ref Range"
                        value={test.referenceRange}
                        onChange={e => updateTest(idx, 'referenceRange', e.target.value)}
                      />
                      <button
                        type="button"
                        className="btn btn-sm btn-danger"
                        onClick={() => removeTest(idx)}
                      >
                        ×
                      </button>
                    </div>

                    {/* Row 2: result fields — only when editing */}
                    {editId && (
                      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 8 }}>
                        <input
                          className="form-control"
                          placeholder="Result"
                          value={test.result}
                          onChange={e => updateTest(idx, 'result', e.target.value)}
                        />
                        <input
                          className="form-control"
                          placeholder="Unit"
                          value={test.unit}
                          onChange={e => updateTest(idx, 'unit', e.target.value)}
                        />
                        <select
                          className="form-control"
                          value={test.status}
                          onChange={e => updateTest(idx, 'status', e.target.value)}
                        >
                          <option>Pending</option>
                          <option>Processing</option>
                          <option>Completed</option>
                        </select>
                      </div>
                    )}
                  </div>
                ))}

                <button type="button" className="btn btn-ghost btn-sm" onClick={addTest}>
                  + Add Test
                </button>

                <div className="divider" />

                {/* Total */}
                <div style={{ textAlign: 'right', fontWeight: 700, fontSize: 16 }}>
                  Total: ₹{(form.totalAmount || 0).toFixed(2)}
                </div>

                {/* Remarks */}
                <div className="form-group" style={{ marginTop: 12 }}>
                  <label className="form-label">Remarks</label>
                  <textarea
                    className="form-control"
                    rows="2"
                    value={form.remarks}
                    onChange={e => setForm(f => ({ ...f, remarks: e.target.value }))}
                  />
                </div>

              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={closeModal}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting}
                >
                  {submitting ? 'Saving…' : editId ? 'Update' : 'Order Tests'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}