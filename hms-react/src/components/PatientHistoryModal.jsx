// components/PatientHistoryModal.jsx
import { useState, useEffect } from "react";
import api from "../utils/api";
import UploadFileModal from "./UploadFileModal";
import FollowUpModal from "./FollowUpModal";

export default function PatientHistoryModal({ patient, onClose }) {
  const [records, setRecords]           = useState([]);
  const [loading, setLoading]           = useState(true);
  const [activeVisit, setActiveVisit]   = useState(0);
  const [activeTab, setActiveTab]       = useState("files");
  const [showUpload, setShowUpload]     = useState(false);
  const [showFollowUp, setShowFollowUp] = useState(false);

  const fetchRecords = async () => {
    try {
      const patientId = patient._id || patient.patientId;
      const res = await api.get(`/patient-records/${patientId}`);
      setRecords(res.data.records || []);
    } catch {
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRecords(); }, [patient]);

  const formatDate = (d) => new Date(d).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
  });

  const formatTime = (d) => new Date(d).toLocaleTimeString("en-IN", {
    hour: "2-digit", minute: "2-digit",
  });

  const getFileIcon = (mimetype = "") => {
    if (mimetype.includes("pdf"))   return "📄";
    if (mimetype.includes("image")) return "🖼️";
    if (mimetype.includes("word") || mimetype.includes("doc")) return "📝";
    if (mimetype.includes("sheet") || mimetype.includes("excel")) return "📊";
    return "📎";
  };

  const fuStatusStyle = (status) => {
    if (status === "completed") return { bg: "#dcfce7", color: "#16a34a", dot: "#16a34a" };
    if (status === "cancelled") return { bg: "#fee2e2", color: "#dc2626", dot: "#dc2626" };
    return { bg: "#fef9c3", color: "#ca8a04", dot: "#eab308" };
  };

  // Most recent record (index 0, sorted desc by visitDate)
  const mostRecentRecord = records[0];

  // Token shape for modals — built from most recent record
  const modalToken = mostRecentRecord ? {
    _id:         mostRecentRecord.tokenId?._id || mostRecentRecord.tokenId || null,
    status:      "Done",
    patientId:   patient._id,
    patient:     { _id: patient._id, patientId: patient.patientId, name: patient.name },
    patientName: patient.name,
    patientCode: patient.patientId || "",
    doctorId:    mostRecentRecord.doctorId?._id || mostRecentRecord.doctorId,
    doctor:      mostRecentRecord.doctorId,
  } : {
    // No records yet — still allow adding
    _id:         null,
    status:      "Done",
    patientId:   patient._id,
    patient:     { _id: patient._id, patientId: patient.patientId, name: patient.name },
    patientName: patient.name,
    patientCode: patient.patientId || "",
    doctorId:    null,
    doctor:      null,
  };

  const clinicId = mostRecentRecord?.clinicId || "default";
  const currentRecord = records[activeVisit];
  const initials = (patient.name || "P").charAt(0).toUpperCase();

  return (
    <>
      <div style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 1000, padding: 16,
      }}>
        <div style={{
          background: "#fff", borderRadius: 16,
          boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
          width: "100%", maxWidth: 720,
          maxHeight: "88vh", display: "flex", flexDirection: "column",
          fontFamily: "inherit",
        }}>

          {/* ── Header ── */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "16px 20px", borderBottom: "1px solid #e2e8f0", flexShrink: 0,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{
                width: 42, height: 42, borderRadius: "50%",
                background: "linear-gradient(135deg, #0f4c81, #38bdf8)",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "#fff", fontWeight: 700, fontSize: 16,
              }}>{initials}</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16, color: "#1e293b" }}>{patient.name}</div>
                <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>
                  {patient.patientId} · {patient.phone || ""}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <button
                onClick={() => setShowUpload(true)}
                className="btn btn-sm btn-outline"
                style={{ fontSize: 12 }}
              >
                📎 Upload File
              </button>
              <button
                onClick={() => setShowFollowUp(true)}
                className="btn btn-sm btn-outline"
                style={{ fontSize: 12, color: "#16a34a", borderColor: "#16a34a" }}
              >
                📅 Follow-up
              </button>
              <span style={{
                fontSize: 12, fontWeight: 600, padding: "3px 10px", borderRadius: 20,
                background: "#dbeafe", color: "#1e40af",
              }}>
                {records.length} visit{records.length !== 1 ? "s" : ""}
              </span>
              <button onClick={onClose} style={{
                background: "none", border: "none", fontSize: 20,
                cursor: "pointer", color: "#94a3b8", padding: 4, lineHeight: 1,
              }}>×</button>
            </div>
          </div>

          {/* ── Body ── */}
          {loading ? (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 40 }}>
              <div className="spinner" />
            </div>
          ) : records.length === 0 ? (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 40, color: "#94a3b8" }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>No records found</div>
              <div style={{ fontSize: 12, marginTop: 4, marginBottom: 20 }}>No files or follow-ups have been added yet</div>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => setShowUpload(true)} className="btn btn-primary" style={{ fontSize: 13 }}>
                  📎 Upload First File
                </button>
                <button onClick={() => setShowFollowUp(true)} className="btn btn-outline" style={{ fontSize: 13, color: "#16a34a", borderColor: "#16a34a" }}>
                  📅 Schedule Follow-up
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

              {/* ── Left Sidebar ── */}
              <div style={{
                width: 165, borderRight: "1px solid #e2e8f0",
                flexShrink: 0, overflowY: "auto", background: "#f8fafc",
              }}>
                <div style={{
                  fontSize: 10, fontWeight: 700, color: "#94a3b8", letterSpacing: 1,
                  padding: "12px 12px 6px", textTransform: "uppercase",
                }}>VISITS</div>

                {records.map((rec, i) => (
                  <div
                    key={rec._id}
                    onClick={() => { setActiveVisit(i); setActiveTab("files"); }}
                    style={{
                      padding: "10px 12px", cursor: "pointer",
                      borderBottom: "1px solid #e2e8f0",
                      borderLeft: activeVisit === i ? "3px solid #0f4c81" : "3px solid transparent",
                      background: activeVisit === i ? "#fff" : "transparent",
                    }}
                  >
                    <div style={{ fontSize: 12, fontWeight: 600, color: "#1e293b", display: "flex", alignItems: "center", gap: 4 }}>
                      {formatDate(rec.visitDate)}
                      {i === 0 && (
                        <span style={{ fontSize: 9, fontWeight: 700, color: "#0f4c81", background: "#dbeafe", padding: "1px 4px", borderRadius: 4 }}>
                          NEW
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
                      {rec.doctorId?.name || "Doctor"}
                    </div>
                    <div style={{ display: "flex", gap: 4, marginTop: 5, flexWrap: "wrap" }}>
                      {rec.files.length > 0 && (
                        <span style={{ fontSize: 10, fontWeight: 600, padding: "1px 6px", borderRadius: 20, background: "#dbeafe", color: "#1e40af" }}>
                          {rec.files.length} file{rec.files.length > 1 ? "s" : ""}
                        </span>
                      )}
                      {rec.followUps.length > 0 && (
                        <span style={{ fontSize: 10, fontWeight: 600, padding: "1px 6px", borderRadius: 20, background: "#dcfce7", color: "#16a34a" }}>
                          {rec.followUps.length} fu
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* ── Right Panel ── */}
              <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
                {currentRecord && (
                  <>
                    {/* Visit info bar */}
                    <div style={{
                      padding: "12px 18px", borderBottom: "1px solid #e2e8f0",
                      background: "#fff", display: "flex", alignItems: "center", gap: 12, flexShrink: 0,
                    }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: "#1e293b" }}>
                          Dr. {currentRecord.doctorId?.name || "—"}
                        </div>
                        <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
                          {currentRecord.doctorId?.specialization || "General"} · {formatDate(currentRecord.visitDate)}
                        </div>
                      </div>
                      {currentRecord.tokenId?.tokenNumber && (
                        <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 20, background: "#f1f5f9", color: "#475569" }}>
                          Token #{currentRecord.tokenId.tokenNumber}
                        </span>
                      )}
                      {/* Quick add buttons for latest visit */}
                      {activeVisit === 0 && (
                        <div style={{ display: "flex", gap: 6 }}>
                          <button onClick={() => setShowUpload(true)} className="btn btn-sm btn-outline" style={{ fontSize: 11 }}>+ File</button>
                          <button onClick={() => setShowFollowUp(true)} className="btn btn-sm btn-outline" style={{ fontSize: 11, color: "#16a34a", borderColor: "#16a34a" }}>+ Follow-up</button>
                        </div>
                      )}
                    </div>

                    {/* Tabs */}
                    <div style={{ display: "flex", borderBottom: "1px solid #e2e8f0", background: "#fff", flexShrink: 0, padding: "0 18px" }}>
                      {["files", "followups"].map(tab => (
                        <button
                          key={tab}
                          onClick={() => setActiveTab(tab)}
                          style={{
                            padding: "10px 14px", fontSize: 12, fontWeight: 600,
                            cursor: "pointer", background: "none", border: "none",
                            borderBottom: activeTab === tab ? "2px solid #0f4c81" : "2px solid transparent",
                            color: activeTab === tab ? "#0f4c81" : "#94a3b8",
                            marginBottom: -1,
                          }}
                        >
                          {tab === "files"
                            ? `📎 Files (${currentRecord.files.length})`
                            : `📅 Follow-Ups (${currentRecord.followUps.length})`}
                        </button>
                      ))}
                    </div>

                    {/* Tab content */}
                    <div style={{ flex: 1, overflowY: "auto", padding: 18 }}>

                      {/* FILES */}
                      {activeTab === "files" && (
                        currentRecord.files.length === 0 ? (
                          <div style={{ textAlign: "center", padding: 32, color: "#94a3b8" }}>
                            <div style={{ fontSize: 36, marginBottom: 8 }}>📂</div>
                            <div style={{ fontSize: 13, marginBottom: 14 }}>No files uploaded for this visit</div>
                            {activeVisit === 0 && (
                              <button onClick={() => setShowUpload(true)} className="btn btn-primary" style={{ fontSize: 12 }}>📎 Upload File</button>
                            )}
                          </div>
                        ) : (
                          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                            {currentRecord.files.map(f => (
                              <div key={f._id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: "#f8fafc", borderRadius: 10, border: "1px solid #e2e8f0" }}>
                                <span style={{ fontSize: 24 }}>{getFileIcon(f.mimetype)}</span>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontSize: 13, fontWeight: 600, color: "#1e293b" }}>{f.filename}</div>
                                  <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>
                                    {f.label} · {(f.size / 1024).toFixed(1)} KB · {formatDate(f.uploadedAt)}
                                  </div>
                                </div>
                                <a
                                  href={`${import.meta.env.VITE_API_BASE_URL || "http://localhost:5000"}${f.path}`}
                                  target="_blank" rel="noreferrer"
                                  style={{ padding: "5px 12px", borderRadius: 8, fontSize: 11, fontWeight: 600, background: "#dbeafe", color: "#1e40af", textDecoration: "none", whiteSpace: "nowrap" }}
                                >
                                  View ↗
                                </a>
                              </div>
                            ))}
                            {activeVisit === 0 && (
                              <button onClick={() => setShowUpload(true)} style={{ marginTop: 4, padding: "8px 14px", fontSize: 12, fontWeight: 600, background: "#f8fafc", border: "1.5px dashed #cbd5e1", borderRadius: 10, cursor: "pointer", color: "#64748b", width: "100%" }}>
                                + Upload Another File
                              </button>
                            )}
                          </div>
                        )
                      )}

                      {/* FOLLOW-UPS */}
                      {activeTab === "followups" && (
                        currentRecord.followUps.length === 0 ? (
                          <div style={{ textAlign: "center", padding: 32, color: "#94a3b8" }}>
                            <div style={{ fontSize: 36, marginBottom: 8 }}>📅</div>
                            <div style={{ fontSize: 13, marginBottom: 14 }}>No follow-ups scheduled for this visit</div>
                            {activeVisit === 0 && (
                              <button onClick={() => setShowFollowUp(true)} className="btn btn-success" style={{ fontSize: 12 }}>📅 Schedule Follow-up</button>
                            )}
                          </div>
                        ) : (
                          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                            {currentRecord.followUps.map(fu => {
                              const st = fuStatusStyle(fu.status);
                              return (
                                <div key={fu._id} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "12px 14px", background: "#f8fafc", borderRadius: 10, border: "1px solid #e2e8f0" }}>
                                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: st.dot, marginTop: 4, flexShrink: 0 }} />
                                  <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: 13, fontWeight: 600, color: "#1e293b" }}>📅 {formatDate(fu.date)}</div>
                                    {fu.note && <div style={{ fontSize: 12, color: "#64748b", marginTop: 3 }}>{fu.note}</div>}
                                    <span style={{ display: "inline-block", marginTop: 5, fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 20, background: st.bg, color: st.color }}>
                                      {fu.status}
                                    </span>
                                  </div>
                                  <div style={{ fontSize: 11, color: "#94a3b8", flexShrink: 0 }}>{formatTime(fu.createdAt)}</div>
                                </div>
                              );
                            })}
                            {activeVisit === 0 && (
                              <button onClick={() => setShowFollowUp(true)} style={{ marginTop: 4, padding: "8px 14px", fontSize: 12, fontWeight: 600, background: "#f8fafc", border: "1.5px dashed #cbd5e1", borderRadius: 10, cursor: "pointer", color: "#64748b", width: "100%" }}>
                                + Add Another Follow-up
                              </button>
                            )}
                          </div>
                        )
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Upload Modal */}
      {showUpload && (
        <UploadFileModal
          token={modalToken}
          clinicId={clinicId}
          onClose={() => setShowUpload(false)}
          onSuccess={() => { setShowUpload(false); setLoading(true); fetchRecords(); setActiveTab("files"); }}
        />
      )}

      {/* Follow-up Modal */}
      {showFollowUp && (
        <FollowUpModal
          token={modalToken}
          clinicId={clinicId}
          onClose={() => setShowFollowUp(false)}
          onSuccess={() => { setShowFollowUp(false); setLoading(true); fetchRecords(); setActiveTab("followups"); }}
        />
      )}
    </>
  );
}