// hms-react/src/pages/IPD.jsx
// Inpatient Department — Receptionist manages admissions, adds medicines.
// Doctor/Nurse can add follow-up notes.
// Anyone with 'ipd' permission can view the full history.

import React, { useEffect, useState, useCallback } from 'react';
import API from '../utils/api';
import { useAuth } from '../context/AuthContext';

const ROOM_RATES = {
  'General Ward': 800,
  'Semi-Private': 1500,
  'Private Room': 2500,
  'ICU':          4000,
};

// ── small helpers ────────────────────────────────────────────────
function daysSince(date) {
  const d = Math.round((Date.now() - new Date(date)) / 86400000);
  return d <= 0 ? 1 : d;
}
function fmt(date) {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}
function fmtTime(date) {
  if (!date) return '';
  return new Date(date).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

const statusColor = { Admitted: '#d1fae5', Discharged: '#f1f5f9', Transferred: '#fef3c7' };
const statusText  = { Admitted: '#065f46', Discharged: '#475569', Transferred: '#92400e' };

// ────────────────────────────────────────────────────────────────
export default function IPD() {
  const { user } = useAuth();
  const isReceptionist = ['receptionist', 'admin'].includes(user?.role);
  const isDoctor       = user?.role === 'doctor';
  const isNurse        = user?.role === 'nurse';
  const canAddNote     = isDoctor || isNurse || user?.role === 'admin';

  const [admissions,    setAdmissions]    = useState([]);
  const [total,         setTotal]         = useState(0);
  const [loading,       setLoading]       = useState(true);
  const [filterStatus,  setFilterStatus]  = useState('Admitted');
  const [page,          setPage]          = useState(1);

  // detail panel
  const [selected,      setSelected]      = useState(null);   // admission object
  const [detailLoading, setDetailLoading] = useState(false);

  // admit modal
  const [admitModal,    setAdmitModal]    = useState(false);
  const [admitForm,     setAdmitForm]     = useState({ roomType: 'General Ward', roomNumber: '', notes: '' });
  const [patientSearch, setPatientSearch] = useState('');
  const [patientResults,setPatientResults]= useState([]);
  const [chosenPatient, setChosenPatient] = useState(null);
  const [doctors,       setDoctors]       = useState([]);
  const [chosenDoctor,  setChosenDoctor]  = useState('');
  const [admitSaving,   setAdmitSaving]   = useState(false);

  // add medicine modal
  const [medModal,      setMedModal]      = useState(false);
  const [medForm,       setMedForm]       = useState({ medicineName: '', dosage: '', quantity: 1, unitPrice: 0, notes: '' });
  const [medSaving,     setMedSaving]     = useState(false);

  // follow-up modal
  const [noteModal,     setNoteModal]     = useState(false);
  const [noteForm,      setNoteForm]      = useState({ note: '', type: 'General', vitals: { bp: '', temp: '', pulse: '', spo2: '' } });
  const [noteSaving,    setNoteSaving]    = useState(false);

  // discharge confirm
  const [dischargeId,   setDischargeId]   = useState(null);

  // patient search debounce
  const [searchTimer,   setSearchTimer]   = useState(null);

  // ── fetch list ────────────────────────────────────────────────
  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      let url = `/admissions?page=${page}&limit=15`;
      if (filterStatus) url += `&status=${filterStatus}`;
      const { data } = await API.get(url);
      setAdmissions(data.admissions);
      setTotal(data.total);
    } finally {
      setLoading(false);
    }
  }, [page, filterStatus]);

  useEffect(() => { fetchList(); }, [fetchList]);

  useEffect(() => {
    API.get('/auth/users').then(r => setDoctors(r.data.filter(u => u.role === 'doctor')));
  }, []);

  // ── fetch detail ──────────────────────────────────────────────
  const openDetail = async (adm) => {
    setDetailLoading(true);
    setSelected(adm);
    try {
      const { data } = await API.get(`/admissions/${adm._id}`);
      setSelected(data);
    } finally {
      setDetailLoading(false);
    }
  };

  const refreshDetail = async () => {
    if (!selected) return;
    const { data } = await API.get(`/admissions/${selected._id}`);
    setSelected(data);
    fetchList();
  };

  // ── patient search ────────────────────────────────────────────
  const handlePatientSearch = (val) => {
    setPatientSearch(val);
    clearTimeout(searchTimer);
    if (!val.trim()) { setPatientResults([]); return; }
    setSearchTimer(setTimeout(async () => {
      const { data } = await API.get(`/patients?search=${encodeURIComponent(val)}&limit=8`);
      setPatientResults(data.patients || []);
    }, 300));
  };

  // ── admit submit ──────────────────────────────────────────────
  const handleAdmit = async () => {
    if (!chosenPatient) return alert('Select a patient first');
    setAdmitSaving(true);
    try {
      await API.post('/admissions', {
        patientId:  chosenPatient._id,
        doctorId:   chosenDoctor || undefined,
        roomType:   admitForm.roomType,
        roomNumber: admitForm.roomNumber,
        notes:      admitForm.notes,
      });
      setAdmitModal(false);
      setChosenPatient(null);
      setPatientSearch('');
      setPatientResults([]);
      setAdmitForm({ roomType: 'General Ward', roomNumber: '', notes: '' });
      fetchList();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to admit patient');
    } finally {
      setAdmitSaving(false);
    }
  };

  // ── discharge ─────────────────────────────────────────────────
  const handleDischarge = async (id) => {
    try {
      await API.patch(`/admissions/${id}/discharge`);
      setDischargeId(null);
      if (selected?._id === id) refreshDetail();
      else fetchList();
    } catch (err) {
      alert(err.response?.data?.message || 'Discharge failed');
    }
  };

  // ── add medicine ──────────────────────────────────────────────
  const handleAddMedicine = async () => {
    if (!medForm.medicineName.trim()) return alert('Enter medicine name');
    setMedSaving(true);
    try {
      await API.post(`/admissions/${selected._id}/medicines`, medForm);
      setMedModal(false);
      setMedForm({ medicineName: '', dosage: '', quantity: 1, unitPrice: 0, notes: '' });
      refreshDetail();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to add medicine');
    } finally {
      setMedSaving(false);
    }
  };

  // ── remove medicine ───────────────────────────────────────────
  const handleRemoveMed = async (medId) => {
    if (!window.confirm('Remove this medicine entry?')) return;
    await API.delete(`/admissions/${selected._id}/medicines/${medId}`);
    refreshDetail();
  };

  // ── add follow-up note ────────────────────────────────────────
  const handleAddNote = async () => {
    if (!noteForm.note.trim()) return alert('Enter a note');
    setNoteSaving(true);
    try {
      await API.post(`/admissions/${selected._id}/followup`, noteForm);
      setNoteModal(false);
      setNoteForm({ note: '', type: 'General', vitals: { bp: '', temp: '', pulse: '', spo2: '' } });
      refreshDetail();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to add note');
    } finally {
      setNoteSaving(false);
    }
  };

  // ── create bill from admission ────────────────────────────────
  const handleCreateBill = async () => {
    try {
      const { data: summary } = await API.get(`/admissions/${selected._id}/bill-summary`);
      // Compute total
      const itemsTotal = summary.items.reduce((s, i) => s + i.total, 0);
      const grandTotal = itemsTotal + summary.roomRent;

      await API.post('/billing', {
        patient:        summary.patient._id,
        items:          summary.items,
        admissionDate:  summary.admissionDate,
        dischargeDate:  summary.dischargeDate,
        daysAdmitted:   summary.daysAdmitted,
        roomType:       summary.roomType,
        roomRatePerDay: summary.roomRatePerDay,
        roomRent:       summary.roomRent,
        subtotal:       grandTotal,
        totalAmount:    grandTotal,
        paymentStatus:  'Pending',
        paymentMethod:  'Pending',
        notes:          `Auto-generated from Admission ${summary.admissionId}`,
      });

      alert(`Bill created for ${summary.patient.name}! Go to Billing page to view.`);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create bill');
    }
  };

  const pages = Math.ceil(total / 15);

  // ── medicine total for selected admission ─────────────────────
  const medTotal = selected?.medicineLog?.reduce((s, m) => s + (m.total || 0), 0) || 0;
  const days     = selected
    ? (selected.daysAdmitted || daysSince(selected.admissionDate))
    : 0;
  const roomRent = days * (selected?.roomRatePerDay || 800);
  const grandTotal = medTotal + roomRent;

  // ─────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', gap: 20, height: 'calc(100vh - 80px)', overflow: 'hidden' }}>

      {/* ── LEFT PANEL: Admission list ─────────────────────────── */}
      <div style={{ flex: '0 0 440px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div className="page-header" style={{ marginBottom: 12 }}>
          <h1 className="page-title" style={{ fontSize: 18 }}>🏥 IPD — Inpatient</h1>
          {isReceptionist && (
            <button className="btn btn-primary" onClick={() => setAdmitModal(true)}>
              + Admit Patient
            </button>
          )}
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 12, alignItems: 'center' }}>
          {['Admitted', 'Discharged', ''].map(s => (
            <button
              key={s}
              onClick={() => { setFilterStatus(s); setPage(1); }}
              style={{
                padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                border: 'none', cursor: 'pointer',
                background: filterStatus === s ? '#0f4c81' : '#e2e8f0',
                color:      filterStatus === s ? '#fff' : '#475569',
              }}
            >
              {s || 'All'}
            </button>
          ))}
          <span style={{ fontSize: 12, color: '#94a3b8', marginLeft: 'auto' }}>{total} records</span>
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {loading ? (
            <div className="spinner" />
          ) : admissions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8', fontSize: 13 }}>
              No admissions found
            </div>
          ) : admissions.map(adm => {
            const isActive  = adm.status === 'Admitted';
            const dStr      = isActive ? `${daysSince(adm.admissionDate)}d admitted` : `Discharged ${fmt(adm.dischargeDate)}`;
            const isSelected = selected?._id === adm._id;
            return (
              <div
                key={adm._id}
                onClick={() => openDetail(adm)}
                style={{
                  background: isSelected ? '#eff6ff' : '#fff',
                  border: `1px solid ${isSelected ? '#93c5fd' : '#e2e8f0'}`,
                  borderRadius: 10, padding: '12px 14px', cursor: 'pointer',
                  transition: 'all 0.1s',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{adm.patient?.name}</div>
                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                      {adm.patient?.patientId} · {adm.patient?.age}y/{adm.patient?.gender}
                    </div>
                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                      {adm.roomType} {adm.roomNumber ? `· Room ${adm.roomNumber}` : ''}
                      {adm.doctor?.name ? ` · Dr. ${adm.doctor.name}` : ''}
                    </div>
                    <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
                      Admitted: {fmt(adm.admissionDate)} · {dStr}
                    </div>
                  </div>
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
                    background: statusColor[adm.status] || '#f1f5f9',
                    color:      statusText[adm.status]  || '#475569',
                  }}>
                    {adm.status}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 12, marginTop: 8, fontSize: 11, color: '#64748b' }}>
                  <span>💊 {adm.medicineLog?.length || 0} medicines</span>
                  <span>📋 {adm.followupLog?.length || 0} notes</span>
                </div>
              </div>
            );
          })}
          {pages > 1 && (
            <div className="pagination" style={{ justifyContent: 'center', marginTop: 8 }}>
              <button className="page-btn" onClick={() => setPage(p => Math.max(1, p-1))} disabled={page===1}>‹</button>
              {Array.from({ length: pages }, (_, i) => (
                <button key={i+1} className={`page-btn ${page===i+1?'active':''}`} onClick={() => setPage(i+1)}>{i+1}</button>
              ))}
              <button className="page-btn" onClick={() => setPage(p => Math.min(pages, p+1))} disabled={page===pages}>›</button>
            </div>
          )}
        </div>
      </div>

      {/* ── RIGHT PANEL: Admission detail ─────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {!selected ? (
          <div style={{
            height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexDirection: 'column', gap: 12, color: '#94a3b8',
          }}>
            <div style={{ fontSize: 48 }}>🏥</div>
            <div style={{ fontSize: 14 }}>Select an admission to view details</div>
          </div>
        ) : detailLoading ? (
          <div className="spinner" style={{ marginTop: 80 }} />
        ) : (
          <div>
            {/* Header */}
            <div className="card" style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: '50%', background: '#dbeafe',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 700, fontSize: 16, color: '#1e40af', flexShrink: 0,
                    }}>
                      {selected.patient?.name?.[0]?.toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 16 }}>{selected.patient?.name}</div>
                      <div style={{ fontSize: 12, color: '#64748b' }}>
                        {selected.patient?.patientId} · {selected.patient?.age}y / {selected.patient?.gender}
                        {selected.patient?.bloodGroup ? ` · ${selected.patient.bloodGroup}` : ''}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, auto)', gap: '4px 24px', fontSize: 12 }}>
                    <span style={{ color: '#64748b' }}>Admission ID</span>
                    <span style={{ color: '#64748b' }}>Room</span>
                    <span style={{ color: '#64748b' }}>Doctor</span>
                    <strong>{selected.admissionId}</strong>
                    <strong>{selected.roomType} {selected.roomNumber ? `· #${selected.roomNumber}` : ''}</strong>
                    <strong>{selected.doctor?.name ? `Dr. ${selected.doctor.name}` : '—'}</strong>
                    <span style={{ color: '#64748b' }}>Admitted</span>
                    <span style={{ color: '#64748b' }}>Rate/day</span>
                    <span style={{ color: '#64748b' }}>Days</span>
                    <strong>{fmt(selected.admissionDate)}</strong>
                    <strong>₹{(selected.roomRatePerDay || 0).toLocaleString()}</strong>
                    <strong>{days} day{days !== 1 ? 's' : ''}</strong>
                  </div>
                  {selected.patient?.allergies?.length > 0 && (
                    <div style={{
                      marginTop: 10, background: '#fef2f2', border: '1px solid #fecaca',
                      borderRadius: 6, padding: '4px 10px', fontSize: 11, color: '#b91c1c', display: 'inline-block',
                    }}>
                      ⚠️ Allergies: {selected.patient.allergies.join(', ')}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
                  <span style={{
                    fontSize: 12, fontWeight: 700, padding: '4px 14px', borderRadius: 20,
                    background: statusColor[selected.status], color: statusText[selected.status],
                  }}>
                    {selected.status}
                  </span>
                  {selected.status === 'Admitted' && isReceptionist && (
                    <button
                      className="btn btn-sm btn-outline"
                      style={{ borderColor: '#ef4444', color: '#ef4444' }}
                      onClick={() => setDischargeId(selected._id)}
                    >
                      🚪 Discharge
                    </button>
                  )}
                  {selected.status === 'Admitted' && isReceptionist && (
                    <button className="btn btn-sm btn-primary" onClick={handleCreateBill}>
                      🧾 Generate Bill
                    </button>
                  )}
                </div>
              </div>

              {/* Cost summary strip */}
              <div style={{
                marginTop: 14, display: 'flex', gap: 16, flexWrap: 'wrap',
                background: '#f8fafc', borderRadius: 8, padding: '10px 14px',
              }}>
                {[
                  ['Medicines total', `₹${medTotal.toLocaleString()}`],
                  [`Room rent (${days}d × ₹${(selected.roomRatePerDay||0).toLocaleString()})`, `₹${roomRent.toLocaleString()}`],
                  ['Grand total', `₹${grandTotal.toLocaleString()}`],
                ].map(([l, v], i) => (
                  <div key={l} style={{ flex: 1, minWidth: 120 }}>
                    <div style={{ fontSize: 11, color: '#94a3b8' }}>{l}</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: i === 2 ? '#0f4c81' : '#1e293b' }}>{v}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Medicine Log ───────────────────────────── */}
            <div className="card" style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <h3 style={{ fontSize: 14, margin: 0 }}>💊 Medicine Log</h3>
                {selected.status === 'Admitted' && isReceptionist && (
                  <button className="btn btn-sm btn-primary" onClick={() => setMedModal(true)}>
                    + Add Medicine
                  </button>
                )}
              </div>
              {selected.medicineLog?.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px 0', color: '#94a3b8', fontSize: 13 }}>
                  No medicines recorded yet
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: '#f8fafc' }}>
                      {['Medicine', 'Dosage', 'Qty', 'Unit Price', 'Total', 'Given by', 'Date', ''].map(h => (
                        <th key={h} style={{ padding: '7px 10px', textAlign: 'left', fontSize: 11, color: '#64748b', fontWeight: 600, borderBottom: '1px solid #e2e8f0' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {selected.medicineLog.map((m, i) => (
                      <tr key={m._id || i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '8px 10px', fontWeight: 600 }}>{m.medicineName}</td>
                        <td style={{ padding: '8px 10px', color: '#64748b' }}>{m.dosage || '—'}</td>
                        <td style={{ padding: '8px 10px' }}>{m.quantity}</td>
                        <td style={{ padding: '8px 10px' }}>₹{(m.unitPrice||0).toLocaleString()}</td>
                        <td style={{ padding: '8px 10px', fontWeight: 600 }}>₹{(m.total||0).toLocaleString()}</td>
                        <td style={{ padding: '8px 10px', color: '#64748b', fontSize: 12 }}>{m.givenByName || '—'}</td>
                        <td style={{ padding: '8px 10px', color: '#94a3b8', fontSize: 11 }}>{fmtTime(m.givenAt)}</td>
                        <td style={{ padding: '8px 4px' }}>
                          {isReceptionist && selected.status === 'Admitted' && (
                            <button
                              onClick={() => handleRemoveMed(m._id)}
                              style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 15 }}
                            >×</button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* ── Follow-up / History Log ────────────────── */}
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <h3 style={{ fontSize: 14, margin: 0 }}>📋 Patient History / Follow-ups</h3>
                {selected.status === 'Admitted' && canAddNote && (
                  <button className="btn btn-sm btn-outline" onClick={() => setNoteModal(true)}>
                    + Add Note
                  </button>
                )}
              </div>
              {selected.followupLog?.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px 0', color: '#94a3b8', fontSize: 13 }}>
                  No follow-up notes yet
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {[...selected.followupLog].reverse().map((log, i) => {
                    const typeColor = {
                      Doctor:  { bg: '#eff6ff', border: '#bfdbfe', badge: '#1e40af', badgeBg: '#dbeafe' },
                      Nurse:   { bg: '#f0fdf4', border: '#bbf7d0', badge: '#065f46', badgeBg: '#d1fae5' },
                      General: { bg: '#f8fafc', border: '#e2e8f0', badge: '#475569', badgeBg: '#f1f5f9' },
                    }[log.type] || { bg: '#f8fafc', border: '#e2e8f0', badge: '#475569', badgeBg: '#f1f5f9' };
                    return (
                      <div key={i} style={{
                        background: typeColor.bg, border: `1px solid ${typeColor.border}`,
                        borderRadius: 8, padding: '12px 14px',
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{
                              fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
                              background: typeColor.badgeBg, color: typeColor.badge,
                            }}>
                              {log.type}
                            </span>
                            <span style={{ fontSize: 12, fontWeight: 600, color: '#1e293b' }}>
                              {log.writtenByName || '—'}
                            </span>
                          </div>
                          <span style={{ fontSize: 11, color: '#94a3b8' }}>{fmtTime(log.writtenAt)}</span>
                        </div>
                        <p style={{ fontSize: 13, color: '#334155', margin: '0 0 8px', lineHeight: 1.6 }}>{log.note}</p>
                        {log.vitals && Object.values(log.vitals).some(Boolean) && (
                          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                            {[
                              ['🩸 BP', log.vitals.bp],
                              ['🌡️ Temp', log.vitals.temp],
                              ['❤️ Pulse', log.vitals.pulse],
                              ['💨 SpO2', log.vitals.spo2],
                            ].filter(([, v]) => v).map(([l, v]) => (
                              <span key={l} style={{
                                fontSize: 11, background: '#fff', border: '1px solid #e2e8f0',
                                borderRadius: 6, padding: '2px 8px', color: '#475569',
                              }}>
                                {l}: <strong>{v}</strong>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── ADMIT MODAL ────────────────────────────────────────────── */}
      {admitModal && (
        <div className="modal-overlay" onClick={() => setAdmitModal(false)}>
          <div className="modal" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">🏥 Admit Patient</h3>
              <button className="modal-close" onClick={() => setAdmitModal(false)}>×</button>
            </div>
            <div className="modal-body">

              {/* Patient search */}
              <div className="form-group" style={{ position: 'relative' }}>
                <label className="form-label">Search Patient *</label>
                <input
                  className="form-control"
                  placeholder="Type patient name…"
                  value={patientSearch}
                  onChange={e => { handlePatientSearch(e.target.value); setChosenPatient(null); }}
                  autoComplete="off"
                />
                {patientResults.length > 0 && !chosenPatient && (
                  <div style={{
                    position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
                    background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8,
                    boxShadow: '0 4px 16px rgba(0,0,0,0.10)', maxHeight: 200, overflowY: 'auto',
                  }}>
                    {patientResults.map(p => (
                      <div
                        key={p._id}
                        style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#f0f9ff'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        onClick={() => {
                          setChosenPatient(p);
                          setPatientSearch(p.name);
                          setPatientResults([]);
                          setChosenDoctor(p.assignedDoctor?._id || p.assignedDoctor || '');
                        }}
                      >
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{p.name}</div>
                        <div style={{ fontSize: 11, color: '#64748b' }}>{p.patientId} · {p.phone}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {chosenPatient && (
                <div style={{
                  background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 8,
                  padding: '10px 14px', marginBottom: 14, fontSize: 12,
                }}>
                  ✓ <strong>{chosenPatient.name}</strong> — {chosenPatient.patientId} · {chosenPatient.phone}
                </div>
              )}

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Room Type</label>
                  <select className="form-control" value={admitForm.roomType} onChange={e => setAdmitForm(f => ({ ...f, roomType: e.target.value }))}>
                    {Object.entries(ROOM_RATES).map(([t, r]) => (
                      <option key={t} value={t}>{t} — ₹{r}/day</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Room Number</label>
                  <input className="form-control" placeholder="e.g. 204" value={admitForm.roomNumber}
                    onChange={e => setAdmitForm(f => ({ ...f, roomNumber: e.target.value }))} />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Treating Doctor</label>
                <select className="form-control" value={chosenDoctor} onChange={e => setChosenDoctor(e.target.value)}>
                  <option value="">— None / TBD —</option>
                  {doctors.map(d => <option key={d._id} value={d._id}>{d.name} ({d.department || 'General'})</option>)}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Admission Notes</label>
                <textarea className="form-control" rows={2} value={admitForm.notes}
                  onChange={e => setAdmitForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Reason for admission, initial observations…" />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setAdmitModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleAdmit} disabled={admitSaving || !chosenPatient}>
                {admitSaving ? 'Admitting…' : '🏥 Confirm Admit'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── ADD MEDICINE MODAL ─────────────────────────────────────── */}
      {medModal && (
        <div className="modal-overlay" onClick={() => setMedModal(false)}>
          <div className="modal" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">💊 Add Medicine Given</h3>
              <button className="modal-close" onClick={() => setMedModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div style={{
                background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 8,
                padding: '8px 12px', marginBottom: 14, fontSize: 12,
              }}>
                Patient: <strong>{selected?.patient?.name}</strong>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Medicine Name *</label>
                  <input className="form-control" value={medForm.medicineName}
                    onChange={e => setMedForm(f => ({ ...f, medicineName: e.target.value }))}
                    placeholder="e.g. Paracetamol" />
                </div>
                <div className="form-group">
                  <label className="form-label">Dosage</label>
                  <input className="form-control" value={medForm.dosage}
                    onChange={e => setMedForm(f => ({ ...f, dosage: e.target.value }))}
                    placeholder="e.g. 500mg" />
                </div>
              </div>
              <div className="form-row-3">
                <div className="form-group">
                  <label className="form-label">Quantity</label>
                  <input className="form-control" type="number" min="1" value={medForm.quantity}
                    onChange={e => setMedForm(f => ({ ...f, quantity: Number(e.target.value) }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Unit Price (₹)</label>
                  <input className="form-control" type="number" min="0" value={medForm.unitPrice}
                    onChange={e => setMedForm(f => ({ ...f, unitPrice: Number(e.target.value) }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Total</label>
                  <input className="form-control" readOnly
                    value={`₹${(medForm.quantity * medForm.unitPrice).toLocaleString()}`}
                    style={{ background: '#f8fafc', fontWeight: 600 }} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Notes</label>
                <input className="form-control" value={medForm.notes}
                  onChange={e => setMedForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Any special instructions…" />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setMedModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleAddMedicine} disabled={medSaving}>
                {medSaving ? 'Saving…' : '+ Add Medicine'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── ADD FOLLOW-UP NOTE MODAL ───────────────────────────────── */}
      {noteModal && (
        <div className="modal-overlay" onClick={() => setNoteModal(false)}>
          <div className="modal" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">📋 Add Follow-up Note</h3>
              <button className="modal-close" onClick={() => setNoteModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Note Type</label>
                  <select className="form-control" value={noteForm.type}
                    onChange={e => setNoteForm(f => ({ ...f, type: e.target.value }))}>
                    <option value="Doctor">Doctor</option>
                    <option value="Nurse">Nurse</option>
                    <option value="General">General</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Note *</label>
                <textarea className="form-control" rows={3} value={noteForm.note}
                  onChange={e => setNoteForm(f => ({ ...f, note: e.target.value }))}
                  placeholder="Diagnosis update, observations, instructions…" />
              </div>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 8 }}>
                Vitals (optional)
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {[['bp','BP (e.g. 120/80)'],['temp','Temp (e.g. 98.6°F)'],['pulse','Pulse (e.g. 72 bpm)'],['spo2','SpO2 (e.g. 98%)']].map(([k, ph]) => (
                  <div className="form-group" key={k} style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: 11 }}>{ph.split(' (')[0]}</label>
                    <input className="form-control" placeholder={ph}
                      value={noteForm.vitals[k]}
                      onChange={e => setNoteForm(f => ({ ...f, vitals: { ...f.vitals, [k]: e.target.value } }))} />
                  </div>
                ))}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setNoteModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleAddNote} disabled={noteSaving}>
                {noteSaving ? 'Saving…' : '+ Add Note'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── DISCHARGE CONFIRM ─────────────────────────────────────── */}
      {dischargeId && (
        <div className="modal-overlay" onClick={() => setDischargeId(null)}>
          <div className="modal" style={{ maxWidth: 380, textAlign: 'center' }} onClick={e => e.stopPropagation()}>
            <div className="modal-body" style={{ padding: '28px 24px' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🚪</div>
              <h3 style={{ marginBottom: 8 }}>Discharge Patient?</h3>
              <p style={{ fontSize: 13, color: '#64748b', marginBottom: 20 }}>
                This will mark the patient as discharged and calculate final room rent.
                Make sure to generate the bill before or after.
              </p>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setDischargeId(null)}>Cancel</button>
                <button
                  style={{ flex: 1, background: '#ef4444', color: '#fff', border: 'none', borderRadius: 8, padding: '10px', fontWeight: 600, cursor: 'pointer' }}
                  onClick={() => handleDischarge(dischargeId)}
                >
                  Confirm Discharge
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}