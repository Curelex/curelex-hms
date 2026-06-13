import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import API from '../utils/api';

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
  Available:        { bg: '#F0FDF4', text: '#15803D', border: '#86EFAC', icon: '●' },
  Occupied:         { bg: '#FEF2F2', text: '#B91C1C', border: '#FCA5A5', icon: '●' },
  Reserved:         { bg: '#FFFBEB', text: '#B45309', border: '#FCD34D', icon: '◑' },
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
    flexWrap: 'wrap',
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

  // ── Patient Search ──
  searchSection: {
    marginBottom: '16px',
    paddingBottom: '16px',
    borderBottom: '1px dashed #E2E8F0',
  },
  searchLabel: {
    display: 'block',
    fontSize: '11px',
    fontWeight: 600,
    color: '#6366F1',
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    marginBottom: '5px',
  },
  searchWrapper: {
    position: 'relative',
  },
  searchInput: {
    width: '100%',
    border: '1.5px solid #6366F1',
    borderRadius: '8px',
    padding: '8px 36px 8px 34px',
    fontSize: '13px',
    color: '#0F172A',
    background: '#F5F3FF',
    boxSizing: 'border-box',
    outline: 'none',
  },
  searchIconLeft: {
    position: 'absolute',
    left: '10px',
    top: '50%',
    transform: 'translateY(-50%)',
    fontSize: '14px',
    pointerEvents: 'none',
  },
  searchSpinner: {
    position: 'absolute',
    right: '10px',
    top: '50%',
    transform: 'translateY(-50%)',
    fontSize: '11px',
    color: '#94A3B8',
  },
  searchDropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    background: '#fff',
    border: '1px solid #C7D2FE',
    borderRadius: '8px',
    boxShadow: '0 8px 24px rgba(99,102,241,0.12)',
    zIndex: 100,
    marginTop: '4px',
    overflow: 'hidden',
  },
  searchDropdownItem: {
    padding: '10px 14px',
    cursor: 'pointer',
    borderBottom: '1px solid #F1F5F9',
    transition: 'background 0.1s',
  },
  searchDropdownItemHover: {
    background: '#EEF2FF',
  },
  searchNoResult: {
    padding: '12px 14px',
    fontSize: '12px',
    color: '#94A3B8',
    textAlign: 'center',
  },
  returningBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    background: '#DCFCE7',
    border: '1px solid #86EFAC',
    borderRadius: '7px',
    padding: '7px 10px',
    fontSize: '12px',
    color: '#166534',
    fontWeight: 600,
    marginBottom: '12px',
  },
  newPatientBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    background: '#EEF2FF',
    border: '1px solid #C7D2FE',
    borderRadius: '7px',
    padding: '7px 10px',
    fontSize: '12px',
    color: '#4338CA',
    fontWeight: 600,
    marginBottom: '12px',
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
  inputPrefilled: {
    width: '100%',
    border: '1px solid #86EFAC',
    borderRadius: '8px',
    padding: '8px 10px',
    fontSize: '13px',
    color: '#0F172A',
    background: '#F0FDF4',
    boxSizing: 'border-box',
    outline: 'none',
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
  submitBtnDisabled: {
    width: '100%',
    background: '#94A3B8',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    padding: '10px',
    fontSize: '13px',
    fontWeight: 700,
    letterSpacing: '0.04em',
    cursor: 'not-allowed',
    marginTop: '4px',
  },
  successMsg: {
    marginTop: '12px',
    padding: '10px',
    background: '#DCFCE7',
    border: '1px solid #86EFAC',
    borderRadius: '8px',
    fontSize: '12px',
    color: '#166534',
    textAlign: 'center',
  },
  errorMsg: {
    marginTop: '12px',
    padding: '10px',
    background: '#FEE2E2',
    border: '1px solid #FCA5A5',
    borderRadius: '8px',
    fontSize: '12px',
    color: '#991B1B',
    textAlign: 'center',
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
  assignedDoctor: {
    fontSize: '10px',
    color: '#64748B',
    marginTop: '4px',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
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
    flexWrap: 'wrap',
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
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // ── Patient Search State ──
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isReturningPatient, setIsReturningPatient] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState(-1);
  const searchDebounceRef = useRef(null);

  const [formData, setFormData] = useState({
    patientName: '',
    age: '',
    chiefComplaint: '',
    vitals: { bloodPressure: '', heartRate: '', temperature: '', spO2: '' },
    triageLevel: 'P3',
    assignedDoctor: '',
  });

  // ── Fetch Doctors ──
  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        const res = await API.get('/auth/users');
        const docs = res.data.filter(u => u.role === 'doctor');
        setDoctors(docs);
      } catch (err) {
        console.error('Failed to fetch doctors:', err);
      }
    };
    fetchDoctors();
  }, []);

  const fetchQueue = async () => {
    try {
      const res = await API.get('/emergency/queue');
      setQueue(res.data);
    } catch (err) {
      console.error('Error fetching queue:', err);
    }
  };

  const fetchBeds = async () => {
    try {
      const res = await API.get('/emergency/beds');
      setBeds(res.data);
    } catch (err) {
      console.error('Error fetching beds:', err);
    }
  };

  useEffect(() => {
    fetchQueue();
    fetchBeds();
    socket.on('emergencyQueueUpdated', () => fetchQueue());
    socket.on('bedStatusUpdated', () => fetchBeds());
    return () => {
      socket.off('emergencyQueueUpdated');
      socket.off('bedStatusUpdated');
    };
  }, []);

  // ── Patient Search Logic ──────────────────────────────────────────────────
  const searchPatients = async (query) => {
    if (!query || query.trim().length < 2) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }
    setSearchLoading(true);
    try {
      // Adjust endpoint to match your backend route for patient search
      const res = await API.get(`/patients?search=${encodeURIComponent(query.trim())}`);
      const results = Array.isArray(res.data) ? res.data.slice(0, 6) : [];
      setSearchResults(results);
      setShowDropdown(true);
    } catch (err) {
      console.error('Patient search failed:', err);
      setSearchResults([]);
      setShowDropdown(false);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchQuery(val);
    setIsReturningPatient(false);

    // Debounce 300ms
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => searchPatients(val), 300);
  };

  const handleSelectPatient = (patient) => {
    // Auto-fill form fields from existing patient record
    setFormData(prev => ({
      ...prev,
      patientName: patient.name || patient.patientName || '',
      age: patient.age ? String(patient.age) : '',
      // Pre-fill chief complaint if patient has medical history (optional)
      chiefComplaint: '',
    }));
    setSearchQuery(patient.name || patient.patientName || '');
    setShowDropdown(false);
    setIsReturningPatient(true);
    setSearchResults([]);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setShowDropdown(false);
    setIsReturningPatient(false);
    setFormData({
      patientName: '',
      age: '',
      chiefComplaint: '',
      vitals: { bloodPressure: '', heartRate: '', temperature: '', spO2: '' },
      triageLevel: 'P3',
      assignedDoctor: '',
    });
  };

  // ── Form Submit ──────────────────────────────────────────────────────────
  const handleIntakeSubmit = async (e) => {
    e.preventDefault();

    if (!formData.assignedDoctor) {
      setErrorMsg('Please select a doctor');
      setTimeout(() => setErrorMsg(''), 3000);
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const selectedDoctor = doctors.find(d => d._id === formData.assignedDoctor);

      const payload = {
        patientName: formData.patientName,
        age: parseInt(formData.age) || 0,
        chiefComplaint: formData.chiefComplaint,
        vitals: formData.vitals,
        triageLevel: formData.triageLevel,
        assignedDoctor: formData.assignedDoctor,
        doctorName: selectedDoctor?.name || '',
        isReturningPatient,
      };

      await API.post('/emergency/intake', payload);

      setSuccessMsg(`✅ Patient admitted — Dr. ${selectedDoctor?.name} notified`);

      // Reset form + search
      setFormData({
        patientName: '',
        age: '',
        chiefComplaint: '',
        vitals: { bloodPressure: '', heartRate: '', temperature: '', spO2: '' },
        triageLevel: 'P3',
        assignedDoctor: '',
      });
      setSearchQuery('');
      setIsReturningPatient(false);

      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err) {
      console.error(err);
      setErrorMsg(err.response?.data?.message || 'Failed to admit patient');
      setTimeout(() => setErrorMsg(''), 5000);
    } finally {
      setLoading(false);
    }
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

            {/* ── Patient Lookup Search ── */}
            <div style={styles.searchSection}>
              <label style={styles.searchLabel}>🔎 Search Existing Patient</label>
              <div style={styles.searchWrapper}>
                <span style={styles.searchIconLeft}>👤</span>
                <input
                  type="text"
                  placeholder="Type patient name to check records…"
                  style={styles.searchInput}
                  value={searchQuery}
                  onChange={handleSearchChange}
                  onFocus={() => searchResults.length > 0 && setShowDropdown(true)}
                  onBlur={() => setTimeout(() => setShowDropdown(false), 180)}
                  autoComplete="off"
                />
                {searchLoading && (
                  <span style={styles.searchSpinner}>searching…</span>
                )}
                {searchQuery && !searchLoading && (
                  <span
                    style={{ ...styles.searchSpinner, cursor: 'pointer', color: '#94A3B8', fontSize: '16px' }}
                    onMouseDown={handleClearSearch}
                    title="Clear"
                  >×</span>
                )}

                {/* Dropdown Results */}
                {showDropdown && (
                  <div style={styles.searchDropdown}>
                    {searchResults.length === 0 ? (
                      <div style={styles.searchNoResult}>
                        No existing patient found — will register as new
                      </div>
                    ) : (
                      searchResults.map((p, i) => (
                        <div
                          key={p._id || i}
                          style={{
                            ...styles.searchDropdownItem,
                            background: hoveredIndex === i ? '#EEF2FF' : (i % 2 === 0 ? '#FAFAFA' : '#fff'),
                          }}
                          onMouseEnter={() => setHoveredIndex(i)}
                          onMouseLeave={() => setHoveredIndex(-1)}
                          onMouseDown={() => handleSelectPatient(p)}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <strong style={{ color: '#0F172A', fontSize: '13px' }}>
                                {p.name || p.patientName}
                              </strong>
                              <span style={{ color: '#94A3B8', fontSize: '12px', marginLeft: '6px' }}>
                                {p.age}y
                              </span>
                              {p.phone && (
                                <span style={{ color: '#94A3B8', fontSize: '11px', marginLeft: '6px' }}>
                                  • {p.phone}
                                </span>
                              )}
                            </div>
                            <span style={{
                              background: '#EEF2FF',
                              color: '#4338CA',
                              fontSize: '10px',
                              fontWeight: 700,
                              padding: '2px 7px',
                              borderRadius: '999px',
                            }}>
                              Existing
                            </span>
                          </div>
                          {p.bloodGroup && (
                            <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
                              Blood Group: {p.bloodGroup}
                              {p.lastVisit && ` · Last visit: ${new Date(p.lastVisit).toLocaleDateString()}`}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Status Badge */}
              {isReturningPatient && (
                <div style={{ ...styles.returningBadge, marginTop: '10px' }}>
                  ✅ Returning patient — form pre-filled from records
                </div>
              )}
              {searchQuery && !isReturningPatient && searchQuery.length >= 2 && !searchLoading && !showDropdown && searchResults.length === 0 && (
                <div style={{ ...styles.newPatientBadge, marginTop: '10px' }}>
                  🆕 New patient — fill in details below
                </div>
              )}
            </div>

            {/* ── Intake Form ── */}
            <form onSubmit={handleIntakeSubmit}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Patient Name *</label>
                <input
                  type="text" required
                  style={isReturningPatient ? styles.inputPrefilled : styles.input}
                  placeholder="Full name"
                  value={formData.patientName}
                  onChange={e => setFormData({ ...formData, patientName: e.target.value })}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Age *</label>
                <input
                  type="number" required
                  style={isReturningPatient ? styles.inputPrefilled : styles.input}
                  placeholder="Years"
                  value={formData.age}
                  onChange={e => setFormData({ ...formData, age: e.target.value })}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Chief Complaint *</label>
                <textarea
                  required rows={2}
                  style={{ ...styles.input, resize: 'none' }}
                  placeholder="Describe presenting complaint…"
                  value={formData.chiefComplaint}
                  onChange={e => setFormData({ ...formData, chiefComplaint: e.target.value })}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Vitals</label>
                <div style={styles.vitalsGrid}>
                  {[
                    { key: 'bloodPressure', label: 'BP',   unit: 'mmHg', ph: '120/80' },
                    { key: 'heartRate',     label: 'HR',   unit: 'bpm',  ph: '72'     },
                    { key: 'temperature',   label: 'Temp', unit: '°F',   ph: '98.6'   },
                    { key: 'spO2',          label: 'SpO2', unit: '%',    ph: '98'     },
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
                <label style={styles.label}>Triage Level *</label>
                <select
                  required style={styles.select}
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

              <div style={styles.formGroup}>
                <label style={styles.label}>Assign Doctor *</label>
                <select
                  required style={styles.select}
                  value={formData.assignedDoctor}
                  onChange={e => setFormData({ ...formData, assignedDoctor: e.target.value })}
                >
                  <option value="">— Select Doctor —</option>
                  {doctors.map(doc => (
                    <option key={doc._id} value={doc._id}>
                      Dr. {doc.name} ({doc.department || 'General'})
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                style={loading ? styles.submitBtnDisabled : styles.submitBtn}
                disabled={loading}
              >
                {loading ? 'Processing…' : '＋ Admit to Emergency'}
              </button>

              {successMsg && <div style={styles.successMsg}>{successMsg}</div>}
              {errorMsg   && <div style={styles.errorMsg}>{errorMsg}</div>}
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
                            {patient.doctorName && (
                              <div style={styles.assignedDoctor}>
                                <span>👨‍⚕️</span> Assigned: Dr. {patient.doctorName}
                              </div>
                            )}
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
                        <div style={styles.bedNumber}>
                          {bed.roomNumber ? `${bed.roomNumber} - ${bed.bedNumber}` : bed.bedNumber}
                        </div>
                        <div style={styles.bedStatus(bed.status)}>
                          <span style={{ fontSize: '8px' }}>{cfg.icon}</span>
                          <select
                            value={bed.status}
                            onChange={async (e) => {
                              try {
                                await API.put(`/emergency/beds/${bed._id}/status`, { status: e.target.value });
                                fetchBeds();
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