// components/FollowUpModal.jsx
import { useState } from "react";
import api from "../utils/api";

export default function FollowUpModal({ token, clinicId, onClose, onSuccess }) {
  const today = new Date().toISOString().split("T")[0];
  const [date, setDate] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const addDays = (n) => {
    const d = new Date();
    d.setDate(d.getDate() + n);
    return d.toISOString().split("T")[0];
  };

  const quickPicks = [
    { label: "3 days", value: addDays(3) },
    { label: "1 week", value: addDays(7) },
    { label: "2 weeks", value: addDays(14) },
    { label: "1 month", value: addDays(30) },
  ];

  const handleSubmit = async () => {
    if (!date) return setError("Please select a follow-up date");
    if (date < today) return setError("Date cannot be in the past");
    setLoading(true);
    setError("");
    try {
      await api.post("/patient-records/follow-up", {
        tokenId:     token._id,
        patientId: token.patientId?._id || token.patient?._id || token.patientId,
        patientCode: token.patientCode || token.patientId?.patientId || "",
        doctorId:    token.doctorId?._id  || token.doctor?._id || token.doctorId,
        clinicId,
        date,
        note,
      });
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to schedule follow-up");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (iso) => {
    if (!iso) return "";
    return new Date(iso).toLocaleDateString("en-IN", {
      weekday: "short", day: "numeric", month: "long", year: "numeric",
    });
  };

  const patientName = token.patientName || token.patientId?.name || token.patient?.name || "Patient";
  const patientCode = token.patientCode || token.patientId?.patientId || token.patient?.patientId || "";

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 1000, padding: 16,
    }}>
      <div style={{
        background: "#fff", borderRadius: 16, boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
        width: "100%", maxWidth: 440, fontFamily: "inherit",
      }}>
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "18px 20px", borderBottom: "1px solid #e2e8f0",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 36, height: 36, background: "#dcfce7", borderRadius: 10,
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18,
            }}>📅</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, color: "#1e293b" }}>Schedule Follow-up</div>
              <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 1 }}>
                {patientName} · {patientCode}
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{
            background: "none", border: "none", fontSize: 20, cursor: "pointer",
            color: "#94a3b8", lineHeight: 1, padding: 4,
          }}>×</button>
        </div>

        {/* Body */}
        <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Quick picks */}
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 8 }}>
              Quick Select
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {quickPicks.map(q => (
                <button
                  key={q.label}
                  onClick={() => setDate(q.value)}
                  style={{
                    padding: "6px 14px", fontSize: 12, fontWeight: 600,
                    borderRadius: 20, cursor: "pointer", transition: "all 0.15s",
                    border: date === q.value ? "1px solid #16a34a" : "1px solid #e2e8f0",
                    background: date === q.value ? "#16a34a" : "#fff",
                    color: date === q.value ? "#fff" : "#475569",
                  }}
                >
                  {q.label}
                </button>
              ))}
            </div>
          </div>

          {/* Date picker */}
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 }}>
              Follow-up Date
            </div>
            <input
              type="date"
              min={today}
              value={date}
              onChange={e => setDate(e.target.value)}
              className="form-control"
              style={{ width: "100%", boxSizing: "border-box" }}
            />
            {date && (
              <div style={{ fontSize: 12, color: "#16a34a", marginTop: 5, fontWeight: 600 }}>
                📅 {formatDate(date)}
              </div>
            )}
          </div>

          {/* Note */}
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 }}>
              Note (optional)
            </div>
            <textarea
              rows={2}
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="e.g. Review blood report, check BP..."
              className="form-control"
              style={{ width: "100%", boxSizing: "border-box", resize: "none" }}
            />
          </div>

          {error && (
            <div style={{
              padding: "8px 12px", background: "#fee2e2", borderRadius: 8,
              color: "#dc2626", fontSize: 12,
            }}>
              ⚠️ {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          display: "flex", gap: 10, padding: "0 20px 20px",
        }}>
          <button
            onClick={onClose}
            className="btn btn-ghost"
            style={{ flex: 1 }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !date}
            className="btn btn-success"
            style={{ flex: 1 }}
          >
            {loading ? "Saving..." : "✅ Schedule Follow-up"}
          </button>
        </div>
      </div>
    </div>
  );
}