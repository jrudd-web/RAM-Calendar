import React, { useState, useEffect, useCallback } from 'react';
import api from '../api';

function formatDate(date) {
  return date.toISOString().split('T')[0];
}

function formatDisplay(date) {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });
}

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

export default function DailyView({ user }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [data, setData] = useState({ appointments: [], jobs: [], unbilled_count: 0 });
  const [showAddModal, setShowAddModal] = useState(false);
  const [addType, setAddType] = useState('appointment');
  const [selectedAppt, setSelectedAppt] = useState(null);

  const dateStr = formatDate(currentDate);

  const loadDay = useCallback(async () => {
    try {
      // Generate jobs from contracts first, then load
      await api.generateJobs(dateStr);
      const result = await api.getDaily(dateStr);
      setData(result);
    } catch (err) {
      console.error('Failed to load daily view:', err);
    }
  }, [dateStr]);

  useEffect(() => { loadDay(); }, [loadDay]);

  const prevDay = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() - 1);
    setCurrentDate(d);
  };

  const nextDay = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + 1);
    setCurrentDate(d);
  };

  const handleCompleteJob = async (jobId) => {
    try {
      await api.completeJob(jobId);
      loadDay();
    } catch (err) {
      alert('Failed to complete job: ' + err.message);
    }
  };

  const pendingJobs = data.jobs.filter(j => j.status === 'pending');
  const completedJobs = data.jobs.filter(j => j.status === 'complete');

  return (
    <div>
      {/* Date header */}
      <div className="page-header">
        <div className="date-nav">
          <button onClick={prevDay}>&larr;</button>
          <span className="current-date">{formatDisplay(currentDate)}</span>
          <button onClick={nextDay}>&rarr;</button>
        </div>
      </div>

      {/* Appointments section */}
      <div className="section-divider">
        <h2>Appointments</h2>
        <span className="count">{data.appointments.length}</span>
      </div>

      <div className="scroll-section">
        {data.appointments.length === 0 ? (
          <div className="empty-state">No appointments today</div>
        ) : (
          data.appointments.map(appt => (
            <div
              key={appt.id}
              className={`card appointment ${appt.completed_at ? 'complete' : ''}`}
              onClick={() => !appt.completed_at && setSelectedAppt(appt)}
              style={{ cursor: appt.completed_at ? 'default' : 'pointer' }}
            >
              <div style={{ display: 'flex' }}>
                <div className="timeline-bar" />
                <div>
                  <div className="appt-time">
                    {formatTime(appt.start_time)} - {formatTime(appt.end_time)}
                  </div>
                  <div className="appt-title">{appt.title}</div>
                  {appt.client_name && (
                    <div className="appt-client">{appt.client_name}</div>
                  )}
                  {appt.notes && (
                    <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>
                      {appt.notes}
                    </div>
                  )}
                  {appt.completed_at && appt.appointment_notes && (
                    <div style={{ fontSize: 12, color: '#27ae60', marginTop: 4, fontStyle: 'italic' }}>
                      Notes: {appt.appointment_notes}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Tasks section - heavy Franklin divider */}
      <div className="section-divider">
        <h2>Tasks</h2>
        <span className={`count ${pendingJobs.length > 0 ? '' : ''}`}>
          {pendingJobs.length}
        </span>
      </div>

      <div className="scroll-section">
        {pendingJobs.length === 0 && completedJobs.length === 0 ? (
          <div className="empty-state">No tasks for today</div>
        ) : (
          <>
            {pendingJobs.map(job => (
              <div key={job.id} className={`card ${job.is_rollover ? 'rollover' : 'job'} ${job.type === 'quote' ? 'quote' : ''}`}>
                <div className="task-row">
                  <div
                    className="task-checkbox"
                    onClick={() => handleCompleteJob(job.id)}
                  >
                  </div>
                  <div className="task-info">
                    <div className="client">
                      {job.client_name}
                      {job.is_rollover && <span className="tag rollover">Rollover</span>}
                      {job.type === 'quote' && <span className="tag quote">Quote</span>}
                      {job.type === 'estimate' && <span className="tag quote">Estimate</span>}
                    </div>
                    <div className="description">{job.description}</div>
                    <div className="meta">
                      {job.assigned_user_name && <span>{job.assigned_user_name}</span>}
                      {job.is_rollover && (
                        <span style={{ color: '#c0392b' }}>
                          From {new Date(job.scheduled_date).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {completedJobs.length > 0 && (
              <>
                <div style={{ padding: '8px 20px', fontSize: 11, color: '#999', textTransform: 'uppercase', letterSpacing: 1 }}>
                  Completed ({completedJobs.length})
                </div>
                {completedJobs.map(job => (
                  <div key={job.id} className="card complete">
                    <div className="task-row">
                      <div className="task-checkbox checked">&#10003;</div>
                      <div className="task-info">
                        <div className="client" style={{ textDecoration: 'line-through' }}>
                          {job.client_name}
                        </div>
                        <div className="description">{job.description}</div>
                        <div className="meta">
                          <span>Done by {job.completed_by_name}</span>
                          <span>{new Date(job.completed_at).toLocaleTimeString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )}
          </>
        )}
      </div>

      {/* FAB menu - two buttons for appointment and task */}
      <div className="fab-group">
        <button
          className="fab fab-secondary"
          onClick={() => { setAddType('job'); setShowAddModal(true); }}
          title="Add Task"
        >
          &#9745;
        </button>
        <button
          className="fab fab-primary"
          onClick={() => { setAddType('appointment'); setShowAddModal(true); }}
          title="Add Appointment"
        >
          +
        </button>
      </div>

      {/* Add Modal - supports both appointment and task */}
      {showAddModal && (
        <AddModal
          date={dateStr}
          userId={user.id}
          initialType={addType}
          onClose={() => setShowAddModal(false)}
          onSaved={loadDay}
        />
      )}

      {/* Complete Appointment Modal */}
      {selectedAppt && (
        <CompleteAppointmentModal
          appointment={selectedAppt}
          onClose={() => setSelectedAppt(null)}
          onSaved={loadDay}
        />
      )}
    </div>
  );
}

function AddModal({ date, userId, initialType, onClose, onSaved }) {
  const [type, setType] = useState(initialType || 'appointment');
  const [title, setTitle] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [notes, setNotes] = useState('');
  const [clients, setClients] = useState([]);
  const [users, setUsers] = useState([]);
  const [clientId, setClientId] = useState('');
  const [assignedUserId, setAssignedUserId] = useState(userId.toString());
  const [description, setDescription] = useState('');
  const [showNewClient, setShowNewClient] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientAddress, setNewClientAddress] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [newClientEmail, setNewClientEmail] = useState('');

  const loadClients = () => {
    api.getClients().then(setClients).catch(() => {});
  };

  useEffect(() => {
    loadClients();
    api.getUsers().then(setUsers).catch(() => {});
  }, []);

  const handleClientChange = (val) => {
    if (val === '__new__') {
      setShowNewClient(true);
      setClientId('');
    } else {
      setShowNewClient(false);
      setClientId(val);
    }
  };

  const handleAddClient = async () => {
    if (!newClientName.trim()) {
      alert('Client name is required');
      return;
    }
    try {
      const newClient = await api.createClient({
        name: newClientName.trim(),
        address: newClientAddress.trim(),
        phone: newClientPhone.trim(),
        email: newClientEmail.trim(),
      });
      setClients(prev => [...prev, newClient].sort((a, b) => a.name.localeCompare(b.name)));
      setClientId(newClient.id.toString());
      setShowNewClient(false);
      setNewClientName('');
      setNewClientAddress('');
      setNewClientPhone('');
      setNewClientEmail('');
    } catch (err) {
      alert('Failed to create client: ' + err.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (type === 'appointment') {
        await api.createAppointment({
          user_id: userId,
          client_id: clientId || null,
          title,
          start_time: `${date}T${startTime}:00`,
          end_time: `${date}T${endTime}:00`,
          notes,
        });
      } else {
        await api.createJob({
          client_id: clientId || null,
          description,
          assigned_user_id: parseInt(assignedUserId),
          scheduled_date: date,
        });
      }
      onSaved();
      onClose();
    } catch (err) {
      alert('Failed to save: ' + err.message);
    }
  };

  const clientSelect = (
    <div className="form-group">
      <label>Client</label>
      <select value={showNewClient ? '__new__' : clientId} onChange={e => handleClientChange(e.target.value)}>
        <option value="">-- No client --</option>
        {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        <option value="__new__">+ Add New Client</option>
      </select>
    </div>
  );

  const newClientForm = showNewClient && (
    <div style={{ background: '#f9f6ef', border: '2px solid #c8a84e', borderRadius: 6, padding: 12, marginBottom: 14 }}>
      <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: '#8a6d1b', marginBottom: 8 }}>
        New Client
      </div>
      <div className="form-group">
        <label>Name *</label>
        <input value={newClientName} onChange={e => setNewClientName(e.target.value)} placeholder="Client name" />
      </div>
      <div className="form-group">
        <label>Address</label>
        <input value={newClientAddress} onChange={e => setNewClientAddress(e.target.value)} placeholder="Street address" />
      </div>
      <div style={{ display: 'flex', gap: 12 }}>
        <div className="form-group" style={{ flex: 1 }}>
          <label>Phone</label>
          <input value={newClientPhone} onChange={e => setNewClientPhone(e.target.value)} placeholder="Phone" />
        </div>
        <div className="form-group" style={{ flex: 1 }}>
          <label>Email</label>
          <input value={newClientEmail} onChange={e => setNewClientEmail(e.target.value)} placeholder="Email" />
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="button" className="btn btn-gold btn-sm" onClick={handleAddClient}>Save Client</button>
        <button type="button" className="btn btn-outline btn-sm" onClick={() => setShowNewClient(false)}>Cancel</button>
      </div>
    </div>
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Add to Today</h3>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>

        <div className="filter-pills" style={{ padding: '0 0 16px' }}>
          <button className={`filter-pill ${type === 'appointment' ? 'active' : ''}`} onClick={() => setType('appointment')}>
            Appointment
          </button>
          <button className={`filter-pill ${type === 'job' ? 'active' : ''}`} onClick={() => setType('job')}>
            Task
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {type === 'appointment' ? (
            <>
              <div className="form-group">
                <label>Title</label>
                <input value={title} onChange={e => setTitle(e.target.value)} required />
              </div>
              {clientSelect}
              {newClientForm}
              <div style={{ display: 'flex', gap: 12 }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Start</label>
                  <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>End</label>
                  <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} />
                </div>
              </div>
              <div className="form-group">
                <label>Prep Notes</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes for before the appointment..." />
              </div>
            </>
          ) : (
            <>
              {clientSelect}
              {newClientForm}
              <div className="form-group">
                <label>Task Description</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)} required placeholder="What needs to be done..." />
              </div>
              <div className="form-group">
                <label>Assign To</label>
                <select value={assignedUserId} onChange={e => setAssignedUserId(e.target.value)}>
                  {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </div>
            </>
          )}
          <button type="submit" className="btn btn-gold btn-block">
            Add {type === 'appointment' ? 'Appointment' : 'Task'}
          </button>
        </form>
      </div>
    </div>
  );
}

function CompleteAppointmentModal({ appointment, onClose, onSaved }) {
  const [notes, setNotes] = useState('');
  const [needsQuote, setNeedsQuote] = useState(false);
  const [quoteDesc, setQuoteDesc] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.completeAppointment(appointment.id, {
        appointment_notes: notes,
        needs_quote: needsQuote,
        quote_description: quoteDesc,
      });
      onSaved();
      onClose();
    } catch (err) {
      alert('Failed to complete appointment: ' + err.message);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Close Out Appointment</h3>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        <div style={{ marginBottom: 16 }}>
          <div className="appt-title">{appointment.title}</div>
          {appointment.client_name && <div className="appt-client">{appointment.client_name}</div>}
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Appointment Notes</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="What was discussed, outcomes, follow-up..."
            />
          </div>
          <div className="checkbox-field">
            <input
              type="checkbox"
              id="needsQuote"
              checked={needsQuote}
              onChange={e => setNeedsQuote(e.target.checked)}
            />
            <label htmlFor="needsQuote">Quote or estimate needed?</label>
          </div>
          {needsQuote && (
            <div className="form-group">
              <label>Quote Description</label>
              <input
                value={quoteDesc}
                onChange={e => setQuoteDesc(e.target.value)}
                placeholder="What needs to be quoted..."
              />
            </div>
          )}
          <button type="submit" className="btn btn-primary btn-block">Complete Appointment</button>
        </form>
      </div>
    </div>
  );
}
