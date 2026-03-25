import React, { useState, useEffect } from 'react';
import api from '../api';

const FREQ_LABELS = { weekly: 'Weekly', biweekly: 'Bi-weekly', monthly: 'Monthly' };
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function Jobs({ user }) {
  const [contracts, setContracts] = useState([]);
  const [filter, setFilter] = useState('active');
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    api.getContracts().then(setContracts).catch(console.error);
  }, []);

  const filtered = contracts.filter(c => {
    if (filter === 'active') return c.active;
    if (filter === 'inactive') return !c.active;
    return true;
  });

  const weekly = filtered.filter(c => c.frequency === 'weekly' || c.frequency === 'biweekly');
  const monthly = filtered.filter(c => c.frequency === 'monthly');

  const handleToggle = async (id) => {
    try {
      await api.toggleContract(id);
      const updated = await api.getContracts();
      setContracts(updated);
    } catch (err) {
      alert('Failed to toggle contract');
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>Contracts</h1>
        <button className="btn btn-gold btn-sm" onClick={() => setShowModal(true)}>+ New</button>
      </div>

      <div className="filter-pills">
        {['active', 'all', 'inactive'].map(f => (
          <button
            key={f}
            className={`filter-pill ${filter === f ? 'active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {weekly.length > 0 && (
        <>
          <div className="section-divider">
            <h2>Weekly</h2>
            <span className="count">{weekly.length}</span>
          </div>
          {weekly.map(c => (
            <ContractCard key={c.id} contract={c} onToggle={handleToggle} />
          ))}
        </>
      )}

      {monthly.length > 0 && (
        <>
          <div className="section-divider">
            <h2>Monthly</h2>
            <span className="count">{monthly.length}</span>
          </div>
          {monthly.map(c => (
            <ContractCard key={c.id} contract={c} onToggle={handleToggle} />
          ))}
        </>
      )}

      {filtered.length === 0 && (
        <div className="empty-state">No contracts found</div>
      )}

      {showModal && (
        <AddContractModal
          onClose={() => setShowModal(false)}
          onSaved={() => {
            api.getContracts().then(setContracts);
            setShowModal(false);
          }}
        />
      )}
    </div>
  );
}

function ContractCard({ contract, onToggle }) {
  const c = contract;
  const scheduleText = c.frequency === 'monthly'
    ? `${FREQ_LABELS[c.frequency]} - Day ${c.day_of_month}`
    : `${FREQ_LABELS[c.frequency]} - ${DAY_NAMES[c.day_of_week] || ''}`;

  return (
    <div className="card job" style={{ opacity: c.active ? 1 : 0.5 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div className="task-info">
          <div className="client">
            {c.client_name}
            <span className={`tag ${c.frequency === 'monthly' ? 'monthly' : 'weekly'}`}>
              {FREQ_LABELS[c.frequency]}
            </span>
          </div>
          <div className="description">{c.description}</div>
          <div className="meta">
            <span>{scheduleText}</span>
            {c.assigned_user_name && <span>{c.assigned_user_name}</span>}
          </div>
        </div>
        <button
          className={`btn btn-sm ${c.active ? 'btn-outline' : 'btn-primary'}`}
          onClick={() => onToggle(c.id)}
        >
          {c.active ? 'Pause' : 'Activate'}
        </button>
      </div>
    </div>
  );
}

function AddContractModal({ onClose, onSaved }) {
  const [clients, setClients] = useState([]);
  const [users, setUsers] = useState([]);
  const [clientId, setClientId] = useState('');
  const [description, setDescription] = useState('');
  const [frequency, setFrequency] = useState('weekly');
  const [dayOfWeek, setDayOfWeek] = useState('1');
  const [dayOfMonth, setDayOfMonth] = useState('1');
  const [assignedUserId, setAssignedUserId] = useState('');

  useEffect(() => {
    Promise.all([api.getClients(), api.getUsers()])
      .then(([c, u]) => { setClients(c); setUsers(u); })
      .catch(console.error);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.createContract({
        client_id: parseInt(clientId),
        description,
        frequency,
        day_of_week: frequency !== 'monthly' ? parseInt(dayOfWeek) : null,
        day_of_month: frequency === 'monthly' ? parseInt(dayOfMonth) : null,
        assigned_user_id: assignedUserId ? parseInt(assignedUserId) : null,
      });
      onSaved();
    } catch (err) {
      alert('Failed to create contract: ' + err.message);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>New Contract</h3>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Client</label>
            <select value={clientId} onChange={e => setClientId(e.target.value)} required>
              <option value="">-- Select client --</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Description</label>
            <input value={description} onChange={e => setDescription(e.target.value)} required placeholder="Lawn mowing, maintenance, etc." />
          </div>
          <div className="form-group">
            <label>Frequency</label>
            <select value={frequency} onChange={e => setFrequency(e.target.value)}>
              <option value="weekly">Weekly</option>
              <option value="biweekly">Bi-weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
          {frequency !== 'monthly' ? (
            <div className="form-group">
              <label>Day of Week</label>
              <select value={dayOfWeek} onChange={e => setDayOfWeek(e.target.value)}>
                {['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'].map((d, i) => (
                  <option key={i} value={i}>{d}</option>
                ))}
              </select>
            </div>
          ) : (
            <div className="form-group">
              <label>Day of Month</label>
              <select value={dayOfMonth} onChange={e => setDayOfMonth(e.target.value)}>
                {Array.from({ length: 31 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>{i + 1}</option>
                ))}
              </select>
            </div>
          )}
          <div className="form-group">
            <label>Assign To</label>
            <select value={assignedUserId} onChange={e => setAssignedUserId(e.target.value)}>
              <option value="">-- Unassigned --</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>
          <button type="submit" className="btn btn-primary btn-block">Create Contract</button>
        </form>
      </div>
    </div>
  );
}
