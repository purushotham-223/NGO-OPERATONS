import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [role, setRole] = useState(null); // 'admin', 'manager', or 'volunteer'
  const [approved, setApproved] = useState(false); // approval status
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initial session load
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setRole(null);
        setApproved(false);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function fetchProfile(userId) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('role, approved')
        .eq('id', userId)
        .single();

      if (error) {
        // Fallback for new signups where trigger might still be running
        setRole('volunteer');
        setApproved(true);
      } else {
        setRole(data?.role ?? 'volunteer');
        setApproved(data?.approved ?? false);
      }
    } catch (e) {
      setRole('volunteer');
      setApproved(true);
    } finally {
      setLoading(false);
    }
  }

  const value = { user, session, role, approved, loading };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
