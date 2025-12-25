import { useState, useEffect } from 'react';

const SESSION_KEY = 'auth-session';
// Password complessa hardcoded - rimuovere quando si implementa Supabase
const PASSWORD_HASH = 'ForfettarioIVA2025!@#$';

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem(SESSION_KEY) === 'true';
  });

  const login = (password: string): boolean => {
    if (password === PASSWORD_HASH) {
      sessionStorage.setItem(SESSION_KEY, 'true');
      setIsAuthenticated(true);
      return true;
    }
    return false;
  };

  const logout = () => {
    sessionStorage.removeItem(SESSION_KEY);
    setIsAuthenticated(false);
  };

  useEffect(() => {
    // Sincronizza con sessionStorage
    const checkAuth = () => {
      const isAuth = sessionStorage.getItem(SESSION_KEY) === 'true';
      setIsAuthenticated(isAuth);
    };

    window.addEventListener('storage', checkAuth);
    return () => window.removeEventListener('storage', checkAuth);
  }, []);

  return { isAuthenticated, login, logout };
}
