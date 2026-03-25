import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import api from './api';
import Login from './pages/Login';
import DailyView from './pages/DailyView';
import Schedule from './pages/Schedule';
import Jobs from './pages/Jobs';
import Invoices from './pages/Invoices';
import Team from './pages/Team';
import TabBar from './components/TabBar';
import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.me()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const handleLogin = (userData) => setUser(userData);
  const handleLogout = async () => {
    await api.logout();
    setUser(null);
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <BrowserRouter>
      <div className="app">
        <div className="app-content">
          <Routes>
            <Route path="/" element={<DailyView user={user} />} />
            <Route path="/schedule" element={<Schedule user={user} />} />
            <Route path="/jobs" element={<Jobs user={user} />} />
            <Route path="/invoices" element={<Invoices user={user} />} />
            <Route path="/team" element={<Team user={user} onLogout={handleLogout} />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </div>
        <TabBar />
      </div>
    </BrowserRouter>
  );
}

export default App;
