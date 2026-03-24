// client/src/App.js
import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AuthProvider, { useAuth } from './context/AuthContext';
import { Navbar, AuthModal } from './components/Shared';
import Home        from './pages/Home';
import Matches     from './pages/Matches';
import MatchDetail from './pages/MatchDetail';
import Standings   from './pages/Standings';
import Teams       from './pages/Teams';
import Players     from './pages/Players';
import Auction     from './pages/Auction';
import Register    from './pages/Register';
import Admin       from './pages/Admin';
import Fantasy     from './pages/Fantasy';

const Guard = ({ children, need }) => {
  const { isAdmin, isOwner } = useAuth();
  if (need === 'admin' && !isAdmin) return <Navigate to="/" replace />;
  if (need === 'owner' && !isOwner) return <Navigate to="/" replace />;
  return children;
};

function Shell() {
  const [showAuth, setShowAuth] = useState(false);
  return (
    <>
      <Navbar onAuth={() => setShowAuth(true)} />
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
      <main style={{ minHeight: 'calc(100vh - 52px)', paddingBottom: 40 }}>
        <Routes>
          <Route path="/"            element={<Home />} />
          <Route path="/matches"     element={<Matches />} />
          <Route path="/matches/:id" element={<MatchDetail />} />
          <Route path="/standings"   element={<Standings />} />
          <Route path="/teams"       element={<Teams />} />
          <Route path="/players"     element={<Players />} />
          <Route path="/auction"     element={<Auction />} />
          <Route path="/fantasy"     element={<Fantasy />} />
          <Route path="/register"    element={<Register />} />
          <Route path="/admin"       element={<Guard need="admin"><Admin /></Guard>} />
          <Route path="*"            element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <footer style={{ background: '#111', color: '#555', padding: '12px 20px', textAlign: 'center', fontSize: 11 }}>
        ⚡ CTO DT League of Legends Sports League · Season 2 · 2026 · Built with Node.js + Socket.io + MongoDB
      </footer>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Shell />
      </AuthProvider>
    </BrowserRouter>
  );
}
