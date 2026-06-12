// components/UploadFileModal.jsx
import { useState, useRef } from "react";
import api from "../utils/api";

export default function UploadFileModal({ token, clinicId, onClose, onSuccess }) {
  const [file, setFile]       = useState(null);
  const [label, setLabel]     = useState("Report");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef();

  const LABELS = ["Blood Report", "X-Ray", "Prescription", "MRI / Scan", "Other"];

  const handleFile = (f) => {
    if (f && f.size > 10 * 1024 * 1024) {
      setError("File size must be less than 10 MB");
      return;
    }
    setError("");
    setFile(f);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const handleSubmit = async () => {
    if (!file) return setError("Please select a file");
    setLoading(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("label", label);
      formData.append("tokenId",     token._id);
      formData.append("patientId", token.patientId?._id || token.patient?._id || token.patientId);
      formData.append("patientCode", token.patientCode || token.patientId?.patientId || "");
      formData.append("doctorId",    token.doctorId?._id || token.doctor?._id || token.doctorId);
      formData.append("clinicId",    clinicId);

      await api.post("/patient-records/upload-file", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.message || "Upload failed");
    } finally {
      setLoading(false);
    }
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
              width: 36, height: 36, background: "#dbeafe", borderRadius: 10,
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18,
            }}>📎</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, color: "#1e293b" }}>Upload File</div>
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

          {/* File type label */}
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 }}>
              File Type
            </div>
            <select
              value={label}
              onChange={e => setLabel(e.target.value)}
              className="form-control"
              style={{ width: "100%" }}
            >
              {LABELS.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>

          {/* Drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current.click()}
            style={{
              border: `2px dashed ${dragOver ? "#3b82f6" : file ? "#16a34a" : "#e2e8f0"}`,
              borderRadius: 12, padding: "28px 20px", textAlign: "center",
              cursor: "pointer", transition: "all 0.15s",
              background: dragOver ? "#eff6ff" : file ? "#f0fdf4" : "#fafafa",
            }}
          >
            {file ? (
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{
                  width: 40, height: 40, background: "#dcfce7", borderRadius: 8,
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20,
                }}>📄</div>
                <div style={{ textAlign: "left", flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#1e293b" }}>
                    {file.name.length > 30 ? file.name.substring(0, 30) + "..." : file.name}
                  </div>
                  <div style={{ fontSize: 11, color: "#94a3b8" }}>
                    {(file.size / 1024).toFixed(1)} KB
                  </div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); setFile(null); }}
                  style={{
                    background: "#fee2e2", border: "none", borderRadius: 6,
                    color: "#dc2626", cursor: "pointer", padding: "4px 8px", fontSize: 12,
                  }}
                >
                  ✕
                </button>
              </div>
            ) : (
              <>
                <div style={{ fontSize: 32, marginBottom: 8 }}>☁️</div>
                <div style={{ fontSize: 13, color: "#475569" }}>
                  Drag & drop or <span style={{ color: "#3b82f6", fontWeight: 600 }}>browse</span>
                </div>
                <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>
                  PDF, JPG, PNG, DOC up to 10 MB
                </div>
              </>
            )}
          </div>
          <input
            ref={inputRef}
            type="file"
            style={{ display: "none" }}
            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
            onChange={e => handleFile(e.target.files[0])}
          />

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
        <div style={{ display: "flex", gap: 10, padding: "0 20px 20px" }}>
          <button
            onClick={onClose}
            className="btn btn-ghost"
            style={{ flex: 1 }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !file}
            className="btn btn-primary"
            style={{ flex: 1 }}
          >
            {loading ? "Uploading..." : "📤 Upload File"}
          </button>
        </div>
      </div>
    </div>
  );
}