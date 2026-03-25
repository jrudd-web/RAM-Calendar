import React, { useState, useEffect } from 'react';
import api from '../api';

export default function Invoices({ user }) {
  const [invoices, setInvoices] = useState([]);
  const [filter, setFilter] = useState('unbilled');
  const [sendingId, setSendingId] = useState(null);
  const [qbRef, setQbRef] = useState('');

  useEffect(() => {
    api.getInvoices().then(setInvoices).catch(console.error);
  }, []);

  const filtered = invoices.filter(inv => {
    if (filter === 'all') return true;
    return inv.status === filter;
  });

  const unbilledCount = invoices.filter(i => i.status === 'unbilled').length;

  const handleSend = async (id) => {
    try {
      await api.sendInvoice(id, { qb_reference: qbRef });
      const updated = await api.getInvoices();
      setInvoices(updated);
      setSendingId(null);
      setQbRef('');
    } catch (err) {
      alert('Failed to mark as sent: ' + err.message);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>Invoices</h1>
        {unbilledCount > 0 && (
          <span style={{
            background: '#c0392b',
            color: 'white',
            padding: '4px 10px',
            borderRadius: 12,
            fontSize: 13,
            fontWeight: 700,
          }}>
            {unbilledCount} unbilled
          </span>
        )}
      </div>

      <div className="filter-pills">
        {['unbilled', 'sent', 'all'].map(f => (
          <button
            key={f}
            className={`filter-pill ${filter === f ? 'active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
            {f === 'unbilled' && unbilledCount > 0 ? ` (${unbilledCount})` : ''}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          {filter === 'unbilled' ? 'All caught up! No unbilled jobs.' : 'No invoices found.'}
        </div>
      ) : (
        filtered.map(inv => (
          <div key={inv.id} className="card" style={{
            borderLeft: `4px solid ${inv.status === 'unbilled' ? '#c0392b' : '#27ae60'}`
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div className="task-info">
                <div className="client">
                  {inv.client_name}
                  <span className={`status-badge ${inv.status}`}>{inv.status}</span>
                </div>
                <div className="description">{inv.description}</div>
                <div className="meta">
                  {inv.completed_date && (
                    <span>Completed: {new Date(inv.completed_date).toLocaleDateString()}</span>
                  )}
                  {inv.sent_date && (
                    <span>Sent: {new Date(inv.sent_date).toLocaleDateString()}</span>
                  )}
                  {inv.sent_by_name && <span>By: {inv.sent_by_name}</span>}
                  {inv.qb_reference && <span>QB: {inv.qb_reference}</span>}
                </div>
              </div>

              {inv.status === 'unbilled' && (
                <div>
                  {sendingId === inv.id ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 120 }}>
                      <input
                        type="text"
                        placeholder="QB Ref #"
                        value={qbRef}
                        onChange={e => setQbRef(e.target.value)}
                        style={{
                          padding: '6px 8px',
                          border: '2px solid #d4c9b0',
                          borderRadius: 4,
                          fontSize: 12,
                        }}
                      />
                      <button className="btn btn-primary btn-sm" onClick={() => handleSend(inv.id)}>
                        Confirm Sent
                      </button>
                      <button className="btn btn-outline btn-sm" onClick={() => setSendingId(null)}>
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button className="btn btn-red btn-sm" onClick={() => setSendingId(inv.id)}>
                      Mark Sent
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
