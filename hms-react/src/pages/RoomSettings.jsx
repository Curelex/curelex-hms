// hms-react/src/pages/RoomSettings.jsx
import React, { useState, useEffect } from 'react';
import API from '../utils/api';

// ── Resolve clinicId from stored JWT / user object ───────────────────────────
// Adjust the localStorage key / shape to match your app's auth storage.
function getClinicId() {
  try {
    const raw = localStorage.getItem('user');        // change key if needed
    if (!raw) return 'default';
    const parsed = JSON.parse(raw);
    return (
      parsed.clinicId ||
      parsed.clinic?._id ||
      parsed.clinic ||
      'default'
    );
  } catch {
    return 'default';
  }
}

const ROOM_DEFAULTS = {
  'General Ward': { dailyRate: 800,  totalRooms: 5, availableRooms: 5 },
  'Semi-Private': { dailyRate: 1500, totalRooms: 4, availableRooms: 4 },
  'Private Room': { dailyRate: 2500, totalRooms: 3, availableRooms: 3 },
  'ICU':          { dailyRate: 4000, totalRooms: 4, availableRooms: 4 },
};
const ROOM_TYPES = Object.keys(ROOM_DEFAULTS);

export default function RoomSettings() {
  const clinicId = getClinicId();

  const [roomConfigs, setRoomConfigs] = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [saving,      setSaving]      = useState(false);
  const [saveMessage, setSaveMessage] = useState(null);

  useEffect(() => { fetchConfigs(); }, []); // eslint-disable-line

  const fetchConfigs = async () => {
    setLoading(true);
    try {
      const { data } = await API.get(`/room-settings?clinicId=${clinicId}`);

      // Merge API data with defaults so all four room types always appear
      const merged = ROOM_TYPES.map(roomType => {
        const existing = data.find(c => c.roomType === roomType);
        return existing || { roomType, ...ROOM_DEFAULTS[roomType] };
      });
      setRoomConfigs(merged);
    } catch (err) {
      console.error('Failed to load room settings', err);
      // Fall back to hard-coded defaults on network error
      setRoomConfigs(
        ROOM_TYPES.map(roomType => ({ roomType, ...ROOM_DEFAULTS[roomType] }))
      );
    } finally {
      setLoading(false);
    }
  };

  const updateConfig = (index, field, value) => {
    const updated   = [...roomConfigs];
    const numValue  = Number(value);
    updated[index]  = { ...updated[index], [field]: numValue };

    // Guard: availableRooms must not exceed totalRooms
    if (field === 'totalRooms' && updated[index].availableRooms > numValue) {
      updated[index].availableRooms = numValue;
    }
    if (field === 'availableRooms' && numValue > updated[index].totalRooms) {
      updated[index].availableRooms = updated[index].totalRooms;
    }

    setRoomConfigs(updated);
    setSaveMessage(null);
  };

  const handleSaveAll = async () => {
    setSaving(true);
    setSaveMessage(null);
    try {
      await API.post('/room-settings/bulk', { clinicId, configs: roomConfigs });
      setSaveMessage({ type: 'success', text: '✅ Room settings saved successfully!' });
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (err) {
      console.error('Save failed', err);
      setSaveMessage({
        type: 'error',
        text: '❌ Failed to save: ' + (err.response?.data?.message || err.message),
      });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!window.confirm('Reset all room settings to default values?')) return;
    const defaults = ROOM_TYPES.map(roomType => ({ roomType, ...ROOM_DEFAULTS[roomType] }));
    setSaving(true);
    try {
      await API.post('/room-settings/bulk', { clinicId, configs: defaults });
      setRoomConfigs(defaults);
      setSaveMessage({ type: 'success', text: '✅ Reset to default values!' });
      setTimeout(() => setSaveMessage(null), 3000);
    } catch {
      setSaveMessage({ type: 'error', text: '❌ Reset failed' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <div className="spinner" />
        <span style={{ marginLeft: 12, color: '#64748b' }}>Loading room settings...</span>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>

      {/* Header */}
      <div className="page-header" style={{ marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="page-title" style={{ fontSize: 20, marginBottom: 6 }}>🏨 Room & Rate Settings</h1>
          <p style={{ color: '#64748b', fontSize: 13, margin: 0 }}>
            Configure room rates and availability for your clinic.
            These settings will be used when admitting patients to IPD.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            className="btn btn-outline"
            onClick={handleReset}
            disabled={saving}
            style={{ borderColor: '#ef4444', color: '#ef4444' }}
          >
            🔄 Reset to Defaults
          </button>
          <button className="btn btn-primary" onClick={handleSaveAll} disabled={saving}>
            {saving ? '💾 Saving...' : '💾 Save All Changes'}
          </button>
        </div>
      </div>

      {/* Save message */}
      {saveMessage && (
        <div style={{
          padding: '12px 16px', borderRadius: 8, marginBottom: 20,
          background: saveMessage.type === 'success' ? '#dcfce7' : '#fee2e2',
          color:      saveMessage.type === 'success' ? '#166534' : '#991b1b',
          border: `1px solid ${saveMessage.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
        }}>
          {saveMessage.text}
        </div>
      )}

      {/* Info banner */}
      <div style={{
        background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10,
        padding: '14px 18px', marginBottom: 24,
        display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
      }}>
        <span style={{ fontSize: 24 }}>💡</span>
        <div style={{ flex: 1, fontSize: 13, color: '#1e40af' }}>
          <strong>How it works:</strong> When a patient is admitted, available rooms count decreases
          automatically. When discharged, it increases back. If available rooms = 0, that room type
          will be disabled in the admit form.
        </div>
      </div>

      {/* Room cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {roomConfigs.map((config, idx) => {
          const isFull      = config.availableRooms === 0;
          const isOverbooked = config.availableRooms > config.totalRooms;

          return (
            <div
              key={config.roomType}
              className="card"
              style={{
                padding: 20,
                borderLeft: `4px solid ${isFull ? '#ef4444' : isOverbooked ? '#f59e0b' : '#10b981'}`,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
                <div>
                  <h3 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>🏨 {config.roomType}</h3>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                    {config.roomType === 'General Ward'  && 'Shared room with multiple beds'}
                    {config.roomType === 'Semi-Private'  && 'Shared room with 2–3 beds'}
                    {config.roomType === 'Private Room'  && 'Single occupancy private room'}
                    {config.roomType === 'ICU'           && 'Intensive Care Unit with monitoring'}
                  </div>
                </div>
                <div style={{
                  padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                  background: isFull ? '#fee2e2' : isOverbooked ? '#fef3c7' : '#dcfce7',
                  color:      isFull ? '#b91c1c' : isOverbooked ? '#92400e' : '#166534',
                }}>
                  {isFull
                    ? '❌ No rooms available'
                    : isOverbooked
                      ? '⚠️ Overbooked!'
                      : `✅ ${config.availableRooms} of ${config.totalRooms} available`}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20 }}>

                {/* Daily Rate */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 600, color: '#334155' }}>
                    💰 Daily Rate (₹)
                  </label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>₹</span>
                    <input
                      type="number" className="form-control"
                      value={config.dailyRate}
                      onChange={e => updateConfig(idx, 'dailyRate', e.target.value)}
                      min="0" step="100"
                      style={{ paddingLeft: 28 }}
                    />
                  </div>
                  <small style={{ fontSize: 11, color: '#94a3b8' }}>Per day charge for this room type</small>
                </div>

                {/* Total Rooms */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 600, color: '#334155' }}>
                    🏢 Total Rooms
                  </label>
                  <input
                    type="number" className="form-control"
                    value={config.totalRooms}
                    onChange={e => updateConfig(idx, 'totalRooms', e.target.value)}
                    min="0" step="1"
                  />
                  <small style={{ fontSize: 11, color: '#94a3b8' }}>Total number of rooms in your clinic</small>
                </div>

                {/* Currently Available */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 600, color: '#334155' }}>
                    🟢 Currently Available
                  </label>
                  <input
                    type="number" className="form-control"
                    value={config.availableRooms}
                    onChange={e => updateConfig(idx, 'availableRooms', e.target.value)}
                    min="0" max={config.totalRooms} step="1"
                    style={{ borderColor: isFull ? '#ef4444' : '#e2e8f0' }}
                  />
                  <small style={{ fontSize: 11, color: isFull ? '#ef4444' : '#94a3b8' }}>
                    Max: {config.totalRooms} rooms
                  </small>
                </div>
              </div>

              {/* Progress bar */}
              <div style={{ marginTop: 16 }}>
                <div style={{ height: 6, background: '#e2e8f0', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{
                    width: `${config.totalRooms > 0 ? (config.availableRooms / config.totalRooms) * 100 : 0}%`,
                    height: '100%', borderRadius: 3, transition: 'width 0.3s',
                    background: isFull
                      ? '#ef4444'
                      : config.availableRooms < config.totalRooms / 2
                        ? '#f59e0b'
                        : '#10b981',
                  }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 11, color: '#64748b' }}>
                  <span>{config.availableRooms} available</span>
                  <span>{config.totalRooms - config.availableRooms} occupied</span>
                  <span>{config.totalRooms} total</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer note */}
      <div style={{
        marginTop: 24, background: '#fef3c7', border: '1px solid #fde68a',
        borderRadius: 8, padding: '14px 18px', fontSize: 13, color: '#92400e',
      }}>
        <strong>📌 Note:</strong> Changes to "Available Rooms" will immediately affect what
        receptionists see when admitting patients. If a room type shows 0 available, it will
        be disabled in the admission form.
      </div>
    </div>
  );
}