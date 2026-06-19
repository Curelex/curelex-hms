// hms-react/src/context/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import API from '../utils/api';

const AuthContext = createContext();

// ── Role → nav section permissions ───────────────────────────────────────────
const ROLE_PERMISSIONS = {
  admin: [
    'dashboard', 'patients', 'ipd', 'billing',
    'pharmacy', 'lab', 'inventory', 'staff', 'room-settings',
  ],
  doctor: [
    'dashboard', 'patients', 'ipd', 'lab',
  ],
  nurse: [
    'dashboard', 'patients', 'ipd',
  ],
  receptionist: [
    'dashboard', 'patients', 'billing', 'tokens',
  ],
  pharmacist: [
    'dashboard', 'pharmacy', 'inventory',
  ],
  lab_technician: [
    'dashboard', 'patients', 'lab',
  ],
  patient: [
    'patient-dashboard', 'appointments', 'prescriptions', 'profile',
  ],
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(false);
  const [authReady, setAuthReady] = useState(false);

  // On app load: restore session from token
  useEffect(() => {
    const token = localStorage.getItem('hms_token');
    if (!token) {
      setAuthReady(true);
      return;
    }
    API.get('/auth/profile')
      .then(({ data }) => {
        setUser(data.user || data);
        if (data.patient) {
          setPatient(data.patient);
        }
      })
      .catch(() => {
        localStorage.removeItem('hms_token');
        localStorage.removeItem('user');
        setUser(null);
        setPatient(null);
      })
      .finally(() => {
        setAuthReady(true);
      });
  }, []);

  // ── Login ─────────────────────────────────────────────────────────────────
  const login = async (email, password) => {
    setLoading(true);
    try {
      const { data } = await API.post('/auth/login', { email, password });
      console.log('LOGIN RESPONSE:', data);
      
      localStorage.setItem('hms_token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      
      setUser(data.user);
      if (data.patient) {
        setPatient(data.patient);
        localStorage.setItem('patient', JSON.stringify(data.patient));
      }
      
      return { success: true, user: data.user, patient: data.patient };
    } catch (err) {
      return { 
        success: false, 
        message: err.response?.data?.message || 'Login failed' 
      };
    } finally {
      setLoading(false);
    }
  };

  // ── Register (Staff) ──────────────────────────────────────────────────────
  const register = async (formData) => {
    setLoading(true);
    try {
      const { data } = await API.post('/auth/register', formData);
      localStorage.setItem('hms_token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      setUser(data.user);
      return { success: true };
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Registration failed' };
    } finally {
      setLoading(false);
    }
  };

  // ── Patient Registration ──────────────────────────────────────────────────
  const registerPatient = async (formData) => {
    setLoading(true);
    try {
      const patientData = {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        phone: formData.phone || '',
        clinicName: formData.clinicName,
        dob: formData.dob || null,
        age: formData.age || null,
        gender: formData.gender || null,
        bloodGroup: formData.bloodGroup || null,
        address: formData.address || '',
        city: formData.city || '',
        state: formData.state || '',
        pincode: formData.pincode || '',
        emergencyContact: formData.emergencyContact || '',
        emergencyName: formData.emergencyName || '',
        emergencyRelation: formData.emergencyRelation || '',
        allergies: formData.allergies || '',
        chronicConditions: formData.chronicConditions || '',
        currentMedications: formData.currentMedications || '',
        medicalHistory: formData.medicalHistory || '',
        notes: formData.notes || '',
        assignedDoctor: formData.assignedDoctor || null,
      };
      
      const { data } = await API.post('/auth/register-patient', patientData);
      
      return { success: true, data };
    } catch (err) {
      return { 
        success: false, 
        message: err.response?.data?.message || 'Registration failed' 
      };
    } finally {
      setLoading(false);
    }
  };

  // ── Logout ────────────────────────────────────────────────────────────────
  const logout = () => {
    localStorage.removeItem('hms_token');
    localStorage.removeItem('user');
    localStorage.removeItem('patient');
    setUser(null);
    setPatient(null);
  };

  // ── Permission check ──────────────────────────────────────────────────────
  const hasPerm = (key) => {
    if (!user) return false;

    const role = user.role?.toLowerCase();

    // Admin sees everything
    if (role === 'admin') return true;

    // Check role-based nav permissions
    const roleNavPerms = ROLE_PERMISSIONS[role];
    if (roleNavPerms) return roleNavPerms.includes(key);

    return Array.isArray(user.permissions) && user.permissions.includes(key);
  };

  // ── Patient helper methods ──────────────────────────────────────────────
  const isPatient = () => {
    return user?.role === 'patient';
  };

  const isDoctor = () => {
    return user?.role?.toLowerCase() === 'doctor';
  };

  const isAdmin = () => {
    return user?.role?.toLowerCase() === 'admin';
  };

  const isStaff = () => {
    if (!user) return false;
    return user?.role !== 'patient';
  };

  const getUserId = () => {
    return user?.id || user?._id || null;
  };

  const getUserName = () => {
    return user?.name || user?.fullName || 'User';
  };

  const getUserEmail = () => {
    return user?.email || '';
  };

  const getUserRole = () => {
    return user?.role || null;
  };

  const isAuthenticated = () => {
    return !!user;
  };

  const getPatientData = () => {
    return patient || null;
  };

  if (!authReady) return null;

  return (
    <AuthContext.Provider value={{ 
      user, 
      patient,
      login, 
      register, 
      logout, 
      loading, 
      hasPerm,
      
      isPatient,
      isDoctor,
      isAdmin,
      isStaff,
      getUserId,
      getUserName,
      getUserEmail,
      getUserRole,
      isAuthenticated,
      getPatientData,
      
      registerPatient,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);