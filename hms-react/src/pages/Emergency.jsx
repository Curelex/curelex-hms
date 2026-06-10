import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';

const socket = io('http://localhost:5000');

// ─── Design Tokens ────────────────────────────────────────────────────────────
const TRIAGE_CONFIG = {
  P1: { label: 'P1 · Critical',    bg: '#FEE2E2', text: '#991B1B', border: '#F87171', dot: '#DC2626', pulse: true  },
  P2: { label: 'P2 · Emergent',    bg: '#FFEDD5', text: '#9A3412', border: '#FB923C', dot: '#EA580C', pulse: true  },
  P3: { label: 'P3 · Urgent',      bg: '#FEF9C3', text: '#854D0E', border: '#FACC15', dot: '#CA8A04', pulse: false },
  P4: { label: 'P4 · Less Urgent', bg: '#DCFCE7', text: '#166534', border: '#4ADE80', dot: '#16A34A', pulse: false },
  P5: { label: 'P5 · Non-Urgent',  bg: '#DBEAFE', text: '#1E40AF', border: '#60A5FA', dot: '#2563EB', pulse: false },
};

const BED_CONFIG = {
  Available:     { bg: '#F0FDF4', text: '#15803D', border: '#86EFAC', icon: '●' },
  Occupied:      { bg: '#FEF2F2', text: '#B91C1C', border: '#FCA5A5', icon: '●' },
  Reserved:      { bg: '#FFFBEB', text: '#B45309', border: '#FCD34D', icon: '◑' },
  'Under Cleaning': { bg: '#F5F3FF', text: '#6D28D9', border: '#C4B5FD', icon: '◌' },
};

// ─── Inline Styles ────────────────────────────────────────────────────────────
const styles = {
  page: {
    minHeight: '100vh',
    background: '#F1F5F9',
    fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
    padding: '24px',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '24px',
  },
  headerBadge: {
    background: '#DC2626',
    color: '#fff',
    fontWeight: 700,
    fontSize: '11px',
    letterSpacing: '0.12em',
    padding: '4px 10px',
    borderRadius: '4px',
    textTransform: 'uppercase',
  },
  headerTitle: {
    fontSize: '20px',
    fontWeight: 700,
    color: '#0F172A',
    margin: 0,
  },
  headerSub: {
    fontSize: '13px',
    color: '#64748B',
    marginLeft: 'auto',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
    gap: '20px',
  },
  card: {
    background: '#FFFFFF',
    borderRadius: '12px',
    border: '1px solid #E2E8F0',
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
    overflow: 'hidden',
  },
  cardHeader: {
    padding: '16px 20px',
    borderBottom: '1px solid #F1F5F9',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTitle: {
    fontSize: '14px',
    fontWeight: 700,
    color: '#0F172A',
    letterSpacing: '0.02em',
    textTransform: 'uppercase',
    margin: 0,
  },
  cardCount: {
    background: '#F1F5F9',
    color: '#475569',
    fontSize: '12px',
    fontWeight: 600,
    padding: '2px 8px',
    borderRadius: '999px',
  },
  cardBody: {
    padding: '16px 20px',
  },

  // ── Intake Form ──
  formGroup: { marginBottom: '14px' },
  label: {
    display: 'block',
    fontSize: '11px',
    fontWeight: 600,
    color: '#64748B',
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    marginBottom: '5px',
  },
  input: {
    width: '100%',
    border: '1px solid #CBD5E1',
    borderRadius: '8px',
    padding: '8px 10px',
    fontSize: '13px',
    color: '#0F172A',
    background: '#FAFAFA',
    boxSizing: 'border-box',
    outline: 'none',
    transition: 'border-color 0.15s',
  },
  vitalsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '10px',
  },
  vitalBox: {
    background: '#F8FAFC',
    border: '1px solid #E2E8F0',
    borderRadius: '8px',
    padding: '8px 10px',
  },
  vitalLabel: {
    fontSize: '10px',
    fontWeight: 600,
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    marginBottom: '4px',
  },
  vitalInput: {
    width: '100%',
    border: 'none',
    background: 'transparent',
    fontSize: '13px',
    color: '#1E293B',
    fontWeight: 600,
    outline: 'none',
    padding: 0,
  },
  select: {
    width: '100%',
    border: '1px solid #CBD5E1',
    borderRadius: '8px',
    padding: '8px 10px',
    fontSize: '13px',
    color: '#0F172A',
    background: '#FAFAFA',
    boxSizing: 'border-box',
    outline: 'none',
    cursor: 'pointer',
  },
  submitBtn: {
    width: '100%',
    background: '#DC2626',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    padding: '10px',
    fontSize: '13px',
    fontWeight: 700,
    letterSpacing: '0.04em',
    cursor: 'pointer',
    marginTop: '4px',
    transition: 'background 0.15s',
  },

  // ── Queue ──
  queueScroll: {
    maxHeight: '560px',
    overflowY: 'auto',
    paddingRight: '4px',
  },
  queueItem: {
    background: '#FAFAFA',
    border: '1px solid #E2E8F0',
    borderRadius: '10px',
    padding: '12px 14px',
    marginBottom: '10px',
  },
  queueTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '6px',
  },
  patientName: {
    fontSize: '14px',
    fontWeight: 700,
    color: '#0F172A',
    margin: 0,
  },
  patientAge: {
    fontSize: '12px',
    color: '#94A3B8',
    fontWeight: 400,
    marginLeft: '4px',
  },
  complaint: {
    fontSize: '12px',
    color: '#475569',
    marginTop: '2px',
    margin: 0,
  },
  triageBadge: (level) => {
    const c = TRIAGE_CONFIG[level] || { bg: '#F1F5F9', text: '#475569', border: '#CBD5E1' };
    return {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '5px',
      background: c.bg,
      color: c.text,
      border: `1px solid ${c.border}`,
      borderRadius: '6px',
      fontSize: '11px',
      fontWeight: 700,
      padding: '3px 8px',
      whiteSpace: 'nowrap',
      letterSpacing: '0.04em',
    };
  },
  triageDot: (level) => {
    const c = TRIAGE_CONFIG[level] || { dot: '#94A3B8' };
    return {
      width: '6px',
      height: '6px',
      borderRadius: '50%',
      background: c.dot,
      flexShrink: 0,
    };
  },
  queueMeta: {
    fontSize: '11px',
    color: '#94A3B8',
    borderTop: '1px solid #F1F5F9',
    paddingTop: '8px',
    marginTop: '8px',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  emptyState: {
    textAlign: 'center',
    padding: '32px 16px',
    color: '#94A3B8',
    fontSize: '13px',
  },

  // ── Beds ──
  bedsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '10px',
  },
  bedCard: (status) => {
    const c = BED_CONFIG[status] || BED_CONFIG['Under Cleaning'];
    return {
      background: c.bg,
      border: `1px solid ${c.border}`,
      borderRadius: '10px',
      padding: '14px 12px',
      textAlign: 'center',
    };
  },
  bedNumber: {
    fontSize: '16px',
    fontWeight: 700,
    color: '#0F172A',
    marginBottom: '4px',
  },
  bedStatus: (status) => {
    const c = BED_CONFIG[status] || BED_CONFIG['Under Cleaning'];
    return {
      fontSize: '11px',
      fontWeight: 600,
      color: c.text,
      textTransform: 'uppercase',
      letterSpacing: '0.08em',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '4px',
    };
  },
};

// ─── Pulse Dot for P1/P2 ─────────────────────────────────────────────────────
const PulseDot = ({ color }) => (
  <>
    <style>{`
      @keyframes pulse-ring {
        0%   { transform: scale(1);   opacity: 0.8; }
        100% { transform: scale(2.2); opacity: 0; }
      }
      .pulse-dot-wrapper { position: relative; width: 8px; height: 8px; flex-shrink: 0; }
      .pulse-dot-ring {
        position: absolute; inset: 0;
        border-radius: 50%;
        animation: pulse-ring 1.1s ease-out infinite;
      }
      .pulse-dot-core {
        position: absolute; inset: 1px;
        border-radius: 50%;
      }
    `}</style>
    <span className="pulse-dot-wrapper">
      <span className="pulse-dot-ring" style={{ background: color }} />
      <span className="pulse-dot-core" style={{ background: color }} />
    </span>
  </>
);

// ─── Component ────────────────────────────────────────────────────────────────
const Emergency = () => {
  const [queue, setQueue] = useState([]);
  const [beds, setBeds] = useState([]);
  const [formData, setFormData] = useState({
    patientName: '',
    age: '',
    chiefComplaint: '',
    vitals: { bloodPressure: '', heartRate: '', temperature: '', spO2: '' },
    triageLevel: 'P3',
  });

  const fetchQueue = async () => {
    try { const res = await axios.get('/api/emergency/queue'); setQueue(res.data); }
    catch (err) { console.error('Error fetching queue:', err); }
  };

  const fetchBeds = async () => {
    try { const res = await axios.get('/api/emergency/beds'); setBeds(res.data); }
    catch (err) { console.error('Error fetching beds:', err); }
  };

  useEffect(() => {
    fetchQueue(); fetchBeds();
    socket.on('emergencyQueueUpdated', () => fetchQueue());
    socket.on('bedStatusUpdated', () => fetchBeds());
    return () => { socket.off('emergencyQueueUpdated'); socket.off('bedStatusUpdated'); };
  }, []);

  const handleIntakeSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/emergency/intake', formData);
      setFormData({
        patientName: '', age: '', chiefComplaint: '',
        vitals: { bloodPressure: '', heartRate: '', temperature: '', spO2: '' },
        triageLevel: 'P3',
      });
    } catch (err) { console.error(err); }
  };

  const availableBeds = beds.filter(b => b.status === 'Available').length;

  return (
    <div style={styles.page}>

      {/* Page Header */}
      <div style={styles.header}>
        <span style={styles.headerBadge}>ED</span>
        <h1 style={styles.headerTitle}>Emergency Department</h1>
        <span style={styles.headerSub}>
          {availableBeds > 0
            ? `${availableBeds} bed${availableBeds > 1 ? 's' : ''} available`
            : 'No beds available'}
          {' · '}
          {queue.length} in queue
        </span>
      </div>

      <div style={styles.grid}>

        {/* ── 1. Rapid Intake ──────────────────────────────────── */}
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <h2 style={styles.cardTitle}>Rapid Intake</h2>
          </div>
          <div style={styles.cardBody}>
            <form onSubmit={handleIntakeSubmit}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Patient Name</label>
                <input
                  type="text" required style={styles.input}
                  placeholder="Full name"
                  value={formData.patientName}
                  onChange={e => setFormData({ ...formData, patientName: e.target.value })}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Age</label>
                <input
                  type="number" required style={styles.input}
                  placeholder="Years"
                  value={formData.age}
                  onChange={e => setFormData({ ...formData, age: e.target.value })}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Chief Complaint</label>
                <textarea
                  required rows={2} style={{ ...styles.input, resize: 'none' }}
                  placeholder="Describe presenting complaint…"
                  value={formData.chiefComplaint}
                  onChange={e => setFormData({ ...formData, chiefComplaint: e.target.value })}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Vitals</label>
                <div style={styles.vitalsGrid}>
                  {[
                    { key: 'bloodPressure', label: 'BP', unit: 'mmHg', ph: '120/80' },
                    { key: 'heartRate',     label: 'HR', unit: 'bpm',  ph: '72'     },
                    { key: 'temperature',   label: 'Temp', unit: '°F', ph: '98.6'   },
                    { key: 'spO2',          label: 'SpO2', unit: '%',  ph: '98'     },
                  ].map(({ key, label, unit, ph }) => (
                    <div style={styles.vitalBox} key={key}>
                      <div style={styles.vitalLabel}>{label} <span style={{ fontWeight: 400, opacity: 0.7 }}>{unit}</span></div>
                      <input
                        type="text" placeholder={ph} style={styles.vitalInput}
                        value={formData.vitals[key]}
                        onChange={e => setFormData({ ...formData, vitals: { ...formData.vitals, [key]: e.target.value } })}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Triage Level</label>
                <select
                  style={styles.select}
                  value={formData.triageLevel}
                  onChange={e => setFormData({ ...formData, triageLevel: e.target.value })}
                >
                  <option value="P1">P1 — Critical / Resuscitation</option>
                  <option value="P2">P2 — Emergent</option>
                  <option value="P3">P3 — Urgent</option>
                  <option value="P4">P4 — Less Urgent</option>
                  <option value="P5">P5 — Non-Urgent</option>
                </select>
              </div>

              <button type="submit" style={styles.submitBtn}>
                ＋ Admit to Emergency
              </button>
            </form>
          </div>
        </div>

        {/* ── 2. Priority Queue ─────────────────────────────────── */}
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <h2 style={styles.cardTitle}>Priority Queue</h2>
            {queue.length > 0 && <span style={styles.cardCount}>{queue.length}</span>}
          </div>
          <div style={{ ...styles.cardBody, paddingTop: '12px' }}>
            {queue.length === 0
              ? <div style={styles.emptyState}>No patients in queue</div>
              : (
                <div style={styles.queueScroll}>
                  {queue.map(patient => {
                    const cfg = TRIAGE_CONFIG[patient.triageLevel] || {};
                    return (
                      <div key={patient._id} style={styles.queueItem}>
                        <div style={styles.queueTop}>
                          <div>
                            <p style={styles.patientName}>
                              {patient.patientName}
                              <span style={styles.patientAge}>{patient.age}y</span>
                            </p>
                            <p style={styles.complaint}>{patient.chiefComplaint}</p>
                          </div>
                          <span style={styles.triageBadge(patient.triageLevel)}>
                            {cfg.pulse
                              ? <PulseDot color={cfg.dot} />
                              : <span style={styles.triageDot(patient.triageLevel)} />
                            }
                            {cfg.label || patient.triageLevel}
                          </span>
                        </div>
                        <div style={styles.queueMeta}>
                          <svg width="11" height="11" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
                            <circle cx="8" cy="8" r="6.5" stroke="#94A3B8" strokeWidth="1.5"/>
                            <path d="M8 5v3.5l2 1.5" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round"/>
                          </svg>
                          Waiting since {new Date(patient.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            }
          </div>
        </div>

        {/* ── 3. Bed Availability ───────────────────────────────── */}
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <h2 style={styles.cardTitle}>Emergency Beds</h2>
            {beds.length > 0 && (
              <span style={styles.cardCount}>
                {availableBeds}/{beds.length} free
              </span>
            )}
          </div>
          <div style={styles.cardBody}>
            {beds.length === 0
              ? <div style={styles.emptyState}>No beds configured</div>
              : (
                <div style={styles.bedsGrid}>
                  {beds.map(bed => {
                    const cfg = BED_CONFIG[bed.status] || BED_CONFIG['Under Cleaning'];
                    return (
                      <div key={bed._id} style={styles.bedCard(bed.status)}>
                        <div style={styles.bedNumber}>{bed.roomNumber ? `${bed.roomNumber} - ${bed.bedNumber}` : bed.bedNumber}</div>
                        <div style={styles.bedStatus(bed.status)}>
                          <span style={{ fontSize: '8px' }}>{cfg.icon}</span>
                          <select
                            value={bed.status}
                            onChange={async (e) => {
                              try {
                                await axios.put(`/api/emergency/beds/${bed._id}/status`, { status: e.target.value });
                              } catch (err) {
                                console.error('Error updating bed status:', err);
                              }
                            }}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: cfg.text,
                              fontSize: '11px',
                              fontWeight: 600,
                              textTransform: 'uppercase',
                              cursor: 'pointer',
                              outline: 'none',
                            }}
                          >
                            <option value="Available">Available</option>
                            <option value="Occupied">Occupied</option>
                            <option value="Reserved">Reserved</option>
                            <option value="Under Cleaning">Under Cleaning</option>
                          </select>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            }
          </div>
        </div>

      </div>
    </div>
  );
};

export default Emergency;