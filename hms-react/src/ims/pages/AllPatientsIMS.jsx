import React, { useState, useEffect, useCallback } from 'react';

// ✅ FIXED: was '/api' — missing '/clinic', causing 404 on all patient/file requests
const CLINIC_BASE = import.meta.env.VITE_CLINIC_API_URL
  ? `${import.meta.env.VITE_CLINIC_API_URL}`
  : '/api/clinic';

// ── helpers ────────────────────────────────────────────────────────────────────
function getTodayIST() {
  const now = new Date();
  const ist = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
  return ist.toISOString().split('T')[0];
}

function authHeader() {
  const token =
    localStorage.getItem('clinic_token') ||
    localStorage.getItem('ims_token')     ||
    localStorage.getItem('token')         ||
    sessionStorage.getItem('token') || '';
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function apiFetch(path) {
  const res = await fetch(`${CLINIC_BASE}${path}`, { headers: authHeader() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || `API error ${res.status}`);
  return data;
}

// ── PDF Generator (identical to ReceptionistDashboard) ────────────────────────
function generatePrescriptionHTML(prescription, clinicName) {
  const {
    patientName, patientAge, patientGender, patientPhone,
    doctorName, doctorSpecialist, tokenNumber,
    date, diagnosis, medicines, tests, notes, followUpDate,
  } = prescription;

  const medsHTML = (medicines || []).length === 0
    ? '<tr><td colspan="5" style="text-align:center;color:#999;padding:12px">No medicines prescribed</td></tr>'
    : (medicines || []).map((m, i) => `
        <tr style="border-bottom:1px solid #eee">
          <td style="padding:8px 10px;font-weight:600">${i + 1}</td>
          <td style="padding:8px 10px;font-weight:700;color:#0a3d62">${m.name || ''}</td>
          <td style="padding:8px 10px">${m.dosage || '-'}</td>
          <td style="padding:8px 10px">${m.frequency || '-'}</td>
          <td style="padding:8px 10px">${m.duration || '-'}${m.instructions ? `<br><small style="color:#888">${m.instructions}</small>` : ''}</td>
        </tr>`).join('');

  const testsHTML = (tests || []).length === 0 ? '' : `
    <div style="margin-top:20px">
      <h3 style="font-size:14px;color:#3498db;border-bottom:2px solid #3498db;padding-bottom:6px;margin-bottom:10px">🔬 Investigations / Tests</h3>
      <table style="width:100%;border-collapse:collapse;font-size:13px">
        <thead><tr style="background:#f0f8ff">
          <th style="padding:8px 10px;text-align:left;width:40px">#</th>
          <th style="padding:8px 10px;text-align:left">Test Name</th>
          <th style="padding:8px 10px;text-align:left">Instructions</th>
        </tr></thead>
        <tbody>${(tests || []).map((t, i) => `
          <tr style="border-bottom:1px solid #eee">
            <td style="padding:8px 10px">${i + 1}</td>
            <td style="padding:8px 10px;font-weight:700;color:#0a3d62">${t.name || ''}</td>
            <td style="padding:8px 10px">${t.instructions || '-'}</td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>`;

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Prescription - ${patientName}</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}body{font-family:'Segoe UI',Arial,sans-serif;color:#222;background:#fff}
    @media print{body{padding:0}.no-print{display:none!important}@page{margin:15mm;size:A4}}
    .page{max-width:780px;margin:0 auto;padding:24px}
    .header{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:16px;border-bottom:3px solid #7c3aed;margin-bottom:18px}
    .clinic-info h1{font-size:22px;color:#7c3aed;font-weight:800}.clinic-info p{font-size:12px;color:#888;margin-top:2px}
    .rx-symbol{font-size:60px;color:#7c3aed;font-weight:900;line-height:1;opacity:.15}
    .doctor-info{text-align:right}.doctor-info h2{font-size:16px;color:#0a3d62;font-weight:700}.doctor-info p{font-size:12px;color:#888}
    .patient-bar{background:linear-gradient(135deg,#f8f5ff,#f0f8ff);border:1px solid #e8e0ff;border-radius:10px;padding:14px 18px;margin-bottom:18px;display:flex;gap:24px;flex-wrap:wrap}
    .patient-field label{font-size:10px;color:#999;text-transform:uppercase;letter-spacing:.5px;display:block}
    .patient-field span{font-size:14px;font-weight:700;color:#0a3d62}
    .section-title{font-size:14px;color:#7c3aed;border-bottom:2px solid #7c3aed;padding-bottom:6px;margin-bottom:10px;font-weight:700}
    .diagnosis-box{background:#fafafa;border-left:4px solid #7c3aed;padding:10px 14px;border-radius:0 8px 8px 0;margin-bottom:18px;font-size:14px;color:#0a3d62}
    table{width:100%;border-collapse:collapse;font-size:13px}thead tr{background:#f8f5ff}
    th{padding:8px 10px;text-align:left;font-size:11px;color:#7c3aed;font-weight:700;text-transform:uppercase;letter-spacing:.5px}
    .notes-box{background:#fffbf0;border:1px solid #ffe082;border-radius:8px;padding:12px 16px;margin-top:20px;font-size:13px}
    .followup-box{background:#f0fff4;border:1px solid #a8e6cf;border-radius:8px;padding:12px 16px;margin-top:12px;font-size:13px;display:flex;align-items:center;gap:8px}
    .footer{margin-top:40px;border-top:1px solid #eee;padding-top:14px;display:flex;justify-content:space-between;align-items:flex-end;font-size:11px;color:#aaa}
    .signature-line{border-top:1px solid #aaa;padding-top:4px;text-align:center;width:160px;font-size:11px;color:#555}
    .token-badge{background:#7c3aed;color:#fff;border-radius:8px;padding:4px 12px;font-size:13px;font-weight:700}
    .print-btn{position:fixed;top:20px;right:20px;background:#7c3aed;color:#fff;border:none;padding:10px 20px;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer;box-shadow:0 4px 12px rgba(124,58,237,.4);z-index:1000}
  </style></head><body>
  <button class="no-print print-btn" onclick="window.print()">🖨️ Print / Save PDF</button>
  <div class="page">
    <div class="header">
      <div class="clinic-info"><h1>${clinicName || 'ClinicFlow'}</h1><p>Medical Prescription</p></div>
      <div style="display:flex;align-items:center;gap:16px">
        <div class="doctor-info"><h2>Dr. ${doctorName || ''}</h2><p>${doctorSpecialist || 'Doctor'}</p></div>
        <div class="rx-symbol">Rx</div>
      </div>
    </div>
    <div class="patient-bar">
      <div class="patient-field"><label>Patient Name</label><span>${patientName || 'N/A'}</span></div>
      ${patientAge ? `<div class="patient-field"><label>Age</label><span>${patientAge} yrs</span></div>` : ''}
      ${patientGender ? `<div class="patient-field"><label>Gender</label><span style="text-transform:capitalize">${patientGender}</span></div>` : ''}
      ${patientPhone ? `<div class="patient-field"><label>Phone</label><span>${patientPhone}</span></div>` : ''}
      <div class="patient-field"><label>Date</label><span>${date || ''}</span></div>
      <div class="patient-field"><label>Token</label><span class="token-badge">#${tokenNumber || ''}</span></div>
    </div>
    ${diagnosis ? `<div style="margin-bottom:18px"><div class="section-title">📋 Diagnosis / Chief Complaint</div><div class="diagnosis-box">${diagnosis}</div></div>` : ''}
    <div style="margin-bottom:18px">
      <div class="section-title">💊 Medicines Prescribed</div>
      <table><thead><tr><th>#</th><th>Medicine</th><th>Dosage</th><th>Frequency</th><th>Duration / Instructions</th></tr></thead>
      <tbody>${medsHTML}</tbody></table>
    </div>
    ${testsHTML}
    ${notes ? `<div class="notes-box"><strong>📝 Advice / Notes:</strong><br><span style="margin-top:4px;display:block">${notes}</span></div>` : ''}
    ${followUpDate ? `<div class="followup-box"><span style="font-size:18px">📅</span><div><strong>Follow-up Date:</strong> ${followUpDate}</div></div>` : ''}
    <div class="footer">
      <div><div>Generated by ClinicFlow · ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div><div style="margin-top:2px">This prescription is computer generated.</div></div>
      <div class="signature-line">Dr. ${doctorName || ''}<br>Signature</div>
    </div>
  </div></body></html>`;
}

// ── Rx PDF Button — same as ReceptionistDashboard ─────────────────────────────
function RxPdfButton({ patientId, clinicName }) {
  const [loading, setLoading] = useState(false);

  async function handleClick(e) {
    // stop the row's toggle/expand from firing
    e.stopPropagation();
    setLoading(true);
    try {
      const token = localStorage.getItem('clinic_token') ||
                    localStorage.getItem('ims_token')     ||
                    localStorage.getItem('token')         || '';
      const res = await fetch(`${CLINIC_BASE}/prescriptions/patient/${patientId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (!res.ok || !data.prescriptions?.length) {
        alert('No prescription found for this patient.');
        return;
      }
      const rx   = data.prescriptions[0];
      const html = generatePrescriptionHTML(rx, clinicName || rx.clinicName || '');
      const win  = window.open('', '_blank');
      if (win) { win.document.write(html); win.document.close(); }
    } catch (e) {
      alert('Failed to load prescription: ' + e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      title="View Prescription PDF"
      style={{
        background: loading ? 'rgba(124,58,237,0.05)' : 'rgba(124,58,237,0.10)',
        border: '1px solid rgba(124,58,237,0.30)',
        borderRadius: 7,
        padding: '4px 10px',
        cursor: loading ? 'not-allowed' : 'pointer',
        fontSize: 12,
        color: '#7c3aed',
        fontWeight: 700,
        fontFamily: 'inherit',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        opacity: loading ? 0.7 : 1,
        flexShrink: 0,
        whiteSpace: 'nowrap',
      }}
    >
      {loading ? '⏳' : '📋 Rx'}
    </button>
  );
}

function PaymentBadge({ method }) {
  return method === 'upi' ? (
    <span style={{ background: 'rgba(124,58,237,0.10)', color: '#7c3aed', border: '1px solid rgba(124,58,237,0.25)', borderRadius: 20, padding: '2px 10px', fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' }}>
      📲 UPI
    </span>
  ) : (
    <span style={{ background: 'rgba(0,184,148,0.10)', color: '#00a878', border: '1px solid rgba(0,184,148,0.25)', borderRadius: 20, padding: '2px 10px', fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' }}>
      💵 Cash
    </span>
  );
}

function StatusBadge({ status }) {
  const map = {
    waiting: { bg: 'rgba(21,101,168,0.10)', color: '#1565a8', border: 'rgba(21,101,168,0.25)', label: '⏳ Waiting' },
    called:  { bg: 'rgba(243,156,18,0.10)', color: '#d68910', border: 'rgba(243,156,18,0.25)', label: '📢 Called'  },
    done:    { bg: 'rgba(0,184,148,0.10)',  color: '#00a878', border: 'rgba(0,184,148,0.25)', label: '✓ Done'    },
  };
  const s = map[status] || map.waiting;
  return (
    <span style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}`, borderRadius: 20, padding: '2px 10px', fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' }}>
      {s.label}
    </span>
  );
}

// ── File row (download only) ────────────────────────────────────────────────
function FileRow({ file, patientId }) {
  const [loading, setLoading] = useState(false);

  async function download() {
    setLoading(true);
    try {
      const res = await fetch(`${CLINIC_BASE}/patients/${patientId}/files/${file._id}`, {
        headers: authHeader(),
      });
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert('Download failed: ' + e.message);
    } finally {
      setLoading(false);
    }
  }

  const isPdf   = file.mimeType === 'application/pdf';
  const isImage = file.mimeType?.startsWith('image/');
  const icon    = isPdf ? '📄' : isImage ? '🖼️' : '📎';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: '#f7f9fc', border: '1px solid #e8eff6', borderRadius: 8, marginBottom: 4 }}>
      <span style={{ fontSize: 14, flexShrink: 0 }}>{icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#0a3d62' }}>{file.filename}</div>
        <div style={{ fontSize: 11, color: '#8fa8bc' }}>
          {(file.size / 1024).toFixed(1)} KB · {file.uploadedBy} · {new Date(file.uploadedAt).toLocaleDateString('en-IN')}
        </div>
      </div>
      <button
        onClick={download}
        disabled={loading}
        style={{ padding: '3px 10px', borderRadius: 6, border: '1px solid #7c3aed', background: 'rgba(124,58,237,0.08)', color: '#7c3aed', fontSize: 11, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1, whiteSpace: 'nowrap', fontFamily: 'inherit' }}
      >
        {loading ? '⏳' : '⬇ Download'}
      </button>
    </div>
  );
}

// ── Patient row (expandable) ────────────────────────────────────────────────
function PatientRow({ patient: p, isLast, clinicName }) {
  const [expanded,  setExpanded]  = useState(false);
  const [files,     setFiles]     = useState([]);
  const [loadingF,  setLoadingF]  = useState(false);
  const [loadedF,   setLoadedF]   = useState(false);
  const pid = p._id || p.id;

  async function loadFiles() {
    if (loadedF) return;
    setLoadingF(true);
    try {
      const data = await apiFetch(`/patients/${pid}/files`);
      setFiles(Array.isArray(data) ? data : (data?.files || []));
      setLoadedF(true);
    } catch (e) {
      console.error('Files load error:', e);
      setFiles([]);
      setLoadedF(true);
    } finally {
      setLoadingF(false);
    }
  }

  function toggle() {
    setExpanded(v => !v);
    if (!loadedF) loadFiles();
  }

  return (
    <div style={{ borderBottom: isLast ? 'none' : '1px solid #eef1f5' }}>
      {/* ── main row ── */}
      <div
        onClick={toggle}
        style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', cursor: 'pointer', background: expanded ? 'rgba(21,101,168,0.03)' : '#fff', transition: 'background 0.15s' }}
      >
        {/* token badge */}
        <div style={{ width: 38, height: 38, borderRadius: 10, background: p.status === 'done' ? '#e8eff6' : 'linear-gradient(135deg, #0a3d62, #1565a8)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: p.status === 'done' ? '#8fa8bc' : '#fff', fontWeight: 800, fontSize: 16, flexShrink: 0 }}>
          {p.token}
        </div>

        {/* patient info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 2 }}>
            <span style={{ fontWeight: 700, fontSize: 14, color: p.status === 'done' ? '#8fa8bc' : '#0a3d62', textDecoration: p.status === 'done' ? 'line-through' : 'none' }}>{p.name}</span>
            {p.age && <span style={{ fontSize: 12, color: '#8fa8bc' }}>{p.gender === 'female' ? '♀' : '♂'} {p.age} yrs</span>}
            <StatusBadge status={p.status} />
            <PaymentBadge method={p.paymentMethod} />
            {p.dues > 0 && <span style={{ fontSize: 11, color: '#e74c3c', fontWeight: 700 }}>⚠️ Due Rs.{p.dues}</span>}
          </div>
          <div style={{ fontSize: 12, color: '#4a6278', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            🩺 {p.symptoms?.substring(0, 80)}{p.symptoms?.length > 80 ? '…' : ''}
          </div>
          <div style={{ fontSize: 11, color: '#8fa8bc', marginTop: 2, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <span>🕐 {p.time}</span>
            {p.phone && <span>📞 {p.phone}</span>}
            {p.followUpDate && <span style={{ color: '#7c3aed' }}>📅 {p.followUpDate}</span>}
          </div>
        </div>

        {/* ✅ fee summary + Rx button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <div style={{ textAlign: 'right', minWidth: 70 }}>
            {p.paid > 0 && <div style={{ fontSize: 12, fontWeight: 700, color: '#00a878' }}>Rs.{p.paid}</div>}
            {p.dues > 0 && <div style={{ fontSize: 11, color: '#e74c3c', fontWeight: 600 }}>Due Rs.{p.dues}</div>}
            <div style={{ fontSize: 11, color: '#8fa8bc', marginTop: 2 }}>{expanded ? '▲ hide' : '▼ files'}</div>
          </div>

          {/* ✅ Rx button — same as receptionist queue card */}
          <RxPdfButton patientId={pid} clinicName={clinicName} />
        </div>
      </div>

      {/* ── files panel ── */}
      {expanded && (
        <div style={{ padding: '10px 16px 14px 66px', borderTop: '1px dashed #e8eff6', background: 'rgba(21,101,168,0.02)' }}>
          {loadingF ? (
            <div style={{ fontSize: 12, color: '#8fa8bc', padding: '8px 0' }}>⏳ Loading files…</div>
          ) : files.length === 0 ? (
            <div style={{ fontSize: 12, color: '#8fa8bc', padding: '8px 0' }}>📁 No files uploaded for this visit.</div>
          ) : (
            <>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#4a6278', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 8 }}>
                📎 {files.length} file{files.length !== 1 ? 's' : ''} — uploaded by doctor / receptionist
              </div>
              {files.map(f => (
                <FileRow key={String(f._id)} file={f} patientId={pid} />
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── Doctor section ──────────────────────────────────────────────────────────
function DoctorSection({ doctor, patients, defaultOpen, clinicName }) {
  const [open, setOpen] = useState(defaultOpen || false);
  const total   = patients.length;
  const done    = patients.filter(p => p.status === 'done').length;
  const waiting = patients.filter(p => p.status === 'waiting').length;
  const revenue = patients.reduce((s, p) => s + (p.paid || 0), 0);
  const dues    = patients.reduce((s, p) => s + (p.dues || 0), 0);
  const files   = patients.reduce((s, p) => s + (p.fileCount || 0), 0);

  return (
    <div style={{ marginBottom: 16, border: '1.5px solid #dce9f5', borderRadius: 14, overflow: 'hidden' }}>
      {/* header */}
      <div
        onClick={() => setOpen(v => !v)}
        style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px', background: 'linear-gradient(90deg, #0a3d62, #1565a8)', cursor: 'pointer', userSelect: 'none' }}
      >
        <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(255,255,255,0.15)', border: '1.5px solid rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>👨‍⚕️</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: '#fff', fontWeight: 700, fontSize: 15 }}>{doctor.name}</div>
          {doctor.specialist && <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12 }}>{doctor.specialist}</div>}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', borderRadius: 20, padding: '3px 10px', fontSize: 12, fontWeight: 700 }}>🎫 {total}</span>
          <span style={{ background: 'rgba(0,220,130,0.25)', color: '#c8fce8', borderRadius: 20, padding: '3px 10px', fontSize: 12, fontWeight: 700 }}>✓ {done}</span>
          <span style={{ background: 'rgba(255,200,80,0.20)', color: '#ffe9a0', borderRadius: 20, padding: '3px 10px', fontSize: 12, fontWeight: 700 }}>⏳ {waiting}</span>
          {revenue > 0 && <span style={{ background: 'rgba(0,220,130,0.20)', color: '#c8fce8', borderRadius: 20, padding: '3px 10px', fontSize: 12, fontWeight: 700 }}>💰 Rs.{revenue.toLocaleString()}</span>}
          {dues    > 0 && <span style={{ background: 'rgba(255,80,80,0.22)',  color: '#ffc8c8', borderRadius: 20, padding: '3px 10px', fontSize: 12, fontWeight: 700 }}>⚠️ Rs.{dues.toLocaleString()}</span>}
          {files   > 0 && <span style={{ background: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.8)', borderRadius: 20, padding: '3px 10px', fontSize: 12, fontWeight: 700 }}>📎 {files}</span>}
          <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 16, marginLeft: 4 }}>{open ? '▲' : '▼'}</span>
        </div>
      </div>

      {/* patients list */}
      {open && (
        patients.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', color: '#8fa8bc', fontSize: 13, background: '#fff' }}>No patients for this filter.</div>
        ) : (
          <div style={{ background: '#fff' }}>
            {patients.map((p, i) => (
              <PatientRow
                key={p._id || p.id}
                patient={p}
                isLast={i === patients.length - 1}
                clinicName={clinicName}
              />
            ))}
          </div>
        )
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────
export default function AllPatientsIMS({ clinicName }) {
  const [patients,     setPatients]     = useState([]);
  const [doctors,      setDoctors]      = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState('');
  const [dateFilter,   setDateFilter]   = useState('today');
  const [doctorFilter, setDoctorFilter] = useState('all');
  const [search,       setSearch]       = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // ✅ Resolve clinicName from prop, session, or localStorage
  const resolvedClinicName =
    clinicName ||
    (() => {
      try { return JSON.parse(localStorage.getItem('clinic_session') || '{}')?.clinicName; } catch { return ''; }
    })() ||
    localStorage.getItem('clinic_name') ||
    '';

  const todayStr = getTodayIST();

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const pData = await apiFetch('/patients');
      const pats = Array.isArray(pData) ? pData : (pData?.patients || []);
      setPatients(pats);

      const doctorMap = {};
      pats.forEach(p => {
        if (p.doctorId && !doctorMap[p.doctorId]) {
          doctorMap[p.doctorId] = { _id: p.doctorId, name: p.doctorName || 'Unknown Doctor' };
        }
      });
      setDoctors(Object.values(doctorMap));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── filtering ──
  const filtered = patients.filter(p => {
    const matchDate =
      dateFilter === 'today' ? p.date === todayStr :
      dateFilter === 'week'  ? p.date >= (() => { const d = new Date(); d.setDate(d.getDate() - 6); return d.toISOString().split('T')[0]; })() :
      true;
    const matchDoctor = doctorFilter === 'all' || String(p.doctorId) === doctorFilter;
    const matchStatus = statusFilter === 'all' || p.status === statusFilter;
    const matchSearch = !search || p.name?.toLowerCase().includes(search.toLowerCase()) || String(p.token).includes(search) || p.phone?.includes(search);
    return matchDate && matchDoctor && matchStatus && matchSearch;
  });

  // group by doctor
  const grouped = {};
  filtered.forEach(p => {
    const key = String(p.doctorId || 'unknown');
    if (!grouped[key]) grouped[key] = { patients: [], name: p.doctorName || 'Unknown Doctor', id: key };
    grouped[key].patients.push(p);
  });

  // sort each group by token
  Object.values(grouped).forEach(g => g.patients.sort((a, b) => a.token - b.token));

  const inputStyle  = { padding: '8px 12px', borderRadius: 9, border: '1.5px solid #d0dce8', fontSize: 13, fontFamily: 'inherit', color: '#0a3d62', background: '#fff', outline: 'none', width: '100%', boxSizing: 'border-box' };
  const selectStyle = { ...inputStyle, cursor: 'pointer' };

  return (
    <div style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>

      {/* ── page header ── */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0a3d62', marginBottom: 4 }}>All Patients</h1>
        <p style={{ fontSize: 13, color: '#8fa8bc', margin: 0 }}>All patients across all doctors — click any row to view uploaded files · 📋 Rx opens prescription PDF</p>
      </div>

      {/* ── filters ── */}
      <div style={{ background: '#fff', border: '1.5px solid #dce9f5', borderRadius: 12, padding: '14px 16px', marginBottom: 20, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div style={{ flex: '1 1 200px', minWidth: 0 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: '#8fa8bc', textTransform: 'uppercase', letterSpacing: 0.4, display: 'block', marginBottom: 4 }}>Search</label>
          <input
            style={inputStyle}
            placeholder="Name, token, phone…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div style={{ flex: '0 0 140px' }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: '#8fa8bc', textTransform: 'uppercase', letterSpacing: 0.4, display: 'block', marginBottom: 4 }}>Date</label>
          <select style={selectStyle} value={dateFilter} onChange={e => setDateFilter(e.target.value)}>
            <option value="today">Today</option>
            <option value="week">Last 7 days</option>
            <option value="all">All time</option>
          </select>
        </div>
        <div style={{ flex: '0 0 180px' }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: '#8fa8bc', textTransform: 'uppercase', letterSpacing: 0.4, display: 'block', marginBottom: 4 }}>Doctor</label>
          <select style={selectStyle} value={doctorFilter} onChange={e => setDoctorFilter(e.target.value)}>
            <option value="all">All Doctors</option>
            {doctors.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
          </select>
        </div>
        <div style={{ flex: '0 0 140px' }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: '#8fa8bc', textTransform: 'uppercase', letterSpacing: 0.4, display: 'block', marginBottom: 4 }}>Status</label>
          <select style={selectStyle} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="all">All Status</option>
            <option value="waiting">Waiting</option>
            <option value="called">Called</option>
            <option value="done">Done</option>
          </select>
        </div>
        <button
          onClick={load}
          disabled={loading}
          style={{ padding: '8px 16px', borderRadius: 9, border: '1.5px solid #d0dce8', background: '#fff', color: '#1565a8', fontSize: 13, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap', alignSelf: 'flex-end' }}
        >
          {loading ? '⏳' : '🔄 Refresh'}
        </button>
      </div>

      {/* ── content ── */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px 20px', color: '#8fa8bc' }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>⏳</div>
          <div style={{ fontSize: 14 }}>Loading patients…</div>
        </div>
      ) : error ? (
        <div style={{ background: 'rgba(231,76,60,0.08)', border: '1.5px solid rgba(231,76,60,0.25)', borderRadius: 12, padding: '20px 24px', color: '#c0392b', textAlign: 'center' }}>
          <div style={{ fontSize: 24, marginBottom: 8 }}>⚠️</div>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>Failed to load patients</div>
          <div style={{ fontSize: 13, marginBottom: 12 }}>{error}</div>
          <button onClick={load} style={{ padding: '7px 18px', borderRadius: 8, border: '1px solid rgba(231,76,60,0.3)', background: '#fff', color: '#c0392b', fontWeight: 700, cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}>
            Retry
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 20px', background: '#fff', border: '1.5px solid #dce9f5', borderRadius: 14 }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>🪑</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#0a3d62', marginBottom: 6 }}>No patients found</div>
          <div style={{ fontSize: 13, color: '#8fa8bc' }}>Try adjusting your filters above.</div>
        </div>
      ) : (
        <>
          <div style={{ background: 'rgba(21,101,168,0.05)', border: '1px solid rgba(21,101,168,0.15)', borderRadius: 10, padding: '9px 14px', marginBottom: 16, fontSize: 12, color: '#1565a8', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>💡</span>
            <span>Click any patient row to view files. Use the <strong>📋 Rx</strong> button to open the prescription PDF generated by the doctor.</span>
          </div>

          {Object.values(grouped).map((g, i) => (
            <DoctorSection
              key={g.id}
              doctor={{ name: g.name, id: g.id, specialist: doctors.find(d => String(d._id) === g.id)?.specialist }}
              patients={g.patients}
              defaultOpen={i === 0}
              clinicName={resolvedClinicName}
            />
          ))}
        </>
      )}
    </div>
  );
}