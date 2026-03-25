import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const tabs = [
  { path: '/', label: 'Today', icon: '\u2609' },
  { path: '/schedule', label: 'Schedule', icon: '\u2610' },
  { path: '/jobs', label: 'Jobs', icon: '\u2692' },
  { path: '/invoices', label: 'Invoices', icon: '$' },
  { path: '/team', label: 'Team', icon: '\u263A' },
];

export default function TabBar() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <nav style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      background: '#1a1a1a',
      display: 'flex',
      justifyContent: 'center',
      zIndex: 90,
    }}>
      <div style={{
        display: 'flex',
        width: '100%',
        maxWidth: 500,
      }}>
        {tabs.map(tab => {
          const active = location.pathname === tab.path;
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              style={{
                flex: 1,
                padding: '8px 0 6px',
                border: 'none',
                background: 'transparent',
                color: active ? '#c8a84e' : '#666',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 2,
              }}
            >
              <span style={{ fontSize: 20 }}>{tab.icon}</span>
              <span style={{
                fontSize: 10,
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: 0.5,
              }}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
