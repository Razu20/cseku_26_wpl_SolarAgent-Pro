import React, { createContext, useContext, useEffect, useState } from 'react';
import * as api from '../api.js';

const SessionContext = createContext(null);

export function SessionProvider({ children }) {
  const [sessionId, setSessionId] = useState(null);
  const [site, setSite] = useState(null);
  const [results, setResults] = useState(null); // { site_analysis, energy, design, cost, roadmap }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api
      .createSession()
      .then((r) => setSessionId(r.session_id))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  async function submitSite(siteData) {
    const result = await api.submitSite(sessionId, siteData);
    setSite(siteData);
    return result;
  }

  async function submitLoad(loadData) {
    const result = await api.submitLoad(sessionId, loadData);
    setResults(result);
    return result;
  }

  const value = { sessionId, site, results, loading, error, submitSite, submitLoad, setResults };
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used within a SessionProvider');
  return ctx;
}
