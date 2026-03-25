import React, { useState, useEffect, useCallback } from 'react';
import api from '../api';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getWeekDays(baseDate) {
  const d = new Date(baseDate);
  const day = d.getDay();
  const start = new Date(d);
  start.setDate(d.getDate() - day);
  const days = [];
  for (let i = 0; i < 7; i++) {
    const dd = new Date(start);
    dd.setDate(start.getDate() + i);
    days.push(dd);
  }
  return days;
}

function formatDate(d) {
  return d.toISOString().split('T')[0];
}

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

export default function Schedule({ user }) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [appointments, setAppointments] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [showModal, setShowModal] = useState(false);

  const weekDays = getWeekDays(selectedDate);
  const dateStr = formatDate(selectedDate);

  const loadData = useCallback(async () => {
    try {
      const [appts, jbs] = await Promise.all([
        api.getAppointments({ date: dateStr }),
        api.getJobs({ date: dateStr, status: 'pending' }),
      ]);
      setAppointments(appts);
      setJobs(jbs);
    } catch (err) {
      console.error(err);
    }
  }, [dateStr]);

  useEffect(() => { loadData(); }, [loadData]);

  const shiftWeek = (dir) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + dir * 7);
    setSelectedDate(d);
  };

  return (
    <div>
      <div className="page-header">
        <h1>Schedule</h1>
        <div className="date-nav">
          <button onClick={() => shiftWeek(-1)}>&larr;</button>
          <button onClick={() => shiftWeek(1)}>&rarr;</button>
        </div>
      </div>

      {/* Week strip */}
      <div className="week-strip">
        {weekDays.map(d => {
          const isActive = formatDate(d) === formatDate(selectedDate);
          const isToday = formatDate(d) === formatDate(new Date());
          return (
            <div
              key={formatDate(d)}
              className={`week-day ${isActive ? 'active' : ''}`}
              onClick={() => setSelectedDate(new Date(d))}
            >
              <div className="day-name">{DAY_NAMES[d.getDay()]}</div>
              <div className="day-num" style={isToday && !isActive ? { color: '#c8a84e' } : {}}>
                {d.getDate()}
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected day content */}
      <div className="section-divider">
        <h2>
          {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
        </h2>
      </div>

      {appointments.length > 0 && (
        <>
          <div style={{ padding: '8px 20px', fontSize: 11, color: '#999', textTransform: 'uppercase', letterSpacing: 1 }}>
            Appointments
          </div>
          {appointments.map(appt => (
            <div key={appt.id} className="card appointment">
              <div style={{ display: 'flex' }}>
                <div className="timeline-bar" />
                <div>
                  <div className="appt-time">{formatTime(appt.start_time)} - {formatTime(appt.end_time)}</div>
                  <div className="appt-title">{appt.title}</div>
                  {appt.client_name && <div className="appt-client">{appt.client_name}</div>}
                </div>
              </div>
            </div>
          ))}
        </>
      )}

      {jobs.length > 0 && (
        <>
          <div style={{ padding: '8px 20px', fontSize: 11, color: '#999', textTransform: 'uppercase', letterSpacing: 1 }}>
            Scheduled Jobs
          </div>
          {jobs.map(job => (
            <div key={job.id} className="card job">
              <div className="task-info">
                <div className="client">{job.client_name}</div>
                <div className="description">{job.description}</div>
                {job.assigned_user_name && (
                  <div className="meta"><span>{job.assigned_user_name}</span></div>
                )}
              </div>
            </div>
          ))}
        </>
      )}

      {appointments.length === 0 && jobs.length === 0 && (
        <div className="empty-state">Nothing scheduled for this day</div>
      )}

      <button className="fab" onClick={() => setShowModal(true)}>+</button>

      {showModal && (
        <AddModal
          date={dateStr}
          userId={user.id}
          onClose={() => setShowModal(false)}
          onSaved={loadData}
        />
      )}
    </div>
  );
}

function AddModal({ date, userId, onClose, onSaved }) {
  const [type, setType] = useState('appointment');
  const [title, setTitle] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [notes, setNotes] = useState('');
  const [clients, setClients] = useState([]);
  const [clientId, setClientId] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    api.getClients().then(setClients).catch(() => {});
  }, []);

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
          client_id: clientId,
          description,
          assigned_user_id: userId,
          scheduled_date: date,
        });
      }
      onSaved();
      onClose();
    } catch (err) {
      alert('Failed to save: ' + err.message);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Add to {new Date(date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</h3>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>

        <div className="filter-pills" style={{ padding: '0 0 16px' }}>
          <button className={`filter-pill ${type === 'appointment' ? 'active' : ''}`} onClick={() => setType('appointment')}>
            Appointment
          </button>
          <button className={`filter-pill ${type === 'job' ? 'active' : ''}`} onClick={() => setType('job')}>
            Job
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {type === 'appointment' ? (
            <>
              <div className="form-group">
                <label>Title</label>
                <input value={title} onChange={e => setTitle(e.target.value)} required />
              </div>
              <div className="form-group">
                <label>Client</label>
                <select value={clientId} onChange={e => setClientId(e.target.value)}>
                  <option value="">-- No client --</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
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
                <label>Notes</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} />
              </div>
            </>
          ) : (
            <>
              <div className="form-group">
                <label>Client</label>
                <select value={clientId} onChange={e => setClientId(e.target.value)} required>
                  <option value="">-- Select client --</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)} required placeholder="What needs to be done..." />
              </div>
            </>
          )}
          <button type="submit" className="btn btn-gold btn-block">
            Add {type === 'appointment' ? 'Appointment' : 'Job'}
          </button>
        </form>
      </div>
    </div>
  );
}
