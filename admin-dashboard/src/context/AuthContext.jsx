import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../api/auth';
import { federationsApi } from '../api/federations';
import { getToken, getStoredAdmin } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setTokenState] = useState(getToken());
  const [admin, setAdminState] = useState(getStoredAdmin());
  const [federation, setFederation] = useState(null);
  const [availableFederations, setAvailableFederations] = useState([]);
  const [selectedFederationId, setSelectedFederationId] = useState(null);
  const [loading, setLoading] = useState(true);

  const isSuperAdmin = admin?.role === 'supervising_admin';

  useEffect(() => {
    async function initAuth() {
      const storedToken = getToken();
      const storedAdmin = getStoredAdmin();
      if (storedToken && storedAdmin) {
        setTokenState(storedToken);
        setAdminState(storedAdmin);

        try {
          if (storedAdmin.role === 'supervising_admin') {
            setFederation({ id: null, name: 'All Federations (Global)', region: 'National' });
            const feds = await federationsApi.getAll();
            setAvailableFederations(Array.isArray(feds) ? feds : []);
          } else {
            const fed = await authApi.getCurrentFederation();
            setFederation(fed || { id: storedAdmin.federation_id, name: 'Pilot Federation', region: 'Local' });
          }
        } catch (err) {
          // If the error is an unauthorized 401, clear credentials
          if (err?.status === 401) {
            authApi.logout();
            setTokenState(null);
            setAdminState(null);
            setFederation(null);
          }
          // If it's a network glitch, keep the user logged in with stored info
        }
      }
      setLoading(false);
    }

    initAuth();

    const handleExpired = () => {
      setTokenState(null);
      setAdminState(null);
      setFederation(null);
      setAvailableFederations([]);
    };

    window.addEventListener('auth:expired', handleExpired);
    return () => window.removeEventListener('auth:expired', handleExpired);
  }, []);

  const login = async (email, password) => {
    const data = await authApi.login(email, password);
    setTokenState(data.token);
    setAdminState(data.admin);

    if (data.admin?.role === 'supervising_admin') {
      setFederation({ id: null, name: 'All Federations (Global)', region: 'National' });
      federationsApi.getAll()
        .then((feds) => setAvailableFederations(Array.isArray(feds) ? feds : []))
        .catch(() => {});
    } else {
      authApi.getCurrentFederation()
        .then((fed) => setFederation(fed || { id: data.admin?.federation_id, name: 'Pilot Federation', region: 'Local' }))
        .catch(() => setFederation({ id: data.admin?.federation_id, name: 'Pilot Federation', region: 'Local' }));
    }

    return data;
  };

  const logout = () => {
    authApi.logout();
    setTokenState(null);
    setAdminState(null);
    setFederation(null);
    setAvailableFederations([]);
    setSelectedFederationId(null);
  };

  const switchFederation = (fedId) => {
    if (!isSuperAdmin) return;
    setSelectedFederationId(fedId);
    if (!fedId) {
      setFederation({ id: null, name: 'All Federations (Global)', region: 'National' });
    } else {
      const match = availableFederations.find((f) => f.id === fedId);
      if (match) setFederation(match);
    }
  };

  const reloadFederations = async () => {
    if (isSuperAdmin) {
      try {
        const feds = await federationsApi.getAll();
        setAvailableFederations(Array.isArray(feds) ? feds : []);
      } catch (err) {
        console.error('Failed to reload federations:', err);
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        admin,
        federation,
        isSuperAdmin,
        availableFederations,
        selectedFederationId,
        switchFederation,
        reloadFederations,
        isAuthenticated: !!token,
        loading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
