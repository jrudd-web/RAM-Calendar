import React, { useState, useEffect } from 'react';
import api from '../api';

export default function Team({ user, onLogout }) {
  const [users, setUsers] = useState([]);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    api.getUsers().then(setUsers).catch(console.error);
  }, []);

  return (
    <div>
      <div className="page-header">
        <h1>Team</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          {user.role === 'admin' && (
            <button className="btn btn-gold btn-sm" onClick={() => setShowModal(true)}>+ User</button>
          )}
          <button className="btn btn-outline btn-sm" style={{ color: 'white', borderColor: '#666' }} onClick={onLogout}>
            Logout
          </button>
        </div>
      </div>

      <div style={{ padding: '16px 12px' }}>
        {users.map(u => (
          <div key={u.id} className="card" style={{
            borderLeft: `4px solid ${u.role === 'admin' ? '#c8a84e' : '#1a1a1a'}`,
            opacity: u.active ? 1 : 0.5,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 600 }}>
                  {u.name}
                  {u.id === user.id && (
                    <span style={{ fontSize: 11, color: '#999', marginLeft: 8 }}>(you)</span>
                  )}
                </div>
                <div style={{ fontSize: 13, color: '#666', marginTop: 2 }}>{u.email}</div>
                {u.phone && (
                  <div style={{ fontSize: 13, color: '#666' }}>{u.phone}</div>
                )}
              </div>
              <span className={`tag ${u.role === 'admin' ? 'weekly' : 'monthly'}`}>
                {u.role}
              </span>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <AddUserModal
          onClose={() => setShowModal(false)}
          onSaved={() => {
            api.getUsers().then(setUsers);
            setShowModal(false);
          }}
        />
      )}
    </div>
  );
}

function AddUserModal({ onClose, onSaved }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('field');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.createUser({ name, email, password, phone, role });
      onSaved();
    } catch (err) {
      alert('Failed to create user: ' + err.message);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Add Team Member</h3>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Name</label>
            <input value={name} onChange={e => setName(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Phone</label>
            <input value={phone} onChange={e => setPhone(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Role</label>
            <select value={role} onChange={e => setRole(e.target.value)}>
              <option value="field">Field</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <button type="submit" className="btn btn-primary btn-block">Add User</button>
        </form>
      </div>
    </div>
  );
}
