// hms-react/src/pages/Equipment.jsx
import React, { useEffect, useState } from 'react';
import inventoryService from '../services/inventoryService';
import vendorService from '../services/vendorService';

const conditionOptions = ['Excellent', 'Good', 'Fair', 'Poor', 'Under Repair', 'Decommissioned'];
const maintenanceTypeOptions = ['Routine', 'Repair', 'Calibration', 'Emergency'];

export default function Equipment() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCondition, setFilterCondition] = useState('');
  const [dueMaintenance, setDueMaintenance] = useState([]);
  const [overdueMaintenance, setOverdueMaintenance] = useState([]);
  const [maintenanceModal, setMaintenanceModal] = useState(null);
  const [maintenanceForm, setMaintenanceForm] = useState({ type: 'Routine', performedBy: '', cost: 0, notes: '', nextDueDate: '' });
  const [conditionModal, setConditionModal] = useState(null);
  const [conditionForm, setConditionForm] = useState({ condition: '', assignedTo: '', status: '' });
  const [historyModal, setHistoryModal] = useState(null);
  const [historyData, setHistoryData] = useState(null);
  const [vendors, setVendors] = useState([]);

  useEffect(() => {
    fetchEquipment();
    fetchDueMaintenance();
    fetchVendors();
  }, []);

  const fetchEquipment = async () => {
    setLoading(true);
    try {
      let params = {};
      if (search) params.search = search;
      if (filterCondition) params.condition = filterCondition;
      const { data } = await inventoryService.getEquipment(params);
      setItems(data.items);
    } finally { setLoading(false); }
  };

  const fetchDueMaintenance = async () => {
    try {
      const [due, overdue] = await Promise.all([
        inventoryService.getDueMaintenance(),
        inventoryService.getOverdueMaintenance()
      ]);
      setDueMaintenance(due.data);
      setOverdueMaintenance(overdue.data);
    } catch {}
  };

  const fetchVendors = async () => {
    try {
      const { data } = await vendorService.getActiveVendors();
      setVendors(data);
    } catch {}
  };

  const handleLogMaintenance = async (e) => {
    e.preventDefault();
    try {
      await inventoryService.logMaintenance(maintenanceModal._id, maintenanceForm);
      setMaintenanceModal(null);
      setMaintenanceForm({ type: 'Routine', performedBy: '', cost: 0, notes: '', nextDueDate: '' });
      fetchEquipment();
      fetchDueMaintenance();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to log maintenance');
    }
  };

  const handleUpdateCondition = async (e) => {
    e.preventDefault();
    try {
      await inventoryService.updateEquipmentCondition(conditionModal._id, conditionForm);
      setConditionModal(null);
      fetchEquipment();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update condition');
    }
  };

  const handleViewHistory = async (item) => {
    try {
      const { data } = await inventoryService.getMaintenanceHistory(item._id);
      setHistoryData(data);
      setHistoryModal(item);
    } catch (err) {
      alert('Failed to load maintenance history');
    }
  };

  const getConditionBadge = (condition) => {
    const colors = {
      Excellent: '#d1fae5', Good: '#dbeafe', Fair: '#fef3c7',
      Poor: '#fee2e2', 'Under Repair': '#fef08a', Decommissioned: '#e2e8f0'
    };
    return <span className="badge" style={{ background: colors[condition] || '#f1f5f9' }}>{condition}</span>;
  };

  const getMaintenanceStatus = (item) => {
    if (!item.equipmentDetails?.nextMaintenanceDate) return null;
    const today = new Date();
    const nextDate = new Date(item.equipmentDetails.nextMaintenanceDate);
    const daysUntil = Math.ceil((nextDate - today) / (1000 * 60 * 60 * 24));
    if (daysUntil < 0) return <span className="badge badge-danger">Overdue</span>;
    if (daysUntil <= 7) return <span className="badge badge-warning">Due in {daysUntil}d</span>;
    return <span className="badge badge-success">OK</span>;
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Equipment Tracking</h1>
        <button className="btn btn-primary" onClick={() => window.location.href = '/inventory'}>+ Add Equipment</button>
      </div>

      {/* Maintenance Alerts */}
      {(dueMaintenance.length > 0 || overdueMaintenance.length > 0) && (
        <div className="card" style={{ marginBottom: 20, background: overdueMaintenance.length > 0 ? '#fef2f2' : '#fffbeb' }}>
          <h3 style={{ fontSize: 14, marginBottom: 12 }}>⚠️ Maintenance Alerts</h3>
          {overdueMaintenance.map(item => (
            <div key={item._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
              <div><strong>{item.name}</strong><br/><span className="text-muted text-small">Due: {new Date(item.equipmentDetails?.nextMaintenanceDate).toLocaleDateString()}</span></div>
              <button className="btn btn-sm btn-danger" onClick={() => { setMaintenanceModal(item); setMaintenanceForm({ type: 'Routine', performedBy: '', cost: 0, notes: '', nextDueDate: '' }); }}>Log Maintenance</button>
            </div>
          ))}
          {dueMaintenance.map(item => (
            <div key={item._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
              <div><strong>{item.name}</strong><br/><span className="text-muted text-small">Due: {new Date(item.equipmentDetails?.nextMaintenanceDate).toLocaleDateString()}</span></div>
              <button className="btn btn-sm btn-warning" onClick={() => { setMaintenanceModal(item); setMaintenanceForm({ type: 'Routine', performedBy: '', cost: 0, notes: '', nextDueDate: '' }); }}>Schedule Maintenance</button>
            </div>
          ))}
        </div>
      )}

      {/* Equipment Table */}
      <div className="card">
        <div className="filter-bar">
          <div className="search-wrap">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input className="search-input" placeholder="Search equipment..." value={search} onChange={e => { setSearch(e.target.value); fetchEquipment(); }} />
          </div>
          <select className="form-control" value={filterCondition} onChange={e => { setFilterCondition(e.target.value); fetchEquipment(); }} style={{ width: 160 }}>
            <option value="">All Conditions</option>
            {conditionOptions.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>

        {loading ? <div className="spinner" /> : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr><th>Item ID</th><th>Name</th><th>Serial Number</th><th>Model</th><th>Condition</th><th>Assigned To</th><th>Maintenance</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {items.length === 0 ? (<tr><td colSpan="8" className="empty-state">No equipment found</td></tr>) : items.map(item => (
                  <tr key={item._id}>
                    <td><strong style={{ color: 'var(--primary)' }}>{item.itemCode}</strong></td>
                    <td><strong>{item.name}</strong><br/><span className="text-muted text-small">{item.location || '—'}</span></td>
                    <td>{item.equipmentDetails?.serialNumber || '—'}</td>
                    <td>{item.equipmentDetails?.modelNumber || '—'}<br/><span className="text-muted text-small">{item.equipmentDetails?.manufacturer}</span></td>
                    <td>{getConditionBadge(item.equipmentDetails?.condition)}</td>
                    <td>{item.equipmentDetails?.assignedTo || '—'}</td>
                    <td>{getMaintenanceStatus(item)}</td>
                    <td>
                      <div className="flex gap-2">
                        <button className="btn btn-sm btn-outline" onClick={() => handleViewHistory(item)}>History</button>
                        <button className="btn btn-sm btn-success" onClick={() => { setMaintenanceModal(item); setMaintenanceForm({ type: 'Routine', performedBy: '', cost: 0, notes: '', nextDueDate: '' }); }}>Maintenance</button>
                        <button className="btn btn-sm btn-outline" onClick={() => { setConditionModal(item); setConditionForm({ condition: item.equipmentDetails?.condition || 'Good', assignedTo: item.equipmentDetails?.assignedTo || '', status: item.status }); }}>Update</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Maintenance Modal */}
      {maintenanceModal && (
        <div className="modal-overlay" onClick={() => setMaintenanceModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h3 className="modal-title">Log Maintenance - {maintenanceModal.name}</h3><button className="modal-close" onClick={() => setMaintenanceModal(null)}>×</button></div>
            <form onSubmit={handleLogMaintenance}>
              <div className="modal-body">
                <div className="form-row"><div className="form-group"><label className="form-label">Maintenance Type</label><select className="form-control" value={maintenanceForm.type} onChange={e => setMaintenanceForm({...maintenanceForm, type: e.target.value})}>{maintenanceTypeOptions.map(t => <option key={t}>{t}</option>)}</select></div>
                <div className="form-group"><label className="form-label">Performed By</label><input className="form-control" value={maintenanceForm.performedBy} onChange={e => setMaintenanceForm({...maintenanceForm, performedBy: e.target.value})} placeholder="Engineer name" /></div></div>
                <div className="form-row"><div className="form-group"><label className="form-label">Cost (₹)</label><input className="form-control" type="number" value={maintenanceForm.cost} onChange={e => setMaintenanceForm({...maintenanceForm, cost: e.target.value})} /></div>
                <div className="form-group"><label className="form-label">Next Due Date</label><input className="form-control" type="date" value={maintenanceForm.nextDueDate} onChange={e => setMaintenanceForm({...maintenanceForm, nextDueDate: e.target.value})} /></div></div>
                <div className="form-group"><label className="form-label">Notes</label><textarea className="form-control" rows={3} value={maintenanceForm.notes} onChange={e => setMaintenanceForm({...maintenanceForm, notes: e.target.value})} placeholder="Work performed, parts replaced, etc." /></div>
              </div>
              <div className="modal-footer"><button type="button" className="btn btn-ghost" onClick={() => setMaintenanceModal(null)}>Cancel</button><button type="submit" className="btn btn-primary">Log Maintenance</button></div>
            </form>
          </div>
        </div>
      )}

      {/* Condition Update Modal */}
      {conditionModal && (
        <div className="modal-overlay" onClick={() => setConditionModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h3 className="modal-title">Update Equipment - {conditionModal.name}</h3><button className="modal-close" onClick={() => setConditionModal(null)}>×</button></div>
            <form onSubmit={handleUpdateCondition}>
              <div className="modal-body">
                <div className="form-group"><label className="form-label">Condition</label><select className="form-control" value={conditionForm.condition} onChange={e => setConditionForm({...conditionForm, condition: e.target.value})}>{conditionOptions.map(c => <option key={c}>{c}</option>)}</select></div>
                <div className="form-group"><label className="form-label">Assigned To (Ward/Department)</label><input className="form-control" value={conditionForm.assignedTo} onChange={e => setConditionForm({...conditionForm, assignedTo: e.target.value})} placeholder="e.g., ICU Ward, OT-2" /></div>
                <div className="form-group"><label className="form-label">Status</label><select className="form-control" value={conditionForm.status} onChange={e => setConditionForm({...conditionForm, status: e.target.value})}><option>Active</option><option>Inactive</option><option>Discontinued</option></select></div>
              </div>
              <div className="modal-footer"><button type="button" className="btn btn-ghost" onClick={() => setConditionModal(null)}>Cancel</button><button type="submit" className="btn btn-primary">Update</button></div>
            </form>
          </div>
        </div>
      )}

      {/* Maintenance History Modal */}
      {historyModal && historyData && (
        <div className="modal-overlay" onClick={() => setHistoryModal(null)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h3 className="modal-title">Maintenance History - {historyData.item?.name}</h3><button className="modal-close" onClick={() => setHistoryModal(null)}>×</button></div>
            <div className="modal-body">
              <div className="stat-grid" style={{ marginBottom: 16 }}>
                <div className="stat-card"><div className="stat-label">Last Maintenance</div><div className="stat-value">{historyData.lastMaintenanceDate ? new Date(historyData.lastMaintenanceDate).toLocaleDateString() : '—'}</div></div>
                <div className="stat-card"><div className="stat-label">Next Due</div><div className="stat-value">{historyData.nextMaintenanceDate ? new Date(historyData.nextMaintenanceDate).toLocaleDateString() : '—'}</div></div>
              </div>
              {historyData.maintenanceLogs?.length === 0 ? (<div className="empty-state">No maintenance records</div>) : (
                <div className="table-wrapper">
                  <table><thead><tr><th>Date</th><th>Type</th><th>Performed By</th><th>Cost</th><th>Notes</th><th>Next Due</th></tr></thead>
                  <tbody>{historyData.maintenanceLogs.map((log, i) => (<tr key={i}><td>{new Date(log.date).toLocaleDateString()}</td><td><span className="badge badge-info">{log.type}</span></td><td>{log.performedBy}</td><td>₹{log.cost}</td><td>{log.notes}</td><td>{log.nextDueDate ? new Date(log.nextDueDate).toLocaleDateString() : '—'}</td></tr>))}</tbody></table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}