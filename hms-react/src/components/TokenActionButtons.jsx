// components/TokenActionButtons.jsx
import { useState } from "react";
import UploadFileModal from "./UploadFileModal";
import FollowUpModal from "./FollowUpModal";

/**
 * Props:
 *   token      – full token object { _id, status, patientId, patientCode, doctorId, ... }
 *   clinicId   – current clinic
 *   onRefresh  – callback to reload token list after action
 */
export default function TokenActionButtons({ token, clinicId, onRefresh }) {
  const [showUpload, setShowUpload] = useState(false);
  const [showFollowUp, setShowFollowUp] = useState(false);

  if (token.status !== "Done") return null; // only show for done tokens

  return (
    <>
      <div className="flex gap-2">
        {/* Upload File */}
        <button
          onClick={() => setShowUpload(true)}
          title="Upload Report / File"
          className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium 
                     bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 
                     rounded-lg transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none"
            viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          Upload
        </button>

        {/* Follow-up */}
        <button
          onClick={() => setShowFollowUp(true)}
          title="Schedule Follow-up"
          className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium 
                     bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 
                     rounded-lg transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none"
            viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          Follow-up
        </button>
      </div>

      {showUpload && (
        <UploadFileModal
          token={token}
          clinicId={clinicId}
          onClose={() => setShowUpload(false)}
          onSuccess={() => { setShowUpload(false); onRefresh?.(); }}
        />
      )}

      {showFollowUp && (
        <FollowUpModal
          token={token}
          clinicId={clinicId}
          onClose={() => setShowFollowUp(false)}
          onSuccess={() => { setShowFollowUp(false); onRefresh?.(); }}
        />
      )}
    </>
  );
}