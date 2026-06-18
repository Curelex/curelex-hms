// // hms-react/src/pages/PatientAppointments.jsx
// import React, { useState, useEffect } from 'react';
// import { useNavigate, Link } from 'react-router-dom';
// import { useAuth } from '../context/AuthContext';
// import API from '../utils/api';
// import '../css/PatientDashboard.css';

// const STATUS_COLORS = {
//   Pending: { bg: '#fef3c7', text: '#92400e' },
//   Waiting: { bg: '#dbeafe', text: '#1e40af' },
//   Called:  { bg: '#dcfce7', text: '#166534' },
//   Done:    { bg: '#e5e7eb', text: '#374151' },
//   Skipped: { bg: '#fee2e2', text: '#991b1b' },
// };

// const PAYMENT_STATUS_COLORS = {
//   paid:    { bg: '#dcfce7', text: '#166534' },
//   pending: { bg: '#fef3c7', text: '#92400e' },
//   failed:  { bg: '#fee2e2', text: '#991b1b' },
// };

// // Modal steps
// const STEP_DETAILS = 'details';
// const STEP_PAYMENT  = 'payment';

// export default function PatientAppointments() {
//   const { user, patient, logout, isPatient } = useAuth();
//   const navigate = useNavigate();

//   const [appointments, setAppointments] = useState([]);
//   const [clinics, setClinics]           = useState([]);
//   const [doctors, setDoctors]           = useState([]);
//   const [doctorsLoading, setDoctorsLoading] = useState(false);
//   const [loading, setLoading]           = useState(true);
//   const [showModal, setShowModal]       = useState(false);
//   const [step, setStep]                 = useState(STEP_DETAILS);
//   const [submitting, setSubmitting]     = useState(false);
//   const [formError, setFormError]       = useState('');
//   const [sidebarOpen, setSidebarOpen]   = useState(false);

//   // Mock payment UI state
//   const [payMethod, setPayMethod]     = useState('card');
//   const [paying, setPaying]           = useState(false);
//   const [payError, setPayError]       = useState('');
//   const [cardNumber, setCardNumber]   = useState('');
//   const [cardExpiry, setCardExpiry]   = useState('');
//   const [cardCvv, setCardCvv]         = useState('');
//   const [upiId, setUpiId]             = useState('');

//   const patientId   = patient?._id || patient?.id || user?.id || user?._id;
//   const patientName = patient?.name || user?.name || '';

//   const [form, setForm] = useState({
//     name: patientName,
//     age: patient?.age || '',
//     gender: patient?.gender || '',
//     symptoms: '',
//     clinicId: '',
//     doctorId: '',
//     consultationType: 'in-person',
//   });

//   useEffect(() => {
//     if (!user) {
//       navigate('/patient-login');
//       return;
//     }
//     if (!isPatient()) {
//       navigate('/');
//       return;
//     }
//     loadAppointments();
//     loadClinics();
//   }, [user]);

//   async function loadAppointments() {
//     setLoading(true);
//     try {
//       const res = await API.get(`/patient-portal/${patientId}/appointments`);
//       if (res.data.success) {
//         setAppointments(res.data.appointments || []);
//       }
//     } catch (error) {
//       console.error('Error loading appointments:', error);
//     }
//     setLoading(false);
//   }

//   async function loadClinics() {
//     try {
//       const res = await API.get('/clinics');
//       if (res.data.success) {
//         setClinics(res.data.clinics || []);
//       }
//     } catch (error) {
//       console.error('Error loading clinics:', error);
//     }
//   }

//   async function loadDoctors(clinicId) {
//     if (!clinicId) {
//       setDoctors([]);
//       return;
//     }
//     setDoctorsLoading(true);
//     try {
//       const res = await API.get(`/patient-portal/doctors/${clinicId}`);
//       if (res.data.success) {
//         setDoctors(res.data.doctors || []);
//       }
//     } catch (error) {
//       console.error('Error loading doctors:', error);
//       setDoctors([]);
//     }
//     setDoctorsLoading(false);
//   }

//   const handleLogout = () => {
//     logout();
//     navigate('/patient-login');
//   };

//   const goTo = (path) => {
//     setSidebarOpen(false);
//     navigate(path);
//   };

//   const formatDate = (dateStr) => {
//     if (!dateStr) return '-';
//     return new Date(dateStr).toLocaleDateString('en-US', {
//       day: 'numeric', month: 'short', year: 'numeric',
//     });
//   };

//   const handleFormChange = (field, value) => {
//     setForm(f => {
//       const next = { ...f, [field]: value };
//       // Changing clinic invalidates the previously selected doctor
//       if (field === 'clinicId') {
//         next.doctorId = '';
//       }
//       return next;
//     });
//     setFormError('');

//     if (field === 'clinicId') {
//       loadDoctors(value);
//     }
//   };

//   const resetPaymentFields = () => {
//     setPayMethod('card');
//     setPayError('');
//     setCardNumber('');
//     setCardExpiry('');
//     setCardCvv('');
//     setUpiId('');
//     setPaying(false);
//   };

//   const openModal = () => {
//     setForm({
//       name: patientName,
//       age: patient?.age || '',
//       gender: patient?.gender || '',
//       symptoms: '',
//       clinicId: '',
//       doctorId: '',
//       consultationType: 'in-person',
//     });
//     setDoctors([]);
//     setFormError('');
//     setStep(STEP_DETAILS);
//     resetPaymentFields();
//     setShowModal(true);
//   };

//   const closeModal = () => {
//     if (submitting || paying) return;
//     setShowModal(false);
//   };

//   const selectedDoctor = doctors.find(d => d._id === form.doctorId);

//   const handleDetailsSubmit = (e) => {
//     e.preventDefault();
//     if (!form.name || !form.age || !form.gender || !form.symptoms || !form.clinicId || !form.doctorId) {
//       setFormError('Please fill in all fields, including selecting a doctor.');
//       return;
//     }
//     setFormError('');
//     setStep(STEP_PAYMENT);
//   };

//   const handleConfirmPayment = async () => {
//     setPayError('');

//     if (payMethod === 'card') {
//       if (!cardNumber || !cardExpiry || !cardCvv) {
//         setPayError('Please fill in all card details.');
//         return;
//       }
//     } else if (payMethod === 'upi') {
//       if (!upiId) {
//         setPayError('Please enter your UPI ID.');
//         return;
//       }
//     }

//     setPaying(true);
//     try {
//       // Step 1: mock-charge the payment
//       const payRes = await API.post(`/patient-portal/payments/mock`, {
//         doctorId: form.doctorId,
//         amount: selectedDoctor?.consultationFee || 0,
//         method: payMethod,
//       });

//       if (!payRes.data.success) {
//         setPayError('Payment failed. Please try again.');
//         setPaying(false);
//         return;
//       }

//       const { paymentStatus, transactionId, paidAt } = payRes.data.payment;

//       // Step 2: create the token, now that payment succeeded
//       setSubmitting(true);
//       const res = await API.post(`/patient-portal/${patientId}/appointments`, {
//         ...form,
//         paymentStatus,
//         transactionId,
//         paidAt,
//       });

//       if (res.data.success) {
//         setShowModal(false);
//         loadAppointments();
//       } else {
//         setPayError(res.data.message || 'Could not create token after payment. Please contact support.');
//       }
//     } catch (err) {
//       setPayError(err.response?.data?.message || 'Payment could not be completed. Please try again.');
//     }
//     setPaying(false);
//     setSubmitting(false);
//   };

//   const initials = (patientName || 'U')
//     .split(' ')
//     .map(n => n[0])
//     .join('')
//     .slice(0, 2)
//     .toUpperCase();

//   if (loading) {
//     return (
//       <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
//         <div style={{ textAlign: 'center' }}>
//           <i className="fas fa-spinner fa-spin" style={{ fontSize: 48, color: '#2d6be4' }}></i>
//           <p style={{ marginTop: '1rem', color: '#6b7a99' }}>Loading your appointments...</p>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="pd-layout">
//       {/* TOPBAR */}
//       <header className="pd-topbar">
//         <div className="pd-topbar__left">
//           <button className="pd-hamburger" onClick={() => setSidebarOpen(true)}>
//             <i className="fas fa-bars"></i>
//           </button>
//           <Link to="/patient-dashboard" className="pd-topbar__title">
//             My Health
//           </Link>
//         </div>
//         <div className="pd-topbar__right">
//           <div className="pd-user-menu">
//             <div className="pd-user-menu__trigger">
//               <div className="pd-user-menu__avatar">{initials}</div>
//               <span className="pd-user-menu__name">{patientName}</span>
//             </div>
//           </div>
//         </div>
//       </header>

//       <div className="pd-below-header">
//         <div className={`pd-sidebar-overlay${sidebarOpen ? ' visible' : ''}`} onClick={() => setSidebarOpen(false)} />

//         {/* SIDEBAR */}
//         <aside className={`pd-sidebar${sidebarOpen ? ' open' : ''}`}>
//           <div className="pd-sidebar__profile">
//             <div className="pd-sidebar__avatar">{initials}</div>
//             <div>
//               <div className="pd-sidebar__name">{patientName}</div>
//               <div className="pd-sidebar__phone">{patient?.email || user?.email}</div>
//             </div>
//           </div>
//           <nav className="pd-sidebar__nav">
//             <div className="pd-nav-item" onClick={() => goTo('/patient-dashboard')}>
//               <i className="fas fa-home"></i> Dashboard
//             </div>
//             <div className="pd-nav-item active" onClick={() => setSidebarOpen(false)}>
//               <i className="fas fa-calendar-check"></i> My Appointments
//             </div>
//             <div className="pd-nav-item" onClick={() => goTo('/patient-prescriptions')}>
//               <i className="fas fa-prescription-bottle-alt"></i> Prescriptions
//             </div>
//             <div className="pd-nav-item" onClick={() => goTo('/patient-profile')}>
//               <i className="fas fa-user-circle"></i> Profile
//             </div>
//             <div className="pd-nav-divider" />
//             <div className="pd-nav-item" onClick={handleLogout}>
//               <i className="fas fa-sign-out-alt"></i> Logout
//             </div>
//           </nav>
//         </aside>

//         {/* MAIN CONTENT */}
//         <div className="pd-main">
//           <main className="pd-body">
//             <div style={{
//               display: 'flex',
//               justifyContent: 'space-between',
//               alignItems: 'center',
//               marginBottom: '20px',
//               flexWrap: 'wrap',
//               gap: '12px',
//             }}>
//               <div>
//                 <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 700, color: '#1a2236' }}>
//                   My Appointments
//                 </h2>
//                 <p style={{ margin: '4px 0 0', color: '#6b7a99', fontSize: '14px' }}>
//                   Your appointment requests
//                 </p>
//               </div>
//               <button
//                 className="pd-btn pd-btn--primary"
//                 onClick={openModal}
//                 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
//               >
//                 <i className="fas fa-plus"></i> Create New Token
//               </button>
//             </div>

//             <div className="pd-card">
//               <div className="pd-card__body" style={{ padding: appointments.length ? 0 : '24px' }}>
//                 {appointments.length === 0 && (
//                   <div className="pd-empty">
//                     <i className="fas fa-calendar-times"></i> No appointments yet. Create a new token to get started.
//                   </div>
//                 )}
//                 {appointments.length > 0 && (
//                   <div style={{ overflowX: 'auto' }}>
//                     <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
//                       <thead>
//                         <tr style={{ borderBottom: '1px solid #e5e7eb', textAlign: 'left' }}>
//                           <th style={{ padding: '12px 16px', color: '#6b7a99', fontWeight: 600 }}>Token #</th>
//                           <th style={{ padding: '12px 16px', color: '#6b7a99', fontWeight: 600 }}>Date</th>
//                           <th style={{ padding: '12px 16px', color: '#6b7a99', fontWeight: 600 }}>Clinic</th>
//                           <th style={{ padding: '12px 16px', color: '#6b7a99', fontWeight: 600 }}>Doctor</th>
//                           <th style={{ padding: '12px 16px', color: '#6b7a99', fontWeight: 600 }}>Type</th>
//                           <th style={{ padding: '12px 16px', color: '#6b7a99', fontWeight: 600 }}>Symptoms</th>
//                           <th style={{ padding: '12px 16px', color: '#6b7a99', fontWeight: 600 }}>Fee</th>
//                           <th style={{ padding: '12px 16px', color: '#6b7a99', fontWeight: 600 }}>Payment</th>
//                           <th style={{ padding: '12px 16px', color: '#6b7a99', fontWeight: 600 }}>Status</th>
//                         </tr>
//                       </thead>
//                       <tbody>
//                         {appointments.map((apt) => {
//                           const sc = STATUS_COLORS[apt.status] || STATUS_COLORS.Pending;
//                           const pc = PAYMENT_STATUS_COLORS[apt.paymentStatus] || PAYMENT_STATUS_COLORS.pending;
//                           return (
//                             <tr key={apt._id} style={{ borderBottom: '1px solid #f1f3f6' }}>
//                               <td style={{ padding: '12px 16px', fontWeight: 600, color: '#1a2236' }}>
//                                 #{apt.tokenNumber}
//                               </td>
//                               <td style={{ padding: '12px 16px', color: '#374151' }}>
//                                 {formatDate(apt.createdAt)}
//                               </td>
//                               <td style={{ padding: '12px 16px', color: '#374151' }}>
//                                 {apt.clinic?.name || apt.clinicId?.name || '-'}
//                               </td>
//                               <td style={{ padding: '12px 16px', color: '#374151' }}>
//                                 {apt.doctor?.name ? `Dr. ${apt.doctor.name}` : 'Not yet assigned'}
//                               </td>
//                               <td style={{ padding: '12px 16px', color: '#374151', textTransform: 'capitalize' }}>
//                                 {apt.consultationType || '-'}
//                               </td>
//                               <td style={{ padding: '12px 16px', color: '#374151', maxWidth: '200px' }}>
//                                 {apt.symptoms || '-'}
//                               </td>
//                               <td style={{ padding: '12px 16px', color: '#374151' }}>
//                                 {apt.consultationFee ? `₹${apt.consultationFee}` : '-'}
//                               </td>
//                               <td style={{ padding: '12px 16px' }}>
//                                 <span style={{
//                                   background: pc.bg, color: pc.text, padding: '4px 10px',
//                                   borderRadius: '999px', fontSize: '12px', fontWeight: 600,
//                                   textTransform: 'capitalize',
//                                 }}>
//                                   {apt.paymentStatus || 'pending'}
//                                 </span>
//                               </td>
//                               <td style={{ padding: '12px 16px' }}>
//                                 <span style={{
//                                   background: sc.bg,
//                                   color: sc.text,
//                                   padding: '4px 10px',
//                                   borderRadius: '999px',
//                                   fontSize: '12px',
//                                   fontWeight: 600,
//                                 }}>
//                                   {apt.status}
//                                 </span>
//                               </td>
//                             </tr>
//                           );
//                         })}
//                       </tbody>
//                     </table>
//                   </div>
//                 )}
//               </div>
//             </div>
//           </main>
//         </div>
//       </div>

//       {/* CREATE NEW TOKEN MODAL */}
//       {showModal && (
//         <div
//           style={{
//             position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
//             display: 'flex', alignItems: 'center', justifyContent: 'center',
//             zIndex: 1000, padding: '16px',
//           }}
//           onClick={closeModal}
//         >
//           <div
//             style={{
//               background: 'white', borderRadius: '16px', width: '100%', maxWidth: '460px',
//               padding: '24px', boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
//               maxHeight: '90vh', overflowY: 'auto',
//             }}
//             onClick={e => e.stopPropagation()}
//           >
//             {step === STEP_DETAILS && (
//               <>
//                 <h3 style={{ margin: '0 0 4px', fontSize: '18px', fontWeight: 700, color: '#1a2236' }}>
//                   Create New Token
//                 </h3>
//                 <p style={{ margin: '0 0 18px', fontSize: '13px', color: '#6b7a99' }}>
//                   Choose a clinic and doctor, then pay the consultation fee to confirm your token.
//                 </p>

//                 <form onSubmit={handleDetailsSubmit}>
//                   {/* Full Name */}
//                   <div style={{ marginBottom: '14px' }}>
//                     <label style={labelStyle}>Full Name *</label>
//                     <input
//                       type="text"
//                       value={form.name}
//                       onChange={e => handleFormChange('name', e.target.value)}
//                       style={inputStyle}
//                       placeholder="Enter full name"
//                     />
//                   </div>

//                   {/* Age & Gender */}
//                   <div style={{ display: 'flex', gap: '12px', marginBottom: '14px' }}>
//                     <div style={{ flex: 1 }}>
//                       <label style={labelStyle}>Age *</label>
//                       <input
//                         type="number"
//                         min="0"
//                         max="120"
//                         value={form.age}
//                         onChange={e => handleFormChange('age', e.target.value)}
//                         style={inputStyle}
//                         placeholder="Age"
//                       />
//                     </div>
//                     <div style={{ flex: 1 }}>
//                       <label style={labelStyle}>Gender *</label>
//                       <select
//                         value={form.gender}
//                         onChange={e => handleFormChange('gender', e.target.value)}
//                         style={inputStyle}
//                       >
//                         <option value="">Select</option>
//                         <option value="Male">Male</option>
//                         <option value="Female">Female</option>
//                         <option value="Other">Other</option>
//                       </select>
//                     </div>
//                   </div>

//                   {/* Symptoms */}
//                   <div style={{ marginBottom: '14px' }}>
//                     <label style={labelStyle}>Symptoms *</label>
//                     <textarea
//                       value={form.symptoms}
//                       onChange={e => handleFormChange('symptoms', e.target.value)}
//                       style={{ ...inputStyle, minHeight: '70px', resize: 'vertical' }}
//                       placeholder="Describe what's bothering you"
//                     />
//                   </div>

//                   {/* Clinic Dropdown */}
//                   <div style={{ marginBottom: '14px' }}>
//                     <label style={labelStyle}>Clinic *</label>
//                     <select
//                       value={form.clinicId}
//                       onChange={e => handleFormChange('clinicId', e.target.value)}
//                       style={inputStyle}
//                     >
//                       <option value="">Select a clinic</option>
//                       {clinics.map(clinic => (
//                         <option key={clinic._id} value={clinic._id}>
//                           {clinic.name}
//                         </option>
//                       ))}
//                     </select>
//                     {clinics.length === 0 && (
//                       <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#ef4444' }}>
//                         No clinics available. Please contact support.
//                       </p>
//                     )}
//                   </div>

//                   {/* Doctor Dropdown — appears once a clinic is chosen */}
//                   {form.clinicId && (
//                     <div style={{ marginBottom: '14px' }}>
//                       <label style={labelStyle}>Doctor *</label>
//                       {doctorsLoading ? (
//                         <p style={{ fontSize: '13px', color: '#6b7a99', margin: 0 }}>
//                           <i className="fas fa-spinner fa-spin"></i> Loading doctors...
//                         </p>
//                       ) : (
//                         <>
//                           <select
//                             value={form.doctorId}
//                             onChange={e => handleFormChange('doctorId', e.target.value)}
//                             style={inputStyle}
//                           >
//                             <option value="">Select a doctor</option>
//                             {doctors.map(doc => (
//                               <option key={doc._id} value={doc._id}>
//                                 Dr. {doc.name} — {doc.department || 'General'} — ₹{doc.consultationFee || 0}
//                               </option>
//                             ))}
//                           </select>
//                           {doctors.length === 0 && (
//                             <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#ef4444' }}>
//                               No doctors available at this clinic yet.
//                             </p>
//                           )}
//                         </>
//                       )}
//                     </div>
//                   )}

//                   {/* Consultation type */}
//                   {form.doctorId && (
//                     <div style={{ marginBottom: '18px' }}>
//                       <label style={labelStyle}>Consultation Type *</label>
//                       <div style={{ display: 'flex', gap: '10px' }}>
//                         {['in-person', 'online'].map(type => (
//                           <label
//                             key={type}
//                             style={{
//                               flex: 1, display: 'flex', alignItems: 'center', gap: '8px',
//                               padding: '10px 12px', borderRadius: '8px',
//                               border: `1px solid ${form.consultationType === type ? '#2d6be4' : '#d1d5db'}`,
//                               background: form.consultationType === type ? '#eff6ff' : 'white',
//                               cursor: 'pointer', fontSize: '13px', color: '#374151',
//                               textTransform: 'capitalize',
//                             }}
//                           >
//                             <input
//                               type="radio"
//                               name="consultationType"
//                               value={type}
//                               checked={form.consultationType === type}
//                               onChange={e => handleFormChange('consultationType', e.target.value)}
//                             />
//                             {type === 'in-person' ? 'In-person' : 'Online'}
//                           </label>
//                         ))}
//                       </div>
//                       {selectedDoctor && (
//                         <p style={{ margin: '8px 0 0', fontSize: '13px', color: '#374151' }}>
//                           Consultation fee: <strong>₹{selectedDoctor.consultationFee || 0}</strong>{' '}
//                           <span style={{ color: '#6b7a99' }}>(payable now to confirm your token)</span>
//                         </p>
//                       )}
//                     </div>
//                   )}

//                   {/* Error */}
//                   {formError && (
//                     <div style={{
//                       background: '#fee2e2', color: '#991b1b', padding: '10px 12px',
//                       borderRadius: '8px', fontSize: '13px', marginBottom: '14px',
//                     }}>
//                       {formError}
//                     </div>
//                   )}

//                   {/* Buttons */}
//                   <div style={{ display: 'flex', gap: '10px' }}>
//                     <button
//                       type="button"
//                       onClick={closeModal}
//                       className="pd-btn pd-btn--outline"
//                       style={{ flex: 1 }}
//                     >
//                       Cancel
//                     </button>
//                     <button
//                       type="submit"
//                       className="pd-btn pd-btn--primary"
//                       style={{ flex: 1 }}
//                     >
//                       Continue to Payment
//                     </button>
//                   </div>
//                 </form>
//               </>
//             )}

//             {step === STEP_PAYMENT && (
//               <>
//                 <h3 style={{ margin: '0 0 4px', fontSize: '18px', fontWeight: 700, color: '#1a2236' }}>
//                   Confirm &amp; Pay
//                 </h3>
//                 <p style={{ margin: '0 0 18px', fontSize: '13px', color: '#6b7a99' }}>
//                   This is a test payment screen. No real money will be charged.
//                 </p>

//                 {/* Summary card */}
//                 <div style={{
//                   background: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: '10px',
//                   padding: '14px', marginBottom: '18px',
//                 }}>
//                   <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
//                     <span style={{ color: '#6b7a99' }}>Doctor</span>
//                     <span style={{ color: '#1a2236', fontWeight: 600 }}>Dr. {selectedDoctor?.name}</span>
//                   </div>
//                   <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
//                     <span style={{ color: '#6b7a99' }}>Specialization</span>
//                     <span style={{ color: '#1a2236' }}>{selectedDoctor?.department || 'General'}</span>
//                   </div>
//                   <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
//                     <span style={{ color: '#6b7a99' }}>Consultation</span>
//                     <span style={{ color: '#1a2236', textTransform: 'capitalize' }}>{form.consultationType}</span>
//                   </div>
//                   <div style={{
//                     display: 'flex', justifyContent: 'space-between', fontSize: '15px',
//                     fontWeight: 700, color: '#1a2236', marginTop: '10px', paddingTop: '10px',
//                     borderTop: '1px solid #e5e7eb',
//                   }}>
//                     <span>Amount to pay</span>
//                     <span>₹{selectedDoctor?.consultationFee || 0}</span>
//                   </div>
//                 </div>

//                 {/* Payment method tabs */}
//                 <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
//                   {[
//                     { id: 'card', label: 'Card' },
//                     { id: 'upi', label: 'UPI' },
//                   ].map(m => (
//                     <button
//                       key={m.id}
//                       type="button"
//                       onClick={() => { setPayMethod(m.id); setPayError(''); }}
//                       style={{
//                         flex: 1, padding: '8px 10px', borderRadius: '8px', fontSize: '13px',
//                         fontWeight: 600, cursor: 'pointer',
//                         border: `1px solid ${payMethod === m.id ? '#2d6be4' : '#d1d5db'}`,
//                         background: payMethod === m.id ? '#2d6be4' : 'white',
//                         color: payMethod === m.id ? 'white' : '#374151',
//                       }}
//                     >
//                       {m.label}
//                     </button>
//                   ))}
//                 </div>

//                 {payMethod === 'card' && (
//                   <>
//                     <div style={{ marginBottom: '14px' }}>
//                       <label style={labelStyle}>Card Number</label>
//                       <input
//                         type="text"
//                         value={cardNumber}
//                         onChange={e => setCardNumber(e.target.value)}
//                         style={inputStyle}
//                         placeholder="4242 4242 4242 4242"
//                         maxLength={19}
//                       />
//                     </div>
//                     <div style={{ display: 'flex', gap: '12px', marginBottom: '14px' }}>
//                       <div style={{ flex: 1 }}>
//                         <label style={labelStyle}>Expiry</label>
//                         <input
//                           type="text"
//                           value={cardExpiry}
//                           onChange={e => setCardExpiry(e.target.value)}
//                           style={inputStyle}
//                           placeholder="MM/YY"
//                           maxLength={5}
//                         />
//                       </div>
//                       <div style={{ flex: 1 }}>
//                         <label style={labelStyle}>CVV</label>
//                         <input
//                           type="text"
//                           value={cardCvv}
//                           onChange={e => setCardCvv(e.target.value)}
//                           style={inputStyle}
//                           placeholder="123"
//                           maxLength={3}
//                         />
//                       </div>
//                     </div>
//                   </>
//                 )}

//                 {payMethod === 'upi' && (
//                   <div style={{ marginBottom: '14px' }}>
//                     <label style={labelStyle}>UPI ID</label>
//                     <input
//                       type="text"
//                       value={upiId}
//                       onChange={e => setUpiId(e.target.value)}
//                       style={inputStyle}
//                       placeholder="yourname@upi"
//                     />
//                   </div>
//                 )}

//                 {payError && (
//                   <div style={{
//                     background: '#fee2e2', color: '#991b1b', padding: '10px 12px',
//                     borderRadius: '8px', fontSize: '13px', marginBottom: '14px',
//                   }}>
//                     {payError}
//                   </div>
//                 )}

//                 <div style={{ display: 'flex', gap: '10px' }}>
//                   <button
//                     type="button"
//                     onClick={() => setStep(STEP_DETAILS)}
//                     disabled={paying || submitting}
//                     className="pd-btn pd-btn--outline"
//                     style={{ flex: 1 }}
//                   >
//                     Back
//                   </button>
//                   <button
//                     type="button"
//                     onClick={handleConfirmPayment}
//                     disabled={paying || submitting}
//                     className="pd-btn pd-btn--primary"
//                     style={{ flex: 1 }}
//                   >
//                     {paying || submitting ? 'Processing...' : `Pay ₹${selectedDoctor?.consultationFee || 0}`}
//                   </button>
//                 </div>
//               </>
//             )}
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }

// const labelStyle = {
//   display: 'block',
//   fontSize: '13px',
//   fontWeight: 600,
//   color: '#374151',
//   marginBottom: '6px',
// };

// const inputStyle = {
//   width: '100%',
//   padding: '10px 12px',
//   borderRadius: '8px',
//   border: '1px solid #d1d5db',
//   fontSize: '14px',
//   fontFamily: 'inherit',
//   boxSizing: 'border-box',
// };












// hms-react/src/pages/PatientAppointments.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API from '../utils/api';
import '../css/PatientDashboard.css';

const STATUS_COLORS = {
  Pending: { bg: '#fef3c7', text: '#92400e' },
  Waiting: { bg: '#dbeafe', text: '#1e40af' },
  Called:  { bg: '#dcfce7', text: '#166534' },
  Done:    { bg: '#e5e7eb', text: '#374151' },
  Skipped: { bg: '#fee2e2', text: '#991b1b' },
};

const PAYMENT_STATUS_COLORS = {
  paid:    { bg: '#dcfce7', text: '#166534' },
  pending: { bg: '#fef3c7', text: '#92400e' },
  failed:  { bg: '#fee2e2', text: '#991b1b' },
};

const STEP_DETAILS = 'details';
const STEP_PAYMENT  = 'payment';

export default function PatientAppointments() {
  const { user, patient, logout, isPatient } = useAuth();
  const navigate = useNavigate();

  const [appointments, setAppointments] = useState([]);
  const [clinics, setClinics]           = useState([]);
  const [doctors, setDoctors]           = useState([]);
  const [doctorsLoading, setDoctorsLoading] = useState(false);
  const [loading, setLoading]           = useState(true);
  const [showModal, setShowModal]       = useState(false);
  const [step, setStep]                 = useState(STEP_DETAILS);
  const [submitting, setSubmitting]     = useState(false);
  const [formError, setFormError]       = useState('');
  const [sidebarOpen, setSidebarOpen]   = useState(false);

  const [payMethod, setPayMethod]   = useState('card');
  const [paying, setPaying]         = useState(false);
  const [payError, setPayError]     = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv]       = useState('');
  const [upiId, setUpiId]           = useState('');

  const patientId   = patient?._id || patient?.id || user?.id || user?._id;
  const patientName = patient?.name || user?.name || '';

  const [form, setForm] = useState({
    name: patientName,
    age: patient?.age || '',
    gender: patient?.gender || '',
    symptoms: '',
    clinicId: '',
    doctorId: '',
    consultationType: 'in-person',
  });

  useEffect(() => {
    if (!user) { navigate('/patient-login'); return; }
    if (!isPatient()) { navigate('/'); return; }
    loadAppointments();
    loadClinics();
  }, [user]);

  async function loadAppointments() {
    setLoading(true);
    try {
      const res = await API.get(`/patient-portal/${patientId}/appointments`);
      if (res.data.success) setAppointments(res.data.appointments || []);
    } catch (error) {
      console.error('Error loading appointments:', error);
    }
    setLoading(false);
  }

  async function loadClinics() {
    try {
      const res = await API.get('/clinics');
      if (res.data.success) setClinics(res.data.clinics || []);
    } catch (error) {
      console.error('Error loading clinics:', error);
    }
  }

  async function loadDoctors(clinicId) {
    if (!clinicId) { setDoctors([]); return; }
    setDoctorsLoading(true);
    try {
      const res = await API.get(`/patient-portal/doctors/${clinicId}`);
      if (res.data.success) setDoctors(res.data.doctors || []);
    } catch (error) {
      console.error('Error loading doctors:', error);
      setDoctors([]);
    }
    setDoctorsLoading(false);
  }

  const handleLogout = () => { logout(); navigate('/patient-login'); };
  const goTo = (path) => { setSidebarOpen(false); navigate(path); };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  };

  const handleFormChange = (field, value) => {
    setForm(f => {
      const next = { ...f, [field]: value };
      if (field === 'clinicId') next.doctorId = '';
      return next;
    });
    setFormError('');
    if (field === 'clinicId') loadDoctors(value);
  };

  const resetPaymentFields = () => {
    setPayMethod('card'); setPayError('');
    setCardNumber(''); setCardExpiry(''); setCardCvv(''); setUpiId('');
    setPaying(false);
  };

  const openModal = () => {
    setForm({
      name: patientName,
      age: patient?.age || '',
      gender: patient?.gender || '',
      symptoms: '',
      clinicId: '',
      doctorId: '',
      consultationType: 'in-person',
    });
    setDoctors([]);
    setFormError('');
    setStep(STEP_DETAILS);
    resetPaymentFields();
    setShowModal(true);
  };

  const closeModal = () => { if (submitting || paying) return; setShowModal(false); };

  const selectedDoctor = doctors.find(d => d._id === form.doctorId);

  const handleDetailsSubmit = (e) => {
    e.preventDefault();
    if (!form.name || !form.age || !form.gender || !form.symptoms || !form.clinicId || !form.doctorId) {
      setFormError('Please fill in all fields, including selecting a clinic and doctor.');
      return;
    }
    setFormError('');
    setStep(STEP_PAYMENT);
  };

  const handleConfirmPayment = async () => {
    setPayError('');

    if (payMethod === 'card') {
      if (!cardNumber || !cardExpiry || !cardCvv) {
        setPayError('Please fill in all card details.');
        return;
      }
    } else if (payMethod === 'upi') {
      if (!upiId) {
        setPayError('Please enter your UPI ID.');
        return;
      }
    }

    setPaying(true);
    try {
      // Step 1: mock payment
      const payRes = await API.post(`/patient-portal/payments/mock`, {
        doctorId: form.doctorId,
        amount: selectedDoctor?.consultationFee || 0,
        method: payMethod,
      });

      if (!payRes.data.success) {
        setPayError('Payment failed. Please try again.');
        setPaying(false);
        return;
      }

      const { paymentStatus, transactionId, paidAt } = payRes.data.payment;

      // Step 2: create the token
      setSubmitting(true);
      const res = await API.post(`/patient-portal/${patientId}/appointments`, {
        name: form.name,
        age: form.age,
        gender: form.gender,
        symptoms: form.symptoms,
        clinicId: form.clinicId,       // ✅ explicitly sent from form
        doctorId: form.doctorId,
        consultationType: form.consultationType,
        paymentStatus,
        transactionId,
        paidAt,
        method: payMethod,
      });

      if (res.data.success) {
        setShowModal(false);
        loadAppointments();
      } else {
        setPayError(res.data.message || 'Could not create token after payment.');
      }
    } catch (err) {
      setPayError(err.response?.data?.message || 'Payment could not be completed. Please try again.');
    }
    setPaying(false);
    setSubmitting(false);
  };

  const initials = (patientName || 'U')
    .split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div style={{ textAlign: 'center' }}>
          <i className="fas fa-spinner fa-spin" style={{ fontSize: 48, color: '#2d6be4' }}></i>
          <p style={{ marginTop: '1rem', color: '#6b7a99' }}>Loading your appointments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pd-layout">
      {/* TOPBAR */}
      <header className="pd-topbar">
        <div className="pd-topbar__left">
          <button className="pd-hamburger" onClick={() => setSidebarOpen(true)}>
            <i className="fas fa-bars"></i>
          </button>
          <Link to="/patient-dashboard" className="pd-topbar__title">My Health</Link>
        </div>
        <div className="pd-topbar__right">
          <div className="pd-user-menu">
            <div className="pd-user-menu__trigger">
              <div className="pd-user-menu__avatar">{initials}</div>
              <span className="pd-user-menu__name">{patientName}</span>
            </div>
          </div>
        </div>
      </header>

      <div className="pd-below-header">
        <div className={`pd-sidebar-overlay${sidebarOpen ? ' visible' : ''}`} onClick={() => setSidebarOpen(false)} />

        {/* SIDEBAR */}
        <aside className={`pd-sidebar${sidebarOpen ? ' open' : ''}`}>
          <div className="pd-sidebar__profile">
            <div className="pd-sidebar__avatar">{initials}</div>
            <div>
              <div className="pd-sidebar__name">{patientName}</div>
              <div className="pd-sidebar__phone">{patient?.email || user?.email}</div>
            </div>
          </div>
          <nav className="pd-sidebar__nav">
            <div className="pd-nav-item" onClick={() => goTo('/patient-dashboard')}>
              <i className="fas fa-home"></i> Dashboard
            </div>
            <div className="pd-nav-item active" onClick={() => setSidebarOpen(false)}>
              <i className="fas fa-calendar-check"></i> My Appointments
            </div>
            <div className="pd-nav-item" onClick={() => goTo('/patient-prescriptions')}>
              <i className="fas fa-prescription-bottle-alt"></i> Prescriptions
            </div>
            <div className="pd-nav-item" onClick={() => goTo('/patient-profile')}>
              <i className="fas fa-user-circle"></i> Profile
            </div>
            <div className="pd-nav-divider" />
            <div className="pd-nav-item" onClick={handleLogout}>
              <i className="fas fa-sign-out-alt"></i> Logout
            </div>
          </nav>
        </aside>

        {/* MAIN */}
        <div className="pd-main">
          <main className="pd-body">
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              marginBottom: '20px', flexWrap: 'wrap', gap: '12px',
            }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 700, color: '#1a2236' }}>
                  My Appointments
                </h2>
                <p style={{ margin: '4px 0 0', color: '#6b7a99', fontSize: '14px' }}>
                  Your appointment requests
                </p>
              </div>
              <button
                className="pd-btn pd-btn--primary"
                onClick={openModal}
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <i className="fas fa-plus"></i> Create New Token
              </button>
            </div>

            <div className="pd-card">
              <div className="pd-card__body" style={{ padding: appointments.length ? 0 : '24px' }}>
                {appointments.length === 0 && (
                  <div className="pd-empty">
                    <i className="fas fa-calendar-times"></i> No appointments yet. Create a new token to get started.
                  </div>
                )}
                {appointments.length > 0 && (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid #e5e7eb', textAlign: 'left' }}>
                          {['Token #','Date','Clinic','Doctor','Type','Symptoms','Fee','Payment','Status'].map(h => (
                            <th key={h} style={{ padding: '12px 16px', color: '#6b7a99', fontWeight: 600 }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {appointments.map((apt) => {
                          const sc = STATUS_COLORS[apt.status] || STATUS_COLORS.Pending;
                          const pc = PAYMENT_STATUS_COLORS[apt.paymentStatus] || PAYMENT_STATUS_COLORS.pending;
                          return (
                            <tr key={apt._id} style={{ borderBottom: '1px solid #f1f3f6' }}>
                              <td style={{ padding: '12px 16px', fontWeight: 600, color: '#1a2236' }}>
                                #{apt.tokenNumber}
                              </td>
                              <td style={{ padding: '12px 16px', color: '#374151' }}>
                                {formatDate(apt.createdAt)}
                              </td>
                              <td style={{ padding: '12px 16px', color: '#374151' }}>
                                {apt.clinicId?.name || '-'}
                              </td>
                              <td style={{ padding: '12px 16px', color: '#374151' }}>
                                {apt.doctor?.name ? `Dr. ${apt.doctor.name}` : 'Not yet assigned'}
                              </td>
                              <td style={{ padding: '12px 16px', color: '#374151', textTransform: 'capitalize' }}>
                                {apt.consultationType || '-'}
                              </td>
                              <td style={{ padding: '12px 16px', color: '#374151', maxWidth: '200px' }}>
                                {apt.symptoms || '-'}
                              </td>
                              <td style={{ padding: '12px 16px', color: '#374151' }}>
                                {apt.consultationFee ? `₹${apt.consultationFee}` : '-'}
                              </td>
                              <td style={{ padding: '12px 16px' }}>
                                <span style={{
                                  background: pc.bg, color: pc.text, padding: '4px 10px',
                                  borderRadius: '999px', fontSize: '12px', fontWeight: 600,
                                  textTransform: 'capitalize',
                                }}>
                                  {apt.paymentStatus || 'pending'}
                                </span>
                              </td>
                              <td style={{ padding: '12px 16px' }}>
                                <span style={{
                                  background: sc.bg, color: sc.text, padding: '4px 10px',
                                  borderRadius: '999px', fontSize: '12px', fontWeight: 600,
                                }}>
                                  {apt.status}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </main>
        </div>
      </div>

      {/* MODAL */}
      {showModal && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000, padding: '16px',
          }}
          onClick={closeModal}
        >
          <div
            style={{
              background: 'white', borderRadius: '16px', width: '100%', maxWidth: '460px',
              padding: '24px', boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
              maxHeight: '90vh', overflowY: 'auto',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* ── STEP 1: Details ─────────────────────────────────── */}
            {step === STEP_DETAILS && (
              <>
                <h3 style={{ margin: '0 0 4px', fontSize: '18px', fontWeight: 700, color: '#1a2236' }}>
                  Create New Token
                </h3>
                <p style={{ margin: '0 0 18px', fontSize: '13px', color: '#6b7a99' }}>
                  Choose a clinic and doctor, then pay the consultation fee to confirm your token.
                </p>

                <form onSubmit={handleDetailsSubmit}>
                  <div style={{ marginBottom: '14px' }}>
                    <label style={labelStyle}>Full Name *</label>
                    <input type="text" value={form.name}
                      onChange={e => handleFormChange('name', e.target.value)}
                      style={inputStyle} placeholder="Enter full name" />
                  </div>

                  <div style={{ display: 'flex', gap: '12px', marginBottom: '14px' }}>
                    <div style={{ flex: 1 }}>
                      <label style={labelStyle}>Age *</label>
                      <input type="number" min="0" max="120" value={form.age}
                        onChange={e => handleFormChange('age', e.target.value)}
                        style={inputStyle} placeholder="Age" />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={labelStyle}>Gender *</label>
                      <select value={form.gender}
                        onChange={e => handleFormChange('gender', e.target.value)}
                        style={inputStyle}>
                        <option value="">Select</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ marginBottom: '14px' }}>
                    <label style={labelStyle}>Symptoms *</label>
                    <textarea value={form.symptoms}
                      onChange={e => handleFormChange('symptoms', e.target.value)}
                      style={{ ...inputStyle, minHeight: '70px', resize: 'vertical' }}
                      placeholder="Describe what's bothering you" />
                  </div>

                  <div style={{ marginBottom: '14px' }}>
                    <label style={labelStyle}>Clinic *</label>
                    <select value={form.clinicId}
                      onChange={e => handleFormChange('clinicId', e.target.value)}
                      style={inputStyle}>
                      <option value="">Select a clinic</option>
                      {clinics.map(c => (
                        <option key={c._id} value={c._id}>{c.name}</option>
                      ))}
                    </select>
                    {clinics.length === 0 && (
                      <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#ef4444' }}>
                        No clinics available.
                      </p>
                    )}
                  </div>

                  {form.clinicId && (
                    <div style={{ marginBottom: '14px' }}>
                      <label style={labelStyle}>Doctor *</label>
                      {doctorsLoading ? (
                        <p style={{ fontSize: '13px', color: '#6b7a99', margin: 0 }}>
                          <i className="fas fa-spinner fa-spin"></i> Loading doctors...
                        </p>
                      ) : (
                        <>
                          <select value={form.doctorId}
                            onChange={e => handleFormChange('doctorId', e.target.value)}
                            style={inputStyle}>
                            <option value="">Select a doctor</option>
                            {doctors.map(doc => (
                              <option key={doc._id} value={doc._id}>
                                Dr. {doc.name} — {doc.department || 'General'} — ₹{doc.consultationFee || 0}
                              </option>
                            ))}
                          </select>
                          {doctors.length === 0 && (
                            <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#ef4444' }}>
                              No doctors available at this clinic yet.
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  )}

                  {form.doctorId && (
                    <div style={{ marginBottom: '18px' }}>
                      <label style={labelStyle}>Consultation Type *</label>
                      <div style={{ display: 'flex', gap: '10px' }}>
                        {['in-person', 'online'].map(type => (
                          <label key={type} style={{
                            flex: 1, display: 'flex', alignItems: 'center', gap: '8px',
                            padding: '10px 12px', borderRadius: '8px',
                            border: `1px solid ${form.consultationType === type ? '#2d6be4' : '#d1d5db'}`,
                            background: form.consultationType === type ? '#eff6ff' : 'white',
                            cursor: 'pointer', fontSize: '13px', color: '#374151',
                          }}>
                            <input type="radio" name="consultationType" value={type}
                              checked={form.consultationType === type}
                              onChange={e => handleFormChange('consultationType', e.target.value)} />
                            {type === 'in-person' ? 'In-Person' : 'Online'}
                          </label>
                        ))}
                      </div>
                      {selectedDoctor && (
                        <p style={{ margin: '8px 0 0', fontSize: '13px', color: '#374151' }}>
                          Consultation fee: <strong>₹{selectedDoctor.consultationFee || 0}</strong>{' '}
                          <span style={{ color: '#6b7a99' }}>(payable now to confirm your token)</span>
                        </p>
                      )}
                    </div>
                  )}

                  {formError && (
                    <div style={{
                      background: '#fee2e2', color: '#991b1b', padding: '10px 12px',
                      borderRadius: '8px', fontSize: '13px', marginBottom: '14px',
                    }}>
                      {formError}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button type="button" onClick={closeModal}
                      className="pd-btn pd-btn--outline" style={{ flex: 1 }}>
                      Cancel
                    </button>
                    <button type="submit" className="pd-btn pd-btn--primary" style={{ flex: 1 }}>
                      Continue to Payment
                    </button>
                  </div>
                </form>
              </>
            )}

            {/* ── STEP 2: Payment ─────────────────────────────────── */}
            {step === STEP_PAYMENT && (
              <>
                <h3 style={{ margin: '0 0 4px', fontSize: '18px', fontWeight: 700, color: '#1a2236' }}>
                  Confirm &amp; Pay
                </h3>
                <p style={{ margin: '0 0 18px', fontSize: '13px', color: '#6b7a99' }}>
                  This is a test payment screen. No real money will be charged.
                </p>

                <div style={{
                  background: '#f8fafc', border: '1px solid #e5e7eb',
                  borderRadius: '10px', padding: '14px', marginBottom: '18px',
                }}>
                  {[
                    ['Doctor',         `Dr. ${selectedDoctor?.name}`],
                    ['Specialization', selectedDoctor?.department || 'General'],
                    ['Consultation',   form.consultationType],
                  ].map(([label, val]) => (
                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                      <span style={{ color: '#6b7a99' }}>{label}</span>
                      <span style={{ color: '#1a2236', fontWeight: 600, textTransform: 'capitalize' }}>{val}</span>
                    </div>
                  ))}
                  <div style={{
                    display: 'flex', justifyContent: 'space-between', fontSize: '15px',
                    fontWeight: 700, color: '#1a2236', marginTop: '10px',
                    paddingTop: '10px', borderTop: '1px solid #e5e7eb',
                  }}>
                    <span>Amount to pay</span>
                    <span>₹{selectedDoctor?.consultationFee || 0}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
                  {[{ id: 'card', label: 'Card' }, { id: 'upi', label: 'UPI' }].map(m => (
                    <button key={m.id} type="button"
                      onClick={() => { setPayMethod(m.id); setPayError(''); }}
                      style={{
                        flex: 1, padding: '8px 10px', borderRadius: '8px', fontSize: '13px',
                        fontWeight: 600, cursor: 'pointer',
                        border: `1px solid ${payMethod === m.id ? '#2d6be4' : '#d1d5db'}`,
                        background: payMethod === m.id ? '#2d6be4' : 'white',
                        color: payMethod === m.id ? 'white' : '#374151',
                      }}>
                      {m.label}
                    </button>
                  ))}
                </div>

                {payMethod === 'card' && (
                  <>
                    <div style={{ marginBottom: '14px' }}>
                      <label style={labelStyle}>Card Number</label>
                      <input type="text" value={cardNumber}
                        onChange={e => setCardNumber(e.target.value)}
                        style={inputStyle} placeholder="4242 4242 4242 4242" maxLength={19} />
                    </div>
                    <div style={{ display: 'flex', gap: '12px', marginBottom: '14px' }}>
                      <div style={{ flex: 1 }}>
                        <label style={labelStyle}>Expiry</label>
                        <input type="text" value={cardExpiry}
                          onChange={e => setCardExpiry(e.target.value)}
                          style={inputStyle} placeholder="MM/YY" maxLength={5} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={labelStyle}>CVV</label>
                        <input type="text" value={cardCvv}
                          onChange={e => setCardCvv(e.target.value)}
                          style={inputStyle} placeholder="123" maxLength={3} />
                      </div>
                    </div>
                  </>
                )}

                {payMethod === 'upi' && (
                  <div style={{ marginBottom: '14px' }}>
                    <label style={labelStyle}>UPI ID</label>
                    <input type="text" value={upiId}
                      onChange={e => setUpiId(e.target.value)}
                      style={inputStyle} placeholder="yourname@upi" />
                  </div>
                )}

                {payError && (
                  <div style={{
                    background: '#fee2e2', color: '#991b1b', padding: '10px 12px',
                    borderRadius: '8px', fontSize: '13px', marginBottom: '14px',
                  }}>
                    {payError}
                  </div>
                )}

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button type="button" onClick={() => setStep(STEP_DETAILS)}
                    disabled={paying || submitting}
                    className="pd-btn pd-btn--outline" style={{ flex: 1 }}>
                    Back
                  </button>
                  <button type="button" onClick={handleConfirmPayment}
                    disabled={paying || submitting}
                    className="pd-btn pd-btn--primary" style={{ flex: 1 }}>
                    {paying || submitting ? 'Processing...' : `Pay ₹${selectedDoctor?.consultationFee || 0}`}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const labelStyle = {
  display: 'block', fontSize: '13px', fontWeight: 600,
  color: '#374151', marginBottom: '6px',
};

const inputStyle = {
  width: '100%', padding: '10px 12px', borderRadius: '8px',
  border: '1px solid #d1d5db', fontSize: '14px',
  fontFamily: 'inherit', boxSizing: 'border-box',
};