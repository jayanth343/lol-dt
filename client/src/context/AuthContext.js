// client/src/context/AuthContext.js
import React, { createContext, useContext, useEffect, useState } from 'react';
import { apiLogin, apiRegister, apiMe, resetSocket } from '../lib/api';

const Ctx = createContext({});
export const useAuth = () => useContext(Ctx);

export default function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore session on mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { setLoading(false); return; }
    apiMe()
      .then(data => { if (data && !data.error) setUser(data); else localStorage.removeItem('token'); })
      .catch(() => localStorage.removeItem('token'))
      .finally(() => setLoading(false));
  }, []);

  const signIn = async (email, password) => {
    const res = await apiLogin(email, password);
    if (res.error) return { error: res.error };
    localStorage.setItem('token', res.token);
    setUser(res.user);
    return { error: null };
  };

  const signUp = async (data) => {
    const res = await apiRegister(data);
    if (res.error) return { error: res.error };
    localStorage.setItem('token', res.token);
    setUser(res.user);
    return { error: null };
  };

  const signOut = () => {
    localStorage.removeItem('token');
    setUser(null);
    resetSocket();
  };

  const role     = user?.role || 'viewer';
  const isAdmin  = role === 'admin';
  const isOwner  = role === 'team_owner' || role === 'admin';
  const teamId   = user?.teamId?._id || user?.teamId || null;

  return (
    <Ctx.Provider value={{ user, loading, role, isAdmin, isOwner, teamId, signIn, signUp, signOut }}>
      {!loading && children}
    </Ctx.Provider>
  );
}
